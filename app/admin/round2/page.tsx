"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { calculateRound2Rankings, type CaptainSubmission, type GuessSubmission, type Round2RankingRow } from "@/lib/round2Ranking";
import { Round2Board } from "@/components/Round2Board";
import { ROUND2_CELLS } from "@/lib/questions";
import { TEAMS } from "@/lib/teams";
import { AdminPlayersPanel } from "@/components/AdminPlayersPanel";

type Team = { id: number; name: string };
type Cell = { cell_index: number; option_a: string; option_b: string };

export default function AdminRound2Page() {
  const [teams] = useState<Team[]>(TEAMS);
  const [cells] = useState<Cell[]>(ROUND2_CELLS);
  const [captains, setCaptains] = useState<CaptainSubmission[]>([]);
  const [guesses, setGuesses] = useState<GuessSubmission[]>([]);
  const [rankings, setRankings] = useState<Round2RankingRow[]>([]);
  const [rankingRevealed, setRankingRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  const refresh = useCallback(async () => {
    const [captainsRes, guessesRes, playersRes, stateRes, scoresRes] = await Promise.all([
      supabase.from("round2_answer_key").select("team_id, answers, created_at, submitted_by"),
      supabase.from("round2_guesses").select("player_id, team_id, answers, created_at"),
      supabase.from("players").select("id, nickname"),
      supabase.from("game_state").select("round2_started, round2_revealed").eq("id", 1).maybeSingle(),
      supabase.from("team_scores").select("team_id, icebreaking"),
    ]);
    const nicknameById = new Map(((playersRes.data || []) as { id: string; nickname: string }[]).map((p) => [p.id, p.nickname]));
    const nextCaptains = (captainsRes.data || []) as CaptainSubmission[];
    const nextGuesses = ((guessesRes.data || []) as GuessSubmission[]).map((g) => ({ ...g, players: { nickname: nicknameById.get(g.player_id) || "알 수 없음" } }));
    setCaptains(nextCaptains);
    setGuesses(nextGuesses);
    const icebreakingScores = Object.fromEntries(
      ((scoresRes.data || []) as { team_id: number; icebreaking: number }[]).map((score) => [score.team_id, score.icebreaking])
    );
    setRankings(calculateRound2Rankings(nextCaptains, nextGuesses, icebreakingScores));
    setRankingRevealed(Boolean(stateRes.data?.round2_revealed));
    setStarted(Boolean(stateRes.data?.round2_started));
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase.channel("admin-round2-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "round2_answer_key" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "round2_guesses" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_state" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_scores" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  async function revealRankings() {
    if (rankings.length === 0 || !confirm("현재 실시간 순위를 참가자에게 공개할까요?")) return;
    setBusy(true); setError("");
    const { error: updateError } = await supabase.from("game_state").update({ round2_revealed: true }).eq("id", 1);
    if (updateError) setError(updateError.message);
    await refresh(); setBusy(false);
  }

  async function startRound2() {
    if (!confirm("대기 중인 모든 참가자의 ROUND 2를 지금 동시에 시작할까요?")) return;
    setBusy(true); setError("");
    const { error: updateError } = await supabase.from("game_state").update({ round2_started: true }).eq("id", 1);
    if (updateError) setError(updateError.message); else setStarted(true);
    setBusy(false);
  }

  async function resetRound2() {
    if (!confirm("ROUND 2의 CAPTAIN 답안, 일반 제출, 순위 공개 상태를 모두 초기화할까요? 이 작업은 되돌릴 수 없습니다.")) return;
    setBusy(true); setError("");
    const results = await Promise.all([
      supabase.from("round2_guesses").delete().not("player_id", "is", null),
      supabase.from("round2_reps").delete().not("team_id", "is", null),
      supabase.from("round2_answer_key").delete().not("team_id", "is", null),
      supabase.from("round2_team_results").update({ match_count: 0, match_percent: 0, revealed: false }).not("team_id", "is", null),
      supabase.from("team_scores").update({ round2: 0 }).not("team_id", "is", null),
      supabase.from("players").update({ current_round: 1 }).not("id", "is", null),
      supabase.from("game_state").update({ round2_started: false, round2_revealed: false }).eq("id", 1),
    ]);
    const failed = results.find((result) => result.error)?.error;
    if (failed) setError(failed.message);
    await refresh(); setBusy(false);
  }

  const teamName = (id: number) => teams.find((team) => team.id === id)?.name || `TEAM ${id}`;

  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <Link href="/admin" className="text-sm text-navy/60 underline">← 대시보드</Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 mb-2">
        <h1 className="text-3xl font-extrabold text-navy">ROUND 2 관리</h1>
        <button onClick={resetRound2} disabled={busy} className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-40">ROUND 2 초기화</button>
      </div>
      <p className="text-sm text-navy/60 mb-6">종합점수 = 캡틴 빙고 점수 + 팀원 개인 점수 합계 + 아이스브레이킹 점수</p>
      {error && <p className="text-accentB text-sm mb-4">{error}</p>}

      <AdminPlayersPanel round={2} />
      {!started && <button onClick={startRound2} disabled={busy} className="mb-6 w-full rounded-xl bg-accentA py-4 text-lg font-extrabold text-white shadow-lg disabled:opacity-40">ROUND 2 시작하기</button>}
      {started && !rankingRevealed && <p className="mb-6 rounded-xl bg-blue-100 p-4 text-sm font-bold text-navy">ROUND 2 진행 중 · 모든 참가자에게 역할 선택 화면이 열렸어요.</p>}

      <section className="bg-navy text-white rounded-3xl p-6 shadow-xl mb-8">
        <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-xl font-extrabold">실시간 팀 순위</h2><button onClick={revealRankings} disabled={busy || !started || rankingRevealed || rankings.length === 0} className="bg-hit text-ink font-bold px-4 py-2 rounded-xl disabled:opacity-40">{rankingRevealed ? "순위 공개 완료" : "순위 공개하기"}</button></div>
        <div className="space-y-2">
          {rankings.map((row) => <div key={row.teamId} className="bg-white/10 rounded-xl px-4 py-3 grid grid-cols-[55px_1fr_auto] gap-3 items-center"><p className="text-xl font-extrabold">{row.rank}위</p><div><p className="font-bold">{teamName(row.teamId)}</p><p className="text-xs text-blue-200">캡틴 빙고 {row.captainBingoScore}점 · 개인 합계 {row.individualScore}점 · 아이스브레이킹 {row.icebreakingScore}점</p></div><p className="text-right font-bold">총 {row.totalScore}점<br /><span className="text-xs text-blue-200">{row.matchCount}/25 · 빙고 {row.bingoCount}줄</span></p></div>)}
          {rankings.length === 0 && <p className="text-sm text-blue-200">CAPTAIN과 일반 제출이 모두 있는 팀부터 순위에 표시됩니다.</p>}
        </div>
      </section>

      <section className="space-y-5">
        {teams.map((team) => {
          const captain = captains.find((item) => item.team_id === team.id);
          const teamGuesses = guesses.filter((guess) => guess.team_id === team.id);
          const result = rankings.find((row) => row.teamId === team.id);
          return <details key={team.id} className="bg-white rounded-2xl p-5 shadow" open={Boolean(result)}>
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3"><div><p className="font-extrabold text-lg text-navy">{team.name}</p><p className="text-xs text-navy/60">CAPTAIN {captain ? "제출완료" : "미제출"} · 일반 제출 {teamGuesses.length}명</p></div>{result && <p className="font-bold text-accentA">{result.rank}위 · {result.matchCount}/25 ({result.matchPercent}%)</p>}</summary>
            {captain && <div className={`grid ${result ? "md:grid-cols-2" : "md:grid-cols-1 max-w-md"} gap-5 mt-5`}><Round2Board title="CAPTAIN 빙고" cells={cells} answers={captain.answers} />{result && <Round2Board title="팀 제출 빙고 (팀원 다수결)" cells={cells} answers={result.teamAnswers} compareTo={captain.answers} comparisonStyle="dim" />}</div>}
            {captain && teamGuesses.length > 0 && <div className="mt-5"><p className="text-sm font-bold text-navy mb-2">개인 제출 빙고</p><div className="space-y-2">{teamGuesses.map((guess) => { const score = result?.individualScores.find((item) => item.playerId === guess.player_id); const matches = score?.matchCount || 0; return <details key={guess.player_id} className="border border-gray-200 rounded-xl p-3"><summary className="cursor-pointer text-sm font-semibold text-navy">{guess.players?.nickname} · {score?.score || 0}점 (정답 {matches}개 + 빙고 {score?.bingoCount || 0}줄) · {new Date(guess.created_at).toLocaleTimeString("ko-KR")}</summary><div className="mt-3"><Round2Board title={`${guess.players?.nickname} 제출 빙고`} cells={cells} answers={guess.answers} compareTo={captain.answers} comparisonStyle="dim" /></div></details>; })}</div></div>}
          </details>;
        })}
      </section>
    </main>
  );
}
