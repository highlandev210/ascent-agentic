'use client'

import React, { useState } from 'react'

import { UseChatHelpers } from '@ai-sdk/react'
import {
  IconAlertCircle as AlertCircle,
  IconCheck as Check,
  IconChevronDown as ChevronDown,
  IconCode as Code,
  IconCopy as Copy,
  IconLayoutSidebarRight as SidebarIcon,
  IconPlug as Plug,
  IconSearch as SearchIcon
} from '@tabler/icons-react'
import { Streamdown } from 'streamdown'

import { toPublicErrorPayload } from '@/lib/errors/public-error'
import { useCopyToClipboard } from '@/lib/hooks/use-copy-to-clipboard'
import type { UIDataTypes, UIMessage, UITools } from '@/lib/types/ai'
import type { DynamicToolPart } from '@/lib/types/dynamic-tools'
import { cn } from '@/lib/utils'

import { useArtifact } from './artifact/artifact-context'
import { StatusIndicator } from './ui/status-indicator'
import { CollapsibleMessage } from './collapsible-message'
import ProcessHeader from './process-header'

export interface DynamicToolDisplayProps {
  part?: DynamicToolPart
  tool?: any
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  status?: UseChatHelpers<UIMessage<unknown, UIDataTypes, UITools>>['status']
  borderless?: boolean
  isFirst?: boolean
  isLast?: boolean
}

