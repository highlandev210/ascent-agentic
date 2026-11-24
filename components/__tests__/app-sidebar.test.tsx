import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { SidebarProvider } from '@/components/ui/sidebar'

import AppSidebar from '../app-sidebar'

vi.mock('../sidebar/chat-history-section', () => ({
  ChatHistorySection: () => <div />
}))

vi.mock('../sidebar/chat-history-skeleton', () => ({
  ChatHistorySkeleton: () => <div />
}))

vi.mock('../sidebar/new-chat-menu-item', () => ({
  NewChatMenuItem: () => <div>New</div>
}))

vi.mock('../sidebar/library-menu-item', () => ({
  LibraryMenuItem: () => <div>Library</div>
}))

vi.mock('../sidebar/connectors-menu-item', () => ({
  ConnectorsMenuItem: () => <div>Connectors</div>
}))

vi.mock('../sidebar/version-footer', () => ({
  VersionFooter: () => <div>Version footer</div>
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false
}))

function renderSidebar() {
  render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>
  )
}

describe('AppSidebar library entry', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('shows the Library entry when authentication is enabled', () => {
    vi.stubEnv('ENABLE_AUTH', 'true')
    renderSidebar()

    expect(screen.getByText('Library')).toBeInTheDocument()
    expect(screen.getByText('Connectors')).toBeInTheDocument()
  })

  test('shows the Library entry in anonymous mode (shared user)', () => {
    vi.stubEnv('ENABLE_AUTH', 'false')
    renderSidebar()

    expect(screen.getByText('Library')).toBeInTheDocument()
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  test('shows the Library entry when AUTH_PROVIDER=none with ENABLE_AUTH unset', () => {
    vi.stubEnv('AUTH_PROVIDER', 'none')
    renderSidebar()

    expect(screen.getByText('Library')).toBeInTheDocument()
  })
})

describe('AppSidebar version footer', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('shows the version footer by default', () => {
    renderSidebar()

    expect(screen.getByText('Version footer')).toBeInTheDocument()
  })

  test('hides the version footer on the cloud deployment', () => {
    vi.stubEnv('MORPHIC_CLOUD_DEPLOYMENT', 'true')
    renderSidebar()

    expect(screen.queryByText('Version footer')).not.toBeInTheDocument()
  })
})
