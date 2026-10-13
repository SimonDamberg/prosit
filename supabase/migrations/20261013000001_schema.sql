-- Prosit! schema: tables, RLS, grants, realtime publication and every RPC.
-- Anon may SELECT (except member_secrets). Writes happen only through the SECURITY DEFINER RPCs
-- below. Errors are raised as stable codes (message = code); src/shared/content/errors.ts holds
-- the copy and src/lib/errors.ts maps them.
-- jsonb shapes: events.payload = EventPayload, events.result = EventResult,
-- responses.payload = EventResponse (src/shared/game/types.ts).
-- Constants mirror src/shared/game/members.ts: MAX_NAME_LENGTH 16, MAX_MEMBERS 8,
-- MAX_REASON_LENGTH 80.

-- Helpers live in a schema PostgREST does not expose.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Tables ----------------------------------------------------------------------------------

create table public.night (
  id boolean primary key default true check (id),
  status text not null default 'idle' check (status in ('idle', 'live', 'ended')),
  -- Set by start_night. Event N is scheduled from createRng(seed + N).
  seed int,
  started_at timestamptz,
  interval_min numeric(4, 1) not null default 12 check (interval_min between 0.5 and 60),
  ended_at timestamptz
);
insert into public.night (id) values (true);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 16),
  colour text not null unique check (colour ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now()
);
create unique index members_name_idx on public.members (lower(name));

create table public.member_secrets (
  member_id uuid primary key references public.members (id) on delete cascade,
  token uuid not null default gen_random_uuid()
);

