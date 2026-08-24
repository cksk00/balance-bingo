"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ROUND2_CELLS } from "@/lib/questions";

type Cell = { cell_index: number; option_a: string; option_b: string };
type Choice = "A" | "B" | null;

const ROWS = 5;
const COLS = 5;

export default function Round2AnswerPage() {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [cells] = useState<Cell[]>(ROUND2_CELLS);
  const [selections, setSelections] = useState<Choice[]>(Array(25).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    if (!teamId) return;
    supabase
      .from("round2_answer_key")
      .select("answers, submitted_by")
      .eq("team_id", teamId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.submitted_by !== playerId) {
          router.push("/round2");
          return;
        }
        const answers = data.answers as Record<string, "A" | "B">;
        const next = Array(25).fill(null) as Choice[];
        for (let i = 0; i < 25; i++) next[i] = answers[String(i)] ?? null;
        setSelections(next);
        if (next.every((v) => v !== null)) setSubmitted(true);
      });
  }, [teamId, playerId, router]);

  useEffect(() => {
    supabase
      .from("game_state")
      .select("round2_revealed")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.round2_revealed) router.push("/round2/results");
      });

    const channel = supabase
      .channel("round2-answer-reveal")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_state", filter: "id=eq.1" },
        (payload) => {
          const state = payload.new as { round2_revealed?: boolean };
          if (state.round2_revealed) router.push("/round2/results");
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router]);

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
    setError("");
    const { error } = await supabase
      .from("round2_answer_key")
      .insert({ team_id: teamId, answers, submitted_by: playerId });
    setSubmitting(false);
    if (error) {
      setError("이미 이 팀의 CAPTAIN 빙고가 제출됐어요. 제출 후에는 수정할 수 없습니다.");
      return;
    }
    await supabase
      .from("round2_reps")
      .insert({ team_id: teamId, player_id: playerId });
    setSubmitted(true);
  }, [teamId, playerId, completedCount, selections]);

  const grid = useMemo(() => {
    const g: Cell[][] = [];
    for (let r = 0; r < ROWS; r++) g.push(cells.slice(r * COLS, r * COLS + COLS));
    return g;
  }, [cells]);

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-sm text-navy/60">seKUrity 빙고 세션 · CAPTAIN 답안 제출</p>
        <h1 className="text-3xl font-extrabold text-navy">
          우리 팀의 정답 빙고판을 완성하세요
        </h1>
        <p className="text-sm text-navy/60 mt-2">
          완료 {completedCount} / 25 · 팀당 한 번만 제출할 수 있고 제출 후에는
          수정할 수 없어요.
        </p>
      </div>

      <div className="bg-navy rounded-3xl p-6 shadow-xl">
        {error && <p className="text-accentB text-sm mb-4">{error}</p>}
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
          {submitted ? "CAPTAIN 제출 완료 · 수정 불가" : submitting ? "제출 중..." : "CAPTAIN으로 제출하기"}
        </button>
      </div>
    </main>
  );
}
