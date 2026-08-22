"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Cell = { cell_index: number; option_a: string; option_b: string };
type Choice = "A" | "B" | null;

const ROWS = 5;
const COLS = 5;

export default function Round2GuessPage() {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [selections, setSelections] = useState<Choice[]>(Array(25).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const pid = localStorage.getItem("bb_player_id");
    const tid = localStorage.getItem("bb_team_id");
    if (!pid || !tid) {
      router.push("/");
      return;
    }
    setPlayerId(pid);
    setTeamId(Number(tid));
  }, [router]);

  useEffect(() => {
    supabase
      .from("round1_cells")
      .select("cell_index, option_a, option_b")
      .order("cell_index")
      .then(({ data }) => {
        if (data) setCells(data as Cell[]);
      });
  }, []);

  useEffect(() => {
    if (!playerId) return;
    supabase
      .from("round2_guesses")
      .select("answers")
      .eq("player_id", playerId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const answers = data.answers as Record<string, "A" | "B">;
        const next = Array(25).fill(null) as Choice[];
        for (let i = 0; i < 25; i++) next[i] = answers[String(i)] ?? null;
        setSelections(next);
        if (next.every((v) => v !== null)) setSubmitted(true);
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

  const handleSubmit = useCallback(async () => {
    if (!teamId || !playerId) return;
    if (completedCount < 25) return;
    setSubmitting(true);
    const answers: Record<string, "A" | "B"> = {};
    selections.forEach((choice, i) => {
      if (choice) answers[String(i)] = choice;
    });
    const { error } = await supabase.from("round2_guesses").upsert(
      { player_id: playerId, team_id: teamId, answers },
      { onConflict: "player_id" }
    );
    setSubmitting(false);
    if (!error) setSubmitted(true);
  }, [teamId, playerId, completedCount, selections]);

  const grid = useMemo(() => {
    const g: Cell[][] = [];
    for (let r = 0; r < ROWS; r++) g.push(cells.slice(r * COLS, r * COLS + COLS));
    return g;
  }, [cells]);

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-sm text-navy/60">ROUND 2 · 대표자 답 예측</p>
        <h1 className="text-3xl font-extrabold text-navy">
          우리 팀 대표자가 골랐을 법한 답을 예측하세요
        </h1>
        <p className="text-sm text-navy/60 mt-2">
          완료 {completedCount} / 25 · 결과는 라운드가 끝난 뒤 공개돼요.
        </p>
      </div>

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
          {submitted ? "제출 완료 · 결과 공개를 기다려주세요" : submitting ? "제출 중..." : "제출하기"}
        </button>
      </div>
    </main>
  );
}
