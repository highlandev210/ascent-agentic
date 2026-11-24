'use client'

import React, { useState } from 'react'

import {
  IconPlug as PlugIcon,
  IconRefresh as RefreshIcon,
  IconX as X
} from '@tabler/icons-react'
import { toast } from 'sonner'

import type { ConnectorStatus } from '@/lib/connectors/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TooltipButton } from '@/components/ui/tooltip-button'

import { useConnectors } from './connectors-context'

export function ConnectorsPanel() {
  const { isOpen, closeConnectors, connectors, isLoading, refreshConnectors } =
    useConnectors()

  const [knowledgeToken, setKnowledgeToken] = useState('')
  const [tavilyKey, setTavilyKey] = useState('')
  const [savingKnowledge, setSavingKnowledge] = useState(false)
  const [savingTavily, setSavingTavily] = useState(false)

  if (!isOpen) return null

  const handleSaveKnowledge = async () => {
    if (!knowledgeToken.trim()) return
    try {
      setSavingKnowledge(true)
      const res = await fetch('/api/mcp/knowledge/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: knowledgeToken.trim() })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save Knowledge MCP token')
      }
      toast.success('Knowledge MCP token saved')
      setKnowledgeToken('')
      await refreshConnectors()
    } catch (err: any) {
      toast.error(err.message || 'Error saving Knowledge MCP token')
    } finally {
      setSavingKnowledge(false)
    }
  }

  const handleDeleteKnowledge = async () => {
    try {
      setSavingKnowledge(true)
      const res = await fetch('/api/mcp/knowledge/token', {
        method: 'DELETE'
      })
      if (!res.ok) {
        throw new Error('Failed to remove Knowledge MCP token')
      }
      toast.success('Knowledge MCP token removed')
      await refreshConnectors()
    } catch (err: any) {
      toast.error(err.message || 'Error removing Knowledge MCP token')
    } finally {
      setSavingKnowledge(false)
    }
  }

  const handleSaveTavily = async () => {
    if (!tavilyKey.trim()) return
    try {
      setSavingTavily(true)
      const res = await fetch('/api/mcp/tavily/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: tavilyKey.trim() })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save Tavily API key')
      }
      toast.success('Tavily API key saved')
      setTavilyKey('')
      await refreshConnectors()
    } catch (err: any) {
      toast.error(err.message || 'Error saving Tavily API key')
    } finally {
      setSavingTavily(false)
    }
  }

  const handleDeleteTavily = async () => {
    try {
      setSavingTavily(true)
      const res = await fetch('/api/mcp/tavily/key', {
        method: 'DELETE'
      })
      if (!res.ok) {
        throw new Error('Failed to remove Tavily API key')
      }
      toast.success('Tavily API key removed')
      await refreshConnectors()
    } catch (err: any) {
      toast.error(err.message || 'Error removing Tavily API key')
    } finally {
      setSavingTavily(false)
    }
  }

  const handleDisconnectCrunchbase = async () => {
    try {
      const res = await fetch('/api/mcp/crunchbase/status', {
        method: 'DELETE'
      })
      if (!res.ok) {
        throw new Error('Failed to disconnect Crunchbase')
      }
      toast.success('Crunchbase disconnected')
      await refreshConnectors()
    } catch (err: any) {
      toast.error(err.message || 'Error disconnecting Crunchbase')
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted md:px-4 md:pt-14 md:pb-4">
        <div className="flex h-full flex-col overflow-hidden bg-background md:rounded-xl md:border">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2">
            <h3 className="flex min-w-0 items-center gap-2">
              <div className="flex items-center gap-2 rounded-md p-2">
                <PlugIcon size={18} />
              </div>
              <span className="truncate text-sm font-medium">Connectors</span>
            </h3>
            <div className="flex items-center gap-1">
              <TooltipButton
                variant="ghost"
                size="icon"
                onClick={() => refreshConnectors()}
                aria-label="Refresh status"
                tooltipContent="Refresh"
                disabled={isLoading}
              >
                <RefreshIcon
                  className={`size-4 ${isLoading ? 'animate-spin' : ''}`}
                />
              </TooltipButton>
              <TooltipButton
                variant="ghost"
                size="icon"
                onClick={closeConnectors}
                aria-label="Close panel"
                tooltipContent="Close"
              >
                <X className="size-4" />
              </TooltipButton>
            </div>
          </div>
          <Separator className="my-1 bg-border/50" />

          {/* List content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading && !connectors ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-lg border p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              connectors?.map(connector => (
                <div
                  key={connector.id}
                  className="rounded-lg border bg-card p-4 text-card-foreground shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold">
                        {connector.name}
                      </h4>
                      {connector.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {connector.description}
                        </p>
                      )}
                    </div>
                    <StatusBadge connector={connector} />
                  </div>

                  {/* Actions / Inputs */}
                  {connector.connectType === 'oauth' && (
                    <div className="pt-1 space-y-2">
                      {connector.connected && connector.expiresAt && (
                        <p className="text-xs text-muted-foreground">
                          Token expires:{' '}
                          {new Date(connector.expiresAt).toLocaleString()}
                        </p>
                      )}
                      {connector.configured ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            asChild
                            variant={
                              connector.connected ? 'outline' : 'default'
                            }
                          >
                            <a
                              href={
                                connector.authUrl || '/api/mcp/crunchbase/auth'
                              }
                            >
                              {connector.connected ? 'Reconnect' : 'Connect'}
                            </a>
                          </Button>
                          {connector.connected && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-muted-foreground hover:text-destructive"
                              onClick={handleDisconnectCrunchbase}
                            >
                              Disconnect
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Requires CRUNCHBASE_CLIENT_ID and
                          CRUNCHBASE_CLIENT_SECRET in environment.
                        </p>
                      )}
                    </div>
                  )}

                  {connector.connectType === 'token' && (
                    <div className="pt-1 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder="Paste Knowledge token..."
                          value={knowledgeToken}
                          onChange={e => setKnowledgeToken(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={handleSaveKnowledge}
                          disabled={savingKnowledge || !knowledgeToken.trim()}
                        >
                          Save
                        </Button>
                      </div>
                      {connector.connected && (
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>Token configured</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={handleDeleteKnowledge}
                            disabled={savingKnowledge}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {connector.connectType === 'apiKey' && (
                    <div className="pt-1 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder="Paste Tavily API key (tvly-...)..."
                          value={tavilyKey}
                          onChange={e => setTavilyKey(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={handleSaveTavily}
                          disabled={savingTavily || !tavilyKey.trim()}
                        >
                          Save
                        </Button>
                      </div>
                      {connector.connected && (
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>API key configured</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={handleDeleteTavily}
                            disabled={savingTavily}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {connector.connectType === 'none' && (
                    <div className="pt-1">
                      <p className="text-xs text-muted-foreground">
                        Configured via environment variable.
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

function StatusBadge({ connector }: { connector: ConnectorStatus }) {
  if (connector.connected) {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium">
        Connected
      </Badge>
    )
  }

  if (connector.configured) {
    return <Badge variant="secondary">Configured</Badge>
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      Not Configured
    </Badge>
  )
}
