'use client'

import { CircleCheck, TriangleAlert, Wallet } from 'lucide-react'
import { FEE_RATE, type Player, type TradeSide, formatUSD } from '@/lib/market-data'
import { cn } from '@/lib/utils'

type OrderTicketProps = {
  player: Player
  side: TradeSide
  onSideChange: (side: TradeSide) => void
  sharesInput: string
  onSharesChange: (value: string) => void
  leverage: number
  onLeverageChange: (lev: number) => void
  cash: number
  ownedShares: number
  onExecute: () => void
  notice: string | null
}

const PRESETS = [
  { label: '25%', ratio: 0.25 },
  { label: '50%', ratio: 0.5 },
  { label: '75%', ratio: 0.75 },
  { label: 'MAX', ratio: 1 },
]

const LEVERAGE_OPTIONS = [1, 2, 3, 5]

export function OrderTicket({
  player,
  side,
  onSideChange,
  sharesInput,
  onSharesChange,
  leverage,
  onLeverageChange,
  cash,
  ownedShares,
  onExecute,
  notice,
}: OrderTicketProps) {
  const isBuy = side === 'BUY'
  const locked = player.status === 'locked'
  const shares = Number.parseInt(sharesInput, 10)
  const validShares = Number.isFinite(shares) && shares > 0 ? shares : 0

  const notional = validShares * player.price
  const equity = isBuy ? notional / leverage : notional
  const borrowed = isBuy ? notional - equity : 0
  const fee = notional * FEE_RATE
  const cashNeeded = isBuy ? equity + fee : 0
  const netProceeds = isBuy ? 0 : notional - fee

  const maxBuyable = Math.floor(cash / (player.price * (1 + FEE_RATE) / leverage))
  const capacity = isBuy ? maxBuyable : ownedShares

  const liquidationPrice = isBuy && leverage > 1
    ? player.price * (1 - 1 / leverage) * 0.95
    : null

  let error: string | null = null
  if (validShares > 0) {
    if (isBuy && cashNeeded > cash) error = 'Insufficient cash for this order.'
    if (!isBuy && validShares > ownedShares) error = `You only own ${ownedShares} share${ownedShares === 1 ? '' : 's'}.`
  }

  const canExecute = !locked && validShares > 0 && !error

  return (
    <section className="flex flex-col rounded-lg border border-border bg-card" aria-labelledby="order-ticket-title">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 id="order-ticket-title" className="font-mono text-xs font-semibold tracking-widest text-foreground">
          ORDER TICKET
        </h2>
        <span className="font-mono text-[10px] text-muted-foreground">MARKET · {player.tickerName.toUpperCase()}</span>
      </div>

      <div className="flex flex-col gap-3 p-3">
        <div className="grid grid-cols-2 rounded-md border border-border bg-background p-1" role="tablist" aria-label="Order side">
          {(['BUY', 'SELL'] as const).map((s) => {
            const active = side === s
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSideChange(s)}
                className={cn(
                  'rounded-sm py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active && s === 'BUY' && 'bg-gain text-primary-foreground',
                  active && s === 'SELL' && 'bg-loss text-white',
                  !active && 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s === 'BUY' ? 'Buy Shares' : 'Sell Shares'}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2.5">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="size-4" aria-hidden="true" />
            {isBuy ? 'Available Cash' : 'Shares Owned'}
          </span>
          <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
            {isBuy ? (
              <>
                {formatUSD(cash)} <span className="text-[10px] text-muted-foreground">USD</span>
              </>
            ) : (
              `${ownedShares} ${ownedShares === 1 ? 'share' : 'shares'}`
            )}
          </span>
        </div>

        {isBuy && (
          <div>
            <p className="mb-1.5 font-mono text-[10px] tracking-widest text-muted-foreground">LEVERAGE</p>
            <div className="flex gap-1.5" role="group" aria-label="Leverage multiplier">
              {LEVERAGE_OPTIONS.map((lev) => (
                <button
                  key={lev}
                  type="button"
                  onClick={() => onLeverageChange(lev)}
                  aria-pressed={leverage === lev}
                  className={cn(
                    'flex-1 rounded-md border py-1.5 font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    leverage === lev
                      ? lev === 1
                        ? 'border-border bg-secondary text-foreground'
                        : 'border-gain/50 bg-gain/15 text-gain'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  {lev === 1 ? '1×' : `${lev}×`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="share-qty" className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted-foreground">
            NUMBER OF SHARES
          </label>
          <input
            id="share-qty"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={sharesInput}
            onChange={(e) => onSharesChange(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0"
            className="h-11 w-full rounded-md border border-input bg-background px-3 font-mono text-lg text-foreground tabular-nums placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-describedby="share-capacity"
          />
          <p id="share-capacity" className="mt-1 font-mono text-[10px] text-muted-foreground">
            Max {isBuy ? 'buyable' : 'sellable'}: {capacity}
          </p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {PRESETS.map(({ label, ratio }) => (
              <button
                key={label}
                type="button"
                onClick={() => onSharesChange(String(Math.floor(capacity * ratio)))}
                className="rounded-sm border border-border bg-secondary py-1.5 font-mono text-[11px] font-medium text-muted-foreground transition-colors hover:border-input hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <dl className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 font-mono text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Market Price</dt>
            <dd className="text-foreground tabular-nums">{formatUSD(player.price)} / share</dd>
          </div>
          {isBuy && leverage > 1 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Notional Value</dt>
              <dd className="text-foreground tabular-nums">{formatUSD(notional)}</dd>
            </div>
          )}
          {isBuy && leverage > 1 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Platform Lends</dt>
              <dd className="text-gain tabular-nums">+{formatUSD(borrowed)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Est. Platform Fee (0.50%)</dt>
            <dd className="text-foreground tabular-nums">
              {isBuy ? '+' : '-'}
              {formatUSD(fee)}
            </dd>
          </div>
          {liquidationPrice && (
            <div className="flex justify-between">
              <dt className="text-loss">Liquidation Price</dt>
              <dd className="text-loss tabular-nums">{formatUSD(liquidationPrice)}</dd>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2.5">
            <dt className="font-semibold text-foreground">{isBuy ? 'You Pay' : 'Net Proceeds'}</dt>
            <dd className={cn('text-base font-bold tabular-nums', isBuy ? 'text-gain' : 'text-loss')}>
              {formatUSD(isBuy ? cashNeeded : netProceeds)}
            </dd>
          </div>
        </dl>

        {locked && (
          <div role="alert" className="flex gap-2 rounded-md border border-lock/40 bg-lock/10 px-3 py-2.5 text-xs text-lock">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>Trading is paused while player is in an active rated game.</p>
          </div>
        )}

        {!locked && error && (
          <p role="alert" className="text-xs text-loss">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onExecute}
          disabled={!canExecute}
          className={cn(
            'h-11 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-40',
            isBuy ? 'bg-gain text-primary-foreground hover:bg-gain/90' : 'bg-loss text-white hover:bg-loss/90',
          )}
        >
          {isBuy
            ? leverage > 1 ? `Execute ${leverage}× Leveraged Buy` : 'Execute Buy Order'
            : 'Execute Sell Order'}
        </button>

        <div aria-live="polite" className="min-h-4">
          {notice && (
            <p className="flex items-center gap-1.5 font-mono text-[11px] text-gain">
              <CircleCheck className="size-3.5" aria-hidden="true" />
              {notice}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