create table public.drinks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  kind text not null check (kind in ('ol', 'mass', 'schnaps', 'wasser')),
  at timestamptz not null default now()
);
create index drinks_member_id_idx on public.drinks (member_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  -- One night at a time (night is a singleton), so seq alone is the race guard.
  seq int not null unique check (seq > 0),
  kind text not null
    check (kind in ('prosit', 'duell', 'regel', 'abstimmung', 'schatzfrage', 'trinkspruch')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'live' check (status in ('live', 'done')),
  -- null until resolved.
  result jsonb
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  at timestamptz not null default now(),
  unique (event_id, member_id)
);

create table public.strafen (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  -- null: handed out by an event, not by a member.
  given_by uuid references public.members (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 80),
  event_id uuid references public.events (id) on delete cascade,
  at timestamptz not null default now()
);

create table public.points (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  amount int not null,
  reason text not null,
  event_id uuid references public.events (id) on delete cascade,
  at timestamptz not null default now()
);

-- RLS and grants --------------------------------------------------------------------------

alter table public.night enable row level security;
alter table public.members enable row level security;
alter table public.member_secrets enable row level security;
alter table public.drinks enable row level security;
alter table public.events enable row level security;
alter table public.responses enable row level security;
alter table public.strafen enable row level security;
alter table public.points enable row level security;

revoke all on
  public.night, public.members, public.member_secrets, public.drinks, public.events,
  public.responses, public.strafen, public.points
from public, anon, authenticated;

grant select on
  public.night, public.members, public.drinks, public.events, public.responses,
  public.strafen, public.points
to anon, authenticated;

create policy "public read" on public.night for select to anon, authenticated using (true);
create policy "public read" on public.members for select to anon, authenticated using (true);
create policy "public read" on public.drinks for select to anon, authenticated using (true);
create policy "public read" on public.events for select to anon, authenticated using (true);
create policy "public read" on public.responses for select to anon, authenticated using (true);
create policy "public read" on public.strafen for select to anon, authenticated using (true);
create policy "public read" on public.points for select to anon, authenticated using (true);
-- member_secrets: no grants, no policies.

-- Realtime --------------------------------------------------------------------------------

alter publication supabase_realtime add table
  public.night, public.members, public.drinks, public.events, public.responses,
  public.strafen, public.points;

-- Private helpers -------------------------------------------------------------------------

create function private.check_member(p_member_id uuid, p_token uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_token uuid;
begin
  select s.token into v_token from public.member_secrets s where s.member_id = p_member_id;
  if not found then
    raise exception 'member_not_found';
  end if;
  if p_token is null or v_token <> p_token then
    raise exception 'invalid_token';
  end if;
end
$$;

-- Trims, collapses whitespace and validates a member name. Mirrors cleanName in members.ts.
create function private.clean_name(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if char_length(v) = 0 then
    raise exception 'name_empty';
  end if;
  if char_length(v) > 16 then
    raise exception 'name_too_long';
  end if;
  return v;
end
$$;

create function private.night_status()
returns text
language sql
stable
set search_path = ''
as $$
  select n.status from public.night n
$$;

-- Members ---------------------------------------------------------------------------------

create function public.join(p_name text, p_colour text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := private.clean_name(p_name);
  v_colour text := lower(btrim(coalesce(p_colour, '')));
  v_status text;
  v_id uuid;
  v_token uuid;
begin
  if v_colour !~ '^#[0-9a-f]{6}$' then
    raise exception 'colour_invalid';
  end if;

  -- The night row doubles as the mutex that makes the checks below race-free.
  select n.status into v_status from public.night n for update;
  if v_status = 'ended' then
    raise exception 'night_ended';
  end if;
  if (select count(*) from public.members) >= 8 then
    raise exception 'club_full';
  end if;
  if exists (select 1 from public.members m where lower(m.name) = lower(v_name)) then
    raise exception 'name_taken';
  end if;
  if exists (select 1 from public.members m where m.colour = v_colour) then
    raise exception 'colour_taken';
  end if;

  insert into public.members (name, colour) values (v_name, v_colour)
  returning id into v_id;
  insert into public.member_secrets (member_id) values (v_id)
  returning token into v_token;

  return json_build_object('id', v_id, 'token', v_token);
end
$$;

-- Drinks ----------------------------------------------------------------------------------

-- Allowed while the night is idle too: the log is useful before anyone starts the events.
create function public.log_drink(p_member_id uuid, p_token uuid, p_kind text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.drinks;
begin
  perform private.check_member(p_member_id, p_token);
  if private.night_status() = 'ended' then
    raise exception 'night_ended';
  end if;
  if p_kind is null or p_kind not in ('ol', 'mass', 'schnaps', 'wasser') then
    raise exception 'drink_invalid';
  end if;

  insert into public.drinks (member_id, kind) values (p_member_id, p_kind)
  returning * into v_row;
  return row_to_json(v_row);
end
$$;

-- Removes the caller's latest drink and returns its id.
create function public.undo_drink(p_member_id uuid, p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.check_member(p_member_id, p_token);
  if private.night_status() = 'ended' then
    raise exception 'night_ended';
  end if;

  delete from public.drinks d
  where d.id = (
    select d2.id from public.drinks d2
    where d2.member_id = p_member_id
    order by d2.at desc, d2.id
    limit 1
  )
  returning d.id into v_id;
  if v_id is null then
    raise exception 'nothing_to_undo';
  end if;
  return v_id;
end
$$;

-- Strafen ---------------------------------------------------------------------------------

create function public.give_strafe(p_member_id uuid, p_token uuid, p_target uuid, p_reason text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := btrim(regexp_replace(coalesce(p_reason, ''), '\s+', ' ', 'g'));
  v_row public.strafen;
begin
  perform private.check_member(p_member_id, p_token);
  if private.night_status() = 'ended' then
    raise exception 'night_ended';
  end if;
  if char_length(v_reason) = 0 then
    raise exception 'reason_empty';
  end if;
  if char_length(v_reason) > 80 then
    raise exception 'reason_too_long';
  end if;
  if not exists (select 1 from public.members m where m.id = p_target) then
    raise exception 'target_not_found';
  end if;

  insert into public.strafen (member_id, given_by, reason) values (p_target, p_member_id, v_reason)
  returning * into v_row;
  return row_to_json(v_row);
end
$$;

-- Night -----------------------------------------------------------------------------------

-- idle -> live. Already live is a no-op, so two members tapping at once both succeed.
create function public.start_night(p_member_id uuid, p_token uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.night;
begin
  perform private.check_member(p_member_id, p_token);
  select * into v_row from public.night for update;
  if v_row.status = 'ended' then
    raise exception 'night_ended';
  end if;
  if v_row.status = 'idle' then
    update public.night n
    set status = 'live', seed = floor(random() * 2147483647)::int, started_at = now()
    where n.id
    returning * into v_row;
  end if;
  return row_to_json(v_row);
end
$$;

create function public.set_interval(p_member_id uuid, p_token uuid, p_minutes numeric)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.night;
begin
  perform private.check_member(p_member_id, p_token);
  if p_minutes is null or p_minutes < 0.5 or p_minutes > 60 then
    raise exception 'interval_invalid';
  end if;
  update public.night n set interval_min = round(p_minutes, 1) where n.id
  returning * into v_row;
  return row_to_json(v_row);
end
$$;

-- live -> ended. Anything else is a no-op.
create function public.end_night(p_member_id uuid, p_token uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.night;
begin
  perform private.check_member(p_member_id, p_token);
  update public.night n set status = 'ended', ended_at = now()
  where n.id and n.status = 'live';
  select * into v_row from public.night;
  return row_to_json(v_row);
end
$$;

-- Back to idle with an empty log. Members stay unless p_wipe_members, which also signs every
-- phone out (their member row is gone).
create function public.reset_night(p_member_id uuid, p_token uuid, p_wipe_members boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_member(p_member_id, p_token);
  perform 1 from public.night for update;

  -- "where true": hosted Supabase refuses a DELETE without a WHERE clause.
  delete from public.events where true;
  delete from public.strafen where true;
  delete from public.points where true;
  delete from public.drinks where true;
  if coalesce(p_wipe_members, false) then
    delete from public.members where true;
  end if;
  update public.night n
  set status = 'idle', seed = null, started_at = null, ended_at = null, interval_min = 12
  where n.id;
end
$$;

-- Events ----------------------------------------------------------------------------------
-- Every connected client runs the same engine and calls these when an event is due, so they
-- race on purpose. The first write wins; the rest return false.

create function public.spawn_event(
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
  perform private.check_member(p_member_id, p_token);
  if p_seq is null or p_seq < 1
    or p_ends_at is null
    or p_kind is null
    or p_kind not in ('prosit', 'duell', 'regel', 'abstimmung', 'schatzfrage', 'trinkspruch')
    or p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
    or p_payload ->> 'kind' is distinct from p_kind
  then
    raise exception 'event_invalid';
  end if;
  if private.night_status() <> 'live' then
    return false;
  end if;

  insert into public.events (seq, kind, payload, ends_at)
  values (p_seq, p_kind, p_payload, p_ends_at)
  on conflict (seq) do nothing
  returning id into v_id;
  return v_id is not null;
end
$$;

-- One answer per member and event; the first one stands. Returns false for a repeat.
create function public.respond(p_member_id uuid, p_token uuid, p_event_id uuid, p_payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.check_member(p_member_id, p_token);
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'event_invalid';
  end if;
  -- Share lock: resolve_event cannot close the event between this check and the insert.
  if not exists (
    select 1 from public.events e where e.id = p_event_id and e.status = 'live' for share
  ) then
    raise exception 'event_closed';
  end if;

  insert into public.responses (event_id, member_id, payload)
  values (p_event_id, p_member_id, p_payload)
  on conflict (event_id, member_id) do nothing
  returning id into v_id;
  return v_id is not null;
end
$$;

-- p_points = PointsAward[] ({memberId, amount, reason}), p_strafen = StrafeAward[]
-- ({memberId, reason}). Applied only by the call that flips the event from live to done.
create function public.resolve_event(
  p_member_id uuid,
  p_token uuid,
  p_event_id uuid,
  p_result jsonb,
  p_points jsonb,
  p_strafen jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_member(p_member_id, p_token);
  if p_result is null or jsonb_typeof(p_result) <> 'object'
    or jsonb_typeof(coalesce(p_points, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_strafen, '[]'::jsonb)) <> 'array'
  then
    raise exception 'event_invalid';
  end if;

  update public.events e set status = 'done', result = p_result
  where e.id = p_event_id and e.status = 'live';
  if not found then
    return false;
  end if;

  -- Joined on members so an award to a member who has since left is dropped, not an error.
  insert into public.points (member_id, amount, reason, event_id)
  select m.id, (a ->> 'amount')::int, coalesce(a ->> 'reason', ''), p_event_id
  from jsonb_array_elements(coalesce(p_points, '[]'::jsonb)) as a
  join public.members m on m.id = (a ->> 'memberId')::uuid;

  insert into public.strafen (member_id, reason, event_id)
  select m.id, left(coalesce(nullif(btrim(a ->> 'reason'), ''), 'Strafe'), 80), p_event_id
  from jsonb_array_elements(coalesce(p_strafen, '[]'::jsonb)) as a
  join public.members m on m.id = (a ->> 'memberId')::uuid;

  return true;
end
$$;

-- Clock -----------------------------------------------------------------------------------

-- Server time in ms since the epoch, for the offset in src/lib/clock.ts.
create function public.server_now()
returns bigint
language sql
stable
set search_path = ''
as $$
  select (extract(epoch from clock_timestamp()) * 1000)::bigint
$$;

-- Function grants -------------------------------------------------------------------------

revoke execute on function
  private.check_member(uuid, uuid),
  private.clean_name(text),
  private.night_status()
from public, anon, authenticated;

revoke execute on function
  public.join(text, text),
  public.log_drink(uuid, uuid, text),
  public.undo_drink(uuid, uuid),
  public.give_strafe(uuid, uuid, uuid, text),
  public.start_night(uuid, uuid),
  public.set_interval(uuid, uuid, numeric),
  public.end_night(uuid, uuid),
  public.reset_night(uuid, uuid, boolean),
  public.spawn_event(uuid, uuid, int, text, jsonb, timestamptz),
  public.respond(uuid, uuid, uuid, jsonb),
  public.resolve_event(uuid, uuid, uuid, jsonb, jsonb, jsonb),
  public.server_now()
from public;

grant execute on function
  public.join(text, text),
  public.log_drink(uuid, uuid, text),
  public.undo_drink(uuid, uuid),
  public.give_strafe(uuid, uuid, uuid, text),
  public.start_night(uuid, uuid),
  public.set_interval(uuid, uuid, numeric),
  public.end_night(uuid, uuid),
  public.reset_night(uuid, uuid, boolean),
  public.spawn_event(uuid, uuid, int, text, jsonb, timestamptz),
  public.respond(uuid, uuid, uuid, jsonb),
  public.resolve_event(uuid, uuid, uuid, jsonb, jsonb, jsonb),
  public.server_now()
to anon, authenticated;
