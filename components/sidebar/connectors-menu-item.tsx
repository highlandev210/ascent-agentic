'use client'

import { IconPlug } from '@tabler/icons-react'

import { captureClient } from '@/lib/analytics/posthog-client'

import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'

import { useConnectors } from '@/components/connectors/connectors-context'

export function ConnectorsMenuItem() {
  const { isOpen, toggleConnectors } = useConnectors()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => {
          toggleConnectors()
          captureClient(isOpen ? 'connectors_closed' : 'connectors_opened', {
            source: 'sidebar'
          })
        }}
      >
        <IconPlug className="size-4" />
        <span>Connectors</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
