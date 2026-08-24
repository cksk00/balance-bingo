"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { TEAMS } from "@/lib/teams";

const previewQuestions = [
  "다크모드", "Codex", "터미널", "오픈소스", "클라우드",
  "C언어", "웹 해킹", "GUI", "새벽 코딩", "커스텀 키보드",
  "Git rebase", "백엔드", "Linux", "문서 먼저", "Windows",
  "버그 헌팅", "모니터 2대", "AI 코딩", "CTF", "코드 리뷰",
  "Python", "로컬 개발", "마우스", "VS Code", "아침 코딩",
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
      <div className="landing-stars" aria-hidden="true" />
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
              {previewQuestions.map((question, index) => <div key={index} className="flex aspect-square items-center justify-center border border-blue-900/35 p-1 text-center text-[9px] font-extrabold leading-tight text-[#14316f] sm:text-[11px]">{question}</div>)}
              <div className="marker-line marker-horizontal" />
              <div className="marker-line marker-vertical" />
              <div className="marker-line marker-diagonal" />
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
