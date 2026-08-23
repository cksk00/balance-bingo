"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminHome() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const links = [
    { href: "/admin/round1", label: "ROUND 1 관리", desc: "실시간 통계 · 결과 공개 · 초기화" },
    { href: "/admin/round2", label: "ROUND 2 관리", desc: "CAPTAIN/팀 빙고 · 실시간 6:4 순위 · 초기화" },
    { href: "/admin/scores", label: "아이스브레이킹 점수", desc: "아이스브레이킹 타임 점수 입력" },
  ];

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-navy">운영진 대시보드</h1>
        <button onClick={logout} className="text-sm text-navy/60 underline">
          로그아웃
        </button>
      </div>

      <div className="space-y-4">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block bg-navy text-white rounded-2xl p-5 shadow hover:opacity-90 transition"
          >
            <p className="font-bold text-lg">{l.label}</p>
            <p className="text-sm text-blue-200">{l.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
