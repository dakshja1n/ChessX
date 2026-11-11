-- Stores a rating snapshot per player per sync run.
-- One row per (player_id, synced_at). The sync script inserts after each FIDE upsert.
create table if not exists public.rating_history (
  id            bigserial primary key,
  player_id     uuid not null references public.players(id) on delete cascade,
  elo           integer not null,
  synced_at     timestamptz not null default now()
);

create index if not exists rating_history_player_id_synced_at
  on public.rating_history (player_id, synced_at desc);

-- Public read, service_role write (same pattern as players)
alter table public.rating_history enable row level security;

create policy "Public read rating_history"
  on public.rating_history for select
  using (true);

grant select on public.rating_history to authenticated, anon;
grant all    on public.rating_history to service_role;
grant usage, select on sequence public.rating_history_id_seq to service_role;
