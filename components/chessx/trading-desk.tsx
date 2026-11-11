'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { fetchPlayers, fetchPortfolio, fetchHoldings, fetchTrades, executeTrade, fetchRatingHistory, fetchProfile } from '@/lib/supabase/queries'
import {
  type ChartPoint,
  type Holding,
  type Player,
  type Timeframe,
  type Trade,
  type TradeSide,
  formatTimestamp,
} from '@/lib/market-data'
import { HeaderBar } from './header-bar'
import { HomeHub } from './home-hub'
import { LeaderboardView } from './leaderboard-view'
import { MarketBoard } from './market-board'
import { MODES, type ModeId } from './modes'
import { OrderTicket } from './order-ticket'
import { PlayerDetail } from './player-detail'
import { RoadmapView } from './roadmap-view'

function dbPlayerToPlayer(p: Record<string, unknown>): Player {
  return {
    id: p.id as string,
    name: p.name as string,
    tickerName: ((p.name as string).split(' ').pop() ?? (p.name as string)),
    country: (p.country as string) ?? '—',
    fideId: (p.fide_id as string) ?? '',
    title: (p.title as string) ?? 'GM',
    price: Number(p.elo),
    open: Number(p.elo) - Number(p.elo_change_24h ?? 0),
    status: p.is_locked ? 'locked' : 'active',
    peakElo: Number(p.peak_elo ?? p.elo),
    winRate: Number(p.win_rate ?? 0),
    tournament: (p.tournament as string) ?? '',
  }
}

function dbHoldingToHolding(h: Record<string, unknown>): Holding {
  return {
    playerId: h.player_id as string,
    shares: Number(h.shares),
    avgPrice: Number(h.avg_cost),
    leverage: Number(h.leverage ?? 1),
    borrowedAmount: Number(h.borrowed_amount ?? 0),
    liquidationPrice: h.liquidation_price != null ? Number(h.liquidation_price) : null,
  }
}

function dbTradeToTrade(t: Record<string, unknown>): Trade {
  return {
    id: t.id as string,
    timestamp: formatTimestamp(new Date(t.executed_at as string)),
    side: t.side as TradeSide,
    playerId: t.player_id as string,
    shares: Number(t.shares),
    price: Number(t.price),
    fee: Number(t.fee),
    status: 'FILLED',
  }
}

function formatSyncDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export function TradingDesk() {
  const [mode, setMode] = useState<ModeId>('spot')
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cash, setCash] = useState(0)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [side, setSide] = useState<TradeSide>('BUY')
  const [sharesInput, setSharesInput] = useState('1')
  const [leverage, setLeverage] = useState(1)
  const [timeframe, setTimeframe] = useState<Timeframe>('1D')
  const [notice, setNotice] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string>('Trader')
  const [loading, setLoading] = useState(true)
  const [ratingHistoryCache, setRatingHistoryCache] = useState<Map<string, ChartPoint[]>>(new Map())
  const fetchingHistory = useRef<Set<string>>(new Set())

  const reload = useCallback(async (uid: string) => {
    const [dbPlayers, portfolio, dbHoldings, dbTrades] = await Promise.all([
      fetchPlayers(),
      fetchPortfolio(uid),
      fetchHoldings(uid),
      fetchTrades(uid),
    ])
    const mapped = (dbPlayers ?? []).map(dbPlayerToPlayer)
    setPlayers(mapped)
    setSelectedId((prev) => prev ?? mapped[0]?.id ?? null)
    setCash(portfolio?.cash ?? 10000)
    setHoldings((dbHoldings ?? []).map(dbHoldingToHolding))
    setTrades((dbTrades ?? []).map(dbTradeToTrade))
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null
      setUserId(uid)
      const email = data.user?.email ?? ''
      const fallback = data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.name ?? email.split('@')[0] ?? 'Trader'
      const capitalized = fallback.charAt(0).toUpperCase() + fallback.slice(1)
      if (uid) {
        fetchProfile(uid)
          .then((profile) => {
            setDisplayName(profile?.display_name ?? capitalized)
          })
          .catch(() => setDisplayName(capitalized))
        reload(uid)
          .catch((err) => console.error('Failed to load market data:', err))
          .finally(() => setLoading(false))
      } else {
        setDisplayName(capitalized)
        setLoading(false)
      }
    }).catch((err) => {
      console.error('Auth error:', err)
      setLoading(false)
    })
  }, [reload])

  // Fetch rating history for selected player if not cached
  useEffect(() => {
    if (!selectedId || ratingHistoryCache.has(selectedId) || fetchingHistory.current.has(selectedId)) return
    fetchingHistory.current.add(selectedId)
    fetchRatingHistory(selectedId)
      .then((rows) => {
        if (rows.length >= 2) {
          const points: ChartPoint[] = rows.map((r) => ({
            label: formatSyncDate(r.synced_at),
            price: r.elo,
          }))
          setRatingHistoryCache((prev) => new Map(prev).set(selectedId, points))
        }
        // If fewer than 2 points, leave cache empty → falls back to generated history
      })
      .catch(() => { /* leave cache empty, fall back to generated */ })
      .finally(() => { fetchingHistory.current.delete(selectedId) })
  }, [selectedId, ratingHistoryCache])

  // Realtime player updates
  useEffect(() => {
    const channel = supabase
      .channel('players-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players' }, (payload) => {
        setPlayers((prev) =>
          prev.map((p) => (p.id === payload.new.id ? dbPlayerToPlayer(payload.new) : p)),
        )
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const player = players.find((p) => p.id === selectedId) ?? players[0]
  const ownedShares = holdings.find((h) => h.playerId === player?.id)?.shares ?? 0

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
    setLeverage(1)
    setNotice(null)
  }

  const quickSell = (id: string) => {
    setSelectedId(id)
    setSide('SELL')
    setSharesInput(String(holdings.find((h) => h.playerId === id)?.shares ?? 0))
    setNotice(null)
    setMode('spot')
  }

  const execute = async () => {
    if (!userId || !player) return
    const shares = Number.parseInt(sharesInput, 10)
    if (!shares || shares <= 0 || player.status === 'locked') return

    try {
      await executeTrade(player.id, side, shares, player.price, leverage)
      await reload(userId)
      setNotice(`${side === 'BUY' ? 'Bought' : 'Sold'} ${shares} × ${player.tickerName} @ $${player.price.toFixed(2)} — FILLED`)
      setSharesInput('1')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err ? String((err as {message: unknown}).message) : 'Trade failed'
      setNotice(`Error: ${msg}`)
    }
  }

  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[1]

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground text-sm">
      Loading market data...
    </div>
  )

  if (!player) return null

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      <HeaderBar mode={mode} onModeChange={setMode} cash={cash} netValue={cash + holdingsValue} displayName={displayName} />
      <main className="min-h-0 flex-1 overflow-hidden">
        {mode === 'home' && (
          <HomeHub
            players={players}
            holdings={holdings}
            trades={trades}
            cash={cash}
            holdingsValue={holdingsValue}
            pnl24h={pnl24h}
            displayName={displayName}
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
              <PlayerDetail
                player={player}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                ratingHistory={ratingHistoryCache.get(player.id)}
              />
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
                leverage={leverage}
                onLeverageChange={setLeverage}
                cash={cash}
                ownedShares={ownedShares}
                onExecute={execute}
                notice={notice}
              />
            </div>
          </div>
        )}

        {activeMode.status === 'phase' && <RoadmapView mode={activeMode} onModeChange={setMode} />}
        {mode === 'leaderboard' && (
          <LeaderboardView
            userId={userId}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
          />
        )}
      </main>
    </div>
  )
}

