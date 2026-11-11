import { supabase } from './client'

export async function fetchPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('elo', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchRatingHistory(playerId: string) {
  const { data, error } = await supabase
    .from('rating_history')
    .select('elo, synced_at')
    .eq('player_id', playerId)
    .order('synced_at', { ascending: true })
    .limit(60)
  if (error) throw error
  return data ?? []
}

export async function fetchPortfolio(userId: string) {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    const { data: created, error: createError } = await supabase
      .from('portfolios')
      .upsert({ user_id: userId, cash: 10000 }, { onConflict: 'user_id', ignoreDuplicates: true })
      .select()
      .maybeSingle()
    if (createError) throw createError
    if (created) return created
    // row already existed, fetch it
    const { data: existing, error: fetchError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (fetchError) throw fetchError
    return existing
  }
  return data
}

export async function fetchHoldings(userId: string) {
  const { data, error } = await supabase
    .from('holdings')
    .select('*, players(name, elo)')
    .eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

export async function fetchTrades(userId: string) {
  const { data, error } = await supabase
    .from('trades')
    .select('*, players(name)')
    .eq('user_id', userId)
    .order('executed_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchLeaderboard() {
  const { data, error } = await supabase.rpc('get_leaderboard')
  if (error) throw error
  return (data ?? []) as { rank: number; user_id: string; net_worth: number }[]
}

export async function executeTrade(playerId: string, side: 'BUY' | 'SELL', shares: number, price: number) {
  const { data, error } = await supabase.rpc('execute_trade', {
    p_player_id: playerId,
    p_side: side,
    p_shares: shares,
    p_price: price,
  })
  if (error) throw error
  return data
}
