"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { revealRound1 } from "@/lib/round1Score";

type Cell = { cell_index: number; option_a: string; option_b: string };
type Tally = { A: number; B: number };

const COLS = 5;

export default function AdminRound1Page() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [tallies, setTallies] = useState<Tally[]>(
    Array.from({ length: 25 }, () => ({ A: 0, B: 0 }))
  );
  const [completedPlayers, setCompletedPlayers] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("round1_cells")
      .select("cell_index, option_a, option_b")
      .order("cell_index")
      .then(({ data }) => {
        if (data) setCells(data as Cell[]);
      });
    supabase
      .from("game_state")
      .select("round1_revealed")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setRevealed(data.round1_revealed);
      });
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("round1_answers")
      .select("player_id, cell_index, choice");
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
      supabase.from("game_state").update({ round1_revealed: false }).eq("id", 1),
    ]);
    const failed = results.find((result) => result.error)?.error;
    if (failed) setError(failed.message);
    setRevealed(false);
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

      {!revealed ? (
        <button
          onClick={handleReveal}
          disabled={revealing}
          className="w-full mb-6 bg-accentB hover:opacity-90 transition text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {revealing ? "계산 중..." : "결과 공개하기 (유효 칸 확정 + 점수 반영)"}
        </button>
      ) : (
        <div className="mb-6 bg-hit/20 border border-hit text-navy rounded-xl p-4 text-sm font-semibold">
          결과가 공개되었어요. 참가자 화면에도 확정 결과가 보여요.
        </div>
      )}

      {error && <p className="text-accentB text-sm mb-4">{error}</p>}

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
