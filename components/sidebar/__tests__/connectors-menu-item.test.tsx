import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { captureClient } from '@/lib/analytics/posthog-client'

import { SidebarMenu, SidebarProvider } from '@/components/ui/sidebar'

import { ConnectorsMenuItem } from '../connectors-menu-item'

const connectorsState = vi.hoisted(() => ({
  isOpen: false,
  toggleConnectors: vi.fn()
}))

vi.mock('@/lib/analytics/posthog-client', () => ({
  captureClient: vi.fn()
}))

vi.mock('@/components/connectors/connectors-context', () => ({
  useConnectors: () => connectorsState
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false
}))

describe('ConnectorsMenuItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connectorsState.isOpen = false
  })

  function renderItem() {
    render(
      <SidebarProvider>
        <SidebarMenu>
          <ConnectorsMenuItem />
        </SidebarMenu>
      </SidebarProvider>
    )
  }

  test('opens the connectors panel and captures client event', () => {
    renderItem()

    fireEvent.click(screen.getByRole('button', { name: 'Connectors' }))

    expect(connectorsState.toggleConnectors).toHaveBeenCalledOnce()
    expect(captureClient).toHaveBeenCalledWith('connectors_opened', {
      source: 'sidebar'
    })
  })

  test('closes the connectors panel when already open', () => {
    connectorsState.isOpen = true
    renderItem()

    fireEvent.click(screen.getByRole('button', { name: 'Connectors' }))

    expect(connectorsState.toggleConnectors).toHaveBeenCalledOnce()
    expect(captureClient).toHaveBeenCalledWith('connectors_closed', {
      source: 'sidebar'
    })
  })
})
