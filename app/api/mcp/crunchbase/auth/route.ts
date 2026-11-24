import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createPKCE, isCrunchbaseConfigured } from '@/lib/mcp/crunchbase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isCrunchbaseConfigured()) {
    return NextResponse.json(
      {
        error:
          'Crunchbase MCP is not configured. Please set CRUNCHBASE_CLIENT_ID and CRUNCHBASE_CLIENT_SECRET in .env.local.'
      },
      { status: 400 }
    )
  }

  const clientId = process.env.CRUNCHBASE_CLIENT_ID!
  const redirectUri =
    process.env.CRUNCHBASE_REDIRECT_URI ||
    'http://localhost:3000/api/mcp/crunchbase/callback'

  const { codeVerifier, codeChallenge } = createPKCE()
  const state = crypto.randomBytes(16).toString('hex')

  const authUrl = new URL('https://www.crunchbase.com/oauth/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  if (process.env.CRUNCHBASE_SCOPE) {
    authUrl.searchParams.set('scope', process.env.CRUNCHBASE_SCOPE)
  }
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('state', state)

  const cookieStore = await cookies()
  cookieStore.set('cb_pkce_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/'
  })
  cookieStore.set('cb_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/'
  })

  return NextResponse.redirect(authUrl.toString())
}
