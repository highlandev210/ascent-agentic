import { NextRequest, NextResponse } from 'next/server'

import {
  deleteTavilyApiKey,
  isTavilyConfigured,
  saveTavilyApiKey
} from '@/lib/connectors/tavily'

// NOTE: Save routes write secrets to server-side files and are unauthenticated
// in single-user Docker mode. Phase B / multi-user must move config to per-user
// DB storage and gate these routes by user.

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const key = typeof body?.key === 'string' ? body.key.trim() : ''

    if (!key) {
      return NextResponse.json(
        { error: 'API key is required and cannot be empty' },
        { status: 400 }
      )
    }

    saveTavilyApiKey(key)

    return NextResponse.json({
      success: true,
      configured: isTavilyConfigured(),
      connected: isTavilyConfigured()
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to save Tavily API key' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    deleteTavilyApiKey()
    return NextResponse.json({
      success: true,
      configured: isTavilyConfigured(),
      connected: isTavilyConfigured()
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to delete Tavily API key' },
      { status: 500 }
    )
  }
}
