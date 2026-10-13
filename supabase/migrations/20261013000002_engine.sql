-- Stage 3: what the event engine needs from the referee.
--
-- * The TV runs the engine too. It is the one device that never sleeps, but it is not a member,
--   so spawn_event and resolve_event accept a null member. A non-null member is still checked.
-- * spawn_event only takes the next seq, so two callers cannot leave a gap in the night.
-- * respond closes at ends_at, so every engine resolves from the same answers.
-- * events.resolved_at: when the result was written. The screens time the result from it.

alter table public.events add column resolved_at timestamptz;

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

-- One answer per member and event; the first one stands. Returns false for a repeat.
create or replace function public.respond(p_member_id uuid, p_token uuid, p_event_id uuid, p_payload jsonb)
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
    select 1 from public.events e
    where e.id = p_event_id and e.status = 'live' and e.ends_at >= now()
    for share
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

create or replace function public.resolve_event(
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
  if p_member_id is not null then
    perform private.check_member(p_member_id, p_token);
  end if;
  if p_result is null or jsonb_typeof(p_result) <> 'object'
    or jsonb_typeof(coalesce(p_points, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_strafen, '[]'::jsonb)) <> 'array'
  then
    raise exception 'event_invalid';
  end if;

  update public.events e set status = 'done', result = p_result, resolved_at = now()
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
