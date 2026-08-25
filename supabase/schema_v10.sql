-- BALANCE BINGO - 스키마 v10 (ROUND 2 미제출 답안 임시저장)
-- schema_v9.sql 실행 후 Supabase SQL Editor에서 한 번 실행하세요.

create table if not exists round2_drafts (
  player_id uuid primary key references players(id) on delete cascade,
  team_id int not null references teams(id),
  role text not null check (role in ('captain', 'guess')),
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table round2_drafts enable row level security;
drop policy if exists "public read/write round2_drafts" on round2_drafts;
create policy "public read/write round2_drafts"
on round2_drafts for all using (true) with check (true);
