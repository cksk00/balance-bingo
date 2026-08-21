"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Cell = { cell_index: number; option_a: string; option_b: string };
type Choice = "A" | "B" | null;
type Tally = { A: number; B: number };

const ROWS = 5;
const COLS = 5;

export default function Round1Page() {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [selections, setSelections] = useState<Choice[]>(Array(25).fill(null));
  const [tallies, setTallies] = useState<Tally[]>(
    Array.from({ length: 25 }, () => ({ A: 0, B: 0 }))
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 로그인 확인
  useEffect(() => {
    const id = localStorage.getItem("bb_player_id");
    if (!id) {
      router.push("/");
      return;
    }
    setPlayerId(id);
  }, [router]);

  // 빙고 칸 구성 로드
  useEffect(() => {
    supabase
      .from("round1_cells")
      .select("cell_index, option_a, option_b")
      .order("cell_index")
      .then(({ data }) => {
        if (data) setCells(data as Cell[]);
      });
  }, []);

  // 전체 응답 집계 (최초 1회 + 실시간 갱신)
  const refreshTallies = useCallback(async () => {
    const { data } = await supabase
      .from("round1_answers")
      .select("cell_index, choice");
    if (!data) return;
    const next: Tally[] = Array.from({ length: 25 }, () => ({ A: 0, B: 0 }));
    for (const row of data as { cell_index: number; choice: "A" | "B" }[]) {
      next[row.cell_index][row.choice]++;
    }
    setTallies(next);
  }, []);

  useEffect(() => {
    refreshTallies();
    const channel = supabase
      .channel("round1-answers-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round1_answers" },
        () => refreshTallies()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshTallies]);

  // 내 기존 응답 불러오기
  useEffect(() => {
    if (!playerId) return;
    supabase
      .from("round1_answers")
      .select("cell_index, choice")
      .eq("player_id", playerId)
      .then(({ data }) => {
        if (!data) return;
        const next = Array(25).fill(null) as Choice[];
        for (const row of data as { cell_index: number; choice: "A" | "B" }[]) {
          next[row.cell_index] = row.choice;
        }
        setSelections(next);
      });
  }, [playerId]);

  function toggle(cellIndex: number, choice: "A" | "B") {
    if (submitted) return;
    setSelections((prev) => {
      const next = [...prev];
      next[cellIndex] = next[cellIndex] === choice ? null : choice;
      return next;
    });
  }

  const completedCount = selections.filter(Boolean).length;

  async function handleSubmit() {
    if (!playerId) return;
    if (completedCount < 25) return;
    setSubmitting(true);
    const rows = selections.map((choice, cell_index) => ({
      player_id: playerId,
      cell_index,
      choice,
    }));
    const { error } = await supabase
      .from("round1_answers")
      .upsert(rows, { onConflict: "player_id,cell_index" });
    setSubmitting(false);
    if (!error) setSubmitted(true);
  }

  const grid = useMemo(() => {
    const g: Cell[][] = [];
    for (let r = 0; r < ROWS; r++) {
      g.push(cells.slice(r * COLS, r * COLS + COLS));
    }
    return g;
  }, [cells]);

  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-navy/60">ROUND 1 · 개인 밸런스 빙고</p>
          <h1 className="text-3xl font-extrabold text-navy">
            각 칸의 선택지 중 하나를 골라 체크하세요
          </h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-navy/60">완료</p>
          <p className="text-2xl font-bold text-accentA">{completedCount} / 25</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* 빙고판 */}
        <div className="bg-navy rounded-3xl p-6 shadow-xl">
          <div className="grid grid-cols-5 gap-2">
            {grid.map((row) =>
              row.map((cell) => {
                const choice = selections[cell.cell_index];
                return (
                  <div
                    key={cell.cell_index}
                    className="bg-white/5 rounded-xl p-1.5 flex flex-col gap-1"
                  >
                    <button
                      onClick={() => toggle(cell.cell_index, "A")}
                      className={`text-[11px] leading-tight rounded-lg py-2 px-1 font-semibold transition ${
                        choice === "A"
                          ? "bg-accentA text-white"
                          : "bg-white/10 text-blue-100 hover:bg-white/20"
                      }`}
                    >
                      {cell.option_a}
                    </button>
                    <button
                      onClick={() => toggle(cell.cell_index, "B")}
                      className={`text-[11px] leading-tight rounded-lg py-2 px-1 font-semibold transition ${
                        choice === "B"
                          ? "bg-accentB text-white"
                          : "bg-white/10 text-blue-100 hover:bg-white/20"
                      }`}
                    >
                      {cell.option_b}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={completedCount < 25 || submitting || submitted}
            className="w-full mt-6 bg-accentA hover:bg-blue-500 transition text-white font-bold py-3 rounded-xl disabled:opacity-40"
          >
            {submitted ? "제출 완료" : submitting ? "제출 중..." : "제출하기"}
          </button>
        </div>

        {/* 실시간 통계 */}
        <div className="bg-white rounded-3xl p-6 shadow-xl h-fit">
          <h2 className="font-bold text-navy mb-4">실시간 선택지 통계</h2>
          <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
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
                      {(cell.cell_index % COLS) + 1}열
                    </span>
                    {isHit && (
                      <span className="text-hit font-bold">HIT!</span>
                    )}
                  </div>
                  <div className="flex rounded-full overflow-hidden h-5 bg-gray-100">
                    <div
                      className="bg-accentA text-white text-[10px] flex items-center justify-center transition-all"
                      style={{ width: `${pctA}%` }}
                    >
                      {total > 0 && pctA > 12 ? `A ${pctA}%` : ""}
                    </div>
                    <div
                      className="bg-accentB text-white text-[10px] flex items-center justify-center transition-all"
                      style={{ width: `${pctB}%` }}
                    >
                      {total > 0 && pctB > 12 ? `B ${pctB}%` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
