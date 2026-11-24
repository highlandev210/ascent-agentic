'use client'

import { useMemo } from 'react'

import { getTips, shuffle } from '@/lib/footer-tips'

import { useTypewriterCycle } from '@/hooks/use-typewriter-cycle'

function FooterContent() {
  const shuffledTips = useMemo(() => shuffle(getTips()), [])

  const items = useMemo(
    () => shuffledTips.map(t => t.description),
    [shuffledTips]
  )

  const { currentIndex, charCount, displayText, isIdle } =
    useTypewriterCycle(items)

  if (isIdle && charCount === 0) return null

  const isTip = charCount > 0
  const tip = isTip ? shuffledTips[currentIndex] : null

  return (
    <div className="flex items-center gap-2 select-none">
      {tip ? (
        <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground/60">
          <span>Tips:</span>
          <span className="inline-flex items-center gap-0.5">
            {tip.keys.map((key, i) => (
              <kbd
                key={i}
                className="inline-flex items-center justify-center rounded border border-border/50 bg-muted/50 px-1 py-0.5 text-[10px] leading-none text-muted-foreground/70"
              >
                {key}
              </kbd>
            ))}
          </span>
          <span>{displayText}</span>
        </span>
      ) : (
        <span className="font-mono text-xs text-muted-foreground/60">
          {displayText}
        </span>
      )}
    </div>
  )
}

export function ChatFooterMessage({ isLoading }: { isLoading: boolean }) {
  if (isLoading) return null

  return <FooterContent />
}
