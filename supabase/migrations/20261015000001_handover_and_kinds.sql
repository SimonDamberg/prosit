-- After the scan: the member handover and two new event kinds.
--
-- * Handover ("Överlämna medlemskortet"): a phone that lost its identity gets its member back
--   instead of joining again under a new name (a ghost that collects a PROSIT! Strafe every ten
--   minutes). Any joined member may issue a short-lived claim code for any member, the new phone
--   claims it and receives a fresh token, and the old token stops working. No admin: any member
--   can vouch, as with everything else in this club.
-- * Event kinds 'ehrengericht' and 'stadgeandring' (src/shared/game/schedule.ts).

-- Handover --------------------------------------------------------------------------------

alter table public.member_secrets
  add column claim_code text unique,
  add column claim_expires timestamptz;

-- A code for `p_target`, valid for ten minutes. A new code replaces the previous one.
create function public.issue_claim(p_member_id uuid, p_token uuid, p_target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(substr(md5(gen_random_uuid()::text), 1, 8));
begin
  perform private.check_member(p_member_id, p_token);
  update public.member_secrets s
  set claim_code = v_code, claim_expires = now() + interval '10 minutes'
  where s.member_id = p_target;
  if not found then
    raise exception 'target_not_found';
  end if;
  return v_code;
end
$$;

-- Trades a valid code for the member and a new token. The code is spent, the old token dies.
create function public.claim(p_code text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_token uuid := gen_random_uuid();
begin
  update public.member_secrets s
  set token = v_token, claim_code = null, claim_expires = null
  where s.claim_code = upper(btrim(coalesce(p_code, ''))) and s.claim_expires > now()
  returning s.member_id into v_id;
  if v_id is null then
    raise exception 'claim_invalid';
  end if;
  return json_build_object('id', v_id, 'token', v_token);
end
$$;

-- Event kinds -----------------------------------------------------------------------------

alter table public.events drop constraint events_kind_check;
alter table public.events add constraint events_kind_check
  check (kind in ('prosit', 'duell', 'regel', 'abstimmung', 'schatzfrage', 'trinkspruch', 'ehrengericht', 'stadgeandring'));

-- As in 20261013000002_engine.sql, with the two new kinds.
create or replace function public.spawn_event(
  p_member_id uuid,
  p_token uuid,
  p_seq int,
  p_kind text,
  p_payload jsonb,
  p_ends_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_member_id is not null then
    perform private.check_member(p_member_id, p_token);
  end if;
  if p_seq is null or p_seq < 1
    or p_ends_at is null
    or p_kind is null
    or p_kind not in ('prosit', 'duell', 'regel', 'abstimmung', 'schatzfrage', 'trinkspruch', 'ehrengericht', 'stadgeandring')
    or p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
    or p_payload ->> 'kind' is distinct from p_kind
  then
    raise exception 'event_invalid';
  end if;
  if private.night_status() <> 'live' then
    return false;
  end if;
  if p_seq <> (select coalesce(max(e.seq), 0) + 1 from public.events e) then
    return false;
  end if;

  insert into public.events (seq, kind, payload, ends_at)
  values (p_seq, p_kind, p_payload, p_ends_at)
  on conflict (seq) do nothing
  returning id into v_id;
  return v_id is not null;
end
$$;

-- Grants ----------------------------------------------------------------------------------

revoke execute on function
  public.issue_claim(uuid, uuid, uuid),
  public.claim(text)
from public;

grant execute on function
  public.issue_claim(uuid, uuid, uuid),
  public.claim(text)
to anon, authenticated;
