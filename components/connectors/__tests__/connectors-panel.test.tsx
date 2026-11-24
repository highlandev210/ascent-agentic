import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ConnectorsPanel } from '../connectors-panel'

const mockConnectorsState = vi.hoisted(() => ({
  isOpen: true,
  closeConnectors: vi.fn(),
  refreshConnectors: vi.fn(),
  isLoading: false,
  connectors: [
    {
      id: 'crunchbase',
      name: 'Crunchbase',
      description: 'Company and startup intelligence',
      connectType: 'oauth' as const,
      configured: true,
      connected: true,
      authUrl: '/api/mcp/crunchbase/auth',
      expiresAt: '2026-12-01T00:00:00.000Z'
    },
    {
      id: 'knowledge',
      name: 'Knowledge Pack MCP',
      description: 'Research evidence',
      connectType: 'token' as const,
      configured: false,
      connected: false
    },
    {
      id: 'tavily',
      name: 'Tavily Search',
      description: 'AI-optimized web search',
      connectType: 'apiKey' as const,
      configured: false,
      connected: false
    }
  ]
}))

vi.mock('../connectors-context', () => ({
  useConnectors: () => mockConnectorsState
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('ConnectorsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConnectorsState.isOpen = true
  })

  test('renders connector list with badges', () => {
    render(<ConnectorsPanel />)

    expect(screen.getByText('Connectors')).toBeDefined()
    expect(screen.getByText('Crunchbase')).toBeDefined()
    expect(screen.getByText('Knowledge Pack MCP')).toBeDefined()
    expect(screen.getByText('Tavily Search')).toBeDefined()

    expect(screen.getByText('Connected')).toBeDefined()
    expect(screen.getAllByText('Not Configured').length).toBe(2)
  })

  test('calls closeConnectors when clicking close button', () => {
    render(<ConnectorsPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }))
    expect(mockConnectorsState.closeConnectors).toHaveBeenCalledOnce()
  })

  test('submits Knowledge token on save', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ success: true }))
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<ConnectorsPanel />)

    const input = screen.getByPlaceholderText('Paste Knowledge token...')
    fireEvent.change(input, { target: { value: 'my-kn-token' } })

    const saveButtons = screen.getAllByRole('button', { name: 'Save' })
    fireEvent.click(saveButtons[0])

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/mcp/knowledge/token',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'my-kn-token' })
        })
      )
    })
  })
})
