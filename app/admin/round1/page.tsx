"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { revealRound1 } from "@/lib/round1Score";
import { ROUND1_CELLS } from "@/lib/questions";
import { TEAMS } from "@/lib/teams";
import { AdminPlayersPanel } from "@/components/AdminPlayersPanel";

type Cell = { cell_index: number; option_a: string; option_b: string };
type Tally = { A: number; B: number };

const COLS = 5;

export default function AdminRound1Page() {
  const [cells] = useState<Cell[]>(ROUND1_CELLS);
  const [tallies, setTallies] = useState<Tally[]>(
    Array.from({ length: 25 }, () => ({ A: 0, B: 0 }))
  );
  const [completedPlayers, setCompletedPlayers] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [teamScores, setTeamScores] = useState<{ team_id: number; round1: number }[]>([]);

  useEffect(() => {
    supabase
      .from("game_state")
      .select("round1_started, round1_revealed")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setStarted(Boolean(data.round1_started)); setRevealed(data.round1_revealed); }
      });
  }, []);

  const refresh = useCallback(async () => {
    const [{ data }, { data: scoreData }] = await Promise.all([
      supabase.from("round1_answers").select("player_id, cell_index, choice"),
      supabase.from("team_scores").select("team_id, round1"),
    ]);
    setTeamScores((scoreData || []) as { team_id: number; round1: number }[]);
    if (!data) return;
    const next: Tally[] = Array.from({ length: 25 }, () => ({ A: 0, B: 0 }));
    const perPlayer: Record<string, number> = {};
    for (const row of data as {
      player_id: string;
      cell_index: number;
      choice: "A" | "B";
    }[]) {
      next[row.cell_index][row.choice]++;
      perPlayer[row.player_id] = (perPlayer[row.player_id] || 0) + 1;
    }
    setTallies(next);
    setCompletedPlayers(
      Object.values(perPlayer).filter((count) => count === 25).length
    );
  }, []);

  async function handleStart() {
    if (!confirm("모든 참가자의 ROUND 1을 지금 동시에 시작할까요?")) return;
    setError("");
    const { error: updateError } = await supabase.from("game_state").update({ round1_started: true }).eq("id", 1);
    if (updateError) setError(updateError.message); else setStarted(true);
  }

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("admin-round1-answers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round1_answers" },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  async function handleReveal() {
    if (
      !confirm(
        "결과를 공개하면 유효 칸이 확정되고 팀 점수에 반영돼요. 계속할까요?"
      )
    )
      return;
    setRevealing(true);
    setError("");
    try {
      await revealRound1();
      setRevealed(true);
    } catch (e) {
      setError("결과 공개 중 오류가 발생했어요. 다시 시도해주세요.");
      console.error(e);
    }
    setRevealing(false);
  }

  async function handleReset() {
    if (!confirm("ROUND 1의 모든 참가자 답안, 확정 결과, 빙고 기록과 점수를 초기화할까요? 이 작업은 되돌릴 수 없습니다.")) return;
    setResetting(true);
    setError("");
    const results = await Promise.all([
      supabase.from("round1_bingo_winners").delete().not("player_id", "is", null),
      supabase.from("round1_results").delete().not("cell_index", "is", null),
      supabase.from("round1_answers").delete().not("player_id", "is", null),
      supabase.from("team_scores").update({ round1: 0 }).not("team_id", "is", null),
      supabase.from("game_state").update({ round1_started: false, round1_revealed: false }).eq("id", 1),
    ]);
    const failed = results.find((result) => result.error)?.error;
    if (failed) setError(failed.message);
    setRevealed(false);
    setStarted(false);
    await refresh();
    setResetting(false);
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      <Link href="/admin" className="text-sm text-navy/60 underline">
        ← 대시보드
      </Link>
      <div className="flex items-center justify-between gap-3 mt-2 mb-6">
        <h1 className="text-3xl font-extrabold text-navy">ROUND 1 관리</h1>
        <div className="flex items-center gap-3"><p className="text-sm text-navy/60">완주 {completedPlayers}명</p><button onClick={handleReset} disabled={resetting} className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-40">{resetting ? "초기화 중..." : "ROUND 1 초기화"}</button></div>
      </div>

      <AdminPlayersPanel round={1} />

      {!started && <button onClick={handleStart} className="mb-6 w-full rounded-xl bg-accentA py-4 text-lg font-extrabold text-white shadow-lg">ROUND 1 시작하기</button>}
      {started && !revealed && <p className="mb-6 rounded-xl bg-blue-100 p-4 text-sm font-bold text-navy">ROUND 1 진행 중 · 모든 참가자에게 문항이 열렸어요.</p>}

      {!revealed ? (
        <button
          onClick={handleReveal}
          disabled={revealing || !started}
          className="w-full mb-6 bg-accentB hover:opacity-90 transition text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {revealing ? "계산 중..." : "결과 공개하기 (유효 칸 확정 + 점수 반영)"}
        </button>
      ) : (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-hit/20 border border-hit text-navy rounded-xl p-4 text-sm font-semibold">
          <span>결과가 공개되었어요. 참가자 화면에도 확정 결과가 보여요.</span>
          <button onClick={handleReveal} disabled={revealing} className="rounded-lg bg-navy px-4 py-2 text-white disabled:opacity-40">{revealing ? "계산 중..." : "점수 다시 계산"}</button>
        </div>
      )}

      {error && <p className="text-accentB text-sm mb-4">{error}</p>}

      {revealed && <section className="mb-6 rounded-3xl bg-navy p-6 text-white shadow-xl"><h2 className="mb-4 text-xl font-extrabold">ROUND 1 팀 순위</h2><div className="space-y-2">{[...teamScores].sort((a, b) => b.round1 - a.round1 || a.team_id - b.team_id).map((score, index, sorted) => { const rank = sorted.findIndex((item) => item.round1 === score.round1) + 1; return <div key={score.team_id} className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3"><p className="font-bold">{rank}위 · {TEAMS.find((team) => team.id === score.team_id)?.name || `TEAM ${score.team_id}`}</p><p className="font-extrabold text-hit">{score.round1}점</p></div>; })}</div></section>}

      <div className="bg-white rounded-3xl p-6 shadow-xl">
        <h2 className="font-bold text-navy mb-4">실시간 선택지 통계</h2>
        <div className="space-y-4">
          {cells.map((cell) => {
            const t = tallies[cell.cell_index];
            const total = t.A + t.B;
            const pctA = total ? Math.round((t.A / total) * 100) : 0;
            const pctB = total ? 100 - pctA : 0;
            const isHit = total > 0 && pctA === 50 && pctB === 50;
            return (
              <div key={cell.cell_index}>
                <div className="flex justify-between text-xs text-navy/60 mb-1">
                  <span>
                    {Math.floor(cell.cell_index / COLS) + 1}행{" "}
                    {(cell.cell_index % COLS) + 1}열 · {cell.option_a} vs{" "}
                    {cell.option_b}
                  </span>
                  {isHit && <span className="text-hit font-bold">HIT!</span>}
                </div>
                <div className="flex rounded-full overflow-hidden h-5 bg-gray-100">
                  <div
                    className="bg-accentA text-white text-[10px] flex items-center justify-center transition-all"
                    style={{ width: `${pctA}%` }}
                  >
                    {total > 0 && pctA > 10 ? `A ${t.A}명 (${pctA}%)` : ""}
                  </div>
                  <div
                    className="bg-accentB text-white text-[10px] flex items-center justify-center transition-all"
                    style={{ width: `${pctB}%` }}
                  >
                    {total > 0 && pctB > 10 ? `B ${t.B}명 (${pctB}%)` : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
