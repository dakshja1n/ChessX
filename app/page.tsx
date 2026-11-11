import { AuthGate } from '@/components/chessx/auth-gate'
import { TradingDesk } from '@/components/chessx/trading-desk'

export default function Page() {
  return (
    <AuthGate>
      <TradingDesk />
    </AuthGate>
  )
}