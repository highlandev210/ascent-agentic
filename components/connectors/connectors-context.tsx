'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'

import type { ConnectorStatus } from '@/lib/connectors/types'

import { useSidebar } from '@/components/ui/sidebar'

import { useLibrary } from '@/components/library/library-context'

type ConnectorsContextValue = {
  isOpen: boolean
  connectors: ConnectorStatus[] | null
  isLoading: boolean
  openConnectors: () => void
  closeConnectors: () => void
  toggleConnectors: () => void
  refreshConnectors: () => Promise<void>
}

const ConnectorsContext = createContext<ConnectorsContextValue | null>(null)

export function ConnectorsProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [connectors, setConnectors] = useState<ConnectorStatus[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { setOpen: setSidebarOpen, setOpenMobile: setSidebarOpenMobile } =
    useSidebar()

  // Gracefully read library context if mounted inside LibraryProvider
  let library: ReturnType<typeof useLibrary> | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    library = useLibrary()
  } catch {
    library = null
  }

  const closeSidebarSurfaces = useCallback(() => {
    setSidebarOpen(false)
    setSidebarOpenMobile(false)
  }, [setSidebarOpen, setSidebarOpenMobile])

  const refreshConnectors = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/mcp/connectors/status')
      if (res.ok) {
        const data = await res.json()
        setConnectors(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('[Connectors] Failed to fetch connectors status:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const openConnectors = useCallback(() => {
    closeSidebarSurfaces()
    library?.closeLibrary()
    setIsOpen(true)
  }, [closeSidebarSurfaces, library])

  const closeConnectors = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleConnectors = useCallback(() => {
    if (!isOpen) {
      closeSidebarSurfaces()
      library?.closeLibrary()
    }
    setIsOpen(prev => !prev)
  }, [closeSidebarSurfaces, isOpen, library])

  // Automatically close Connectors if Library opens
  useEffect(() => {
    if (library?.isOpen && isOpen) {
      setIsOpen(false)
    }
  }, [library?.isOpen, isOpen])

  useEffect(() => {
    if (isOpen) {
      refreshConnectors()
    }
  }, [isOpen, refreshConnectors])

  return (
    <ConnectorsContext.Provider
      value={{
        isOpen,
        connectors,
        isLoading,
        openConnectors,
        closeConnectors,
        toggleConnectors,
        refreshConnectors
      }}
    >
      {children}
    </ConnectorsContext.Provider>
  )
}

export function useConnectors() {
  const context = useContext(ConnectorsContext)
  if (!context) {
    throw new Error('useConnectors must be used within a ConnectorsProvider')
  }
  return context
}
