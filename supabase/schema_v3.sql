-- ============================================
-- BALANCE BINGO - 스키마 v3 (8팀 / ROUND2 순위 / 제출 잠금)
-- schema.sql, schema_v2.sql 실행 후 SQL Editor에서 한 번 실행하세요.
-- ============================================

insert into teams (name) values ('TEAM 6'), ('TEAM 7'), ('TEAM 8')
on conflict (name) do nothing;

insert into team_scores (team_id)
select id from teams
on conflict (team_id) do nothing;

insert into round2_team_results (team_id)
select id from teams
on conflict (team_id) do nothing;

-- 캡틴 답안은 팀당 1개이며 한번 생성된 뒤에는 수정할 수 없다.
create or replace function prevent_round2_captain_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'CAPTAIN 답안은 제출 후 수정할 수 없습니다.';
end;
$$;

drop trigger if exists lock_round2_captain_answer on round2_answer_key;
create trigger lock_round2_captain_answer
before update on round2_answer_key
for each row execute function prevent_round2_captain_update();

-- 일반 참가자 답안도 제출 후 수정할 수 없게 잠근다.
create or replace function prevent_round2_guess_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'ROUND 2 답안은 제출 후 수정할 수 없습니다.';
end;
$$;

drop trigger if exists lock_round2_guess_answer on round2_guesses;
create trigger lock_round2_guess_answer
before update on round2_guesses
for each row execute function prevent_round2_guess_update();
