'use client'

import { Menu, ScrollText, Wallet } from 'lucide-react'
import { FEE_RATE, formatUSD } from '@/lib/market-data'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

export function SettingsSheet({ cash, displayName }: { cash: number; displayName: string }) {
  return (
    <Sheet>
      <SheetTrigger
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open account and settings"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-80 border-border bg-panel">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-mono text-xs tracking-widest">ACCOUNT &amp; SETTINGS</SheetTitle>
          <SheetDescription className="text-xs">{displayName} · Verified trader</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
          <section className="rounded-md border border-border bg-card p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Wallet className="size-4 text-gain" aria-hidden="true" />
              Wallet
            </h3>
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-muted-foreground">Available cash</span>
              <span className="font-semibold text-foreground tabular-nums">{formatUSD(cash)} USD</span>
            </div>
          </section>

          <section className="rounded-md border border-border bg-card p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <ScrollText className="size-4 text-gain" aria-hidden="true" />
              System Rules
            </h3>
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              <li>1 Elo point = $1.00 USD per share.</li>
              <li>{(FEE_RATE * 100).toFixed(1)}% platform fee on every fill.</li>
              <li>Prices update monthly when FIDE publishes ratings.</li>
              <li>Trading locks while a GM is in a rated game.</li>
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
