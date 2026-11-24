'use client'

import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

import { useMediaQuery } from '@/lib/hooks/use-media-query'

import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'

import { useArtifact } from '@/components/artifact/artifact-context'
import { useConnectors } from '@/components/connectors/connectors-context'
import { ConnectorsPanel } from '@/components/connectors/connectors-panel'
import { useLibrary } from '@/components/library/library-context'
import { LibraryPanel } from '@/components/library/library-panel'

import { InspectorPanel } from './inspector-panel'

export function InspectorDrawer() {
  const { state, close } = useArtifact()
  const { isOpen: libraryOpen, closeLibrary } = useLibrary()
  const { isOpen: connectorsOpen, closeConnectors } = useConnectors()
  const part = state.part
  const isMobile = useMediaQuery('(max-width: 767px)')
  const open = state.isOpen || libraryOpen || connectorsOpen

  // Function to get the title based on part type (mirrors ArtifactPanel logic)
  const getTitle = () => {
    if (connectorsOpen) return 'Connectors'
    if (libraryOpen) return 'Library'
    if (!part) return 'Artifact' // Default title
    switch (part.type) {
      case 'tool-search':
        return 'search'
      case 'tool-fetch':
        return 'fetch'
      case 'tool-askQuestion':
        return 'askQuestion'
      case 'reasoning':
        return 'Thoughts'
      case 'text':
        return 'Text'
      case 'draft':
        return 'Draft'
      default:
        return 'Content'
    }
  }

  if (!isMobile) return null

  return (
    <Drawer
      open={open}
      onOpenChange={open => {
        if (!open) {
          if (connectorsOpen) {
            closeConnectors()
          } else if (libraryOpen) {
            closeLibrary()
          } else {
            close()
          }
        }
      }}
      modal={true}
    >
      <DrawerContent className="h-[90svh] max-h-[90svh] p-0 md:hidden">
        <DrawerTitle asChild>
          <VisuallyHidden>{getTitle()}</VisuallyHidden>
        </DrawerTitle>
        <div className="min-h-0 flex-1 overflow-hidden">
          {connectorsOpen ? (
            <ConnectorsPanel />
          ) : libraryOpen ? (
            <LibraryPanel />
          ) : (
            <InspectorPanel />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
