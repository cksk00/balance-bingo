"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { revealRound2Team, finalizeRound2Winner } from "@/lib/round2Score";

type Team = { id: number; name: string };
type TeamStatus = {
  hasKey: boolean;
  guessCount: number;
  revealed: boolean;
  matchCount: number;
  matchPercent: number;
};

export default function AdminRound2Page() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [status, setStatus] = useState<Record<number, TeamStatus>>({});
  const [revealingTeam, setRevealingTeam] = useState<number | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [round2Revealed, setRound2Revealed] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [{ data: teamsData }, { data: keys }, { data: guesses }, { data: results }, { data: state }] =
      await Promise.all([
        supabase.from("teams").select("id, name").order("id"),
        supabase.from("round2_answer_key").select("team_id"),
        supabase.from("round2_guesses").select("team_id"),
        supabase
          .from("round2_team_results")
          .select("team_id, match_count, match_percent, revealed"),
        supabase.from("game_state").select("round2_revealed").eq("id", 1).maybeSingle(),
      ]);

    if (teamsData) setTeams(teamsData as Team[]);
    if (state) setRound2Revealed(state.round2_revealed);

    const keySet = new Set((keys || []).map((k: { team_id: number }) => k.team_id));
    const guessCounts: Record<number, number> = {};
    for (const g of (guesses || []) as { team_id: number }[]) {
      guessCounts[g.team_id] = (guessCounts[g.team_id] || 0) + 1;
    }
    const resultMap: Record<
      number,
      { match_count: number; match_percent: number; revealed: boolean }
    > = {};
    for (const r of (results || []) as {
      team_id: number;
      match_count: number;
      match_percent: number;
      revealed: boolean;
    }[]) {
      resultMap[r.team_id] = r;
    }

    const next: Record<number, TeamStatus> = {};
    for (const t of (teamsData || []) as Team[]) {
      next[t.id] = {
        hasKey: keySet.has(t.id),
        guessCount: guessCounts[t.id] || 0,
        revealed: resultMap[t.id]?.revealed || false,
        matchCount: resultMap[t.id]?.match_count || 0,
        matchPercent: resultMap[t.id]?.match_percent || 0,
      };
    }
    setStatus(next);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("admin-round2")
      .on("postgres_changes", { event: "*", schema: "public", table: "round2_answer_key" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "round2_guesses" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "round2_team_results" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  async function handleRevealTeam(teamId: number) {
    setRevealingTeam(teamId);
    setError("");
    try {
      await revealRound2Team(teamId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "공개 중 오류가 발생했어요.");
    }
    setRevealingTeam(null);
  }

  async function handleFinalize() {
    if (!confirm("모든 팀 결과를 바탕으로 최고 일치율 팀에게 점수를 확정할까요?"))
      return;
    setFinalizing(true);
    setError("");
    try {
      await finalizeRound2Winner();
      await refresh();
    } catch (e) {
      setError("점수 확정 중 오류가 발생했어요.");
      console.error(e);
    }
    setFinalizing(false);
  }

  const allRevealed = teams.length > 0 && teams.every((t) => status[t.id]?.revealed);

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <Link href="/admin" className="text-sm text-navy/60 underline">
        ← 대시보드
      </Link>
      <h1 className="text-3xl font-extrabold text-navy mt-2 mb-6">
        ROUND 2 관리
      </h1>

      {error && <p className="text-accentB text-sm mb-4">{error}</p>}

      <div className="space-y-4 mb-6">
        {teams.map((t) => {
          const s = status[t.id];
          if (!s) return null;
          return (
            <div key={t.id} className="bg-white rounded-2xl p-5 shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-navy">{t.name}</p>
                {s.revealed ? (
                  <span className="text-sm font-bold text-accentA">
                    {s.matchCount} / 25 ({s.matchPercent}%)
                  </span>
                ) : (
                  <span className="text-xs text-navy/50">미공개</span>
                )}
              </div>
              <p className="text-xs text-navy/60 mb-3">
                대표자 답안: {s.hasKey ? "제출완료" : "미제출"} · 팀원 예측
                제출 {s.guessCount}명
              </p>
              <button
                onClick={() => handleRevealTeam(t.id)}
                disabled={!s.hasKey || revealingTeam === t.id}
                className="w-full bg-navy text-white text-sm font-semibold py-2 rounded-xl disabled:opacity-40"
              >
                {s.revealed
                  ? "다시 계산"
                  : revealingTeam === t.id
                  ? "계산 중..."
                  : "이 팀 결과 공개"}
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleFinalize}
        disabled={!allRevealed || finalizing || round2Revealed}
        className="w-full bg-accentB text-white font-bold py-3 rounded-xl disabled:opacity-40"
      >
        {round2Revealed
          ? "점수 확정 완료"
          : finalizing
          ? "확정 중..."
          : "전체 팀 공개 완료 → 최고 일치율 팀 +10점 확정"}
      </button>
    </main>
  );
}
