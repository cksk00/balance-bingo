"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { bingoLines } from "@/lib/bingoLines";
import { ROUND1_CELLS } from "@/lib/questions";

type Cell = { cell_index: number; option_a: string; option_b: string };
type Choice = "A" | "B" | null;

const ROWS = 5;
const COLS = 5;

type ValidChoice = "A" | "B" | "HIT";

export default function Round1Page() {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [cells] = useState<Cell[]>(ROUND1_CELLS);
  const [selections, setSelections] = useState<Choice[]>(Array(25).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [validChoices, setValidChoices] = useState<Record<number, ValidChoice>>({});
  const [bingoCount, setBingoCount] = useState(0);

  // 결과 공개 상태 구독
  useEffect(() => {
    supabase
      .from("game_state")
      .select("round1_revealed")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.round1_revealed) setRevealed(true);
      });

    const channel = supabase
      .channel("round1-game-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state" },
        (payload) => {
          const row = payload.new as { round1_revealed?: boolean };
          if (row?.round1_revealed) setRevealed(true);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 결과 공개되면 확정 결과 + 내 빙고 달성 여부 불러오기
  useEffect(() => {
    if (!revealed || !playerId) return;
    supabase
      .from("round1_results")
      .select("cell_index, valid_choice")
      .then(({ data }) => {
        if (!data) return;
        const map: Record<number, ValidChoice> = {};
        for (const row of data as { cell_index: number; valid_choice: ValidChoice }[]) {
          map[row.cell_index] = row.valid_choice;
        }
        setValidChoices(map);
      });
    supabase
      .from("round1_bingo_winners")
      .select("bingo_count")
      .eq("player_id", playerId)
      .maybeSingle()
      .then(({ data }) => {
        setBingoCount(data?.bingo_count || 0);
      });
  }, [revealed, playerId]);

  // 로그인 확인
  useEffect(() => {
    const id = localStorage.getItem("bb_player_id");
    if (!id) {
      router.push("/");
      return;
    }
    setPlayerId(id);
  }, [router]);

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
  }, [playerId, completedCount, selections]);

  const grid = useMemo(() => {
    const g: Cell[][] = [];
    for (let r = 0; r < ROWS; r++) {
      g.push(cells.slice(r * COLS, r * COLS + COLS));
    }
    return g;
  }, [cells]);

  // 결과 공개 시: 내가 유효 칸을 골랐는지, 그 칸이 완성된 빙고 줄에 속하는지 계산
  const completedLines = useMemo(() => {
    const validMine: boolean[] = Array(25).fill(false);
    const completed: number[][] = [];
    if (!revealed) return completed;

    for (let i = 0; i < 25; i++) {
      const mine = selections[i];
      const valid = validChoices[i];
      if (!mine || !valid) continue;
      validMine[i] = valid === "HIT" || mine === valid;
    }

    for (const line of bingoLines()) {
      const complete = line.every((i) => validMine[i]);
      if (complete) completed.push(line);
    }

    return completed;
  }, [revealed, selections, validChoices]);

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-sm text-navy/60">ROUND 1 · 개인 밸런스 빙고</p>
        <h1 className="text-3xl font-extrabold text-navy">
          각 칸의 선택지 중 하나를 골라 체크하세요
        </h1>
        <p className="text-sm text-navy/60 mt-2">
          완료 {completedCount} / 25 · 다른 사람들이 무엇을 골랐는지는 결과
          공개 전까지 보이지 않아요.
        </p>
      </div>

      {revealed && (
        <div className="mb-6 space-y-3">
          <div className="bg-hit/20 border border-hit text-navy rounded-xl p-4 text-sm font-semibold">
            {bingoCount > 0
              ? `결과가 공개됐어요! 빙고 ${bingoCount}줄을 완성했어요 🎉 팀 점수에 반영됐어요.`
              : "결과가 공개됐어요. 아쉽게도 이번엔 빙고를 완성하지 못했어요."}
          </div>
          <button
            onClick={() => router.push("/round2")}
            className="w-full bg-accentB hover:opacity-90 transition text-white text-lg font-extrabold py-4 rounded-xl shadow-lg"
          >
            ROUND 2로 넘어가기 →
          </button>
        </div>
      )}

      <div className="bg-navy rounded-3xl p-6 shadow-xl">
        <div className="relative grid grid-cols-5 gap-2">
          {grid.map((row) =>
            row.map((cell) => {
              const choice = selections[cell.cell_index];
              return (
                <div
                  key={cell.cell_index}
                  className="relative z-10 bg-white/5 rounded-xl p-1.5 flex flex-col gap-1 transition"
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
          {completedLines.length > 0 && (
            <svg
              className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {completedLines.map((line, index) => {
                const first = line[0];
                const last = line[line.length - 1];
                const row = Math.floor(first / COLS);
                const col = first % COLS;
                const isHorizontal = Math.floor(last / COLS) === row;
                const isVertical = last % COLS === col;
                if (isHorizontal) {
                  return <rect key={`${first}-${last}-${index}`} x="0.7" y={row * 20 + 0.7} width="98.6" height="18.6" rx="2.5" fill="none" stroke="#FFC53D" strokeWidth="2" vectorEffect="non-scaling-stroke" />;
                }
                if (isVertical) {
                  return <rect key={`${first}-${last}-${index}`} x={col * 20 + 0.7} y="0.7" width="18.6" height="98.6" rx="2.5" fill="none" stroke="#FFC53D" strokeWidth="2" vectorEffect="non-scaling-stroke" />;
                }
                const points = first === 0
                  ? "-3,10 10,-3 103,90 90,103"
                  : "90,-3 103,10 10,103 -3,90";
                return <polygon key={`${first}-${last}-${index}`} points={points} fill="none" stroke="#FFC53D" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;
              })}
            </svg>
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
