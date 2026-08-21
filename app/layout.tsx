import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BALANCE BINGO",
  description: "동아리 연합 세미나 밸런스 빙고",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
