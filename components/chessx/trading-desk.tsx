'use client'

import { useEffect, useState } from 'react'
import {
  FEE_RATE,
  INITIAL_CASH,
  INITIAL_HOLDINGS,
  INITIAL_PLAYERS,
  INITIAL_TRADES,
  type Holding,
  type Player,
  type Timeframe,
  type Trade,
  type TradeSide,
  formatTimestamp,
} from '@/lib/market-data'
import { HeaderBar } from './header-bar'
import { HomeHub } from './home-hub'
import { MarketBoard } from './market-board'
import { MODES, type ModeId } from './modes'
import { OrderTicket } from './order-ticket'
import { PlayerDetail } from './player-detail'
import { RoadmapView } from './roadmap-view'

const round2 = (n: number) => Math.round(n * 100) / 100

export function TradingDesk() {
  const [mode, setMode] = useState<ModeId>('spot')
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS)
  const [selectedId, setSelectedId] = useState('carlsen')
  const [cash, setCash] = useState(INITIAL_CASH)
  const [holdings, setHoldings] = useState<Holding[]>(INITIAL_HOLDINGS)
  const [trades, setTrades] = useState<Trade[]>(INITIAL_TRADES)
  const [side, setSide] = useState<TradeSide>('BUY')
  const [sharesInput, setSharesInput] = useState('1')
  const [timeframe, setTimeframe] = useState<Timeframe>('1D')
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.status === 'locked' || Math.random() > 0.45) return p
          const delta = (Math.random() - 0.5) * 1.2
          return { ...p, price: round2(Math.max(2000, p.price + delta)) }
        }),
      )
    }, 2500)
    return () => clearInterval(id)
  }, [])

  const player = players.find((p) => p.id === selectedId) ?? players[0]
  const ownedShares = holdings.find((h) => h.playerId === player.id)?.shares ?? 0

  let holdingsValue = 0
  let pnl24h = 0
  for (const h of holdings) {
    const p = players.find((pl) => pl.id === h.playerId)
    if (!p) continue
    holdingsValue += p.price * h.shares
    pnl24h += (p.price - p.open) * h.shares
  }

  const selectPlayer = (id: string) => {
    setSelectedId(id)
    setSharesInput('1')
    setNotice(null)
  }

  const quickSell = (id: string) => {
    setSelectedId(id)
    setSide('SELL')
    setSharesInput(String(holdings.find((h) => h.playerId === id)?.shares ?? 0))
    setNotice(null)
    setMode('spot')
  }

  const execute = () => {
    const shares = Number.parseInt(sharesInput, 10)
    if (!shares || shares <= 0 || player.status === 'locked') return

    const price = player.price
    const subtotal = shares * price
    const fee = round2(subtotal * FEE_RATE)

    if (side === 'BUY') {
      const total = subtotal + fee
      if (total > cash) return
      setCash((c) => round2(c - total))
      setHoldings((prev) => {
        const existing = prev.find((h) => h.playerId === player.id)
        if (!existing) return [...prev, { playerId: player.id, shares, avgPrice: price }]
        return prev.map((h) =>
          h.playerId === player.id
            ? { ...h, shares: h.shares + shares, avgPrice: round2((h.avgPrice * h.shares + price * shares) / (h.shares + shares)) }
            : h,
        )
      })
    } else {
      if (shares > ownedShares) return
      setCash((c) => round2(c + subtotal - fee))
      setHoldings((prev) =>
        prev
          .map((h) => (h.playerId === player.id ? { ...h, shares: h.shares - shares } : h))
          .filter((h) => h.shares > 0),
      )
    }

    setTrades((prev) => [
      {
        id: `t-${Date.now()}`,
        timestamp: formatTimestamp(new Date()),
        side,
        playerId: player.id,
        shares,
        price,
        fee,
        status: 'FILLED',
      },
      ...prev,
    ])
    setNotice(`${side === 'BUY' ? 'Bought' : 'Sold'} ${shares} × ${player.tickerName} @ $${price.toFixed(2)} — FILLED`)
    setSharesInput('1')
  }

  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[1]

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      <HeaderBar mode={mode} onModeChange={setMode} cash={cash} netValue={cash + holdingsValue} />
      <main className="min-h-0 flex-1 overflow-hidden">
        {mode === 'home' && (
          <HomeHub
            players={players}
            holdings={holdings}
            trades={trades}
            cash={cash}
            holdingsValue={holdingsValue}
            pnl24h={pnl24h}
            onModeChange={setMode}
            onQuickSell={quickSell}
          />
        )}

        {mode === 'spot' && (
          <div className="grid h-full min-h-0 grid-cols-[minmax(330px,1fr)_minmax(0,2fr)_minmax(260px,1fr)] gap-4 overflow-hidden p-4">
            <h1 className="sr-only">ChessX spot trading desk</h1>
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <MarketBoard players={players} selectedId={player.id} onSelect={selectPlayer} />
            </div>
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
              <PlayerDetail player={player} timeframe={timeframe} onTimeframeChange={setTimeframe} />
            </div>
            <div className="flex h-full min-h-0 flex-col overflow-y-auto">
              <OrderTicket
                player={player}
                side={side}
                onSideChange={(s) => {
                  setSide(s)
                  setNotice(null)
                }}
                sharesInput={sharesInput}
                onSharesChange={setSharesInput}
                cash={cash}
                ownedShares={ownedShares}
                onExecute={execute}
                notice={notice}
              />
            </div>
          </div>
        )}

        {activeMode.status === 'phase' && <RoadmapView mode={activeMode} onModeChange={setMode} />}
      </main>
    </div>
  )
}
