-- BALANCE BINGO - 스키마 v5 (라운드 동시 시작 상태)
-- schema_v4.sql 실행 후 Supabase SQL Editor에서 한 번 실행하세요.

alter table game_state
  add column if not exists round1_started boolean not null default false,
  add column if not exists round2_started boolean not null default false;

-- game_state는 schema_v2에서 이미 Realtime publication에 등록되어 있습니다.
