import { Lock } from 'lucide-react'
import type { TradingStatus } from '@/lib/market-data'
import { cn } from '@/lib/utils'

export function StatusBadge({ status, compact = false }: { status: TradingStatus; compact?: boolean }) {
  if (status === 'locked') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-sm border border-lock/30 bg-lock/10 px-1.5 py-0.5 font-mono text-[10px] font-medium whitespace-nowrap text-lock"
        title="Trading Locked (In Match)"
      >
        <Lock className="size-3" aria-hidden="true" />
        {compact ? 'Locked' : 'Trading Locked (In Match)'}
        {compact && <span className="sr-only"> (In Match)</span>}
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border border-gain/30 bg-gain/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gain',
      )}
    >
      <span className="size-1.5 rounded-full bg-gain" aria-hidden="true" />
      Active
    </span>
  )
}
