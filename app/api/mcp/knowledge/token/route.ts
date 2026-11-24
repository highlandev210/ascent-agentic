import { NextRequest, NextResponse } from 'next/server'

import {
  deleteKnowledgeToken,
  isKnowledgeConfigured,
  isKnowledgeConnected,
  saveKnowledgeToken
} from '@/lib/mcp/knowledge'

// NOTE: Save routes write secrets to server-side files and are unauthenticated
// in single-user Docker mode. Phase B / multi-user must move config to per-user
// DB storage and gate these routes by user.

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = typeof body?.token === 'string' ? body.token.trim() : ''

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required and cannot be empty' },
        { status: 400 }
      )
    }

    saveKnowledgeToken(token)

    return NextResponse.json({
      success: true,
      configured: isKnowledgeConfigured(),
      connected: isKnowledgeConnected()
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to save Knowledge MCP token' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    deleteKnowledgeToken()
    return NextResponse.json({
      success: true,
      configured: isKnowledgeConfigured(),
      connected: isKnowledgeConnected()
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to delete Knowledge MCP token' },
      { status: 500 }
    )
  }
}
