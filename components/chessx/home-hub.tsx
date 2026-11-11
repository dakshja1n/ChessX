import { ArrowRight, Lock } from 'lucide-react'
import { type Holding, type Player, type ShortPosition, type Trade, formatPct, formatUSD } from '@/lib/market-data'
import { cn } from '@/lib/utils'
import { MODES, type ModeId } from './modes'
import { PortfolioPanel } from './portfolio-panel'

type HomeHubProps = {
  players: Player[]
  holdings: Holding[]
  trades: Trade[]
  shorts: ShortPosition[]
  cash: number
  holdingsValue: number
  pnl24h: number
  displayName: string
  onModeChange: (mode: ModeId) => void
  onQuickSell: (playerId: string) => void
  onQuickCover: (shortId: string) => void
}

export function HomeHub({ players, holdings, trades, shorts, cash, holdingsValue, pnl24h, displayName, onModeChange, onQuickSell, onQuickCover }: HomeHubProps) {
  const netWorth = cash + holdingsValue
  const pnlPct = holdingsValue - pnl24h > 0 ? (pnl24h / (holdingsValue - pnl24h)) * 100 : 0
  const gameModes = MODES.filter((m) => m.id !== 'home')

  const stats = [
    { label: 'NET WORTH', value: formatUSD(netWorth), tone: 'text-foreground' },
    { label: 'CASH', value: formatUSD(cash), tone: 'text-foreground' },
    { label: 'HOLDINGS', value: formatUSD(holdingsValue), tone: 'text-foreground' },
    {
      label: 'MTD P&L',
      value: `${pnl24h >= 0 ? '+' : '-'}${formatUSD(Math.abs(pnl24h))} (${formatPct(pnlPct)})`,
      tone: pnl24h >= 0 ? 'text-gain' : 'text-loss',
    },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <section
        className="flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4"
        aria-labelledby="welcome-title"
      >
        <div>
          <p className="font-mono text-[10px] tracking-widest text-gain">MARKETS OPEN · NOV 2, 2026</p>
          <h1 id="welcome-title" className="mt-1 text-xl font-semibold tracking-tight text-foreground text-balance">
            Welcome back, {displayName}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Every Elo point is a dollar. Here&apos;s where your book stands.</p>
        </div>
        <dl className="flex flex-wrap gap-6 font-mono">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-[10px] tracking-widest text-muted-foreground">{s.label}</dt>
              <dd className={cn('text-base font-semibold tabular-nums', s.tone)}>{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Game modes" className="grid shrink-0 grid-cols-2 gap-3">
        {gameModes.map((m) => {
          const Icon = m.icon
          const active = m.status === 'active'
          return (
            <article
              key={m.id}
              className={cn(
                'flex flex-col gap-2 rounded-lg border bg-card p-4',
                active ? 'border-gain/40 shadow-[inset_0_2px_0_0_var(--gain)]' : 'border-border',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-md ring-1',
                    active ? 'bg-gain/10 text-gain ring-gain/40' : 'bg-secondary text-muted-foreground ring-border',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium',
                    active ? 'bg-gain/15 text-gain' : 'bg-lock/10 text-lock',
                  )}
                >
                  {active ? <span className="size-1.5 rounded-full bg-gain" aria-hidden="true" /> : <Lock className="size-3" aria-hidden="true" />}
                  {m.tag}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-foreground">{m.title}</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">{m.description}</p>
              <button
                type="button"
                onClick={() => onModeChange(m.id)}
                className={cn(
                  'mt-auto flex h-8 items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-gain text-primary-foreground hover:bg-gain/90'
                    : 'border border-border bg-background text-muted-foreground hover:text-foreground',
                )}
              >
                {active ? 'Launch Trading Desk' : 'Preview Roadmap'}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            </article>
          )
        })}
      </section>

      <div className="flex min-h-0 flex-1 flex-col">
        <PortfolioPanel players={players} holdings={holdings} trades={trades} shorts={shorts} onQuickSell={onQuickSell} onQuickCover={onQuickCover} title="GLOBAL PORTFOLIO OVERVIEW" />
      </div>
    </div>
  )
}
