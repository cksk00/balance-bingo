"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ROUND2_CELLS } from "@/lib/questions";
import { QuestionFlow } from "@/components/QuestionFlow";
import { WaitingScreen } from "@/components/WaitingScreen";

type Cell = { cell_index: number; prompt: string; option_a: string; option_b: string };
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
  const [roundStarted, setRoundStarted] = useState<boolean | null>(null);

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
      .select("round2_started, round2_revealed")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        setRoundStarted(Boolean(data?.round2_started));
        if (data?.round2_revealed) router.push("/round2/results");
      });

    const channel = supabase
      .channel("round2-answer-reveal")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_state", filter: "id=eq.1" },
        (payload) => {
          const state = payload.new as { round2_started?: boolean; round2_revealed?: boolean };
          setRoundStarted(Boolean(state.round2_started));
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

  if (roundStarted === null) return <WaitingScreen round={2} message="게임 상태를 확인하고 있어요." />;
  if (!roundStarted) return <WaitingScreen round={2} />;

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

      {error && <p className="text-accentB text-sm mb-4">{error}</p>}
      <QuestionFlow cells={cells} selections={selections} disabled={submitted} submitting={submitting} submitLabel="CAPTAIN으로 제출하기" onChange={toggle} onSubmit={handleSubmit} />
    </main>
  );
}
