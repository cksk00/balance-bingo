-- ============================================
-- BALANCE BINGO - 스키마 v2 (관리자/ROUND1 결과공개/ROUND2/최종점수)
-- schema.sql을 먼저 실행한 뒤, 이 파일을 SQL Editor에서 실행하세요.
-- ============================================

-- 전체 게임 진행 상태 (1행짜리 설정 테이블)
create table if not exists game_state (
  id int primary key default 1,
  round1_revealed boolean not null default false,
  round2_revealed boolean not null default false,
  constraint single_row check (id = 1)
);
insert into game_state (id) values (1) on conflict (id) do nothing;

-- ROUND 1 확정 결과 (관리자가 "결과 공개"를 누르면 계산되어 저장됨)
create table if not exists round1_results (
  cell_index int primary key references round1_cells(cell_index),
  valid_choice text not null check (valid_choice in ('A', 'B', 'HIT')),
  a_count int not null default 0,
  b_count int not null default 0
);

-- 참가자별 ROUND1 빙고 달성 여부 (결과 공개 시 계산되어 저장)
create table if not exists round1_bingo_winners (
  player_id uuid primary key references players(id) on delete cascade,
  team_id int references teams(id),
  bingo_count int not null default 0
);

-- 팀 대표자 지정 (ROUND2, 가위바위보로 오프라인에서 뽑은 뒤 사이트에서 셀프 지정)
create table if not exists round2_reps (
  team_id int primary key references teams(id),
  player_id uuid references players(id)
);

-- 팀별 ROUND2 결과 (관리자가 팀별로 순차 공개할 때 계산되어 저장)
create table if not exists round2_team_results (
  team_id int primary key references teams(id),
  match_count int not null default 0,
  match_percent int not null default 0,
  revealed boolean not null default false
);

-- RLS
alter table game_state enable row level security;
alter table round1_results enable row level security;
alter table round1_bingo_winners enable row level security;
alter table round2_reps enable row level security;
alter table round2_team_results enable row level security;

drop policy if exists "public read/write game_state" on game_state;
create policy "public read/write game_state" on game_state for all using (true) with check (true);

drop policy if exists "public read/write round1_results" on round1_results;
create policy "public read/write round1_results" on round1_results for all using (true) with check (true);

drop policy if exists "public read/write round1_bingo_winners" on round1_bingo_winners;
create policy "public read/write round1_bingo_winners" on round1_bingo_winners for all using (true) with check (true);

drop policy if exists "public read/write round2_reps" on round2_reps;
create policy "public read/write round2_reps" on round2_reps for all using (true) with check (true);

drop policy if exists "public read/write round2_team_results" on round2_team_results;
create policy "public read/write round2_team_results" on round2_team_results for all using (true) with check (true);

-- Realtime 등록 (이미 등록된 테이블은 건너뜀)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'game_state') then
    alter publication supabase_realtime add table game_state;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'round1_results') then
    alter publication supabase_realtime add table round1_results;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'round2_answer_key') then
    alter publication supabase_realtime add table round2_answer_key;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'round2_reps') then
    alter publication supabase_realtime add table round2_reps;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'round2_team_results') then
    alter publication supabase_realtime add table round2_team_results;
  end if;
end $$;

insert into round2_team_results (team_id)
  select id from teams
on conflict (team_id) do nothing;
