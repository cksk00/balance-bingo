const ROWS = 5;
const COLS = 5;

export function bingoLines(): number[][] {
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
