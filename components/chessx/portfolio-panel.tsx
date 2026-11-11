'use client'

import { useState } from 'react'
import { Briefcase, History, TrendingDown } from 'lucide-react'
import { type Holding, type Player, type ShortPosition, type Trade, formatNumber, formatPct, formatUSD } from '@/lib/market-data'
import { cn } from '@/lib/utils'

type PortfolioPanelProps = {
  players: Player[]
  holdings: Holding[]
  trades: Trade[]
  shorts: ShortPosition[]
  onQuickSell: (playerId: string) => void
  onQuickCover: (shortId: string) => void
  title?: string
}

const th = 'px-4 py-2 font-medium whitespace-nowrap'
const td = 'px-4 py-2 whitespace-nowrap'

export function PortfolioPanel({ players, holdings, trades, shorts, onQuickSell, onQuickCover, title }: PortfolioPanelProps) {
  const [tab, setTab] = useState<'holdings' | 'shorts' | 'audit'>('holdings')
  const byId = new Map(players.map((p) => [p.id, p]))

  const tabs = [
    { id: 'holdings' as const, label: 'Holdings', icon: Briefcase, count: holdings.length },
    { id: 'shorts' as const, label: 'Short Positions', icon: TrendingDown, count: shorts.length },
    { id: 'audit' as const, label: 'Recent Trades Audit Log', icon: History, count: trades.length },
  ]

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card" aria-label={title ?? 'Portfolio and audit trail'}>
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2" role="tablist">
        {title && (
          <h2 className="mr-3 ml-2 font-mono text-xs font-semibold tracking-widest text-foreground">{title}</h2>
        )}
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === id ? 'border-gain text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
            <span className="rounded-sm bg-secondary px-1.5 font-mono text-[10px] text-muted-foreground">{count}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:bg-card">
        {tab === 'holdings' ? (
          <table id="panel-holdings" role="tabpanel" aria-labelledby="tab-holdings" className="w-full text-left">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground">
                <th scope="col" className={th}>GRANDMASTER</th>
                <th scope="col" className={cn(th, 'text-right')}>SHARES</th>
                <th scope="col" className={cn(th, 'text-right')}>AVG COST</th>
                <th scope="col" className={cn(th, 'text-right')}>CURRENT</th>
                <th scope="col" className={cn(th, 'text-right')}>VALUE</th>
                <th scope="col" className={cn(th, 'text-right')}>UNREALIZED P&amp;L</th>
                <th scope="col" className={cn(th, 'text-right')}>LIQ. PRICE</th>
                <th scope="col" className={cn(th, 'text-right')}>QUICK ACTION</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {holdings.map((h) => {
                const p = byId.get(h.playerId)
                if (!p) return null
                const value = h.shares * p.price
                const pnl = value - (h.shares * h.avgPrice)
                const pnlPct = ((p.price - h.avgPrice) / h.avgPrice) * 100 * h.leverage
                const isLeveraged = h.leverage > 1
                return (
                  <tr key={h.playerId} className="border-b border-border/60 last:border-0">
                    <td className={cn(td, 'font-sans font-medium text-foreground')}>
                      <span>{p.name}</span>
                      {isLeveraged && (
                        <span className="ml-2 rounded-sm bg-gain/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-gain">
                          {h.leverage}×
                        </span>
                      )}
                    </td>
                    <td className={cn(td, 'text-right tabular-nums')}>{h.shares}</td>
                    <td className={cn(td, 'text-right tabular-nums text-muted-foreground')}>{formatNumber(h.avgPrice)}</td>
                    <td className={cn(td, 'text-right tabular-nums')}>{formatNumber(p.price)}</td>
                    <td className={cn(td, 'text-right tabular-nums text-foreground')}>{formatUSD(value)}</td>
                    <td className={cn(td, 'text-right tabular-nums', pnl >= 0 ? 'text-gain' : 'text-loss')}>
                      {pnl >= 0 ? '+' : '-'}
                      {formatUSD(Math.abs(pnl))} / {formatPct(pnlPct)}
                    </td>
                    <td className={cn(td, 'text-right tabular-nums')}>
                      {h.liquidationPrice != null ? (
                        <span className="text-loss">{formatNumber(h.liquidationPrice)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={cn(td, 'text-right')}>
                      <button
                        type="button"
                        onClick={() => onQuickSell(h.playerId)}
                        className="rounded-sm border border-loss/40 bg-loss/10 px-3 py-1 font-sans text-xs font-semibold text-loss transition-colors hover:bg-loss/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Sell ${p.name} shares`}
                      >
                        Sell
                      </button>
                    </td>
                  </tr>
                )
              })}
              {holdings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
                    No open positions. Buy shares from the order ticket to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : tab === 'shorts' ? (
          <table id="panel-shorts" role="tabpanel" aria-labelledby="tab-shorts" className="w-full text-left">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground">
                <th scope="col" className={th}>GRANDMASTER</th>
                <th scope="col" className={cn(th, 'text-right')}>SHARES</th>
                <th scope="col" className={cn(th, 'text-right')}>OPEN PRICE</th>
                <th scope="col" className={cn(th, 'text-right')}>CURRENT</th>
                <th scope="col" className={cn(th, 'text-right')}>UNREALIZED P&amp;L</th>
                <th scope="col" className={cn(th, 'text-right')}>AUTO-CLOSE AT</th>
                <th scope="col" className={cn(th, 'text-right')}>QUICK ACTION</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {shorts.map((s) => {
                const p = byId.get(s.playerId)
                if (!p) return null
                const pnl = (s.openPrice - p.price) * s.shares
                const pnlPct = ((s.openPrice - p.price) / s.openPrice) * 100
                return (
                  <tr key={s.id} className="border-b border-border/60 last:border-0">
                    <td className={cn(td, 'font-sans font-medium text-foreground')}>
                      <span>{p.name}</span>
                      <span className="ml-2 rounded-sm bg-[hsl(270,70%,60%)]/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[hsl(270,70%,60%)]">
                        SHORT
                      </span>
                    </td>
                    <td className={cn(td, 'text-right tabular-nums')}>{s.shares}</td>
                    <td className={cn(td, 'text-right tabular-nums text-muted-foreground')}>{formatNumber(s.openPrice)}</td>
                    <td className={cn(td, 'text-right tabular-nums')}>{formatNumber(p.price)}</td>
                    <td className={cn(td, 'text-right tabular-nums', pnl >= 0 ? 'text-gain' : 'text-loss')}>
                      {pnl >= 0 ? '+' : '-'}
                      {formatUSD(Math.abs(pnl))} / {formatPct(pnlPct)}
                    </td>
                    <td className={cn(td, 'text-right tabular-nums')}>
                      <span className="text-loss">{formatNumber(s.liquidationPrice)}</span>
                    </td>
                    <td className={cn(td, 'text-right')}>
                      <button
                        type="button"
                        onClick={() => onQuickCover(s.id)}
                        className="rounded-sm border border-[hsl(270,70%,60%)]/40 bg-[hsl(270,70%,60%)]/10 px-3 py-1 font-sans text-xs font-semibold text-[hsl(270,70%,60%)] transition-colors hover:bg-[hsl(270,70%,60%)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Cover ${p.name} short`}
                      >
                        Cover
                      </button>
                    </td>
                  </tr>
                )
              })}
              {shorts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
                    No open short positions. Use the Short tab in the order ticket to open one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table id="panel-audit" role="tabpanel" aria-labelledby="tab-audit" className="w-full text-left">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground">
                <th scope="col" className={th}>TIMESTAMP</th>
                <th scope="col" className={th}>TYPE</th>
                <th scope="col" className={th}>GM</th>
                <th scope="col" className={cn(th, 'text-right')}>SHARES</th>
                <th scope="col" className={cn(th, 'text-right')}>EXECUTION PRICE</th>
                <th scope="col" className={cn(th, 'text-right')}>FEE PAID</th>
                <th scope="col" className={cn(th, 'text-right')}>STATUS</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {trades.map((t) => (
                <tr key={t.id} className="border-b border-border/60 last:border-0">
                  <td className={cn(td, 'text-xs text-muted-foreground tabular-nums')}>{t.timestamp}</td>
                  <td className={td}>
                    <span
                      className={cn(
                        'rounded-sm px-1.5 py-0.5 text-[10px] font-bold',
                        t.side === 'BUY' ? 'bg-gain/15 text-gain'
                        : t.side === 'SHORT' ? 'bg-[hsl(270,70%,60%)]/15 text-[hsl(270,70%,60%)]'
                        : t.side === 'COVER' ? 'bg-[hsl(270,70%,60%)]/10 text-[hsl(270,70%,60%)]'
                        : 'bg-loss/15 text-loss',
                      )}
                    >
                      {t.side}
                    </span>
                  </td>
                  <td className={cn(td, 'font-sans text-foreground')}>{byId.get(t.playerId)?.name ?? t.playerId}</td>
                  <td className={cn(td, 'text-right tabular-nums')}>{t.shares}</td>
                  <td className={cn(td, 'text-right tabular-nums')}>{formatUSD(t.price)}</td>
                  <td className={cn(td, 'text-right tabular-nums text-muted-foreground')}>{formatUSD(t.fee)}</td>
                  <td className={cn(td, 'text-right')}>
                    <span className="text-[10px] font-semibold tracking-wider text-gain">{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
