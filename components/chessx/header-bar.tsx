import { ChessKnight, TrendingUp } from 'lucide-react'
import { formatUSD } from '@/lib/market-data'
import { cn } from '@/lib/utils'
import { MODES, type ModeId } from './modes'
import { SettingsSheet } from './settings-sheet'

type HeaderBarProps = {
  mode: ModeId
  onModeChange: (mode: ModeId) => void
  cash: number
  netValue: number
}

export function HeaderBar({ mode, onModeChange, cash, netValue }: HeaderBarProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border bg-panel px-3 py-2">
      <div className="flex shrink-0 items-center gap-3">
        <SettingsSheet cash={cash} />
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-8 items-center justify-center rounded-md bg-gain/10 ring-1 ring-gain/40">
            <ChessKnight className="size-4.5 text-gain" aria-hidden="true" />
            <TrendingUp className="absolute -right-1 -bottom-1 size-3 rounded-sm bg-panel text-gain" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-tight text-foreground">
              Chess<span className="text-gain">X</span>
            </p>
            <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground">EQUITY EXCHANGE</p>
          </div>
        </div>
      </div>

      <nav aria-label="Game modes" className="flex min-w-0 flex-1 justify-center">
        <ul className="flex items-center gap-0.5 overflow-x-auto rounded-full border border-border bg-background p-1">
          {MODES.map((m) => {
            const active = m.id === mode
            const Icon = m.icon
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onModeChange(m.id)}
                  aria-current={active ? 'page' : undefined}
                  title={m.tag ? `${m.title} (${m.tag})` : m.title}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'bg-gain/15 text-gain ring-1 ring-gain/40' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {m.id !== 'home' && <span className="font-mono text-[10px] opacity-70">{m.short}</span>}
                  <span>{m.label}</span>
                  {m.tag && (
                    <span
                      className={cn(
                        'hidden rounded-full px-1.5 font-mono text-[9px] 2xl:inline',
                        m.status === 'active' ? 'bg-gain/15 text-gain' : 'bg-secondary text-muted-foreground',
                      )}
                    >
                      {m.tag}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        <dl className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-1 font-mono">
          <div className="text-right">
            <dt className="text-[9px] tracking-widest text-muted-foreground">CASH</dt>
            <dd className="text-xs font-semibold text-foreground tabular-nums">
              {formatUSD(cash)} <span className="text-[9px] text-muted-foreground">USD</span>
            </dd>
          </div>
          <div className="h-6 w-px bg-border" aria-hidden="true" />
          <div className="text-right">
            <dt className="text-[9px] tracking-widest text-muted-foreground">NET VALUE</dt>
            <dd className="text-xs font-semibold text-gain tabular-nums">
              {formatUSD(netValue)} <span className="text-[9px] text-muted-foreground">USD</span>
            </dd>
          </div>
        </dl>
        <div
          className="flex size-8 items-center justify-center rounded-full bg-secondary font-mono text-[11px] font-semibold text-foreground ring-1 ring-border"
          role="img"
          aria-label="Account: Jordan Diaz"
        >
          JD
        </div>
      </div>
    </header>
  )
}
