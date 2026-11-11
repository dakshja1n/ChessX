-- Add leverage columns to holdings and trades
alter table public.holdings
  add column if not exists leverage          smallint not null default 1,
  add column if not exists borrowed_amount   numeric  not null default 0,
  add column if not exists liquidation_price numeric;

alter table public.trades
  add column if not exists leverage        smallint not null default 1,
  add column if not exists borrowed_amount numeric  not null default 0;

-- Drop and recreate execute_trade with leverage support
drop function if exists public.execute_trade(uuid, text, integer, numeric);

create or replace function public.execute_trade(
  p_player_id  uuid,
  p_side       text,
  p_shares     integer,
  p_price      numeric,
  p_leverage   smallint default 1
)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id         uuid := auth.uid();
  v_notional        numeric := p_shares * p_price;
  v_equity          numeric := v_notional / p_leverage;
  v_borrowed        numeric := v_notional - v_equity;
  v_fee             numeric := v_notional * 0.005;
  v_cash_needed     numeric := v_equity + v_fee;
  v_current_cash    numeric;
  v_current_shares  numeric;
  v_current_avg     numeric;
  v_current_borrow  numeric;
  v_new_shares      numeric;
  v_new_avg         numeric;
  v_new_borrow      numeric;
  v_repay           numeric;
  v_proceeds        numeric;
  v_liq_price       numeric;
begin
  if p_side = 'BUY' then
    -- Check sufficient cash (user only needs equity + fee, platform lends the rest)
    select cash into v_current_cash from public.portfolios where user_id = v_user_id;
    if v_current_cash < v_cash_needed then
      raise exception 'Insufficient cash. Need % but have %', round(v_cash_needed, 2), round(v_current_cash, 2);
    end if;

    -- Deduct equity + fee from portfolio cash
    update public.portfolios set cash = cash - v_cash_needed where user_id = v_user_id;

    -- Upsert holding with weighted avg_cost, accumulated borrowed_amount
    select shares, avg_cost, borrowed_amount
      into v_current_shares, v_current_avg, v_current_borrow
      from public.holdings
     where user_id = v_user_id and player_id = p_player_id;

    if found then
      v_new_shares  := v_current_shares + p_shares;
      v_new_avg     := ((v_current_shares * v_current_avg) + (p_shares * p_price)) / v_new_shares;
      v_new_borrow  := v_current_borrow + v_borrowed;
    else
      v_new_shares  := p_shares;
      v_new_avg     := p_price;
      v_new_borrow  := v_borrowed;
    end if;

    -- Liquidation price: avg_cost × (1 - 1/leverage) × 0.95 maintenance buffer
    -- For 1x (spot), liquidation_price is null (no liquidation risk)
    if p_leverage > 1 then
      v_liq_price := v_new_avg * (1 - 1.0 / p_leverage) * 0.95;
    else
      v_liq_price := null;
    end if;

    insert into public.holdings (user_id, player_id, shares, avg_cost, leverage, borrowed_amount, liquidation_price)
    values (v_user_id, p_player_id, v_new_shares, v_new_avg, p_leverage, v_new_borrow, v_liq_price)
    on conflict (user_id, player_id) do update set
      shares           = v_new_shares,
      avg_cost         = v_new_avg,
      leverage         = p_leverage,
      borrowed_amount  = v_new_borrow,
      liquidation_price = v_liq_price;

    -- Record trade
    insert into public.trades (user_id, player_id, side, shares, price, fee, leverage, borrowed_amount, executed_at)
    values (v_user_id, p_player_id, 'BUY', p_shares, p_price, v_fee, p_leverage, v_borrowed, now());

  elsif p_side = 'SELL' then
    -- Check sufficient shares
    select shares, borrowed_amount into v_current_shares, v_current_borrow
      from public.holdings
     where user_id = v_user_id and player_id = p_player_id;

    if not found or v_current_shares < p_shares then
      raise exception 'Insufficient shares.';
    end if;

    -- Repay borrowed proportionally
    v_repay    := v_current_borrow * (p_shares::numeric / v_current_shares);
    v_fee      := v_notional * 0.005;
    v_proceeds := v_notional - v_repay - v_fee;

    -- Return proceeds to portfolio
    update public.portfolios set cash = cash + v_proceeds where user_id = v_user_id;

    -- Update or delete holding
    if v_current_shares = p_shares then
      delete from public.holdings where user_id = v_user_id and player_id = p_player_id;
    else
      update public.holdings set
        shares          = shares - p_shares,
        borrowed_amount = borrowed_amount - v_repay
      where user_id = v_user_id and player_id = p_player_id;
    end if;

    -- Record trade
    insert into public.trades (user_id, player_id, side, shares, price, fee, leverage, borrowed_amount, executed_at)
    values (v_user_id, p_player_id, 'SELL', p_shares, p_price, v_fee, 1, v_repay, now());
  end if;
end;
$$;

grant execute on function public.execute_trade(uuid, text, integer, numeric, smallint) to authenticated;

-- Liquidation RPC: force-close a leveraged position at current price, no fee
-- Called by sync-fide.mjs after price updates
create or replace function public.liquidate_position(
  p_user_id   uuid,
  p_player_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_shares         numeric;
  v_borrowed       numeric;
  v_current_price  numeric;
  v_proceeds       numeric;
begin
  select h.shares, h.borrowed_amount, pl.elo
    into v_shares, v_borrowed, v_current_price
    from public.holdings h
    join public.players pl on pl.id = h.player_id
   where h.user_id = p_user_id and h.player_id = p_player_id;

  if not found then return; end if;

  -- Proceeds = notional - repay borrow (no fee on liquidation)
  v_proceeds := greatest(0, (v_shares * v_current_price) - v_borrowed);

  update public.portfolios set cash = cash + v_proceeds where user_id = p_user_id;

  delete from public.holdings where user_id = p_user_id and player_id = p_player_id;

  insert into public.trades (user_id, player_id, side, shares, price, fee, leverage, borrowed_amount, executed_at)
  values (p_user_id, p_player_id, 'SELL', v_shares, v_current_price, 0, 1, v_borrowed, now());
end;
$$;

grant execute on function public.liquidate_position(uuid, uuid) to service_role;
