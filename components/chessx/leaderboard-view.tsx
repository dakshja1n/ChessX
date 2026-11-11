'use client'

import { useEffect, useState } from 'react'
import { fetchLeaderboard, upsertDisplayName } from '@/lib/supabase/queries'
import { formatUSD } from '@/lib/market-data'
import { cn } from '@/lib/utils'

const STARTING_CASH = 10_000

type Row = { rank: number; user_id: string; display_name: string | null; net_worth: number }

function shortId(uid: string) {
  return `${uid.slice(0, 4)}…${uid.slice(-4)}`
}

type Props = {
  userId: string | null
  displayName: string
  onDisplayNameChange: (name: string) => void
}

export function LeaderboardView({ userId, displayName, onDisplayNameChange }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const hasUsername = displayName && !/^[a-f0-9-]{36}$/.test(displayName) && displayName !== 'Trader'
  const myRow = rows.find((r) => r.user_id === userId)
  const hasProfileName = myRow?.display_name != null

  useEffect(() => {
    fetchLeaderboard()
      .then(setRows)
      .catch((e) => setError(e?.message ?? 'Failed to load leaderboard'))
      .finally(() => setLoading(false))
  }, [])

  const saveUsername = async () => {
    const name = nameInput.trim()
    if (name.length < 3 || name.length > 20) {
      setNameError('Must be 3–20 characters')
      return
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      setNameError('Only letters, numbers, _ and - allowed')
      return
    }
    if (!userId) return
    setSaving(true)
    setNameError(null)
    try {
      await upsertDisplayName(userId, name)
      onDisplayNameChange(name)
      // refresh leaderboard to show updated name
      const updated = await fetchLeaderboard()
      setRows(updated)
      setNameInput('')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setNameError(msg.includes('unique') ? 'That username is taken' : msg)
    } finally {
      setSaving(false)
    }
  }

  const myRank = myRow?.rank ?? null

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <section className="flex shrink-0 items-center justify-between rounded-lg border border-border bg-card px-5 py-4">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-gain">LIVE RANKINGS</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Leaderboard</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Ranked by net worth — cash plus current market value of all holdings.</p>
        </div>
        {myRank && (
          <div className="text-right">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground">YOUR RANK</p>
            <p className="font-mono text-3xl font-semibold text-gain tabular-nums">#{myRank}</p>
            <p className="font-mono text-xs text-muted-foreground">of {rows.length} traders</p>
          </div>
        )}
      </section>

      {!hasProfileName && userId && (
        <section className="flex shrink-0 items-center gap-3 rounded-lg border border-gain/30 bg-gain/5 px-5 py-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Set your trader name</p>
            <p className="text-xs text-muted-foreground">Show up on the leaderboard with a name instead of an ID.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => { setNameInput(e.target.value); setNameError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && saveUsername()}
              placeholder="e.g. KasparovFan"
              maxLength={20}
              className="h-8 w-40 rounded-md border border-input bg-background px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={saveUsername}
              disabled={saving || !nameInput.trim()}
              className="h-8 rounded-md bg-gain px-3 font-mono text-xs font-semibold text-primary-foreground transition-colors hover:bg-gain/90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {nameError && <p className="w-full font-mono text-xs text-loss">{nameError}</p>}
        </section>
      )}

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-mono text-xs font-semibold tracking-widest text-foreground">TOP TRADERS</h2>
          <span className="font-mono text-[10px] text-muted-foreground">{rows.length} LISTED</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading leaderboard...</p>
          )}
          {error && (
            <p className="px-4 py-8 text-center text-sm text-loss">{error}</p>
          )}
          {!loading && !error && (
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground">
                  <th scope="col" className="w-12 px-4 py-2 font-medium">RANK</th>
                  <th scope="col" className="px-4 py-2 font-medium">TRADER</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">NET WORTH</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">VS START</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                {rows.map((r) => {
                  const isMe = r.user_id === userId
                  const returnPct = ((r.net_worth - STARTING_CASH) / STARTING_CASH) * 100
                  const label = r.display_name ?? shortId(r.user_id)
                  return (
                    <tr
                      key={r.user_id}
                      className={cn(
                        'border-b border-border/60 last:border-0',
                        isMe && 'bg-accent shadow-[inset_2px_0_0_0_var(--gain)]',
                      )}
                    >
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                        <span className={cn(
                          'font-bold',
                          r.rank === 1 && 'text-yellow-400',
                          r.rank === 2 && 'text-slate-400',
                          r.rank === 3 && 'text-amber-600',
                        )}>
                          #{r.rank}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('font-medium', isMe ? 'text-gain' : 'text-foreground')}>
                          {label}
                        </span>
                        {isMe && (
                          <span className="ml-2 rounded-sm bg-gain/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-gain">YOU</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                        {formatUSD(r.net_worth)}
                      </td>
                      <td className={cn('px-4 py-2.5 text-right tabular-nums', returnPct >= 0 ? 'text-gain' : 'text-loss')}>
                        {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No traders yet. Be the first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
