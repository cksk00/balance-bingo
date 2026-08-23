"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  calculateRound2Rankings,
  formatDuration,
  type CaptainSubmission,
  type GuessSubmission,
  type Round2RankingRow,
} from "@/lib/round2Ranking";
import { Round2Board } from "@/components/Round2Board";

type Team = { id: number; name: string };
type Cell = { cell_index: number; option_a: string; option_b: string };

export default function Round2ResultsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [rankings, setRankings] = useState<Round2RankingRow[]>([]);
  const [showAll, setShowAll] = useState(false);

  const refresh = useCallback(async () => {
    const [{ data: state }, { data: teamData }, { data: cellData }, { data: captains }, { data: guesses }] =
      await Promise.all([
        supabase.from("game_state").select("round2_ranking_revealed").eq("id", 1).maybeSingle(),
        supabase.from("teams").select("id, name").order("id"),
        supabase.from("round2_cells").select("cell_index, option_a, option_b").order("cell_index"),
        supabase.from("round2_answer_key").select("team_id, answers, created_at, submitted_by"),
        supabase.from("round2_guesses").select("player_id, team_id, answers, created_at"),
      ]);
    if (!state?.round2_ranking_revealed) {
      router.push("/round2");
      return;
    }
    setTeams((teamData || []) as Team[]);
    setCells((cellData || []) as Cell[]);
    setRankings(
      calculateRound2Rankings(
        (captains || []) as CaptainSubmission[],
        (guesses || []) as GuessSubmission[]
      )
    );
  }, [router]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("round2-public-rankings")
      .on("postgres_changes", { event: "*", schema: "public", table: "round2_guesses" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_state" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  const teamName = (teamId: number) => teams.find((team) => team.id === teamId)?.name || `TEAM ${teamId}`;
  const winner = rankings[0];

  return (
    <main className="min-h-screen px-4 py-10 max-w-5xl mx-auto">
      <h1 className="text-4xl font-extrabold text-navy text-center mb-8">ROUND 2 순위</h1>
      {winner && (
        <section className="bg-white rounded-3xl p-6 shadow-xl mb-8">
          <div className="text-center mb-6">
            <p className="text-5xl mb-2">🏆</p>
            <p className="text-4xl font-extrabold text-navy">1위 · {teamName(winner.teamId)}</p>
            <p className="text-navy/60 mt-2">
              정답률 {winner.matchPercent}% · {winner.matchCount}/25개 · 평균 {formatDuration(winner.averageSeconds)} · 종합 {winner.totalScore.toFixed(1)}점
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <Round2Board title="CAPTAIN 빙고" cells={cells} answers={winner.captainAnswers} />
            <Round2Board title="팀 제출 빙고" cells={cells} answers={winner.teamAnswers} compareTo={winner.captainAnswers} />
          </div>
        </section>
      )}

      {!showAll ? (
        <button onClick={() => setShowAll(true)} className="w-full bg-navy text-white font-bold py-4 rounded-xl">
          전체 순위 보기
        </button>
      ) : (
        <section className="space-y-3">
          {rankings.map((row) => (
            <div key={row.teamId} className="bg-white rounded-2xl p-5 shadow flex items-center justify-between">
              <div><p className="text-xl font-extrabold text-navy">{row.rank}위 · {teamName(row.teamId)}</p><p className="text-sm text-navy/60">평균 제출 {formatDuration(row.averageSeconds)} · 종합 {row.totalScore.toFixed(1)}점</p></div>
              <p className="text-right font-bold text-navy">정답률 {row.matchPercent}%<br /><span className="text-sm">{row.matchCount}/25개</span></p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
