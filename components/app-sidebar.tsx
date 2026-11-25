import { Suspense } from 'react'

import type { AppUser } from '@/lib/auth/types'
import { cn } from '@/lib/utils'

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
  SidebarTrigger
} from '@/components/ui/sidebar'

import { ChatHistorySection } from './sidebar/chat-history-section'
import { ChatHistorySkeleton } from './sidebar/chat-history-skeleton'
import { ConnectorsMenuItem } from './sidebar/connectors-menu-item'
import { HomeLink } from './sidebar/home-link'
import { LibraryMenuItem } from './sidebar/library-menu-item'
import { NewChatMenuItem } from './sidebar/new-chat-menu-item'
import { IconLogo } from './ui/icons'

export default function AppSidebar({ user }: { user?: AppUser | null }) {
  // Anonymous mode has no per-user library, and the server actions reject it,
  // so the entry point follows the same switch the pages use.
  // The sidebar only renders when a user id exists (including the shared
  // anonymous user), so the library is always available here.
  const libraryAvailable = true

  return (
    <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className="flex flex-row justify-between items-center">
        <HomeLink className="flex items-center gap-2 px-2 py-3">
          <IconLogo className={cn('size-5')} />
          <span className="font-semibold text-sm">Ascent</span>
        </HomeLink>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent className="flex flex-col px-2 py-4 h-full">
        <SidebarMenu>
          <NewChatMenuItem />
          {libraryAvailable && <LibraryMenuItem />}
          <ConnectorsMenuItem />
        </SidebarMenu>
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={<ChatHistorySkeleton />}>
            <ChatHistorySection />
          </Suspense>
        </div>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
