import { ArrowLeft, Lock } from 'lucide-react'
import type { ModeConfig, ModeId } from './modes'

export function RoadmapView({ mode, onModeChange }: { mode: ModeConfig; onModeChange: (mode: ModeId) => void }) {
  const Icon = mode.icon
  return (
    <div className="flex h-full items-center justify-center p-4">
      <section className="flex max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-card px-8 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-lock/10 px-2 py-0.5 font-mono text-[10px] font-medium text-lock">
          <Lock className="size-3" aria-hidden="true" />
          Unlocks in {mode.tag}
        </span>
        <h1 className="text-lg font-semibold text-foreground text-balance">{mode.title}</h1>
        <p className="text-sm text-muted-foreground text-pretty">{mode.description}</p>
        <button
          type="button"
          onClick={() => onModeChange('spot')}
          className="mt-2 flex h-9 items-center gap-1.5 rounded-md bg-gain px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-gain/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Spot Desk
        </button>
      </section>
    </div>
  )
}
