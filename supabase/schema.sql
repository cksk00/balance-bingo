-- ============================================
-- BALANCE BINGO - Supabase 스키마 (프로토타입용)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- ============================================

-- 팀 테이블
create table if not exists teams (
  id serial primary key,
  name text not null unique
);

insert into teams (name) values
  ('TEAM 1'), ('TEAM 2'), ('TEAM 3'), ('TEAM 4'),
  ('TEAM 5'), ('TEAM 6'), ('TEAM 7'), ('TEAM 8')
on conflict (name) do nothing;

-- 참가자 테이블
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  team_id int references teams(id),
  created_at timestamptz default now()
);

-- ROUND 1 빙고 칸 구성 (운영진이 미리 25칸의 A/B 선택지를 세팅)
create table if not exists round1_cells (
  cell_index int primary key check (cell_index between 0 and 24),
  option_a text not null,
  option_b text not null
);

-- ROUND 1 참가자 응답
create table if not exists round1_answers (
  player_id uuid references players(id) on delete cascade,
  cell_index int references round1_cells(cell_index),
  choice text not null check (choice in ('A', 'B')),
  created_at timestamptz default now(),
  primary key (player_id, cell_index)
);

-- ROUND 2: 팀 대표자가 제출한 정답 빙고판
create table if not exists round2_answer_key (
  team_id int primary key references teams(id),
  answers jsonb not null, -- { "0": "A", "1": "B", ... }
  submitted_by uuid references players(id),
  created_at timestamptz default now()
);

-- ROUND 2: 팀원들이 예측해서 제출한 빙고판
create table if not exists round2_guesses (
  player_id uuid primary key references players(id) on delete cascade,
  team_id int references teams(id),
  answers jsonb not null,
  created_at timestamptz default now()
);

-- 점수 테이블 (아이스브레이킹 / ROUND1 / ROUND2)
create table if not exists team_scores (
  team_id int primary key references teams(id),
  icebreaking int default 0,
  round1 int default 0,
  round2 int default 0
);

insert into team_scores (team_id)
  select id from teams
on conflict (team_id) do nothing;

-- ============================================
-- RLS (Row Level Security)
-- 세미나 1회용 내부 도구이므로 익명 read/write를 넓게 허용합니다.
-- 실서비스로 확장 시에는 반드시 정책을 좁혀야 합니다.
-- ============================================
alter table teams enable row level security;
alter table players enable row level security;
alter table round1_cells enable row level security;
alter table round1_answers enable row level security;
alter table round2_answer_key enable row level security;
alter table round2_guesses enable row level security;
alter table team_scores enable row level security;

create policy "public read teams" on teams for select using (true);
create policy "public read/write players" on players for all using (true) with check (true);
create policy "public read round1_cells" on round1_cells for select using (true);
create policy "public read/write round1_answers" on round1_answers for all using (true) with check (true);
create policy "public read/write round2_answer_key" on round2_answer_key for all using (true) with check (true);
create policy "public read/write round2_guesses" on round2_guesses for all using (true) with check (true);
create policy "public read/write team_scores" on team_scores for all using (true) with check (true);

-- Realtime 활성화 (Supabase 대시보드 > Database > Replication 에서도 확인/설정 가능)
alter publication supabase_realtime add table round1_answers;
alter publication supabase_realtime add table round2_guesses;
alter publication supabase_realtime add table team_scores;

-- ============================================
-- 예시: ROUND 1 25칸 A/B 선택지 세팅 (직접 문항으로 교체하세요)
-- ============================================
insert into round1_cells (cell_index, option_a, option_b) values
  (0,  '민초 좋아함', '민초 싫어함'),
  (1,  '아이스 아메리카노', '따뜻한 아메리카노'),
  (2,  '여름파', '겨울파'),
  (3,  '집순이/집돌이', '밖순이/밖돌이'),
  (4,  '아침형 인간', '저녁형 인간'),
  (5,  '밥이 좋다', '빵이 좋다'),
  (6,  '고양이파', '강아지파'),
  (7,  '계획적인 여행', '즉흥적인 여행'),
  (8,  '단짠', '단단'),
  (9,  '영화관 관람', '집에서 관람'),
  (10, '카톡 답장 빠름', '카톡 답장 느림'),
  (11, '아침밥 먹음', '아침밥 안 먹음'),
  (12, '운전 좋아함', '대중교통 좋아함'),
  (13, '노래방 마이크 잡음', '탬버린 침'),
  (14, 'MBTI I', 'MBTI E'),
  (15, '떡볶이 국물맛', '떡볶이 로제맛'),
  (16, '산 좋아함', '바다 좋아함'),
  (17, '이불 밖은 위험해', '나가서 노는 게 좋아'),
  (18, '전화 선호', '문자 선호'),
  (19, '커피파', '차파'),
  (20, '숙제 미리 함', '숙제 벼락치기'),
  (21, '액션 영화', '로맨스 영화'),
  (22, '치킨 후라이드', '치킨 양념'),
  (23, '계획형 인간', '즉흥형 인간'),
  (24, '집콕 휴일', '나들이 휴일')
on conflict (cell_index) do nothing;
