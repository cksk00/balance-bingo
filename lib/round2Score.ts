import { supabase } from "@/lib/supabaseClient";

type Answers = Record<string, "A" | "B">;

/**
 * 특정 팀의 ROUND2 결과를 계산해서 저장한다.
 * - 팀원들의 예측을 칸별로 다수결 집계해 "팀 예측 빙고판"을 만든다.
 * - 그 팀 예측 빙고판을 대표자의 정답 빙고판과 비교해 일치 칸 수/비율을 구한다.
 */
export async function revealRound2Team(teamId: number) {
  const { data: keyRow, error: keyError } = await supabase
    .from("round2_answer_key")
    .select("answers")
    .eq("team_id", teamId)
    .maybeSingle();
  if (keyError) throw keyError;
  if (!keyRow) throw new Error("이 팀은 대표자 답안이 아직 제출되지 않았어요.");

  const key = keyRow.answers as Answers;

  const { data: guessRows, error: guessError } = await supabase
    .from("round2_guesses")
    .select("answers")
    .eq("team_id", teamId);
  if (guessError) throw guessError;

  const tally: Record<number, { A: number; B: number }> = {};
  for (let i = 0; i < 25; i++) tally[i] = { A: 0, B: 0 };

  for (const row of (guessRows || []) as { answers: Answers }[]) {
    for (let i = 0; i < 25; i++) {
      const choice = row.answers[String(i)];
      if (choice === "A" || choice === "B") tally[i][choice]++;
    }
  }

  let matchCount = 0;
  for (let i = 0; i < 25; i++) {
    const t = tally[i];
    if (t.A === 0 && t.B === 0) continue; // 아무도 예측 안 한 칸
    const teamGuess: "A" | "B" | null = t.A === t.B ? null : t.A > t.B ? "A" : "B";
    if (teamGuess && key[String(i)] === teamGuess) matchCount++;
  }

  const matchPercent = Math.round((matchCount / 25) * 100);

  const { error: writeError } = await supabase
    .from("round2_team_results")
    .upsert(
      {
        team_id: teamId,
        match_count: matchCount,
        match_percent: matchPercent,
        revealed: true,
      },
      { onConflict: "team_id" }
    );
  if (writeError) throw writeError;

  return { matchCount, matchPercent };
}

/**
 * 모든 팀의 결과가 공개된 뒤, 가장 높은 일치율을 기록한 팀(동률 포함)에게
 * round2 점수 10점을 부여한다.
 */
export async function finalizeRound2Winner() {
  const { data: results, error } = await supabase
    .from("round2_team_results")
    .select("team_id, match_percent, revealed");
  if (error) throw error;

  const revealedResults = (results || []).filter(
    (r) => (r as { revealed: boolean }).revealed
  ) as { team_id: number; match_percent: number }[];
  if (revealedResults.length === 0) return;

  const maxPercent = Math.max(...revealedResults.map((r) => r.match_percent));

  for (const r of revealedResults) {
    const score = r.match_percent === maxPercent ? 10 : 0;
    await supabase
      .from("team_scores")
      .update({ round2: score })
      .eq("team_id", r.team_id);
  }

  await supabase
    .from("game_state")
    .update({ round2_revealed: true })
    .eq("id", 1);
}
