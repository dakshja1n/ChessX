export type TradingStatus = 'active' | 'locked'

export type Player = {
  id: string
  name: string
  tickerName: string
  country: string
  fideId: string
  price: number
  open: number
  status: TradingStatus
  peakElo: number
  winRate: number
  tournament: string
}

export type Holding = {
  playerId: string
  shares: number
  avgPrice: number
}

export type TradeSide = 'BUY' | 'SELL'

export type Trade = {
  id: string
  timestamp: string
  side: TradeSide
  playerId: string
  shares: number
  price: number
  fee: number
  status: 'FILLED' | 'REJECTED'
}

export type Timeframe = '1D' | '1W' | '1M' | '1Y' | 'ALL'

export const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '1Y', 'ALL']

export const FEE_RATE = 0.005

type PlayerSeed = Omit<Player, 'open'> & { change24h: number }

const seeds: PlayerSeed[] = [
  { id: 'carlsen', name: 'Magnus Carlsen', tickerName: 'Carlsen', country: 'NO', fideId: '1503014', price: 2830.5, change24h: 0.4, status: 'active', peakElo: 2882, winRate: 74.8, tournament: 'Norway Chess 2026' },
  { id: 'nakamura', name: 'Hikaru Nakamura', tickerName: 'Hikaru', country: 'US', fideId: '2016192', price: 2802.1, change24h: -0.1, status: 'active', peakElo: 2816, winRate: 68.2, tournament: 'Norway Chess 2026' },
  { id: 'gukesh', name: 'Gukesh Dommaraju', tickerName: 'Gukesh', country: 'IN', fideId: '46616543', price: 2794.0, change24h: 1.2, status: 'locked', peakElo: 2794, winRate: 66.5, tournament: 'Norway Chess 2026' },
  { id: 'caruana', name: 'Fabiano Caruana', tickerName: 'Caruana', country: 'US', fideId: '2020009', price: 2783.4, change24h: -0.6, status: 'active', peakElo: 2844, winRate: 67.1, tournament: 'Grand Chess Tour Bucharest' },
  { id: 'erigaisi', name: 'Arjun Erigaisi', tickerName: 'Erigaisi', country: 'IN', fideId: '35009192', price: 2779.8, change24h: 0.8, status: 'active', peakElo: 2801, winRate: 64.9, tournament: 'Tata Steel Masters 2026' },
  { id: 'firouzja', name: 'Alireza Firouzja', tickerName: 'Firouzja', country: 'FR', fideId: '12573981', price: 2763.2, change24h: -1.4, status: 'locked', peakElo: 2804, winRate: 63.7, tournament: 'Grand Chess Tour Paris' },
  { id: 'pragg', name: 'R Praggnanandhaa', tickerName: 'Pragg', country: 'IN', fideId: '25059530', price: 2758.6, change24h: 0.3, status: 'active', peakElo: 2779, winRate: 62.4, tournament: 'Tata Steel Masters 2026' },
  { id: 'weiyi', name: 'Wei Yi', tickerName: 'Wei Yi', country: 'CN', fideId: '8603405', price: 2754.0, change24h: 0.0, status: 'active', peakElo: 2763, winRate: 61.8, tournament: 'Chinese League 2026' },
  { id: 'abdusattorov', name: 'Nodirbek Abdusattorov', tickerName: 'Abdusattorov', country: 'UZ', fideId: '14204118', price: 2751.3, change24h: -0.2, status: 'active', peakElo: 2780, winRate: 63.0, tournament: 'Superbet Rapid & Blitz' },
  { id: 'ding', name: 'Ding Liren', tickerName: 'Ding', country: 'CN', fideId: '8603677', price: 2734.9, change24h: -0.9, status: 'active', peakElo: 2816, winRate: 58.6, tournament: 'Chinese League 2026' },
]

export const INITIAL_PLAYERS: Player[] = seeds.map(({ change24h, ...p }) => ({
  ...p,
  open: Math.round((p.price / (1 + change24h / 100)) * 100) / 100,
}))

export const INITIAL_CASH = 10_000

export const INITIAL_HOLDINGS: Holding[] = [
  { playerId: 'carlsen', shares: 3, avgPrice: 2791.4 },
  { playerId: 'gukesh', shares: 2, avgPrice: 2741.25 },
]

export const INITIAL_TRADES: Trade[] = [
  { id: 't-1004', timestamp: '2026-11-02 09:42:17', side: 'BUY', playerId: 'gukesh', shares: 1, price: 2752.5, fee: 13.76, status: 'FILLED' },
  { id: 't-1003', timestamp: '2026-11-02 09:15:03', side: 'SELL', playerId: 'nakamura', shares: 1, price: 2808.0, fee: 14.04, status: 'FILLED' },
  { id: 't-1002', timestamp: '2026-11-01 16:58:41', side: 'BUY', playerId: 'nakamura', shares: 1, price: 2799.3, fee: 14.0, status: 'FILLED' },
  { id: 't-1001', timestamp: '2026-11-01 14:22:09', side: 'BUY', playerId: 'gukesh', shares: 1, price: 2730.0, fee: 13.65, status: 'FILLED' },
  { id: 't-1000', timestamp: '2026-11-01 10:05:55', side: 'BUY', playerId: 'carlsen', shares: 3, price: 2791.4, fee: 41.87, status: 'FILLED' },
]

const TIMEFRAME_CONFIG: Record<Timeframe, { points: number; volatility: number; label: (i: number) => string }> = {
  '1D': { points: 48, volatility: 0.6, label: (i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}` },
  '1W': { points: 42, volatility: 1.4, label: (i) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][Math.floor(i / 6)] },
  '1M': { points: 30, volatility: 2.6, label: (i) => `Oct ${i + 3 > 31 ? i - 28 : i + 3}` },
  '1Y': { points: 52, volatility: 4.5, label: (i) => `W${i + 1}` },
  ALL: { points: 60, volatility: 9, label: (i) => `${2016 + Math.floor(i / 6)}` },
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function hashString(value: string) {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h)
}

export type ChartPoint = { label: string; price: number }

export function buildHistory(player: Player, timeframe: Timeframe): ChartPoint[] {
  const { points, volatility, label } = TIMEFRAME_CONFIG[timeframe]
  const rand = seededRandom(hashString(player.id + timeframe))
  const steps: number[] = []
  for (let i = 0; i < points - 1; i++) steps.push((rand() - 0.47) * volatility)

  const series: number[] = [player.price]
  for (let i = steps.length - 1; i >= 0; i--) series.unshift(series[0] - steps[i])

  return series.map((price, i) => ({
    label: label(i),
    price: Math.round(price * 100) / 100,
  }))
}

export const formatUSD = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatNumber = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatPct = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`

export const changePct = (player: Player) => ((player.price - player.open) / player.open) * 100

export function formatTimestamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
