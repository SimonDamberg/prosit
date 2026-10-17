-- A PROSIT! resolves only once its time is up, so a client still running the old engine cannot cut the song.

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
  where e.id = p_event_id and e.status = 'live'
    -- "Ein Prosit" is sung to the end: a PROSIT! cannot be closed before its time, whatever the client.
    and (e.kind <> 'prosit' or e.ends_at <= now());
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
