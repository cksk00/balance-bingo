"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ROUND1_CELLS } from "@/lib/questions";
import { bingoLines } from "@/lib/bingoLines";
import { QuestionFlow } from "@/components/QuestionFlow";
import { WaitingScreen } from "@/components/WaitingScreen";

type Cell = { cell_index: number; prompt: string; option_a: string; option_b: string };
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
  const [roundStarted, setRoundStarted] = useState<boolean | null>(null);
  const [teamScore, setTeamScore] = useState(0);

  // 결과 공개 상태 구독
  useEffect(() => {
    supabase
      .from("game_state")
      .select("round1_started, round1_revealed")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        setRoundStarted(Boolean(data?.round1_started));
        if (data?.round1_revealed) setRevealed(true);
      });

    const channel = supabase
      .channel("round1-game-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state" },
        (payload) => {
          const row = payload.new as { round1_started?: boolean; round1_revealed?: boolean };
          setRoundStarted(Boolean(row?.round1_started));
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
    const teamId = Number(localStorage.getItem("bb_team_id"));
    if (teamId) supabase.from("team_scores").select("round1").eq("team_id", teamId).maybeSingle().then(({ data }) => setTeamScore(data?.round1 || 0));
  }, [revealed, playerId]);

  useEffect(() => {
    if (!revealed) return;
    const teamId = Number(localStorage.getItem("bb_team_id"));
    if (!teamId) return;
    const refreshTeamScore = () => {
      supabase.from("team_scores").select("round1").eq("team_id", teamId).maybeSingle().then(({ data }) => setTeamScore(data?.round1 || 0));
    };
    const channel = supabase.channel(`round1-team-score-${teamId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "team_scores", filter: `team_id=eq.${teamId}` }, refreshTeamScore).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [revealed]);

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
  const { validMineFlags, bingoCellFlags } = useMemo(() => {
    const validMine: boolean[] = Array(25).fill(false);
    const bingoCells: boolean[] = Array(25).fill(false);
    if (!revealed) return { validMineFlags: validMine, bingoCellFlags: bingoCells };

    for (let i = 0; i < 25; i++) {
      const mine = selections[i];
      const valid = validChoices[i];
      if (!mine || !valid) continue;
      validMine[i] = valid === "HIT" || mine === valid;
    }

    for (const line of bingoLines()) {
      if (line.every((index) => validMine[index])) {
        for (const index of line) bingoCells[index] = true;
      }
    }

    return { validMineFlags: validMine, bingoCellFlags: bingoCells };
  }, [revealed, selections, validChoices]);

  if (roundStarted === null) return <WaitingScreen round={1} message="게임 상태를 확인하고 있어요." />;
  if (!roundStarted) return <WaitingScreen round={1} />;

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
          <div className="bg-white border border-navy/10 text-navy rounded-xl p-4 text-sm font-semibold shadow-sm">
            {bingoCount > 0
              ? `결과가 공개됐어요! 빙고 ${bingoCount}줄을 완성했어요 🎉 팀 점수에 반영됐어요.`
              : "결과가 공개됐어요. 아쉽게도 이번엔 빙고를 완성하지 못했어요."}
            <div className="mt-3 grid grid-cols-2 gap-2 text-center"><p className="rounded-lg bg-blue-50 p-3">내 점수<br /><strong className="text-xl">{validMineFlags.filter(Boolean).length + bingoCount * 10}점</strong><br /><span className="text-xs text-navy/60">정답 {validMineFlags.filter(Boolean).length}개 + 빙고 {bingoCount}줄</span></p><p className="rounded-lg bg-blue-50 p-3">우리 팀 점수<br /><strong className="text-xl">{teamScore}점</strong><br /><span className="text-xs text-navy/60">팀원 개인 점수 합계</span></p></div>
          </div>
          <button
            onClick={() => router.push("/round2")}
            className="w-full bg-accentB hover:opacity-90 transition text-white text-lg font-extrabold py-4 rounded-xl shadow-lg"
          >
            ROUND 2로 넘어가기 →
          </button>
        </div>
      )}

      <QuestionFlow cells={cells} selections={selections} disabled={submitted} submitting={submitting} onChange={toggle} onSubmit={handleSubmit} />
    </main>
  );
}
