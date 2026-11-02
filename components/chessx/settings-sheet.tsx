'use client'

import { FileText, KeyRound, Menu, ScrollText, Wallet } from 'lucide-react'
import { FEE_RATE, formatUSD } from '@/lib/market-data'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

export function SettingsSheet({ cash }: { cash: number }) {
  const sections = [
    {
      icon: Wallet,
      title: 'Wallet Deposits',
      body: (
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-muted-foreground">Available</span>
          <span className="font-semibold text-foreground tabular-nums">{formatUSD(cash)} USD</span>
        </div>
      ),
      meta: 'Last deposit: 2026-10-28 · ACH · $5,000.00',
    },
    {
      icon: FileText,
      title: 'Tax Statements',
      body: <p className="text-xs text-muted-foreground">1099-B for tax year 2025 is ready. 2026 statement issues in Feb 2027.</p>,
      meta: '2 documents available',
    },
    {
      icon: KeyRound,
      title: 'API Keys',
      body: (
        <p className="font-mono text-xs text-muted-foreground">
          cx_live_••••••••4f2a <span className="text-gain">· read/trade</span>
        </p>
      ),
      meta: 'Created 2026-09-14 · Rate limit 50 req/s',
    },
    {
      icon: ScrollText,
      title: 'System Rules',
      body: (
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          <li>1 Elo point = $1.00 USD per share.</li>
          <li>{(FEE_RATE * 100).toFixed(1)}% platform fee on every fill.</li>
          <li>Trading locks while a GM is in a rated game.</li>
        </ul>
      ),
      meta: 'Rulebook v1.3',
    },
  ]

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
          <SheetDescription className="text-xs">Jordan Diaz · Verified trader</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
          {sections.map(({ icon: Icon, title, body, meta }) => (
            <section key={title} className="rounded-md border border-border bg-card p-3">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon className="size-4 text-gain" aria-hidden="true" />
                {title}
              </h3>
              {body}
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">{meta}</p>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
