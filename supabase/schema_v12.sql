-- BALANCE BINGO - 스키마 v12 (ROUND 2 일반 제출 팀당 1회 제한)
-- 한 팀에 기존 일반 제출이 여러 개 있으면 데이터 삭제 없이 실행이 실패합니다.
-- 이 경우 관리자 화면에서 ROUND 2를 초기화한 뒤 다시 실행하세요.

alter table round2_guesses
  add constraint round2_guesses_team_id_key unique (team_id);
