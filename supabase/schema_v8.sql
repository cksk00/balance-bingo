-- BALANCE BINGO - 스키마 v8 (입장 전 참가자/팀 확인)
-- schema_v7.sql 실행 후 Supabase SQL Editor에서 한 번 실행하세요.

create or replace function lookup_participant(p_name text)
returns table (nickname text, team_id int, team_name text)
language sql
security definer
set search_path = public
as $$
  select r.name, r.team_id, t.name
  from participant_roster r
  join teams t on t.id = r.team_id
  where r.name = regexp_replace(trim(p_name), '\s+', ' ', 'g');
$$;

revoke all on function lookup_participant(text) from public;
grant execute on function lookup_participant(text) to anon, authenticated;
