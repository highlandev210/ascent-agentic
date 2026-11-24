import { NextResponse } from 'next/server'

import {
  getCrunchbaseTokens,
  isCrunchbaseConfigured,
  isCrunchbaseConnected
} from '@/lib/mcp/crunchbase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const configured = isCrunchbaseConfigured()
  const connected = isCrunchbaseConnected()
  const tokens = getCrunchbaseTokens()

  return NextResponse.json({
    configured,
    connected,
    authUrl: '/api/mcp/crunchbase/auth',
    expiresAt: tokens?.expiresAt
      ? new Date(tokens.expiresAt).toISOString()
      : null
  })
}
