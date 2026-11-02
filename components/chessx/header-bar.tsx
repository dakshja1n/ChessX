import { ChessKnight, TrendingUp } from 'lucide-react'
import { type Player, changePct, formatNumber, formatUSD } from '@/lib/market-data'
import { cn } from '@/lib/utils'

type HeaderBarProps = {
  players: Player[]
  cash: number
  portfolioValue: number
}

export function HeaderBar({ players, cash, portfolioValue }: HeaderBarProps) {
  const tickerItems = [...players, ...players]

  return (
    <header className="border-b border-border bg-panel">
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 lg:flex-nowrap">
        <div className="flex shrink-0 items-center gap-3">
          <div className="relative flex size-9 items-center justify-center rounded-md bg-gain/10 ring-1 ring-gain/40">
            <ChessKnight className="size-5 text-gain" aria-hidden="true" />
            <TrendingUp className="absolute -right-1 -bottom-1 size-3.5 rounded-sm bg-panel text-gain" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              Chess<span className="text-gain">X</span>
            </p>
            <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">EQUITY EXCHANGE</p>
          </div>
        </div>

        <div
          className="order-3 w-full min-w-0 overflow-hidden rounded-md border border-border bg-background lg:order-none lg:flex-1"
          aria-label="Live ticker"
        >
          <div className="flex items-center">
            <span className="flex shrink-0 items-center gap-1.5 border-r border-border px-3 py-2 font-mono text-[10px] font-semibold tracking-widest text-gain">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-gain opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-gain" />
              </span>
              LIVE
            </span>
            <div className="min-w-0 flex-1 overflow-hidden">
              <ul className="animate-ticker flex w-max items-center gap-6 px-4 py-2 font-mono text-xs">
                {tickerItems.map((p, i) => {
                  const pct = changePct(p)
                  return (
                    <li key={`${p.id}-${i}`} className="flex items-center gap-2 whitespace-nowrap" aria-hidden={i >= players.length}>
                      <span className="font-semibold text-foreground">{p.tickerName}</span>
                      <span className="text-muted-foreground">${formatNumber(p.price)}</span>
                      <span className={cn(pct >= 0 ? 'text-gain' : 'text-loss')}>
                        ({pct >= 0 ? '+' : ''}
                        {pct.toFixed(1)}%)
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-4 lg:ml-0">
          <dl className="flex items-center gap-4 font-mono">
            <div className="text-right">
              <dt className="text-[10px] tracking-widest text-muted-foreground">CASH BALANCE</dt>
              <dd className="text-sm font-semibold text-foreground tabular-nums">
                {formatUSD(cash)} <span className="text-[10px] text-muted-foreground">USD</span>
              </dd>
            </div>
            <div className="h-8 w-px bg-border" aria-hidden="true" />
            <div className="text-right">
              <dt className="text-[10px] tracking-widest text-muted-foreground">PORTFOLIO VALUE</dt>
              <dd className="text-sm font-semibold text-gain tabular-nums">
                {formatUSD(portfolioValue)} <span className="text-[10px] text-muted-foreground">USD</span>
              </dd>
            </div>
          </dl>
          <div
            className="flex size-9 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold text-foreground ring-1 ring-border"
            role="img"
            aria-label="Account: Jordan Diaz"
          >
            JD
          </div>
        </div>
      </div>
    </header>
  )
}
