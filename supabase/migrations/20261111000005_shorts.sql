-- Short positions table
create table public.short_positions (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id),
  player_id         uuid        not null references public.players(id),
  shares            integer     not null check (shares > 0),
  open_price        numeric     not null,
  collateral        numeric     not null,
  liquidation_price numeric     not null,
  opened_at         timestamptz not null default now()
);

alter table public.short_positions enable row level security;

create policy "users own shorts" on public.short_positions
  for all using (auth.uid() = user_id);

create index on public.short_positions(player_id);

grant select, insert, update, delete on public.short_positions to authenticated;

-- open_short: borrow shares from platform, receive proceeds minus fee
-- liquidation_price = open_price * 1.5 (auto-close if price rises 50%)
create or replace function public.open_short(
  p_player_id uuid,
  p_shares    integer,
  p_price     numeric
)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id     uuid    := auth.uid();
  v_notional    numeric := p_shares * p_price;
  v_fee         numeric := v_notional * 0.005;
  v_net_receive numeric := v_notional - v_fee;
begin
  update public.portfolios
     set cash = cash + v_net_receive
   where user_id = v_user_id;

  if not found then
    raise exception 'Portfolio not found.';
  end if;

  insert into public.short_positions (user_id, player_id, shares, open_price, collateral, liquidation_price)
  values (v_user_id, p_player_id, p_shares, p_price, v_notional, p_price * 1.5);

  insert into public.trades (user_id, player_id, side, shares, price, fee, executed_at)
  values (v_user_id, p_player_id, 'SHORT', p_shares, p_price, v_fee, now());
end;
$$;

grant execute on function public.open_short(uuid, integer, numeric) to authenticated;

-- cover_short: buy back shares to close/reduce a short position
create or replace function public.cover_short(
  p_short_id uuid,
  p_shares   integer,
  p_price    numeric
)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id        uuid    := auth.uid();
  v_cost           numeric := p_shares * p_price;
  v_fee            numeric := v_cost * 0.005;
  v_total_cost     numeric := v_cost + v_fee;
  v_current_shares integer;
  v_collateral     numeric;
  v_player_id      uuid;
  v_current_cash   numeric;
begin
  select shares, collateral, player_id
    into v_current_shares, v_collateral, v_player_id
    from public.short_positions
   where id = p_short_id and user_id = v_user_id;

  if not found then
    raise exception 'Short position not found.';
  end if;

  if p_shares > v_current_shares then
    raise exception 'Cannot cover more shares than the open short position.';
  end if;

  select cash into v_current_cash from public.portfolios where user_id = v_user_id;
  if v_current_cash < v_total_cost then
    raise exception 'Insufficient cash to cover. Need % but have %', round(v_total_cost, 2), round(v_current_cash, 2);
  end if;

  update public.portfolios
     set cash = cash - v_total_cost
   where user_id = v_user_id;

  if v_current_shares = p_shares then
    delete from public.short_positions where id = p_short_id;
  else
    update public.short_positions
       set shares     = shares - p_shares,
           collateral = collateral * ((v_current_shares - p_shares)::numeric / v_current_shares)
     where id = p_short_id;
  end if;

  insert into public.trades (user_id, player_id, side, shares, price, fee, executed_at)
  values (v_user_id, v_player_id, 'COVER', p_shares, p_price, v_fee, now());
end;
$$;

grant execute on function public.cover_short(uuid, integer, numeric) to authenticated;

-- liquidate_short: force-close at current price, no fee (called by sync script)
-- User already received (open_price * shares - fee) when opening.
-- Loss = (current_price - open_price) * shares — deducted from cash.
create or replace function public.liquidate_short(
  p_user_id  uuid,
  p_short_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_shares      integer;
  v_open_price  numeric;
  v_player_id   uuid;
  v_current_elo numeric;
  v_loss        numeric;
begin
  select s.shares, s.open_price, s.player_id, pl.elo
    into v_shares, v_open_price, v_player_id, v_current_elo
    from public.short_positions s
    join public.players pl on pl.id = s.player_id
   where s.id = p_short_id and s.user_id = p_user_id;

  if not found then return; end if;

  v_loss := (v_current_elo - v_open_price) * v_shares;

  update public.portfolios
     set cash = cash - v_loss
   where user_id = p_user_id;

  delete from public.short_positions where id = p_short_id;

  insert into public.trades (user_id, player_id, side, shares, price, fee, executed_at)
  values (p_user_id, v_player_id, 'COVER', v_shares, v_current_elo, 0, now());
end;
$$;

grant execute on function public.liquidate_short(uuid, uuid) to service_role;
