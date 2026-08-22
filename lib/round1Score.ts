import { supabase } from "@/lib/supabaseClient";

const ROWS = 5;
const COLS = 5;

function bingoLines(): number[][] {
  const lines: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    lines.push(Array.from({ length: COLS }, (_, c) => r * COLS + c));
  }
  for (let c = 0; c < COLS; c++) {
    lines.push(Array.from({ length: ROWS }, (_, r) => r * COLS + c));
  }
  lines.push(Array.from({ length: ROWS }, (_, i) => i * COLS + i));
  lines.push(Array.from({ length: ROWS }, (_, i) => i * COLS + (COLS - 1 - i)));
  return lines;
}

/**
 * ROUND1 결과를 계산해서 저장하고, 팀별 점수까지 반영한다.
 * - 각 칸: 다수 선택지가 유효 칸. 50:50이면 HIT (A/B 둘 다 유효)
 * - 유효 칸으로 가로/세로/대각선을 만든 참가자는 "빙고 달성"
 * - 빙고 달성한 참가자 수 * 10점을 해당 팀의 round1 점수로 반영
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
    for (const line of lines) {
      const allValid = line.every((cellIndex) => {
        const mine = cellChoices[cellIndex];
        const valid = validMap[cellIndex];
        if (!mine || !valid) return false;
        return valid === "HIT" || mine === valid;
      });
      if (allValid) bingoCount++;
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

  // 3. 팀별 점수 반영 (빙고 달성 인원수 * 10)
  const teamWinnerCounts: Record<number, number> = {};
  for (const w of winners) {
    if (w.team_id == null) continue;
    teamWinnerCounts[w.team_id] = (teamWinnerCounts[w.team_id] || 0) + 1;
  }

  const { data: teams } = await supabase.from("teams").select("id");
  for (const team of (teams || []) as { id: number }[]) {
    const score = (teamWinnerCounts[team.id] || 0) * 10;
    await supabase
      .from("team_scores")
      .update({ round1: score })
      .eq("team_id", team.id);
  }

  // 4. 공개 상태 갱신
  await supabase
    .from("game_state")
    .update({ round1_revealed: true })
    .eq("id", 1);

  return { results, winnersCount: winners.length };
}
