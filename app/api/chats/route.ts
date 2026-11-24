import { NextRequest, NextResponse } from 'next/server'

import { SPACE_COLOR_COOKIE } from '@/components/spaces/space-colors'
import { getChatsPage } from '@/lib/actions/chat'
import { Chat as DBChat } from '@/lib/db/schema'

interface ChatPageResponse {
  chats: DBChat[]
  nextOffset: number | null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const space =
    searchParams.get('space') ??
    request.cookies.get(SPACE_COLOR_COOKIE)?.value ??
    null

  try {
    const result = await getChatsPage(limit, offset, space)
    return NextResponse.json<ChatPageResponse>(result)
  } catch (error) {
    console.error('API route error fetching chats:', error)
    return NextResponse.json<ChatPageResponse>(
      { chats: [], nextOffset: null },
      { status: 500 }
    )
  }
}
