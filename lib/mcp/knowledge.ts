import { tool } from 'ai'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'

const DEFAULT_TOKEN_FILE = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  '.knowledge-token.txt'
)

export function getKnowledgeToken(): string | null {
  const tokenFilePath =
    process.env.KNOWLEDGE_MCP_TOKEN_FILE || DEFAULT_TOKEN_FILE
  try {
    if (fs.existsSync(tokenFilePath)) {
      const token = fs.readFileSync(tokenFilePath, 'utf-8').trim()
      if (token) return token
    }
  } catch (err) {
    console.error('[Knowledge MCP] Error reading token file:', err)
  }

  if (process.env.KNOWLEDGE_MCP_TOKEN) {
    const token = process.env.KNOWLEDGE_MCP_TOKEN.trim()
    if (token) return token
  }

  return null
}

export function saveKnowledgeToken(token: string): void {
  const trimmed = token?.trim()
  if (!trimmed) {
    throw new Error('Knowledge MCP token cannot be empty')
  }

  const tokenFilePath =
    process.env.KNOWLEDGE_MCP_TOKEN_FILE || DEFAULT_TOKEN_FILE
  fs.writeFileSync(tokenFilePath, trimmed, 'utf-8')
}

export function deleteKnowledgeToken(): void {
  const tokenFilePath =
    process.env.KNOWLEDGE_MCP_TOKEN_FILE || DEFAULT_TOKEN_FILE
  try {
    if (fs.existsSync(tokenFilePath)) {
      fs.unlinkSync(tokenFilePath)
    }
  } catch (err) {
    console.error('[Knowledge MCP] Error deleting token file:', err)
  }
}

export function isKnowledgeConfigured(): boolean {
  return !!getKnowledgeToken()
}

export function isKnowledgeConnected(): boolean {
  return isKnowledgeConfigured()
}

/**
 * Execute a JSON-RPC 2.0 call to QSTM Knowledge MCP Streamable HTTP endpoint
 */
