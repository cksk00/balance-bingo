-- BALANCE BINGO - 스키마 v11 (ROUND 1 팀 평균 점수)
-- 개인 점수 평균의 소수 둘째 자리까지 저장할 수 있도록 컬럼 타입을 변경합니다.

alter table team_scores
  alter column round1 type numeric(8,2)
  using round1::numeric(8,2);
