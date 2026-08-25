-- BALANCE BINGO - 스키마 v7 (사전 참가자 명단 + 이름 점유 세션)
-- schema_v6.sql 실행 후 Supabase SQL Editor에서 한 번 실행하세요.

create table if not exists participant_roster (
  id bigserial primary key,
  name text not null unique,
  team_id int not null references teams(id),
  claimed_player_id uuid unique references players(id) on delete set null
);

create table if not exists participant_sessions (
  player_id uuid primary key references players(id) on delete cascade,
  session_token uuid not null unique,
  created_at timestamptz not null default now()
);

alter table participant_roster enable row level security;
alter table participant_sessions enable row level security;

-- 명단과 세션 토큰은 브라우저에서 직접 열람하지 않고 아래 함수로만 접근합니다.
drop policy if exists "no direct roster access" on participant_roster;
drop policy if exists "no direct participant session access" on participant_sessions;

insert into participant_roster (name, team_id) values
  ('김나현', 1), ('손가연', 1), ('심재훈', 1), ('최선종', 1),
  ('정지은', 2), ('왕은서', 2), ('이효정', 2), ('최헌', 2),
  ('황재윤', 3), ('김민준', 3), ('김민우', 3), ('이대현', 3),
  ('김예은', 4), ('김민찬', 4), ('김민재', 4), ('홍설원', 4),
  ('최지웅', 5), ('박소민', 5), ('정일재', 5), ('김정현', 5),
  ('김해인', 6), ('김수현', 6), ('정현진', 6), ('김차나', 6),
  ('이상호', 7), ('곽인정', 7), ('임성빈', 7), ('정재성', 7), ('안준혁', 7),
  ('권채은', 8), ('이시연', 8), ('박상우', 8), ('박혜수', 8), ('이하영', 8)
on conflict (name) do update set team_id = excluded.team_id;

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
  elsif not exists (
    select 1 from participant_sessions s
    where s.player_id = v_player_id and s.session_token = p_session_token
  ) then
    raise exception 'ALREADY_CLAIMED';
  end if;

  return query
  select p.id, p.nickname, p.team_id, p.current_round
  from players p where p.id = v_player_id;
end;
$$;

create or replace function resume_participant(p_session_token uuid)
returns table (player_id uuid, nickname text, team_id int, current_round int)
language sql
security definer
set search_path = public
as $$
  select p.id, p.nickname, p.team_id, p.current_round
  from participant_sessions s
  join players p on p.id = s.player_id
  where s.session_token = p_session_token;
$$;

revoke all on function claim_participant(text, uuid) from public;
revoke all on function resume_participant(uuid) from public;
grant execute on function claim_participant(text, uuid) to anon, authenticated;
grant execute on function resume_participant(uuid) to anon, authenticated;
