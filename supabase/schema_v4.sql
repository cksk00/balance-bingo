-- ============================================
-- BALANCE BINGO - 스키마 v4 (ROUND 1/2 전용 문항 분리)
-- 기존 DB에서 schema_v3.sql 실행 후 이 파일을 한 번 실행하세요.
-- ============================================

create table if not exists round2_cells (
  cell_index int primary key check (cell_index between 0 and 24),
  option_a text not null,
  option_b text not null
);

alter table round2_cells enable row level security;
drop policy if exists "public read round2_cells" on round2_cells;
create policy "public read round2_cells" on round2_cells for select using (true);

insert into round1_cells (cell_index, option_a, option_b) values
  (0,  '다크모드', '라이트모드'),
  (1,  'Claude', 'Codex'),
  (2,  '노션', '메모'),
  (3,  '해커 닉네임이 있다', '해커 닉네임이 없다'),
  (4,  '팀플 발표 담당 고정', '팀플 보고서 담당 고정'),
  (5,  '주소 Leak 하나 확실하게 얻기', '원하는 주소에 1바이트 Write 얻기'),
  (6,  '세미나 발표 중 노트북 블루스크린', '라이브 데모 중 인터넷 끊김'),
  (7,  'sudo 권한 평생 없음', 'root 권한인데 로그 전부 남음'),
  (8,  'Tab 자동완성 금지', '명령어 기록 금지'),
  (9,  'CTF 결승 진출했는데 노트북 두고 옴', '노트북 가져왔는데 충전기 두고 옴'),
  (10, 'PoC는 되는데 왜 되는지 모름', '원리는 완벽하게 아는데 PoC가 안 됨'),
  (11, 'A+ 확정인 관심 없는 전공', 'B+ 확정인 정말 좋아하는 전공'),
  (12, '터미널 폰트 크기 8 고정', '터미널 폰트 크기 32 고정'),
  (13, '쉘코드 직접 작성하기', 'ROP Chain 직접 작성하기'),
  (14, '월요일 오전 8시 수업', '금요일 오후 6시 수업'),
  (15, 'CTF 팀원 다 못하는데 내가 캐리하기', '나 제외 팀원 모두 잘하기'),
  (16, '세계 최고의 해커와 1시간 대화', '최고의 보안 기업에서 한 달 인턴'),
  (17, '깃 커밋 메시지 한 줄 쓰기', '자세히 쓰기'),
  (18, '새벽에 코드가 더 잘 짜임', '아침에 코드가 더 잘 짜임'),
  (19, '발표 전날 리허설 필수', '즉흥으로 감'),
  (20, '문제 풀이법은 아는데 구현이 어려움', '구현은 쉬운데 풀이법을 모름'),
  (21, '코어 덤프 100개 분석하기', '로그 없는 크래시 하나 분석하기'),
  (22, '마감 하루 전 요구사항 변경', '발표 하루 전 PPT 디자인 전면 변경'),
  (23, '노트북 배터리 20% 밑으로 떨어지면 불안', '신경 안 씀'),
  (24, 'CTF할 때 탭 10개 이상 항상 켜져있음', '필요한 탭만 열어둠')
on conflict (cell_index) do update
set option_a = excluded.option_a, option_b = excluded.option_b;

insert into round2_cells (cell_index, option_a, option_b) values
  (0,  'Mac을 사용한다', 'Windows를 사용한다'),
  (1,  '민초 호', '불호'),
  (2,  '새 기술 스택 나오면 바로 써봄', '검증되기 전엔 안 씀'),
  (3,  'MBTI I 이다', 'MBTI E 이다'),
  (4,  '외동이다', '형제자매가 있다'),
  (5,  '벼락치기', '미리미리'),
  (6,  '새로운 사람 만나면 먼저 말 걸기', '상대가 먼저 걸어주길 기다림'),
  (7,  '경쟁자 많은 메이저 분야', '경쟁자 없는 마이너 분야'),
  (8,  '취약점은 5분 만에 찾았는데 Exploit까지 5시간', '취약점 찾는 데 5시간 걸렸는데 Exploit은 5분'),
  (9,  '무서운 걸 잘 본다', '무서운 걸 못 본다'),
  (10, '프론트엔드 개발하기', '백엔드 개발하기'),
  (11, 'Android', 'iOS'),
  (12, '방어(Defense)', '공격(Attack)'),
  (13, 'Heap 문제인데 Leak 없음', 'Stack 문제인데 Gadget이 거의 없음'),
  (14, 'Write-up 바로 정리', '미루다가 안 씀'),
  (15, '평화로운 즐겜 CTF', '수상을 노리는 빡겜 CTF'),
  (16, '논문 하나 작성하기', 'CVE 1개 따기'),
  (17, '평생 한 언어만 사용 가능', '매 프로젝트마다 새로운 언어 배워야 함'),
  (18, '웹 문제에서 Burp Suite 금지', '포너블 문제에서 pwntools 금지'),
  (19, '아침형 인간', '저녁형 인간'),
  (20, '스터디할 때 실력별로 나누는 게 좋음', '관심사별로 나누는 게 좋음'),
  (21, 'ChatGPT/Claude한테 코드 물어보고 그대로 씀', '항상 검증하고 씀'),
  (22, '트랙패드(터치패드)', '마우스'),
  (23, '변수명 대충 짓고 나중에 후회', '항상 의미 있게 지음'),
  (24, '새벽 3시에 바로 버그 고침', '그냥 자고 아침에 정신 멀쩡할 때 고침')
on conflict (cell_index) do update
set option_a = excluded.option_a, option_b = excluded.option_b;
