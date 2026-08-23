import { bingoLines } from "@/lib/bingoLines";

export type Choice = "A" | "B";
export type Answers = Record<string, Choice>;

export type CaptainSubmission = {
  team_id: number;
  answers: Answers;
  created_at: string;
  submitted_by?: string | null;
};

export type GuessSubmission = {
  player_id: string;
  team_id: number;
  answers: Answers;
  created_at: string;
  players?: { nickname: string } | null;
};

export type Round2RankingRow = {
  teamId: number;
  captainAnswers: Answers;
  teamAnswers: Record<string, Choice | null>;
  guesses: GuessSubmission[];
  matchCount: number;
  matchPercent: number;
  bingoCount: number;
  bingoBonus: number;
  averageSeconds: number;
  answerScore: number;
  timeScore: number;
  totalScore: number;
  rank: number;
};

export function calculateRound2Rankings(
  captains: CaptainSubmission[],
  guesses: GuessSubmission[]
): Round2RankingRow[] {
  const rows = captains
    .map((captain) => {
      const teamGuesses = guesses.filter((guess) => guess.team_id === captain.team_id);
      if (teamGuesses.length === 0) return null;

      const teamAnswers: Record<string, Choice | null> = {};
      let matchCount = 0;
      for (let i = 0; i < 25; i++) {
        let a = 0;
        let b = 0;
        for (const guess of teamGuesses) {
          const choice = guess.answers[String(i)];
          if (choice === "A") a++;
          if (choice === "B") b++;
        }
        const teamChoice: Choice | null = a === b ? null : a > b ? "A" : "B";
        teamAnswers[String(i)] = teamChoice;
        if (teamChoice && teamChoice === captain.answers[String(i)]) matchCount++;
      }

      const captainTime = new Date(captain.created_at).getTime();
      const matchedFlags = Array.from(
        { length: 25 },
        (_, index) =>
          teamAnswers[String(index)] !== null &&
          teamAnswers[String(index)] === captain.answers[String(index)]
      );
      const bingoCount = bingoLines().filter((line) =>
        line.every((index) => matchedFlags[index])
      ).length;
      const bingoBonus = bingoCount * 10;
      const averageSeconds =
        teamGuesses.reduce((sum, guess) => {
          const elapsed = Math.max(0, new Date(guess.created_at).getTime() - captainTime);
          return sum + elapsed / 1000;
        }, 0) / teamGuesses.length;

      return {
        teamId: captain.team_id,
        captainAnswers: captain.answers,
        teamAnswers,
        guesses: teamGuesses,
        matchCount,
        matchPercent: Math.round((matchCount / 25) * 100),
        bingoCount,
        bingoBonus,
        averageSeconds,
        answerScore: matchCount,
        timeScore: 0,
        totalScore: 0,
        rank: 0,
      } satisfies Round2RankingRow;
    })
    .filter((row): row is Round2RankingRow => row !== null);

  const times = rows.map((row) => row.averageSeconds);
  const fastest = Math.min(...times);
  const slowest = Math.max(...times);

  for (const row of rows) {
    const normalizedTime =
      fastest === slowest ? 1 : (slowest - row.averageSeconds) / (slowest - fastest);
    row.timeScore = normalizedTime * 40;
    row.totalScore = row.answerScore + row.bingoBonus + row.timeScore;
  }

  rows.sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      b.bingoCount - a.bingoCount ||
      b.matchCount - a.matchCount ||
      a.averageSeconds - b.averageSeconds ||
      a.teamId - b.teamId
  );
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });
  return rows;
}

export function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return minutes > 0 ? `${minutes}분 ${rest}초` : `${rest}초`;
}
