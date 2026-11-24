'use client'

import React from 'react'
import type { ComponentFn } from '@json-render/react'
import {
  IconArrowUpRight as ArrowUpRight,
  IconArrowDownRight as ArrowDownRight,
  IconMinus as Minus
} from '@tabler/icons-react'
import type { CatalogType } from './shared'

export const StatGrid: ComponentFn<CatalogType, 'StatGrid'> = ({ props }) => {
  const { stats = [] } = props

  if (!stats || stats.length === 0) {
    return null
  }

  return (
    <div className="my-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 w-full">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="flex flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-sm hover:border-border/80 transition-all"
        >
          <span className="text-xs text-muted-foreground font-medium truncate">
            {stat.label}
          </span>
          <div className="my-1 flex items-baseline justify-between gap-1">
            <span className="text-lg sm:text-xl font-bold tracking-tight font-mono text-foreground">
              {stat.value}
            </span>
            {stat.trend && (
              <span
                className={`flex items-center text-xs font-semibold ${
                  stat.trend === 'up'
                    ? 'text-emerald-500'
                    : stat.trend === 'down'
                    ? 'text-rose-500'
                    : 'text-muted-foreground'
                }`}
              >
                {stat.trend === 'up' && <ArrowUpRight className="size-3.5" />}
                {stat.trend === 'down' && <ArrowDownRight className="size-3.5" />}
                {stat.trend === 'neutral' && <Minus className="size-3.5" />}
              </span>
            )}
          </div>
          {stat.subtext && (
            <span className="text-[11px] text-muted-foreground/80 truncate">
              {stat.subtext}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