export function DynamicToolDisplay({
  part,
  tool,
  isOpen = false,
  onOpenChange,
  status,
  borderless = false,
  isFirst = false,
  isLast = false
}: DynamicToolDisplayProps) {
  const item = tool || part
  const { open: openArtifact } = useArtifact()
  const [showRawJson, setShowRawJson] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 1500 })

  if (!item) return null

  // Extract tool name
  let rawName: string = ''
  if (item.type === 'dynamic-tool') {
    rawName = item.toolName || ''
  } else if (typeof item.type === 'string' && item.type.startsWith('tool-')) {
    rawName = item.type.slice(5)
  } else if (item.toolName) {
    rawName = item.toolName
  } else {
    rawName = 'Custom Tool'
  }

  // Parse server and method
  let server = ''
  let method = rawName
  let isMcp = false

  if (rawName.startsWith('mcp__')) {
    isMcp = true
    const segments = rawName.slice(5).split('__')
    if (segments.length >= 2) {
      server = segments[0]
      method = segments.slice(1).join('.')
    } else {
      server = 'mcp'
      method = segments[0]
    }
  } else if (rawName.startsWith('dynamic__')) {
    server = 'dynamic'
    method = rawName.slice(9)
  }

  const formatTitle = (str: string) => {
    return str
      .split(/[._]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  const serverDisplay = server
    ? server.charAt(0).toUpperCase() + server.slice(1)
    : ''
  const methodDisplay = formatTitle(method)
  const displayName = serverDisplay
    ? `${serverDisplay}: ${methodDisplay}`
    : methodDisplay

  const input = item.input
  const output = item.output
  const state:
    | 'input-streaming'
    | 'input-available'
    | 'output-available'
    | 'output-error' = item.state || 'input-available'
  const toolCallId: string = item.toolCallId || ''

  // Primary parameter preview for the header label
  let paramPreview = ''
  if (input && typeof input === 'object') {
    const inp = input as Record<string, any>
    const primaryVal =
      inp.query ||
      inp.entity_id ||
      inp.permalink ||
      inp.pack_id ||
      (Array.isArray(inp.pack_ids) ? inp.pack_ids[0] : undefined) ||
      inp.name ||
      inp.topic ||
      inp.question ||
      inp.series_id ||
      inp.url

    if (typeof primaryVal === 'string' && primaryVal.trim()) {
      paramPreview = primaryVal.trim()
    }
  }

  const isToolLoading =
    state === 'input-streaming' || state === 'input-available'
  const isLoading =
    status === 'submitted' || status === 'streaming' || isToolLoading

  const errorMessage =
    state === 'output-error'
      ? item.errorText ||
        toPublicErrorPayload(item.errorText, {
          fallbackMessage: 'Tool execution failed'
        }).error
      : undefined

  // Extract text content from output if available
  const textContent =
    typeof output === 'string'
      ? output
      : output?.answer && typeof output.answer === 'string'
        ? output.answer
        : Array.isArray(output?.content)
          ? output.content
              .filter(
                (c: any) => c?.type === 'text' && typeof c?.text === 'string'
              )
              .map((c: any) => c.text)
              .join('\n\n')
          : undefined

  // Summary badge for output
  const getSummary = () => {
    if (state === 'output-error') return 'Failed'
    if (Array.isArray(output)) return `${output.length} items`
    if (Array.isArray(output?.results))
      return `${output.results.length} results`
    if (Array.isArray(output?.packs)) return `${output.packs.length} packs`
    if (Array.isArray(output?.evidence))
      return `${output.evidence.length} sources`
    if (output?.answer) return 'Answer ready'
    if (output?.content && Array.isArray(output.content)) return 'Complete'
    return 'Complete'
  }

  const handleInspect = () => {
    openArtifact({
      type: 'dynamic-tool',
      toolCallId,
      toolName: rawName,
      state,
      input,
      output,
      errorText: item.errorText
    } as any)
  }

  const isSearchLike =
    rawName.toLowerCase().includes('search') ||
    rawName.toLowerCase().includes('query')

  const header = (
    <ProcessHeader
      onInspect={handleInspect}
      isLoading={isLoading && isToolLoading}
      ariaExpanded={isOpen}
      label={
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {isSearchLike ? (
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <Plug className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate block min-w-0 max-w-full font-medium">
            {displayName}
            {paramPreview && (
              <span className="font-normal text-muted-foreground ml-1.5">
                · {paramPreview}
              </span>
            )}
          </span>
        </div>
      }
      meta={
        state === 'output-error' ? (
          <StatusIndicator icon={AlertCircle} iconClassName="text-destructive">
            Failed
          </StatusIndicator>
        ) : state === 'output-available' ? (
          <StatusIndicator icon={Check} iconClassName="text-green-500">
            {getSummary()}
          </StatusIndicator>
        ) : isToolLoading ? (
          <span className="animate-pulse text-xs text-muted-foreground">
            Executing...
          </span>
        ) : undefined
      }
    />
  )

  return (
    <div className="relative">
      {/* Rails for header - show based on position */}
      {borderless && (
        <>
          {!isFirst && (
            <div className="absolute left-[19.5px] w-px bg-border h-2 top-0" />
          )}
          {!isLast && (
            <div className="absolute left-[19.5px] w-px bg-border h-2 bottom-0" />
          )}
        </>
      )}
      <CollapsibleMessage
        role="assistant"
        isCollapsible={true}
        header={header}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        showBorder={!borderless}
        showIcon={false}
        variant="default"
        showSeparator={false}
        headerClickBehavior="split"
      >
        <div className="flex">
          {/* Rail space - always reserved when grouped */}
          {borderless && (
            <>
              <div className="w-[16px] shrink-0 flex justify-center">
                <div
                  className={cn(
                    'w-px bg-border/50 transition-opacity duration-200',
                    isOpen ? 'opacity-100' : 'opacity-0'
                  )}
                  style={{
                    marginTop: isFirst ? '0' : '-1rem',
                    marginBottom: isLast ? '0' : '-1rem'
                  }}
                />
              </div>
              <div className="w-2 shrink-0" />
            </>
          )}

          <div className="flex-1 min-w-0 space-y-2.5 pb-2 text-xs">
            {/* Loading state */}
            {isToolLoading && (
              <div className="space-y-2 py-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="inline-block size-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>Executing {displayName}...</span>
                </div>
                {input && Object.keys(input).length > 0 && (
                  <pre className="bg-muted/50 p-2.5 rounded-md overflow-x-auto text-muted-foreground font-mono max-h-32">
                    <code>{JSON.stringify(input, null, 2)}</code>
                  </pre>
                )}
              </div>
            )}

            {/* Error state */}
            {state === 'output-error' && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-destructive">
                {errorMessage || 'Tool execution failed'}
              </div>
            )}

            {/* Completed state */}
            {state === 'output-available' && (
              <>
                {/* Input arguments toggle */}
                {input !== undefined &&
                  input !== null &&
                  Object.keys(input).length > 0 && (
                    <div className="rounded-md border bg-muted/20 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowInput(prev => !prev)}
                        className="flex items-center justify-between w-full px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Code className="size-3" />
                          <span>Input Parameters</span>
                        </span>
                        <ChevronDown
                          className={cn(
                            'size-3.5 transition-transform duration-200',
                            showInput && 'rotate-180'
                          )}
                        />
                      </button>
                      {showInput && (
                        <pre className="p-2.5 border-t bg-muted/40 overflow-x-auto max-h-40 font-mono text-muted-foreground">
                          <code>{JSON.stringify(input, null, 2)}</code>
                        </pre>
                      )}
                    </div>
                  )}

                {/* Formatted Text Content (if available) */}
                {textContent && !showRawJson ? (
                  <div className="rounded-md border bg-card p-3 space-y-2">
                    <div className="prose-sm dark:prose-invert max-w-none line-clamp-[12]">
                      <Streamdown>{textContent}</Streamdown>
                    </div>
                  </div>
                ) : null}

                {/* Structured JSON Output */}
                {(!textContent || showRawJson) && output !== undefined && (
                  <div className="rounded-md border bg-muted/30 overflow-hidden">
                    <pre className="p-2.5 overflow-x-auto max-h-60 font-mono text-foreground">
                      <code>{JSON.stringify(output, null, 2)}</code>
                    </pre>
                  </div>
                )}

                {/* Action bar */}
                <div className="flex items-center justify-between pt-0.5 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {textContent && (
                      <button
                        type="button"
                        onClick={() => setShowRawJson(prev => !prev)}
                        className="text-[11px] hover:text-foreground transition-colors cursor-pointer"
                      >
                        {showRawJson ? 'Show formatted' : 'View raw JSON'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(JSON.stringify(output, null, 2))
                      }
                      className="flex items-center gap-1 text-[11px] hover:text-foreground transition-colors cursor-pointer"
                      aria-label="Copy tool result"
                    >
                      {isCopied ? (
                        <Check className="size-3 text-green-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleInspect}
                      className="flex items-center gap-1 text-[11px] hover:text-foreground transition-colors cursor-pointer"
                      aria-label="Inspect in drawer"
                    >
                      <SidebarIcon className="size-3" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CollapsibleMessage>
    </div>
  )
}
