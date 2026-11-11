-- RPC used by sync-fide.mjs to upsert players while preserving peak_elo when it is higher
-- than the incoming rating.
create or replace function public.sync_players(p_players jsonb)
returns void
language plpgsql
security definer
as $$
declare
  p jsonb;
begin
  for p in select * from jsonb_array_elements(p_players)
  loop
    insert into public.players (fide_id, name, country, title, elo, peak_elo, elo_change_24h, win_rate, tournament, is_locked, updated_at)
    values (
      p->>'fide_id',
      p->>'name',
      p->>'country',
      p->>'title',
      (p->>'elo')::integer,
      (p->>'elo')::integer,
      0,
      0,
      null,
      false,
      now()
    )
    on conflict (fide_id) do update set
      name           = excluded.name,
      country        = excluded.country,
      title          = excluded.title,
      elo_change_24h = excluded.elo - players.elo,
      elo            = excluded.elo,
      peak_elo       = greatest(players.peak_elo, excluded.elo),
      is_locked      = false,
      updated_at     = now();
  end loop;
end;
$$;

grant execute on function public.sync_players(jsonb) to service_role;
