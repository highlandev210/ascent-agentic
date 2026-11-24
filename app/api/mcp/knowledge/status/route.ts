import { NextResponse } from 'next/server'

import {
  callKnowledgeMCP,
  getKnowledgeToken,
  isKnowledgeConnected
} from '@/lib/mcp/knowledge'

export async function GET() {
  const configured = isKnowledgeConnected()
  const token = getKnowledgeToken()
  const url =
    process.env.KNOWLEDGE_MCP_URL || 'https://knowledge.strikr.sbs/mcp'

  if (!configured || !token) {
    return NextResponse.json({
      configured: false,
      connected: false,
      url,
      error: 'Knowledge MCP token not configured.'
    })
  }

  try {
    const toolsResult: any = await callKnowledgeMCP('tools/list')
    const tools = toolsResult?.tools?.map((t: any) => t.name) || []
    return NextResponse.json({
      configured: true,
      connected: true,
      url,
      toolsCount: tools.length,
      tools
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        configured: true,
        connected: false,
        url,
        error: err?.message || 'Failed to connect to Knowledge MCP'
      },
      { status: 502 }
    )
  }
}
