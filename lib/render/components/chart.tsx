'use client'

import React, { useState } from 'react'

import type { ComponentFn } from '@json-render/react'

import type { CatalogType } from './shared'

export const Chart: ComponentFn<CatalogType, 'Chart'> = ({ props }) => {
  const {
    title,
    type = 'bar',
    data = [],
    valuePrefix = '',
    valueSuffix = ''
  } = props

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return null
  }

  const maxValue = Math.max(...data.map(d => d.value), 1)

  const formatValue = (val: number) => {
    return `${valuePrefix}${val.toLocaleString()}${valueSuffix}`
  }

  return (
    <div className="my-3 w-full rounded-xl border border-border bg-card p-4 shadow-sm text-card-foreground">
      {title && (
        <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2">
          <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
            {type} chart
          </span>
        </div>
      )}

      {/* Bar Chart */}
      {type === 'bar' && (
        <div className="flex flex-col gap-2.5 pt-1">
          {data.map((item, idx) => {
            const pct = Math.max((item.value / maxValue) * 100, 3)
            const isHovered = hoveredIdx === idx

            return (
              <div
                key={idx}
                className="group flex flex-col gap-1 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground truncate max-w-[65%]">
                    {item.label}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono font-medium">
                    <span className="text-foreground">
                      {formatValue(item.value)}
                    </span>
                    {item.annotation && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {item.annotation}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-5 w-full rounded-md bg-muted/60 overflow-hidden flex items-center p-0.5">
                  <div
                    className={`h-full rounded-sm transition-all duration-500 ease-out flex items-center justify-end pr-1.5 text-[10px] font-mono text-white ${
                      isHovered
                        ? 'bg-blue-600 dark:bg-blue-500'
                        : 'bg-primary/85 dark:bg-primary/90'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Donut Chart */}
      {type === 'donut' && (
        <div className="flex flex-col sm:flex-row items-center justify-around gap-4 pt-2">
          <div className="relative size-32 shrink-0">
            <svg viewBox="0 0 36 36" className="size-full -rotate-90">
              {
                data.reduce(
                  (acc, item, idx) => {
                    const total = data.reduce((sum, d) => sum + d.value, 0)
                    const pct = (item.value / (total || 1)) * 100
                    const colors = [
                      '#3b82f6',
                      '#10b981',
                      '#8b5cf6',
                      '#f59e0b',
                      '#ec4899',
                      '#06b6d4'
                    ]
                    const color = colors[idx % colors.length]

                    acc.elements.push(
                      <circle
                        key={idx}
                        cx="18"
                        cy="18"
                        r="14"
                        fill="transparent"
                        stroke={color}
                        strokeWidth="5"
                        strokeDasharray={`${pct} ${100 - pct}`}
                        strokeDashoffset={-acc.offset}
                        className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                    )
                    acc.offset += pct
                    return acc
                  },
                  { elements: [] as React.ReactNode[], offset: 0 }
                ).elements
              }
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[10px] text-muted-foreground uppercase font-mono">
                {hoveredIdx !== null ? data[hoveredIdx].label : 'Total'}
              </span>
              <span className="text-xs font-semibold font-mono">
                {hoveredIdx !== null
                  ? formatValue(data[hoveredIdx].value)
                  : formatValue(data.reduce((sum, d) => sum + d.value, 0))}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-xs w-full max-w-xs">
            {data.map((item, idx) => {
              const colors = [
                'bg-blue-500',
                'bg-emerald-500',
                'bg-purple-500',
                'bg-amber-500',
                'bg-pink-500',
                'bg-cyan-500'
              ]
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-1 rounded transition-colors ${
                    hoveredIdx === idx ? 'bg-muted' : ''
                  }`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`size-2.5 rounded-full ${colors[idx % colors.length]}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <span className="font-mono text-muted-foreground ml-2">
                    {formatValue(item.value)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Line Chart */}
      {type === 'line' && (
        <div className="pt-2">
          <div className="relative h-36 w-full">
            <svg
              viewBox="0 0 100 50"
              preserveAspectRatio="none"
              className="size-full overflow-visible"
            >
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity="0.35"
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity="0.0"
                  />
                </linearGradient>
              </defs>
              {/* Area */}
              <polygon
                points={`0,50 ${data
                  .map((d, i) => {
                    const x = (i / Math.max(data.length - 1, 1)) * 100
                    const y = 45 - (d.value / maxValue) * 40
                    return `${x},${y}`
                  })
                  .join(' ')} 100,50`}
                fill="url(#lineGrad)"
              />
              {/* Line */}
              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={data
                  .map((d, i) => {
                    const x = (i / Math.max(data.length - 1, 1)) * 100
                    const y = 45 - (d.value / maxValue) * 40
                    return `${x},${y}`
                  })
                  .join(' ')}
              />
              {/* Dots */}
              {data.map((d, i) => {
                const x = (i / Math.max(data.length - 1, 1)) * 100
                const y = 45 - (d.value / maxValue) * 40
                const isHovered = hoveredIdx === i
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={isHovered ? 4 : 2.5}
                    className="fill-background stroke-primary stroke-2 transition-all cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                )
              })}
            </svg>
          </div>
          {/* X Axis Labels */}
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground font-mono">
            {data.map((d, i) => (
              <span
                key={i}
                className={`truncate max-w-[20%] text-center ${
                  hoveredIdx === i ? 'text-foreground font-semibold' : ''
                }`}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
