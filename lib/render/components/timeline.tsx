'use client'

import React from 'react'

import type { ComponentFn } from '@json-render/react'

import type { CatalogType } from './shared'

export const Timeline: ComponentFn<CatalogType, 'Timeline'> = ({ props }) => {
  const { title, items = [] } = props

  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className="my-3 w-full rounded-xl border border-border bg-card p-4 shadow-sm text-card-foreground">
      {title && (
        <div className="mb-4 flex items-center justify-between border-b border-border/50 pb-2">
          <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
            Timeline
          </span>
        </div>
      )}

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
        {items.map((item, idx) => (
          <div key={idx} className="relative group">
            {/* Step Node Dot */}
            <div className="absolute -left-6 top-1 size-3.5 rounded-full border-2 border-primary bg-background ring-4 ring-card transition-transform group-hover:scale-125" />

            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="font-semibold text-sm text-foreground">
                  {item.title}
                </span>
                {item.date && (
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {item.date}
                  </span>
                )}
              </div>

              {item.value && (
                <div className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {item.value}
                </div>
              )}

              {item.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              )}

              {item.badges && item.badges.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.badges.map((badge, bIdx) => (
                    <span
                      key={bIdx}
                      className="text-[10px] font-medium bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded border border-border/40"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
