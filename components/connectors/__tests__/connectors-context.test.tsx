import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { SidebarProvider } from '@/components/ui/sidebar'

import { ConnectorsProvider, useConnectors } from '../connectors-context'

const sidebarState = vi.hoisted(() => ({
  isMobile: false,
  setOpen: vi.fn(),
  setOpenMobile: vi.fn()
}))

vi.mock('@/components/ui/sidebar', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/components/ui/sidebar')>()

  return {
    ...actual,
    useSidebar: () => sidebarState
  }
})

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false
}))

function ConnectorsHarness() {
  const {
    isOpen,
    openConnectors,
    closeConnectors,
    toggleConnectors,
    connectors,
    isLoading
  } = useConnectors()

  return (
    <>
      <button onClick={openConnectors}>Open</button>
      <button onClick={closeConnectors}>Close</button>
      <button onClick={toggleConnectors}>Toggle</button>
      <output data-testid="status">{isOpen ? 'open' : 'closed'}</output>
      <output data-testid="loading">{isLoading ? 'loading' : 'idle'}</output>
      <output data-testid="count">
        {connectors ? connectors.length : 'none'}
      </output>
    </>
  )
}

describe('ConnectorsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify([
              {
                id: 'crunchbase',
                name: 'Crunchbase',
                connectType: 'oauth',
                configured: true,
                connected: false
              }
            ])
          )
      )
    )
  })

  function renderConnectors() {
    render(
      <SidebarProvider>
        <ConnectorsProvider>
          <ConnectorsHarness />
        </ConnectorsProvider>
      </SidebarProvider>
    )
  }

  test('toggles open state and closes sidebar', async () => {
    renderConnectors()

    expect(screen.getByTestId('status').textContent).toBe('closed')

    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByTestId('status').textContent).toBe('open')
    expect(sidebarState.setOpen).toHaveBeenCalledWith(false)

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1')
    })

    fireEvent.click(screen.getByText('Close'))
    expect(screen.getByTestId('status').textContent).toBe('closed')
  })
})
