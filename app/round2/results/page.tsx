"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  calculateRound2Rankings,
  type CaptainSubmission,
  type GuessSubmission,
  type Round2RankingRow,
} from "@/lib/round2Ranking";
import { Round2Board } from "@/components/Round2Board";
import { ROUND2_CELLS } from "@/lib/questions";

type Team = { id: number; name: string };
type Cell = { cell_index: number; option_a: string; option_b: string };

export default function Round2ResultsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [cells] = useState<Cell[]>(ROUND2_CELLS);
  const [rankings, setRankings] = useState<Round2RankingRow[]>([]);
  const [showAll, setShowAll] = useState(false);

  const refresh = useCallback(async () => {
    const [{ data: state }, { data: teamData }, { data: captains }, { data: guesses }, { data: scores }] =
      await Promise.all([
        supabase.from("game_state").select("round2_revealed").eq("id", 1).maybeSingle(),
        supabase.from("teams").select("id, name").order("id"),
        supabase.from("round2_answer_key").select("team_id, answers, created_at, submitted_by"),
        supabase.from("round2_guesses").select("player_id, team_id, answers, created_at"),
        supabase.from("team_scores").select("team_id, icebreaking"),
      ]);
    if (!state?.round2_revealed) {
      router.push("/round2");
      return;
    }
    setTeams((teamData || []) as Team[]);
    const icebreakingScores = Object.fromEntries(
      ((scores || []) as { team_id: number; icebreaking: number }[]).map((score) => [score.team_id, score.icebreaking])
    );
    setRankings(
      calculateRound2Rankings(
        (captains || []) as CaptainSubmission[],
        (guesses || []) as GuessSubmission[],
        icebreakingScores
      )
    );
  }, [router]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("round2-public-rankings")
      .on("postgres_changes", { event: "*", schema: "public", table: "round2_guesses" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_state" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_scores" }, refresh)
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
              캡틴 빙고 {winner.captainBingoScore}점 · 개인 합계 {winner.individualScore}점 · 아이스브레이킹 {winner.icebreakingScore}점 · 종합 {winner.totalScore}점
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
              <div><p className="text-xl font-extrabold text-navy">{row.rank}위 · {teamName(row.teamId)}</p><p className="text-sm text-navy/60">캡틴 빙고 {row.captainBingoScore}점 · 개인 합계 {row.individualScore}점 · 아이스브레이킹 {row.icebreakingScore}점</p></div>
              <p className="text-right font-bold text-navy">총 {row.totalScore}점<br /><span className="text-sm">{row.matchCount}/25 · 빙고 {row.bingoCount}줄</span></p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
