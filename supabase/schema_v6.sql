-- BALANCE BINGO - 스키마 v6 (참가자 현재 라운드 추적)
-- schema_v5.sql 실행 후 Supabase SQL Editor에서 한 번 실행하세요.

alter table players
  add column if not exists current_round int not null default 0
  check (current_round in (0, 1, 2));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table players;
  end if;
end $$;
