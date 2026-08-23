"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { calculateRound2Rankings, formatDuration, type CaptainSubmission, type GuessSubmission, type Round2RankingRow } from "@/lib/round2Ranking";
import { Round2Board } from "@/components/Round2Board";

type Team = { id: number; name: string };
type Cell = { cell_index: number; option_a: string; option_b: string };

export default function AdminRound2Page() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [captains, setCaptains] = useState<CaptainSubmission[]>([]);
  const [guesses, setGuesses] = useState<GuessSubmission[]>([]);
  const [rankings, setRankings] = useState<Round2RankingRow[]>([]);
  const [rankingRevealed, setRankingRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [teamsRes, cellsRes, captainsRes, guessesRes, playersRes, stateRes] = await Promise.all([
      supabase.from("teams").select("id, name").order("id"),
      supabase.from("round2_cells").select("cell_index, option_a, option_b").order("cell_index"),
      supabase.from("round2_answer_key").select("team_id, answers, created_at, submitted_by"),
      supabase.from("round2_guesses").select("player_id, team_id, answers, created_at"),
      supabase.from("players").select("id, nickname"),
      supabase.from("game_state").select("round2_ranking_revealed").eq("id", 1).maybeSingle(),
    ]);
    const nicknameById = new Map(((playersRes.data || []) as { id: string; nickname: string }[]).map((p) => [p.id, p.nickname]));
    const nextCaptains = (captainsRes.data || []) as CaptainSubmission[];
    const nextGuesses = ((guessesRes.data || []) as GuessSubmission[]).map((g) => ({ ...g, players: { nickname: nicknameById.get(g.player_id) || "알 수 없음" } }));
    setTeams((teamsRes.data || []) as Team[]);
    setCells((cellsRes.data || []) as Cell[]);
    setCaptains(nextCaptains);
    setGuesses(nextGuesses);
    setRankings(calculateRound2Rankings(nextCaptains, nextGuesses));
    setRankingRevealed(Boolean(stateRes.data?.round2_ranking_revealed));
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase.channel("admin-round2-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "round2_answer_key" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "round2_guesses" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_state" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  async function revealRankings() {
    if (rankings.length === 0 || !confirm("현재 실시간 순위를 참가자에게 공개할까요?")) return;
    setBusy(true); setError("");
    const { error: updateError } = await supabase.from("game_state").update({ round2_ranking_revealed: true, round2_revealed: true }).eq("id", 1);
    if (updateError) setError(updateError.message);
    await refresh(); setBusy(false);
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
      supabase.from("game_state").update({ round2_revealed: false, round2_ranking_revealed: false }).eq("id", 1),
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
      <p className="text-sm text-navy/60 mb-6">종합점수 = 정확도 60점 + 평균 제출시간 상대점수 40점</p>
      {error && <p className="text-accentB text-sm mb-4">{error}</p>}

      <section className="bg-navy text-white rounded-3xl p-6 shadow-xl mb-8">
        <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-xl font-extrabold">실시간 팀 순위</h2><button onClick={revealRankings} disabled={busy || rankingRevealed || rankings.length === 0} className="bg-hit text-ink font-bold px-4 py-2 rounded-xl disabled:opacity-40">{rankingRevealed ? "순위 공개 완료" : "순위 공개하기"}</button></div>
        <div className="space-y-2">
          {rankings.map((row) => <div key={row.teamId} className="bg-white/10 rounded-xl px-4 py-3 grid grid-cols-[55px_1fr_auto] gap-3 items-center"><p className="text-xl font-extrabold">{row.rank}위</p><div><p className="font-bold">{teamName(row.teamId)}</p><p className="text-xs text-blue-200">정확도 {row.accuracyScore.toFixed(1)}/60 · 시간 {row.timeScore.toFixed(1)}/40 · 평균 {formatDuration(row.averageSeconds)}</p></div><p className="text-right font-bold">{row.matchCount}/25<br /><span className="text-xs text-blue-200">{row.matchPercent}% · {row.totalScore.toFixed(1)}점</span></p></div>)}
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
            {captain && <div className={`grid ${result ? "md:grid-cols-2" : "md:grid-cols-1 max-w-md"} gap-5 mt-5`}><Round2Board title="CAPTAIN 빙고" cells={cells} answers={captain.answers} />{result && <Round2Board title="팀 제출 빙고 (팀원 다수결)" cells={cells} answers={result.teamAnswers} compareTo={captain.answers} />}</div>}
            {captain && teamGuesses.length > 0 && <div className="mt-5"><p className="text-sm font-bold text-navy mb-2">개인 제출 빙고</p><div className="space-y-2">{teamGuesses.map((guess) => { const matches = Array.from({ length: 25 }, (_, i) => captain.answers[String(i)] === guess.answers[String(i)]).filter(Boolean).length; return <details key={guess.player_id} className="border border-gray-200 rounded-xl p-3"><summary className="cursor-pointer text-sm font-semibold text-navy">{guess.players?.nickname} · {matches}/25 ({Math.round(matches / 25 * 100)}%) · {new Date(guess.created_at).toLocaleTimeString("ko-KR")}</summary><div className="mt-3"><Round2Board title={`${guess.players?.nickname} 제출 빙고`} cells={cells} answers={guess.answers} compareTo={captain.answers} /></div></details>; })}</div></div>}
          </details>;
        })}
      </section>
    </main>
  );
}
