import type { Answers, Choice } from "@/lib/round2Ranking";

type Cell = { cell_index: number; option_a: string; option_b: string };

export function Round2Board({
  title,
  cells,
  answers,
  compareTo,
  comparisonStyle = "highlight",
}: {
  title: string;
  cells: Cell[];
  answers: Answers | Record<string, Choice | null>;
  compareTo?: Answers;
  comparisonStyle?: "highlight" | "dim";
}) {
  return (
    <div>
      <p className="text-sm font-bold text-navy mb-2">{title}</p>
      <div className="grid grid-cols-5 gap-1.5 bg-navy rounded-2xl p-3">
        {cells.map((cell) => {
          const choice = answers[String(cell.cell_index)];
          const matched = Boolean(compareTo && choice && compareTo[String(cell.cell_index)] === choice);
          const isMismatch = Boolean(compareTo && choice !== compareTo[String(cell.cell_index)]);
          return (
            <div
              key={cell.cell_index}
              className={`rounded-lg min-h-14 px-1 py-2 text-[10px] leading-tight flex items-center justify-center text-center font-semibold ${
                choice === "A"
                  ? "bg-accentA text-white"
                  : choice === "B"
                  ? "bg-accentB text-white"
                  : "bg-white/10 text-blue-100"
              } ${comparisonStyle === "dim" && isMismatch ? "opacity-[0.12] brightness-50 grayscale" : ""} ${
                comparisonStyle === "highlight" && matched ? "ring-2 ring-hit brightness-125" : ""
              }`}
            >
              {choice === "A"
                ? cell.option_a
                : choice === "B"
                ? cell.option_b
                : "동률"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
