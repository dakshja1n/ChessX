-- Leaderboard RPC: returns all users ranked by net worth (cash + holdings market value)
-- security definer so authenticated users can read other users' aggregated data
-- without needing cross-user RLS access to portfolios/holdings directly.
create or replace function public.get_leaderboard()
returns table (
  rank        bigint,
  user_id     uuid,
  net_worth   numeric
)
language sql
security definer
stable
as $$
  select
    row_number() over (order by net_worth desc) as rank,
    user_id,
    net_worth
  from (
    select
      p.user_id,
      p.cash + coalesce(sum(h.shares * pl.elo), 0) as net_worth
    from portfolios p
    left join holdings h on h.user_id = p.user_id
    left join players pl on pl.id = h.player_id
    group by p.user_id, p.cash
  ) sub
  order by net_worth desc
  limit 100;
$$;

grant execute on function public.get_leaderboard() to authenticated;
