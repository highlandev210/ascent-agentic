'use client'

import {
  IconAlertCircle as AlertCircle,
  IconCheck as Check,
  IconCopy as Copy,
  IconPlug as Plug
} from '@tabler/icons-react'
import { Streamdown } from 'streamdown'

import { toPublicErrorPayload } from '@/lib/errors/public-error'
import { useCopyToClipboard } from '@/lib/hooks/use-copy-to-clipboard'
import type { Part } from '@/lib/types/ai'
import { cn } from '@/lib/utils'

import { Section } from '@/components/section'

interface McpArtifactContentProps {
  tool: Part
}

export function McpArtifactContent({ tool }: McpArtifactContentProps) {
  const item = tool as any
  const rawName: string =
    item.toolName ||
    (typeof item.type === 'string' && item.type.startsWith('tool-')
      ? item.type.slice(5)
      : item.type) ||
    'MCP Tool'

  const formatTitle = (str: string) => {
    return str
      .split(/[._]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  let server = ''
  let method = rawName
  if (rawName.startsWith('mcp__')) {
    const parts = rawName.slice(5).split('__')
    if (parts.length >= 2) {
      server = parts[0]
      method = parts.slice(1).join('.')
    } else {
      server = 'mcp'
      method = parts[0]
    }
  } else if (rawName.startsWith('dynamic__')) {
    server = 'dynamic'
    method = rawName.slice(9)
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
  const state = item.state
  const errorText = item.errorText
  const errorMessage =
    state === 'output-error'
      ? toPublicErrorPayload(errorText, {
          fallbackMessage: 'Tool execution failed'
        }).error
      : undefined

  const { isCopied: isInputCopied, copyToClipboard: copyInput } =
    useCopyToClipboard({ timeout: 1500 })
  const { isCopied: isOutputCopied, copyToClipboard: copyOutput } =
    useCopyToClipboard({ timeout: 1500 })

  // Extract text content if present (common MCP format or answer field)
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

  return (
    <div className="space-y-4 p-4">
      {/* Tool Header */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2">
          <Plug className="size-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{displayName}</h2>
        </div>
        <div>
          {state === 'output-error' ? (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="size-4" />
              Failed
            </span>
          ) : state === 'output-available' ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="size-4" />
              Complete
            </span>
          ) : (
            <span className="animate-pulse text-xs text-muted-foreground">
              Executing...
            </span>
          )}
        </div>
      </div>

      {/* Input arguments */}
      {input !== undefined && input !== null && (
        <Section title="Parameters">
          <div className="rounded-lg border bg-muted/40 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 text-[11px] font-medium text-muted-foreground border-b">
              <span>Input</span>
              <button
                type="button"
                onClick={() => copyInput(JSON.stringify(input, null, 2))}
                className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                aria-label="Copy input"
              >
                {isInputCopied ? (
                  <Check className="size-3 text-green-500" />
                ) : (
                  <Copy className="size-3" />
                )}
                <span>{isInputCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3 text-xs overflow-x-auto max-h-56 text-foreground font-mono">
              <code>{JSON.stringify(input, null, 2)}</code>
            </pre>
          </div>
        </Section>
      )}

      {/* Error message */}
      {state === 'output-error' && errorMessage && (
        <Section title="Error">
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            {errorMessage}
          </div>
        </Section>
      )}

      {/* Formatted Output */}
      {state === 'output-available' && (
        <Section title="Results">
          {textContent ? (
            <div className="space-y-3">
              <div className="prose-sm dark:prose-invert max-w-none rounded-lg border bg-card p-4">
                <Streamdown>{textContent}</Streamdown>
              </div>
              <div className="rounded-lg border bg-muted/40 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 text-[11px] font-medium text-muted-foreground border-b">
                  <span>Raw Output</span>
                  <button
                    type="button"
                    onClick={() => copyOutput(JSON.stringify(output, null, 2))}
                    className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                    aria-label="Copy raw output"
                  >
                    {isOutputCopied ? (
                      <Check className="size-3 text-green-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    <span>{isOutputCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 text-xs overflow-x-auto max-h-64 text-foreground font-mono">
                  <code>{JSON.stringify(output, null, 2)}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/40 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 text-[11px] font-medium text-muted-foreground border-b">
                <span>Output Data</span>
                <button
                  type="button"
                  onClick={() => copyOutput(JSON.stringify(output, null, 2))}
                  className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Copy output data"
                >
                  {isOutputCopied ? (
                    <Check className="size-3 text-green-500" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                  <span>{isOutputCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 text-xs overflow-x-auto max-h-96 text-foreground font-mono">
                <code>{JSON.stringify(output, null, 2)}</code>
              </pre>
            </div>
          )}
        </Section>
      )}
    </div>
  )
}
