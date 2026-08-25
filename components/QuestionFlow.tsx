"use client";

import { useEffect, useState } from "react";

type Cell = { cell_index: number; prompt: string; option_a: string; option_b: string };
type Choice = "A" | "B" | null;

type QuestionFlowProps = {
  cells: Cell[];
  selections: Choice[];
  disabled?: boolean;
  submitting?: boolean;
  submitLabel?: string;
  resultFlags?: boolean[];
  onChange: (index: number, choice: "A" | "B") => void;
  onSubmit: () => void;
};

export function QuestionFlow({ cells, selections, disabled, submitting, submitLabel = "최종 제출하기", resultFlags, onChange, onSubmit }: QuestionFlowProps) {
  const firstEmpty = selections.findIndex((choice) => choice === null);
  const [step, setStep] = useState(firstEmpty === -1 ? 25 : firstEmpty);
  const [showStatus, setShowStatus] = useState(false);
  const allCompleted = selections.every((choice) => choice !== null);

  useEffect(() => {
    if (disabled) setStep(25);
  }, [disabled]);

  const choose = (choice: "A" | "B") => {
    if (disabled || step >= 25) return;
    onChange(step, choice);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setTimeout(() => setStep((current) => Math.min(25, current + 1)), 140);
  };

  if (step < 25) {
    const cell = cells[step];
    const selected = selections[step];
    return (
      <section className="mx-auto w-full max-w-xl rounded-3xl bg-navy p-6 text-white shadow-xl sm:p-9">
        <div className="mb-7 flex items-center justify-between gap-3 text-sm text-blue-200">
          <button onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="font-bold disabled:invisible">← 이전</button>
          <button onClick={() => setShowStatus(true)} className="rounded-full bg-white/10 px-4 py-2 font-extrabold">체크 현황 · {selections.filter(Boolean).length}/25</button>
          <button onClick={() => setStep((current) => Math.min(25, current + 1))} disabled={selected === null} className="font-bold disabled:cursor-not-allowed disabled:opacity-30">다음 →</button>
        </div>
        <div className="mb-8 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-hit transition-all" style={{ width: `${((step + 1) / 25) * 100}%` }} /></div>
        <p className="mb-5 text-center text-lg font-extrabold text-blue-100 sm:text-xl">{cell.prompt}</p>
        <div role="radiogroup" aria-label={cell.prompt} className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          <button role="radio" aria-checked={selected === "A"} key={`option-a-${step}`} onClick={() => choose("A")} className={`min-h-32 rounded-2xl p-5 text-lg font-extrabold transition active:scale-[0.98] sm:min-h-52 ${selected === "A" ? "bg-accentA ring-4 ring-white" : "bg-white/10"}`}>{cell.option_a}</button>
          <span className="self-center text-center text-sm font-black text-hit">VS</span>
          <button role="radio" aria-checked={selected === "B"} key={`option-b-${step}`} onClick={() => choose("B")} className={`min-h-32 rounded-2xl p-5 text-lg font-extrabold transition active:scale-[0.98] sm:min-h-52 ${selected === "B" ? "bg-accentB ring-4 ring-white" : "bg-white/10"}`}>{cell.option_b}</button>
        </div>
        {allCompleted && <button onClick={onSubmit} disabled={disabled || submitting} className="mt-5 w-full rounded-xl bg-hit py-4 font-extrabold text-ink disabled:opacity-40">{submitting ? "제출 중..." : submitLabel}</button>}
        {showStatus && <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4 backdrop-blur-sm" onClick={() => setShowStatus(false)}><div className="w-full max-w-md rounded-3xl bg-white p-6 text-navy shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-extrabold">체크 현황</h2><p className="text-sm text-navy/60">완료 {selections.filter(Boolean).length}개 · 미선택 {selections.filter((choice) => !choice).length}개</p></div><button onClick={() => setShowStatus(false)} className="rounded-lg bg-gray-100 px-3 py-2 font-bold">닫기</button></div><div className="grid grid-cols-5 gap-2">{cells.map((statusCell) => { const statusChoice = selections[statusCell.cell_index]; return <button key={statusCell.cell_index} onClick={() => { setStep(statusCell.cell_index); setShowStatus(false); }} className={`aspect-square rounded-xl text-sm font-extrabold text-white ${statusChoice === "A" ? "bg-accentA" : statusChoice === "B" ? "bg-accentB" : "bg-gray-300 text-navy/60 ring-2 ring-dashed ring-red-400"}`}><span className="block">{statusCell.cell_index + 1}</span><span className="text-[10px]">{statusChoice || "미선택"}</span></button>; })}</div><p className="mt-4 text-center text-xs text-navy/60">수정하거나 선택할 문항 번호를 눌러주세요.</p></div></div>}
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl rounded-3xl bg-navy p-5 text-white shadow-xl sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div><p className="text-sm font-bold text-hit">최종 확인</p><h2 className="text-xl font-extrabold">내가 만든 빙고판</h2></div>
        {!disabled && <button onClick={() => setStep(24)} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold">마지막 문항 수정</button>}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {cells.map((cell) => {
          const choice = selections[cell.cell_index];
          const isIncorrect = resultFlags !== undefined && !resultFlags[cell.cell_index];
          return <button key={cell.cell_index} disabled={disabled} onClick={() => setStep(cell.cell_index)} className={`flex aspect-square items-center justify-center rounded-lg p-1 text-center text-[9px] font-bold leading-tight transition sm:text-xs ${choice === "A" ? "bg-accentA" : choice === "B" ? "bg-accentB" : "bg-white/10"} ${isIncorrect ? "opacity-20 brightness-50 grayscale" : ""}`}>{choice === "A" ? cell.option_a : choice === "B" ? cell.option_b : "미선택"}</button>;
        })}
      </div>
      <button onClick={onSubmit} disabled={disabled || submitting || selections.some((choice) => choice === null)} className="mt-6 w-full rounded-xl bg-hit py-4 font-extrabold text-ink disabled:opacity-40">{disabled ? "제출 완료" : submitting ? "제출 중..." : submitLabel}</button>
    </section>
  );
}
