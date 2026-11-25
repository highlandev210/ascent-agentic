import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { DynamicToolDisplay } from '../dynamic-tool-display'

// Mock artifact context
const mockOpen = vi.fn()
vi.mock('../artifact/artifact-context', () => ({
  useArtifact: () => ({
    open: mockOpen
  })
}))

describe('DynamicToolDisplay', () => {
  test('renders tool title and parameter preview in ProcessHeader', () => {
    const tool = {
      type: 'tool-mcp__crunchbase__get_entity',
      toolCallId: 'call-1',
      state: 'output-available',
      input: { entity_id: 'stripe' },
      output: { name: 'Stripe', valuation: '65B' }
    }

    render(
      <DynamicToolDisplay tool={tool} isOpen={false} onOpenChange={() => {}} />
    )

    expect(screen.getByText(/Crunchbase: Get Entity/)).toBeInTheDocument()
    expect(screen.getByText(/stripe/)).toBeInTheDocument()
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  test('renders running state while executing', () => {
    const tool = {
      type: 'dynamic-tool',
      toolCallId: 'call-2',
      toolName: 'mcp__knowledge__research_pack',
      state: 'input-streaming',
      input: { pack_id: 'southeast-asia-ev' }
    }

    render(
      <DynamicToolDisplay
        tool={tool}
        isOpen={true}
        onOpenChange={() => {}}
        status="streaming"
      />
    )

    expect(
      screen.getAllByText(/Knowledge: Research Pack/).length
    ).toBeGreaterThan(0)
    expect(screen.getByText('Executing...')).toBeInTheDocument()
    expect(
      screen.getByText(/Executing Knowledge: Research Pack\.\.\./)
    ).toBeInTheDocument()
  })

  test('renders error state on tool failure', () => {
    const tool = {
      type: 'tool-mcp__crunchbase__query_answer',
      toolCallId: 'call-3',
      state: 'output-error',
      input: { query: 'bad query' },
      errorText: 'Connection timed out'
    }

    render(
      <DynamicToolDisplay tool={tool} isOpen={true} onOpenChange={() => {}} />
    )

    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('Connection timed out')).toBeInTheDocument()
  })

  test('calls onInspect to open drawer when inspect button is clicked', () => {
    const tool = {
      type: 'tool-mcp__crunchbase__get_entity',
      toolCallId: 'call-4',
      state: 'output-available',
      input: { entity_id: 'openai' },
      output: { name: 'OpenAI' }
    }

    render(
      <DynamicToolDisplay tool={tool} isOpen={true} onOpenChange={() => {}} />
    )

    const inspectBtn = screen.getByRole('button', { name: 'Inspect in drawer' })
    fireEvent.click(inspectBtn)
    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'dynamic-tool',
        toolCallId: 'call-4',
        state: 'output-available'
      })
    )
  })
})
