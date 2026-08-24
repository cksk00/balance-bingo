"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { TEAMS } from "@/lib/teams";

const previewQuestions = [
  ["다크모드", "라이트모드"], ["Claude", "Codex"], ["VS Code", "JetBrains"], ["Mac", "Windows"], ["Tab", "Space"],
  ["프론트엔드", "백엔드"], ["SQL", "NoSQL"], ["모놀리식", "MSA"], ["Vim", "Nano"], ["GitHub", "GitLab"],
  ["REST", "GraphQL"], ["Docker", "로컬 실행"], ["Python", "JavaScript"], ["터미널", "GUI"], ["마우스", "트랙패드"],
  ["클라우드", "온프레미스"], ["문서 먼저", "코드 먼저"], ["테스트 먼저", "배포 먼저"], ["아침 코딩", "새벽 코딩"], ["오픈소스", "상용 SW"],
  ["AI 페어코딩", "혼자 코딩"], ["PR 리뷰", "라이브 리뷰"], ["재택근무", "오피스"], ["핫픽스", "롤백"], ["CLI", "IDE"],
];

const stars = [
  [6, 20, 18], [13, 72, 12], [20, 34, 9], [28, 88, 15], [36, 14, 10],
  [44, 66, 18], [52, 26, 11], [61, 91, 8], [69, 12, 15], [76, 75, 10],
  [84, 31, 17], [92, 62, 12], [9, 91, 8], [24, 54, 14], [39, 42, 8],
  [57, 56, 15], [72, 44, 9], [88, 84, 18], [95, 17, 10], [48, 6, 12],
];

export default function HomePage() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [nickname, setNickname] = useState("");
  const [teamId, setTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    setError("");
    if (!nickname.trim()) return setError("닉네임을 입력해주세요.");
    if (!teamId) return setError("팀을 선택해주세요.");
    setLoading(true);
    const { data, error: insertError } = await supabase
      .from("players")
      .insert({ nickname: nickname.trim(), team_id: teamId })
      .select("id")
      .single();
    setLoading(false);
    if (insertError || !data) return setError("입장에 실패했어요. 다시 시도해주세요.");
    localStorage.setItem("bb_player_id", data.id);
    localStorage.setItem("bb_team_id", String(teamId));
    localStorage.setItem("bb_nickname", nickname.trim());
    router.push("/round1");
  }

  return (
    <main className="landing-page min-h-screen overflow-hidden px-5 py-6 md:px-10 md:py-8">
      <div className="landing-stars" aria-hidden="true">
        {stars.map(([left, top, size], index) => (
          <span key={index} style={{ left: `${left}%`, top: `${top}%`, fontSize: `${size}px` }}>★</span>
        ))}
      </div>
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between border-b border-white/20 pb-5">
        <div className="retro-logo">BINGO<span>★</span></div>
        <p className="hidden text-sm font-bold tracking-[0.25em] text-blue-100 md:block">seKUrity BINGO SESSION</p>
      </header>

      {!started ? (
        <section className="relative z-10 mx-auto grid min-h-[calc(100vh-100px)] max-w-7xl items-center gap-12 py-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="max-w-xl text-white">
            <p className="mb-5 text-lg font-extrabold tracking-wide text-blue-100">seKUrity 빙고 세션</p>
            <h1 className="retro-title mb-6 text-6xl leading-[1.08] md:text-7xl">밸런스 빙고<br />챌린지</h1>
            <p className="mb-9 max-w-md text-lg leading-relaxed text-blue-100">서로의 선택을 맞혀 빙고를 완성하고<br />우리 팀의 순위를 확인해보세요.</p>
            <button onClick={() => setStarted(true)} className="cream-button px-9 py-4 text-lg font-extrabold">빙고판 시작하기 <span className="ml-3">→</span></button>
          </div>

          <div className="relative mx-auto w-full max-w-2xl">
            <div className="mb-4 text-center text-white"><div className="retro-logo hero-logo">BINGO<span>★</span></div><p className="mt-1 inline-block rounded-full bg-blue-100 px-8 py-1 text-sm font-extrabold tracking-wider text-blue-800">seKUrity 빙고 세션</p></div>
            <div className="preview-board relative grid grid-cols-5 overflow-hidden rounded-2xl border-[6px] border-[#143d9e] bg-[#fff8e8] shadow-2xl">
              {previewQuestions.map(([left, right], index) => <div key={index} className="flex aspect-square flex-col items-center justify-center border border-blue-900/35 p-1 text-center text-[8px] font-extrabold leading-tight text-[#14316f] sm:text-[10px]"><span>{left}</span><span className="my-0.5 text-[7px] text-blue-500">VS</span><span>{right}</span></div>)}
              <svg className="pointer-events-none absolute inset-0 z-[3] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <filter id="rough-pencil" x="-10%" y="-10%" width="120%" height="120%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="12" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.15" xChannelSelector="R" yChannelSelector="G" />
                  </filter>
                </defs>
                <g fill="none" stroke="#f04432" strokeWidth="1.7" strokeLinecap="round" filter="url(#rough-pencil)" opacity="0.88">
                  <ellipse cx="50" cy="30" rx="48" ry="8.5" pathLength="100" strokeDasharray="94 6" strokeDashoffset="2" />
                  <ellipse cx="70" cy="50" rx="8.5" ry="48" pathLength="100" strokeDasharray="94 6" strokeDashoffset="7" />
                  <ellipse cx="50" cy="50" rx="58" ry="7.5" transform="rotate(45 50 50)" pathLength="100" strokeDasharray="94 6" strokeDashoffset="4" />
                </g>
                <g fill="none" stroke="#ff5a43" strokeWidth="0.65" opacity="0.45" transform="translate(.35 -.25)">
                  <ellipse cx="50" cy="30" rx="47.5" ry="8" />
                  <ellipse cx="70" cy="50" rx="8" ry="47.5" />
                  <ellipse cx="50" cy="50" rx="57.5" ry="7" transform="rotate(45 50 50)" />
                </g>
              </svg>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-100px)] max-w-xl items-center py-12">
          <div className="w-full rounded-[2rem] border border-white/25 bg-[#073fae]/80 p-7 text-white shadow-2xl backdrop-blur md:p-10">
            <button onClick={() => setStarted(false)} className="mb-5 text-sm font-bold text-blue-200">← 돌아가기</button>
            <p className="text-sm font-bold tracking-[0.2em] text-blue-200">JOIN THE SESSION</p>
            <h1 className="retro-title mb-8 mt-2 text-4xl">팀을 선택하세요</h1>
            <label className="mb-2 block text-sm font-bold text-blue-100">닉네임</label>
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="예: 홍길동" className="mb-6 w-full rounded-xl border-2 border-white/20 bg-white px-4 py-3 font-semibold text-ink outline-none focus:border-[#ffe8a8]" />
            <label className="mb-2 block text-sm font-bold text-blue-100">팀 선택</label>
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TEAMS.map((team) => <button key={team.id} onClick={() => setTeamId(team.id)} className={`rounded-xl py-3 font-extrabold transition ${teamId === team.id ? "bg-[#fff0c8] text-[#15377e] shadow-lg" : "bg-white/10 text-white hover:bg-white/20"}`}>{team.name}</button>)}
            </div>
            {error && <p className="mb-4 rounded-lg bg-red-500/20 p-3 text-sm font-bold text-red-100">{error}</p>}
            <button onClick={handleJoin} disabled={loading} className="cream-button w-full py-4 text-lg font-extrabold disabled:opacity-50">{loading ? "입장 중..." : "빙고 시작하기 →"}</button>
          </div>
        </section>
      )}
    </main>
  );
}
