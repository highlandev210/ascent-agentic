import { tool } from 'ai'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'

const TOKENS_FILE = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  '.crunchbase-tokens.json'
)

export interface CrunchbaseTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number // epoch ms
  tokenType: string
  scope?: string
}

let cachedTokens: CrunchbaseTokens | null = null

export function isCrunchbaseConfigured(): boolean {
  return !!(
    process.env.CRUNCHBASE_CLIENT_ID && process.env.CRUNCHBASE_CLIENT_SECRET
  )
}

export function getCrunchbaseTokens(): CrunchbaseTokens | null {
  if (cachedTokens) return cachedTokens

  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'))
      if (data?.accessToken && data?.refreshToken) {
        cachedTokens = data
        return cachedTokens
      }
    }
  } catch (err) {
    console.error('[Crunchbase MCP] Error reading tokens file:', err)
  }

  return null
}

export function saveCrunchbaseTokens(tokens: CrunchbaseTokens): void {
  cachedTokens = tokens
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8')
    console.log('[Crunchbase MCP] Tokens saved successfully')
  } catch (err) {
    console.error('[Crunchbase MCP] Error saving tokens to file:', err)
  }
}

export function deleteCrunchbaseTokens(): void {
  cachedTokens = null
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      fs.unlinkSync(TOKENS_FILE)
      console.log('[Crunchbase MCP] Tokens deleted successfully')
    }
  } catch (err) {
    console.error('[Crunchbase MCP] Error deleting tokens file:', err)
  }
}

export function isCrunchbaseConnected(): boolean {
  const tokens = getCrunchbaseTokens()
  return !!tokens?.accessToken
}

/**
 * Ensures we have a non-expired access token. Refreshes if expired.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getCrunchbaseTokens()
  if (!tokens) return null

  // If token is valid for at least another 60 seconds, return it
  if (tokens.expiresAt > Date.now() + 60000) {
    return tokens.accessToken
  }

  // Otherwise, refresh the token
  try {
    console.log('[Crunchbase MCP] Refreshing expired access token...')
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.CRUNCHBASE_CLIENT_ID || '',
      client_secret: process.env.CRUNCHBASE_CLIENT_SECRET || '',
      refresh_token: tokens.refreshToken
    })

    const res = await fetch('https://oauth.crunchbase.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[Crunchbase MCP] Token refresh failed:', errText)
      return null
    }

    const data = await res.json()
    const newTokens: CrunchbaseTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope || tokens.scope
    }

    saveCrunchbaseTokens(newTokens)
    return newTokens.accessToken
  } catch (err) {
    console.error('[Crunchbase MCP] Error refreshing token:', err)
    return null
  }
}

/**
 * Execute a JSON-RPC 2.0 call to Crunchbase MCP Streamable HTTP endpoint
 */
export async function callCrunchbaseMCP(
  method: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error(
      'Crunchbase MCP is not authenticated. Visit /api/mcp/crunchbase/auth to connect.'
    )
  }

  const endpoint =
    process.env.CRUNCHBASE_MCP_URL || 'https://mcp.crunchbase.com'

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    })
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Crunchbase MCP HTTP ${res.status}: ${errorText}`)
  }

  const rawText = await res.text()
  let json: any

  // Crunchbase MCP Streamable HTTP responds with text/event-stream (SSE)
  const dataLines = rawText
    .split('\n')
    .filter(line => line.startsWith('data:'))
    .map(line => line.replace(/^data:\s*/, '').trim())
    .filter(Boolean)

  if (dataLines.length > 0) {
    const lastData = dataLines[dataLines.length - 1]
    json = JSON.parse(lastData)
  } else {
    json = JSON.parse(rawText)
  }

  if (json.error) {
    throw new Error(
      `Crunchbase MCP Error: ${json.error.message || JSON.stringify(json.error)}`
    )
  }

  return json.result
}

/**
 * Generate PKCE code verifier and challenge
 */
export function createPKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  return { codeVerifier, codeChallenge }
}

/**
 * Expose Crunchbase tools to AI SDK
 */
export function createCrunchbaseTools(): Record<string, any> {
  return {
    mcp__crunchbase__query_answer: tool({
      description:
        'Ask Crunchbase Expert a natural language question about private companies, startups, funding rounds, valuations, and investors (e.g. "What is Anthropic\'s total funding to date and who led their last round?").',
      inputSchema: z.object({
        question: z
          .string()
          .describe(
            'Natural language question to ask Crunchbase about companies, funding, or investors.'
          )
      }),
      execute: async ({ question }) => {
        try {
          const result = await callCrunchbaseMCP('tools/call', {
            name: 'cb_expert_query_answer',
            arguments: { question }
          })
          return result
        } catch (error: any) {
          console.error('[Crunchbase MCP] query_answer error:', error)
          return { error: error?.message || 'Failed to query Crunchbase' }
        }
      }
    }),

    mcp__crunchbase__resolve_entity: tool({
      description:
        'Resolve and disambiguate a company name or domain in Crunchbase to its canonical profile and funding overview.',
      inputSchema: z.object({
        name: z
          .string()
          .describe(
            'Company or organization name (e.g. "Stripe", "Databricks").'
          ),
        domains: z
          .array(z.string())
          .optional()
          .describe(
            'Optional website domain(s) for higher accuracy (e.g. ["stripe.com"]).'
          )
      }),
      execute: async ({ name, domains }) => {
        try {
          const result = await callCrunchbaseMCP('tools/call', {
            name: 'cb_expert_resolve_entity',
            arguments: { name, domains: domains || [] }
          })
          return result
        } catch (error: any) {
          console.error('[Crunchbase MCP] resolve_entity error:', error)
          return { error: error?.message || 'Failed to resolve entity' }
        }
      }
    }),

    mcp__crunchbase__get_entity: tool({
      description:
        'Retrieve complete profile information, funding rounds, investors, or acquisitions for an entity in Crunchbase by its identifier or permalink.',
      inputSchema: z.object({
        entity_id: z
          .string()
          .describe(
            'The permalink or UUID of the entity (e.g. "stripe" or "anthropic").'
          ),
        entity_def_id: z
          .string()
          .default('organization')
          .describe(
            'Entity definition type: "organization", "person", "funding_round", etc.'
          )
      }),
      execute: async ({ entity_id, entity_def_id }) => {
        try {
          const result = await callCrunchbaseMCP('tools/call', {
            name: 'cb_entity_get',
            arguments: {
              entity_id,
              entity_def_id: entity_def_id || 'organization'
            }
          })
          return result
        } catch (error: any) {
          console.error('[Crunchbase MCP] get_entity error:', error)
          return { error: error?.message || 'Failed to get entity' }
        }
      }
    })
  }
}
