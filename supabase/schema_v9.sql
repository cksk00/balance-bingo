-- BALANCE BINGO - 스키마 v9 (기존 참가자 세션 이전)
-- schema_v8.sql 실행 후 Supabase SQL Editor에서 한 번 실행하세요.

create or replace function claim_participant(p_name text, p_session_token uuid)
returns table (player_id uuid, nickname text, team_id int, current_round int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := regexp_replace(trim(p_name), '\s+', ' ', 'g');
  v_roster_id bigint;
  v_team_id int;
  v_player_id uuid;
begin
  select r.id, r.team_id, r.claimed_player_id
    into v_roster_id, v_team_id, v_player_id
  from participant_roster r
  where r.name = v_name
  for update;

  if v_roster_id is null then
    raise exception 'NAME_NOT_FOUND';
  end if;

  if v_player_id is null then
    insert into players (nickname, team_id, current_round)
    values (v_name, v_team_id, 1)
    returning id into v_player_id;

    insert into participant_sessions (player_id, session_token)
    values (v_player_id, p_session_token);

    update participant_roster
    set claimed_player_id = v_player_id
    where id = v_roster_id;
  else
    insert into participant_sessions (player_id, session_token)
    values (v_player_id, p_session_token)
    on conflict (player_id) do update
    set session_token = excluded.session_token,
        created_at = now();
  end if;

  return query
  select p.id, p.nickname, p.team_id, p.current_round
  from players p where p.id = v_player_id;
end;
$$;

revoke all on function claim_participant(text, uuid) from public;
grant execute on function claim_participant(text, uuid) to anon, authenticated;
