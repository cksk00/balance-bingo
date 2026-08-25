# BALANCE BINGO

동아리 연합 세미나용 밸런스 빙고 사이트. Next.js + Supabase 프로토타입입니다.

## 구현된 것
- 닉네임 + 팀 선택 후 입장 (`/`)
- **ROUND 1** (`/round1`): 5×5 밸런스 빙고, 칸마다 A/B 선택 · 제출
  - 참가자 화면에는 실시간 통계가 보이지 않음 (다수결 왜곡 방지)
  - 결과 공개 전까지는 그냥 빙고판만 보임
- **ROUND 2**
  - `/round2`: 대표자/팀원 여부 선택 (가위바위보로 오프라인에서 정한 대표자가 직접 선택)
  - `/round2/answer`: 대표자가 정답 빙고판 제출
  - `/round2/guess`: 팀원들이 대표자 답을 예측해서 제출
- **운영진 전용 화면** (`/admin`, 비밀번호 보호)
  - `/admin/round1`: 실시간 선택지 통계 확인 + "결과 공개" (유효 칸 확정 + 빙고 판정 + 팀 점수 자동 반영)
  - `/admin/round2`: 팀별 제출 현황 확인 + 팀별 순차 결과 공개(일치율 계산) + 최고 일치율 팀 점수 확정
  - `/admin/scores`: 아이스브레이킹 점수 +10/-10 조정, 실시간 순위 확인
- `/results`: 최종 점수판 (아이스브레이킹 + R1 + R2 합산, 실시간 갱신) — 세미나 당일 큰 화면에 띄워두는 용도

## 1. Supabase 프로젝트 만들기
1. https://supabase.com 에서 무료 계정 생성 후 새 프로젝트 생성
2. 프로젝트 생성 후 왼쪽 메뉴 **SQL Editor** 클릭
3. `supabase/schema.sql` 내용을 그대로 붙여넣고 실행
   - 팀 5개, 빙고 25칸 예시 문항이 자동으로 들어갑니다.
4. 이어서 `supabase/schema_v2.sql` 내용도 붙여넣고 실행
   - 라운드 진행 상태, 결과 공개, ROUND2, 점수 관련 테이블이 추가됩니다.
   - `round1_cells` 테이블의 문항은 실제 세미나 내용에 맞게 나중에 Table Editor에서 수정하면 됩니다.
5. 왼쪽 메뉴 **Project Settings > API** 에서 아래 두 값을 복사
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public`(Publishable) 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. 로컬에서 실행
```bash
cp .env.local.example .env.local
# .env.local 에 위에서 복사한 값 + ADMIN_PASSWORD(원하는 관리자 비밀번호) 입력

npm install
npm run dev
```
http://localhost:3000 접속, 관리자 화면은 http://localhost:3000/admin

## 3. GitHub에 올리기
```bash
git add .
git commit -m "feat: round1/round2/관리자/최종점수판 추가"
git push
```

## 4. Vercel 환경변수 추가
Vercel 프로젝트 **Settings > Environment Variables**에 아래 세 개가 모두 있어야 해요.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ADMIN_PASSWORD` (관리자 화면 로그인 비밀번호 — 새로 추가해야 함)

## 추가 마이그레이션

기존 DB에는 `supabase/schema_v3.sql`을 SQL Editor에서 한 번 실행합니다.
이 마이그레이션은 TEAM 6~8과 CAPTAIN/일반 답안 제출 후 수정 잠금을 추가합니다.

이어서 `supabase/schema_v4.sql`을 실행합니다. ROUND 1 문항 25개를 교체하고
ROUND 2 전용 `round2_cells` 테이블과 문항 25개를 추가합니다.

마지막으로 `supabase/schema_v5.sql`을 실행합니다. 관리자가 ROUND 1·2를 시작할 때
대기 중인 참가자 화면이 실시간으로 동시에 열리도록 시작 상태를 추가합니다.

이어서 `supabase/schema_v6.sql`을 실행합니다. 관리자가 ROUND 1과 ROUND 2에 현재
입장해 있는 참가자 수를 나눠서 실시간으로 확인할 수 있도록 현재 라운드를 기록합니다.

마지막으로 `supabase/schema_v7.sql`을 실행합니다. 확정된 34명의 이름과 팀을 미리
등록하고, 이름 최초 점유와 브라우저 세션 복구 기능을 추가합니다.

이어서 `supabase/schema_v8.sql`을 실행합니다. 참가자가 최종 입장하기 전에 명단의
이름과 배정 팀을 확인할 수 있는 조회 함수를 추가합니다.

이어서 `supabase/schema_v9.sql`을 실행합니다. 세션을 잃은 참가자가 이름을 다시
입력하면 기존 답안과 참가자 기록을 유지한 채 현재 브라우저로 세션을 이전합니다.

ROUND 2 순위는 팀원 다수결 빙고의 정확도 60점과 CAPTAIN 제출 이후 팀원 평균 제출시간의 상대점수 40점을 합산합니다.

환경변수를 추가/수정한 뒤에는 **Deployments 탭 > 최신 배포 > Redeploy**를 한 번 눌러줘야 반영돼요.

## 진행 흐름 (세미나 당일)
1. 참가자들이 각자 `/` 에서 닉네임+팀 입장 → `/round1`에서 빙고판 제출
2. 운영진은 `/admin/round1`에서 실시간 통계를 보다가, 시간 종료 후 "결과 공개" 클릭
   → 유효 칸/HIT 확정, 빙고 달성자 판정, 팀별 ROUND1 점수 자동 반영
3. 참가자들은 `/round2`에서 대표자 1명만 "저는 대표자예요" 클릭 → `/round2/answer`에서 정답 제출
   나머지 팀원은 "저는 예측할게요" → `/round2/guess`에서 예측 제출
4. 운영진은 `/admin/round2`에서 팀별로 순서대로 "이 팀 결과 공개" 클릭 (일치율 계산)
   모든 팀 공개 후 "최고 일치율 팀 +10점 확정" 클릭
5. 운영진은 `/admin/scores`에서 팀별 아이스브레이킹 점수 입력
6. `/results` 화면을 세미나 스크린에 띄워서 실시간 최종 순위 공개

## 참고
- 지금 Supabase RLS(Row Level Security) 정책은 세미나 1회용 내부 도구를 전제로 익명
  read/write를 넓게 열어둔 상태입니다. 참가자 인증은 닉네임 입력 수준이라, URL만 알면
  다른 사람 몫으로 제출하는 것도 기술적으로는 막혀있지 않아요. 세미나 규모(약 40명,
  아는 사람들끼리 진행)에서는 충분하다고 판단했지만, 더 엄격하게 잠그고 싶으면 말씀해주세요.
- 관리자 비밀번호(`ADMIN_PASSWORD`)는 서버에서만 검증되고 쿠키로 로그인 상태를
  유지합니다. 브라우저 콘솔 등으로는 비밀번호 자체가 노출되지 않아요.
