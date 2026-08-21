# BALANCE BINGO 프로토타입 (ROUND 1)

동아리 연합 세미나용 밸런스 빙고 사이트 — ROUND 1(개인 밸런스 빙고) 핵심 동작까지 구현된
Next.js + Supabase 프로토타입입니다.

## 지금까지 구현된 것
- 닉네임 + 팀 선택 후 입장 (`/`)
- 5×5 밸런스 빙고판, 칸마다 A/B 선택 (`/round1`)
- 선택할 때마다 Supabase Realtime으로 전체 응답을 실시간 집계
- 선택 비율이 50:50이면 HIT! 표시
- 제출 시 25칸 응답을 한 번에 저장

## 아직 없는 것 (다음 단계)
- ROUND 1 종료 후 유효 칸(다수결) 판정 + 빙고 판정 + 팀 점수 반영
- ROUND 2 (대표자 답안 제출 / 팀원 예측 / 일치율 공개)
- 운영진 관리자 화면 (라운드 진행 제어, 아이스브레이킹 점수 입력)
- 최종 점수판

## 1. Supabase 프로젝트 만들기
1. https://supabase.com 에서 무료 계정 생성 후 새 프로젝트 생성
2. 프로젝트 생성 후 왼쪽 메뉴 **SQL Editor** 클릭
3. 이 저장소의 `supabase/schema.sql` 내용을 그대로 붙여넣고 실행
   - 팀 5개, 빙고 25칸 예시 문항이 자동으로 들어갑니다.
   - `round1_cells` 테이블의 문항은 실제 세미나 내용에 맞게 수정하세요.
4. 왼쪽 메뉴 **Project Settings > API** 에서 아래 두 값을 복사
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. 로컬에서 실행
```bash
cp .env.local.example .env.local
# .env.local 에 위에서 복사한 값 붙여넣기

npm install
npm run dev
```
http://localhost:3000 접속

## 3. GitHub에 올리기
```bash
git init
git add .
git commit -m "init: balance bingo round1 prototype"
git branch -M main
git remote add origin <본인 GitHub 저장소 주소>
git push -u origin main
```
1인 개발이어도 GitHub 연동을 해두면 Vercel이 push할 때마다 자동으로 재배포해줘서
수정 → 확인 사이클이 훨씬 빨라집니다. private 저장소로 만들면 됩니다.

## 4. Vercel 배포
1. https://vercel.com 에서 GitHub 계정으로 로그인
2. "Add New Project" → 방금 만든 저장소 선택
3. **Environment Variables**에 `.env.local`과 동일하게
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy 클릭 → 배포된 URL로 여러 명이 동시 접속해서 테스트 가능

## 참고
- 지금 RLS(Row Level Security) 정책은 세미나 1회용 내부 도구를 전제로 익명 read/write를
  넓게 열어둔 상태입니다. 외부에 URL이 새어나가도 큰 문제가 없는 용도라 판단해 이렇게
  설정했는데, 더 엄격하게 잠그고 싶으면 말씀해주세요.
