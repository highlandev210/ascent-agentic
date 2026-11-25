import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import type { UIMessage } from '@/lib/types/ai'

import { ChatMessages } from '../chat-messages'

vi.mock('@/lib/hooks/use-media-query', () => ({
  useMediaQuery: () => false
}))

vi.mock('../render-message', () => ({
  RenderMessage: ({
    message,
    getIsOpen,
    onOpenChange
  }: {
    message: UIMessage
    getIsOpen: (id: string, partType?: string, hasNextPart?: boolean) => boolean
    onOpenChange: (id: string, open: boolean) => void
  }) => {
    if (message.role !== 'assistant') return null

    const hasAnswer = message.parts?.some(
      part => part.type === 'text' && part.text.trim().length > 0
    )
    const toolPart = message.parts?.find(
      (part: any) =>
        typeof part.type === 'string' &&
        (part.type.startsWith('tool-') || part.type === 'dynamic-tool')
    ) as any
    const toolId = toolPart?.toolCallId || 'tool-1'
    const toolType = toolPart?.type || 'tool-search'
    const isOpen = getIsOpen(toolId, toolType, hasAnswer)

    return (
      <button onClick={() => onOpenChange(toolId, !isOpen)}>
        {isOpen ? 'Open tool' : 'Closed tool'}
      </button>
    )
  }
}))

vi.mock('../ui/animated-logo', () => ({
  AnimatedLogo: () => null
}))

vi.mock('../chat-footer-message', () => ({
  ChatFooterMessage: () => null
}))

test('closes a single tool when answer text starts streaming', () => {
  const userMessage = {
    id: 'user-1',
    role: 'user',
    parts: [{ type: 'text', text: 'Question' }]
  } as UIMessage
  const toolPart = {
    type: 'tool-search',
    toolCallId: 'tool-1',
    state: 'output-available',
    input: {},
    output: {}
  } as UIMessage['parts'][number]
  const assistantMessage = (answer?: string): UIMessage => ({
    id: 'assistant-1',
    role: 'assistant',
    parts: answer ? [toolPart, { type: 'text', text: answer }] : [toolPart]
  })
  const scrollContainerRef = React.createRef<HTMLDivElement>()
  const sections = (answer?: string) => [
    {
      id: 'section-1',
      userMessage,
      assistantMessages: [assistantMessage(answer)]
    }
  ]

  const { rerender } = render(
    <ChatMessages
      sections={sections()}
      status="streaming"
      scrollContainerRef={scrollContainerRef}
    />
  )

  expect(screen.getByRole('button', { name: 'Open tool' })).toBeInTheDocument()

  rerender(
    <ChatMessages
      sections={sections('Answer has started')}
      status="streaming"
      scrollContainerRef={scrollContainerRef}
    />
  )

  const closedTool = screen.getByRole('button', { name: 'Closed tool' })
  fireEvent.click(closedTool)
  expect(screen.getByRole('button', { name: 'Open tool' })).toBeInTheDocument()
})

test('closes an MCP / dynamic tool when answer text starts streaming', () => {
  const userMessage = {
    id: 'user-2',
    role: 'user',
    parts: [{ type: 'text', text: 'Ask MCP' }]
  } as UIMessage
  const mcpToolPart = {
    type: 'tool-mcp__crunchbase__query_answer',
    toolCallId: 'mcp-1',
    state: 'output-available',
    input: { query: 'test' },
    output: { answer: 'found' }
  } as any
  const assistantMessage = (answer?: string): UIMessage => ({
    id: 'assistant-2',
    role: 'assistant',
    parts: answer
      ? [mcpToolPart, { type: 'text', text: answer }]
      : [mcpToolPart]
  })
  const scrollContainerRef = React.createRef<HTMLDivElement>()
  const sections = (answer?: string) => [
    {
      id: 'section-2',
      userMessage,
      assistantMessages: [assistantMessage(answer)]
    }
  ]

  const { rerender } = render(
    <ChatMessages
      sections={sections()}
      status="streaming"
      scrollContainerRef={scrollContainerRef}
    />
  )

  expect(screen.getByRole('button', { name: 'Open tool' })).toBeInTheDocument()

  rerender(
    <ChatMessages
      sections={sections('Answer is ready')}
      status="streaming"
      scrollContainerRef={scrollContainerRef}
    />
  )

  expect(
    screen.getByRole('button', { name: 'Closed tool' })
  ).toBeInTheDocument()
})
