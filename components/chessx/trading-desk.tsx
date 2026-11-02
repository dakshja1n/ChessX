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
import { MarketBoard } from './market-board'
import { OrderTicket } from './order-ticket'
import { PlayerDetail } from './player-detail'
import { PortfolioPanel } from './portfolio-panel'

const round2 = (n: number) => Math.round(n * 100) / 100

export function TradingDesk() {
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
  const portfolioValue = holdings.reduce((sum, h) => {
    const p = players.find((pl) => pl.id === h.playerId)
    return sum + (p ? p.price * h.shares : 0)
  }, 0)

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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <HeaderBar players={players} cash={cash} portfolioValue={portfolioValue} />
      <main className="flex flex-1 flex-col gap-4 p-4">
        <h1 className="sr-only">ChessX trading desk</h1>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] xl:grid-cols-[minmax(320px,1fr)_minmax(0,1.6fr)_minmax(320px,0.95fr)]">
          <div className="lg:max-h-[calc(100vh-7rem)] xl:max-h-none">
            <MarketBoard players={players} selectedId={player.id} onSelect={selectPlayer} />
          </div>
          <PlayerDetail player={player} timeframe={timeframe} onTimeframeChange={setTimeframe} />
          <div className="lg:col-span-2 xl:col-span-1">
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
        <PortfolioPanel players={players} holdings={holdings} trades={trades} onQuickSell={quickSell} />
      </main>
    </div>
  )
}
