'use client'

import { useState } from 'react'
import { Lock, Search } from 'lucide-react'
import { type Player, changePct, formatNumber, formatPct } from '@/lib/market-data'
import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'

type MarketBoardProps = {
  players: Player[]
  selectedId: string
  onSelect: (id: string) => void
}

export function MarketBoard({ players, selectedId, onSelect }: MarketBoardProps) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const filtered = normalized
    ? players.filter((p) => p.name.toLowerCase().includes(normalized) || p.fideId.includes(normalized))
    : players

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card" aria-labelledby="market-board-title">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 id="market-board-title" className="font-mono text-xs font-semibold tracking-widest text-foreground">
          GM MARKET BOARD
        </h2>
        <span className="font-mono text-[10px] text-muted-foreground">{filtered.length} LISTED</span>
      </div>

      <div className="border-b border-border p-3">
        <label htmlFor="gm-search" className="sr-only">
          Search grandmasters by name or FIDE ID
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="gm-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or FIDE ID"
            className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border font-mono text-[10px] tracking-wider whitespace-nowrap text-muted-foreground">
              <th scope="col" className="px-3 py-2 font-medium">GRANDMASTER</th>
              <th scope="col" className="px-1.5 py-2 text-right font-medium">PRICE</th>
              <th scope="col" className="px-1.5 py-2 text-right font-medium">MTD</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const pct = changePct(p)
              const selected = p.id === selectedId
              return (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className={cn(
                    'cursor-pointer border-b border-border/60 transition-colors hover:bg-accent/60',
                    selected && 'bg-accent shadow-[inset_2px_0_0_0_var(--gain)]',
                  )}
                >
                  <td className="max-w-0 w-full py-2 pr-1 pl-3">
                    <button
                      type="button"
                      aria-pressed={selected}
                      title={p.name}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(p.id)
                      }}
                      className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      <span className="block truncate text-sm font-medium text-foreground">{p.name}</span>
                      <span className="block font-mono text-[10px] text-muted-foreground">
                        {p.country} · {p.fideId}
                      </span>
                    </button>
                  </td>
                  <td className="px-1.5 py-2 text-right font-mono text-sm whitespace-nowrap text-foreground tabular-nums">
                    {formatNumber(p.price)}
                  </td>
                  <td className={cn('px-1.5 py-2 text-right font-mono text-xs whitespace-nowrap tabular-nums', pct >= 0 ? 'text-gain' : 'text-loss')}>
                    {formatPct(pct)}
                  </td>
                  <td className="py-2 pr-3 pl-1.5 text-right">
                    <StatusBadge status={p.status} compact />
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No grandmasters match &ldquo;{query}&rdquo;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 border-t border-border px-4 py-2 font-mono text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-gain" aria-hidden="true" /> Active
        </span>
        <span className="flex items-center gap-1.5">
          <Lock className="size-3 text-lock" aria-hidden="true" /> Trading Locked (In Match)
        </span>
      </div>
    </section>
  )
}
