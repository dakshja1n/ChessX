-- User profiles: display name for leaderboard and UI.
-- One row per user, created on first save.
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now(),
  constraint display_name_length check (char_length(display_name) between 3 and 20),
  constraint display_name_unique unique (display_name)
);

alter table public.profiles enable row level security;

-- Anyone authenticated can read all profiles (needed for leaderboard display names)
create policy "Authenticated read profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only insert/update their own row
create policy "Users manage own profile"
  on public.profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;

-- Drop old leaderboard function so we can change its return type (add display_name column)
drop function if exists public.get_leaderboard();

-- Update leaderboard RPC to include display_name
create or replace function public.get_leaderboard()
returns table (
  rank         bigint,
  user_id      uuid,
  display_name text,
  net_worth    numeric
)
language sql
security definer
stable
as $$
  select
    row_number() over (order by net_worth desc) as rank,
    user_id,
    display_name,
    net_worth
  from (
    select
      p.user_id,
      coalesce(pr.display_name, null) as display_name,
      p.cash + coalesce(sum(h.shares * pl.elo), 0) as net_worth
    from portfolios p
    left join holdings h on h.user_id = p.user_id
    left join players pl on pl.id = h.player_id
    left join profiles pr on pr.user_id = p.user_id
    group by p.user_id, p.cash, pr.display_name
  ) sub
  order by net_worth desc
  limit 100;
$$;

grant execute on function public.get_leaderboard() to authenticated;
