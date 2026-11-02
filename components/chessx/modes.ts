import { Activity, CalendarRange, Gauge, House, TrendingUp, type LucideIcon } from 'lucide-react'

export type ModeId = 'home' | 'spot' | 'prodigy' | 'staking' | 'blitz'

export type ModeConfig = {
  id: ModeId
  short: string
  label: string
  tag: string | null
  status: 'active' | 'phase'
  icon: LucideIcon
  title: string
  description: string
}

export const MODES: ModeConfig[] = [
  {
    id: 'home',
    short: 'Home',
    label: 'Home Hub',
    tag: null,
    status: 'active',
    icon: House,
    title: 'Home Hub',
    description: 'Overview of your account, game modes, and holdings.',
  },
  {
    id: 'spot',
    short: 'M1',
    label: 'Spot Desk',
    tag: 'Active',
    status: 'active',
    icon: TrendingUp,
    title: 'Mode 1: Spot Exchange',
    description: 'Trade GM Elo equity with 0.5% fees and live match locks.',
  },
  {
    id: 'prodigy',
    short: 'M2',
    label: 'Prodigy Curve',
    tag: 'Phase 4',
    status: 'phase',
    icon: Activity,
    title: 'Mode 2: Prodigy Curve',
    description: 'AMM continuous bonding curves for rising GMs.',
  },
  {
    id: 'staking',
    short: 'M3',
    label: 'Event Staking',
    tag: 'Phase 3',
    status: 'phase',
    icon: CalendarRange,
    title: 'Mode 3: Event Staking & Drafts',
    description: 'Salary cap tournament draft rooms with yield payouts.',
  },
  {
    id: 'blitz',
    short: 'M4',
    label: 'Blitz CLOB',
    tag: 'Phase 4',
    status: 'phase',
    icon: Gauge,
    title: 'Mode 4: Wall Street Blitz',
    description: 'High-frequency Central Limit Order Book for blitz games.',
  },
]
