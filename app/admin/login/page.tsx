"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "로그인에 실패했어요.");
      return;
    }
    router.push("/admin");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-navy text-white rounded-3xl p-8 shadow-xl">
        <p className="text-sm text-blue-200 mb-1">BALANCE BINGO</p>
        <h1 className="text-2xl font-extrabold mb-6">운영진 로그인</h1>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="관리자 비밀번호"
          className="w-full rounded-xl px-4 py-3 mb-4 text-ink bg-white outline-none focus:ring-2 focus:ring-accentA"
        />

        {error && <p className="text-accentB text-sm mb-4">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-accentA hover:bg-blue-500 transition text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {loading ? "확인 중..." : "로그인"}
        </button>
      </div>
    </main>
  );
}