export async function callKnowledgeMCP(
  method: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  const token = getKnowledgeToken()
  if (!token) {
    throw new Error('Knowledge MCP token is not configured.')
  }

  const endpoint =
    process.env.KNOWLEDGE_MCP_URL || 'https://knowledge.strikr.sbs/mcp'

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${token}`
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
    throw new Error(`Knowledge MCP HTTP ${res.status}: ${errorText}`)
  }

  const rawText = await res.text()
  let json: any

  // Handle SSE or direct JSON
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
      `Knowledge MCP Error: ${json.error.message || JSON.stringify(json.error)}`
    )
  }

  return json.result
}

async function callKnowledgeTool(name: string, args: Record<string, unknown>) {
  const result: any = await callKnowledgeMCP('tools/call', {
    name,
    arguments: args
  })

  if (result?.content?.[0]?.text) {
    try {
      const parsed = JSON.parse(result.content[0].text)
      return parsed
    } catch {
      // not json, return result
    }
  }
  return result
}

function getDefaultProjectId(): string {
  return process.env.KNOWLEDGE_MCP_DEFAULT_PROJECT_ID || 'demo'
}

function getDefaultAsOf(): string {
  return new Date().toISOString().split('T')[0]
}

export function createKnowledgeTools(): Record<string, any> {
  return {
    mcp__knowledge__discover_packs: tool({
      description:
        'Find permitted research knowledge packs and document collections (e.g. EV penetration, AI data centers, energy infrastructure in Southeast Asia). Selection and licensing are handled by the host application.',
      inputSchema: z.object({
        intent: z
          .string()
          .describe(
            "Research topic or intent, e.g. 'EV market opportunities in Southeast Asia'"
          ),
        project_id: z
          .string()
          .optional()
          .describe("Project identifier (default: 'demo')"),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of packs to discover (default: 2)')
      }),
      execute: async ({ intent, project_id, limit }) => {
        try {
          return await callKnowledgeTool('discover_packs', {
            project_id: project_id || getDefaultProjectId(),
            intent,
            limit: limit ?? 2
          })
        } catch (error: any) {
          console.error('[Knowledge MCP] discover_packs error:', error)
          return { error: error?.message || 'Failed to discover packs' }
        }
      }
    }),

    mcp__knowledge__research_pack: tool({
      description:
        'Get evidence and verifiable citations from selected pack versions. Use this after finding pack_refs with discover_packs.',
      inputSchema: z.object({
        pack_refs: z
          .array(z.string())
          .describe(
            "Pack references obtained from discover_packs (e.g. ['sea-ev-penetration@2026-11-15.mcp.2'])"
          ),
        query: z.string().describe('Specific research query or question'),
        as_of: z
          .string()
          .optional()
          .describe(
            'Observation date in YYYY-MM-DD format (defaults to current date)'
          ),
        project_id: z
          .string()
          .optional()
          .describe("Project identifier (default: 'demo')"),
        country: z
          .string()
          .optional()
          .describe(
            "Optional country filter (e.g. 'ID', 'TH', 'VN', 'MY', 'SG', 'PH')"
          ),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of evidence items (default: 6)')
      }),
      execute: async ({
        pack_refs,
        query,
        as_of,
        project_id,
        country,
        limit
      }) => {
        try {
          return await callKnowledgeTool('research_pack', {
            project_id: project_id || getDefaultProjectId(),
            pack_refs,
            query,
            as_of: as_of || getDefaultAsOf(),
            country: country || null,
            limit: limit ?? 6
          })
        } catch (error: any) {
          console.error('[Knowledge MCP] research_pack error:', error)
          return { error: error?.message || 'Failed to research pack' }
        }
      }
    }),

    mcp__knowledge__exact_search: tool({
      description:
        'Locate an exact quotation of 3–512 UTF-8 bytes in selected packs with byte-level verification.',
      inputSchema: z.object({
        pack_refs: z.array(z.string()).describe('Selected pack references'),
        phrase: z
          .string()
          .describe('Exact phrase to search (3–512 UTF-8 bytes)'),
        as_of: z
          .string()
          .optional()
          .describe(
            'Observation date in YYYY-MM-DD format (defaults to current date)'
          ),
        project_id: z
          .string()
          .optional()
          .describe("Project identifier (default: 'demo')"),
        limit: z.number().optional().describe('Maximum results (default: 3)')
      }),
      execute: async ({ pack_refs, phrase, as_of, project_id, limit }) => {
        try {
          return await callKnowledgeTool('exact_search', {
            project_id: project_id || getDefaultProjectId(),
            pack_refs,
            phrase,
            as_of: as_of || getDefaultAsOf(),
            limit: limit ?? 3
          })
        } catch (error: any) {
          console.error('[Knowledge MCP] exact_search error:', error)
          return { error: error?.message || 'Failed to execute exact search' }
        }
      }
    }),

    mcp__knowledge__query_ev_series: tool({
      description:
        'Return Malaysian registration-share observations, formulas and row citations across vehicle classes and months.',
      inputSchema: z.object({
        pack_ref: z
          .string()
          .describe('Pack reference (e.g. sea-ev-penetration@...)'),
        country: z
          .string()
          .default('MY')
          .describe('Country code (default: MY)'),
        vehicle_class: z
          .string()
          .default('car')
          .describe("Vehicle class, e.g. 'car'"),
        start_month: z.string().describe("Start month YYYY-MM, e.g. '2024-01'"),
        end_month: z.string().describe("End month YYYY-MM, e.g. '2026-10'"),
        as_of: z
          .string()
          .optional()
          .describe(
            'Observation date in YYYY-MM-DD format (defaults to current date)'
          ),
        project_id: z
          .string()
          .optional()
          .describe("Project identifier (default: 'demo')"),
        limit: z.number().optional().describe('Maximum results (default: 12)')
      }),
      execute: async ({
        pack_ref,
        country,
        vehicle_class,
        start_month,
        end_month,
        as_of,
        project_id,
        limit
      }) => {
        try {
          return await callKnowledgeTool('query_ev_series', {
            project_id: project_id || getDefaultProjectId(),
            pack_ref,
            country: country || 'MY',
            vehicle_class: vehicle_class || 'car',
            start_month,
            end_month,
            as_of: as_of || getDefaultAsOf(),
            limit: limit ?? 12
          })
        } catch (error: any) {
          console.error('[Knowledge MCP] query_ev_series error:', error)
          return { error: error?.message || 'Failed to query EV series' }
        }
      }
    }),

    mcp__knowledge__calculate_philippines_share: tool({
      description:
        'Calculate monitored 2026 Philippine sales share for explicit EV categories (BEV, PHEV, HEV) with source citations.',
      inputSchema: z.object({
        pack_ref: z.string().describe('Pack reference'),
        categories: z
          .array(z.enum(['BEV', 'PHEV', 'HEV']))
          .describe('Categories to calculate'),
        as_of: z
          .string()
          .optional()
          .describe(
            'Observation date in YYYY-MM-DD format (defaults to current date)'
          ),
        project_id: z
          .string()
          .optional()
          .describe("Project identifier (default: 'demo')")
      }),
      execute: async ({ pack_ref, categories, as_of, project_id }) => {
        try {
          return await callKnowledgeTool('calculate_philippines_share', {
            project_id: project_id || getDefaultProjectId(),
            pack_ref,
            categories,
            as_of: as_of || getDefaultAsOf()
          })
        } catch (error: any) {
          console.error(
            '[Knowledge MCP] calculate_philippines_share error:',
            error
          )
          return { error: error?.message || 'Failed to calculate share' }
        }
      }
    }),

    mcp__knowledge__compare_capacity: tool({
      description:
        'Compare covered data center facility examples, keeping capacity definitions (IT_load, total_power) and operating status separate across Southeast Asia.',
      inputSchema: z.object({
        pack_ref: z.string().describe('Pack reference'),
        as_of: z
          .string()
          .optional()
          .describe(
            'Observation date in YYYY-MM-DD format (defaults to current date)'
          ),
        countries: z
          .array(z.string())
          .optional()
          .describe("Countries to compare, e.g. ['MY', 'SG', 'ID']"),
        basis: z
          .enum(['IT_load', 'total_power'])
          .optional()
          .describe('Capacity basis'),
        status: z.string().optional().describe('Operating status'),
        project_id: z
          .string()
          .optional()
          .describe("Project identifier (default: 'demo')")
      }),
      execute: async ({
        pack_ref,
        as_of,
        countries,
        basis,
        status,
        project_id
      }) => {
        try {
          return await callKnowledgeTool('compare_capacity', {
            project_id: project_id || getDefaultProjectId(),
            pack_ref,
            as_of: as_of || getDefaultAsOf(),
            countries: countries || null,
            basis: basis || null,
            status: status || null
          })
        } catch (error: any) {
          console.error('[Knowledge MCP] compare_capacity error:', error)
          return { error: error?.message || 'Failed to compare capacity' }
        }
      }
    }),

    mcp__knowledge__run_scenario: tool({
      description:
        'Calculate explicit assumptions for EV units (total_vehicles, assumed_share_percent) or data center energy (it_design_mw, capacity_basis, pue, hours, tariff_per_kwh). Returns mathematical formulas and results.',
      inputSchema: z.object({
        pack_ref: z.string().describe('Pack reference'),
        model: z
          .enum(['ev_units', 'dc_energy'])
          .describe("Model type: 'ev_units' or 'dc_energy'"),
        inputs: z
          .record(z.string(), z.any())
          .describe('Model input parameters and assumptions'),
        project_id: z
          .string()
          .optional()
          .describe("Project identifier (default: 'demo')")
      }),
      execute: async ({ pack_ref, model, inputs, project_id }) => {
        try {
          return await callKnowledgeTool('run_scenario', {
            project_id: project_id || getDefaultProjectId(),
            pack_ref,
            model,
            inputs
          })
        } catch (error: any) {
          console.error('[Knowledge MCP] run_scenario error:', error)
          return { error: error?.message || 'Failed to run scenario' }
        }
      }
    }),

    mcp__knowledge__get_evidence: tool({
      description:
        'Retrieve an identified evidence card with its source citations, definitions, and limitations.',
      inputSchema: z.object({
        pack_ref: z.string().describe('Pack reference'),
        evidence_id: z
          .string()
          .describe("Evidence identifier, e.g. 'iea_trends:0108'"),
        as_of: z
          .string()
          .optional()
          .describe(
            'Observation date in YYYY-MM-DD format (defaults to current date)'
          ),
        project_id: z
          .string()
          .optional()
          .describe("Project identifier (default: 'demo')")
      }),
      execute: async ({ pack_ref, evidence_id, as_of, project_id }) => {
        try {
          return await callKnowledgeTool('get_evidence', {
            project_id: project_id || getDefaultProjectId(),
            pack_ref,
            evidence_id,
            as_of: as_of || getDefaultAsOf()
          })
        } catch (error: any) {
          console.error('[Knowledge MCP] get_evidence error:', error)
          return { error: error?.message || 'Failed to get evidence' }
        }
      }
    }),

    mcp__knowledge__inspect_pack: tool({
      description:
        'Inspect pack scope, version, source provenance, coverage gaps, rights, and review status.',
      inputSchema: z.object({
        pack_ref: z.string().describe('Pack reference to inspect'),
        project_id: z
          .string()
          .optional()
          .describe("Project identifier (default: 'demo')")
      }),
      execute: async ({ pack_ref, project_id }) => {
        try {
          return await callKnowledgeTool('inspect_pack', {
            project_id: project_id || getDefaultProjectId(),
            pack_ref
          })
        } catch (error: any) {
          console.error('[Knowledge MCP] inspect_pack error:', error)
          return { error: error?.message || 'Failed to inspect pack' }
        }
      }
    })
  }
}
