import { supabase } from "@/lib/supabaseClient";
import { bingoLines } from "@/lib/bingoLines";

/**
 * ROUND1 결과를 계산해서 저장하고, 팀별 점수까지 반영한다.
 * - 각 칸: 다수 선택지가 유효 칸. 50:50이면 HIT (A/B 둘 다 유효)
 * - 개인 점수: 유효 선택지와 일치한 칸 수 + 완성한 빙고 줄 수 * 10
 * - 팀 점수: 해당 팀 완주자들의 개인 점수 평균 (소수 둘째 자리까지)
 */
export async function revealRound1() {
  const { data: answers, error: answersError } = await supabase
    .from("round1_answers")
    .select("player_id, cell_index, choice");
  if (answersError || !answers) throw answersError;

  // 1. 칸별 집계
  const tally: Record<number, { A: number; B: number }> = {};
  for (let i = 0; i < 25; i++) tally[i] = { A: 0, B: 0 };
  for (const row of answers as { cell_index: number; choice: "A" | "B" }[]) {
    tally[row.cell_index][row.choice]++;
  }

  const results = Object.entries(tally).map(([cellIndexStr, t]) => {
    const cell_index = Number(cellIndexStr);
    const total = t.A + t.B;
    let valid_choice: "A" | "B" | "HIT" = "A";
    if (total === 0) {
      valid_choice = "A";
    } else if (t.A === t.B) {
      valid_choice = "HIT";
    } else {
      valid_choice = t.A > t.B ? "A" : "B";
    }
    return { cell_index, valid_choice, a_count: t.A, b_count: t.B };
  });

  const { error: resultsError } = await supabase
    .from("round1_results")
    .upsert(results, { onConflict: "cell_index" });
  if (resultsError) throw resultsError;

  // 2. 참가자별 응답을 모아서 빙고 판정
  const byPlayer: Record<string, Record<number, "A" | "B">> = {};
  for (const row of answers as {
    player_id: string;
    cell_index: number;
    choice: "A" | "B";
  }[]) {
    if (!byPlayer[row.player_id]) byPlayer[row.player_id] = {};
    byPlayer[row.player_id][row.cell_index] = row.choice;
  }

  const validMap: Record<number, "A" | "B" | "HIT"> = {};
  for (const r of results) validMap[r.cell_index] = r.valid_choice as "A" | "B" | "HIT";

  const lines = bingoLines();
  const winners: { player_id: string; team_id: number | null; bingo_count: number }[] = [];
  const teamScoreTotals: Record<number, number> = {};
  const teamCompletedCounts: Record<number, number> = {};

  const { data: players } = await supabase
    .from("players")
    .select("id, team_id");
  const teamOf: Record<string, number | null> = {};
  for (const p of (players || []) as { id: string; team_id: number | null }[]) {
    teamOf[p.id] = p.team_id;
  }

  for (const [playerId, cellChoices] of Object.entries(byPlayer)) {
    if (Object.keys(cellChoices).length < 25) continue; // 완주자만 판정

    let bingoCount = 0;
    let matchedCount = 0;
    for (let cellIndex = 0; cellIndex < 25; cellIndex++) {
      const mine = cellChoices[cellIndex];
      const valid = validMap[cellIndex];
      if (mine && valid && (valid === "HIT" || mine === valid)) matchedCount++;
    }
    for (const line of lines) {
      const allValid = line.every((cellIndex) => {
        const mine = cellChoices[cellIndex];
        const valid = validMap[cellIndex];
        if (!mine || !valid) return false;
        return valid === "HIT" || mine === valid;
      });
      if (allValid) bingoCount++;
    }

    const teamId = teamOf[playerId];
    if (teamId != null) {
      const personalScore = matchedCount + bingoCount * 10;
      teamScoreTotals[teamId] = (teamScoreTotals[teamId] || 0) + personalScore;
      teamCompletedCounts[teamId] = (teamCompletedCounts[teamId] || 0) + 1;
    }

    if (bingoCount > 0) {
      winners.push({
        player_id: playerId,
        team_id: teamOf[playerId] ?? null,
        bingo_count: bingoCount,
      });
    }
  }

  if (winners.length > 0) {
    const { error: winnersError } = await supabase
      .from("round1_bingo_winners")
      .upsert(winners, { onConflict: "player_id" });
    if (winnersError) throw winnersError;
  }

  // 3. 팀별 점수 반영 (완주한 팀원 개인 점수의 평균)
  const { data: teams } = await supabase.from("teams").select("id");
  for (const team of (teams || []) as { id: number }[]) {
    const completedCount = teamCompletedCounts[team.id] || 0;
    const score = completedCount > 0
      ? Math.round((teamScoreTotals[team.id] / completedCount) * 100) / 100
      : 0;
    const { error: scoreError } = await supabase
      .from("team_scores")
      .update({ round1: score })
      .eq("team_id", team.id);
    if (scoreError) throw scoreError;
  }

  // 4. 공개 상태 갱신
  await supabase
    .from("game_state")
    .update({ round1_revealed: true })
    .eq("id", 1);

  return { results, winnersCount: winners.length };
}
