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
      .insert({ nickname: nickname.trim(), team_id: teamId, current_round: 1 })
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
        <div className="retro-logo landing-header-logo">BINGO<span>★</span></div>
        <p className="hidden text-sm font-bold tracking-[0.25em] text-blue-100 md:block">seKUrity BINGO SESSION</p>
      </header>

      {!started ? (
        <section className="relative z-10 mx-auto grid min-h-[calc(100vh-100px)] max-w-7xl items-center gap-12 py-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="landing-clouds landing-clouds-left" aria-hidden="true"><i /></div>
          <div className="landing-clouds landing-clouds-right" aria-hidden="true"><i /></div>
          <div className="landing-copy max-w-2xl text-white">
            <p className="mb-6 text-xl font-extrabold tracking-wide text-blue-100 md:text-2xl">seKUrity 빙고 세션</p>
            <h1 className="retro-title mb-7 text-6xl leading-[1.18] md:text-7xl">밸런스 빙고<br />챌린지</h1>
            <p className="mb-10 max-w-xl text-xl leading-relaxed text-blue-100 md:text-2xl">서로의 선택을 맞혀 빙고를 완성하고<br />우리 팀의 순위를 확인해보세요.</p>
            <button onClick={() => setStarted(true)} className="cream-button px-12 py-5 text-xl font-extrabold md:text-2xl">빙고판 시작하기 <span className="ml-4">→</span></button>
          </div>

          <div className="relative mx-auto w-full max-w-[420px] lg:-translate-x-6">
            <div className="board-ornaments" aria-hidden="true">
              <span className="ornament ornament-code">&lt;/&gt;</span>
              <span className="ornament ornament-shield">◆</span>
              <span className="ornament ornament-star-one">★</span>
              <span className="ornament ornament-star-two">✦</span>
              <span className="ornament ornament-star-three">★</span>
              <span className="ornament ornament-spark-one">✦</span>
              <span className="ornament ornament-spark-two">✧</span>
              <span className="ornament ornament-braces">&#123; &#125;</span>
              <span className="ornament ornament-diamond">✦</span>
            </div>
            <div className="mb-4 text-center text-white"><div className="retro-logo hero-logo">BINGO<span>★</span></div><p className="mt-1 inline-block rounded-full bg-blue-100 px-8 py-1 text-sm font-extrabold tracking-wider text-blue-800">seKUrity 빙고 세션</p></div>
            <div className="preview-board-stack relative">
              <div className="preview-board-back" aria-hidden="true" />
              <div className="preview-board relative z-[2] grid grid-cols-5 overflow-hidden rounded-2xl border-[6px] border-[#143d9e] bg-[#fff8e8] shadow-2xl">
                {previewQuestions.map(([left, right], index) => <div key={index} className="flex aspect-square flex-col items-center justify-center border border-blue-900/35 p-1 text-center text-[10px] font-extrabold leading-tight text-[#14316f] sm:text-[12px] md:text-[13px]"><span>{left}</span><span className="my-0.5 text-[8px] text-blue-500 sm:text-[10px]">VS</span><span>{right}</span></div>)}
              </div>
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
