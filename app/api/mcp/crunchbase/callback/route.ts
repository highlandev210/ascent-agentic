import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  saveCrunchbaseTokens,
  type CrunchbaseTokens
} from '@/lib/mcp/crunchbase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('[Crunchbase Callback] OAuth error returned:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/?mcp_error=${encodeURIComponent(errorDescription || error)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.json(
      { error: 'Missing code parameter in authorization response' },
      { status: 400 }
    )
  }

  const cookieStore = await cookies()
  const storedVerifier = cookieStore.get('cb_pkce_verifier')?.value
  const storedState = cookieStore.get('cb_oauth_state')?.value

  if (state && storedState && state !== storedState) {
    console.warn('[Crunchbase Callback] State mismatch. Continuing exchange...')
  }

  if (!storedVerifier) {
    console.error('[Crunchbase Callback] Missing code_verifier in cookies')
    return NextResponse.json(
      { error: 'OAuth session expired. Please restart the authorization flow at /api/mcp/crunchbase/auth' },
      { status: 400 }
    )
  }

  const clientId = process.env.CRUNCHBASE_CLIENT_ID!
  const clientSecret = process.env.CRUNCHBASE_CLIENT_SECRET!
  const redirectUri =
    process.env.CRUNCHBASE_REDIRECT_URI ||
    'http://localhost:3000/api/mcp/crunchbase/callback'

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: storedVerifier
    })

    const tokenRes = await fetch('https://oauth.crunchbase.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error('[Crunchbase Callback] Token exchange failed:', tokenRes.status, errBody)
      return NextResponse.json(
        { error: `Token exchange failed: ${errBody}` },
        { status: tokenRes.status }
      )
    }

    const tokenData = await tokenRes.json()
    const tokens: CrunchbaseTokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
      tokenType: tokenData.token_type || 'Bearer',
      scope: tokenData.scope
    }

    saveCrunchbaseTokens(tokens)

    // Clean up temporary cookies
    cookieStore.delete('cb_pkce_verifier')
    cookieStore.delete('cb_oauth_state')

    return NextResponse.redirect(new URL('/?mcp=crunchbase_connected', request.url))
  } catch (err: any) {
    console.error('[Crunchbase Callback] Unexpected error during token exchange:', err)
    return NextResponse.json(
      { error: err?.message || 'Unexpected error during token exchange' },
      { status: 500 }
    )
  }
}
