"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { TEAMS } from "@/lib/teams";

type Team = { id: number; name: string };

export default function HomePage() {
  const router = useRouter();
  const [teams] = useState<Team[]>(TEAMS);
  const [nickname, setNickname] = useState("");
  const [teamId, setTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = localStorage.getItem("bb_player_id");
    if (existing) {
      router.push("/round1");
    }
  }, [router]);

  async function handleJoin() {
    setError("");
    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    if (!teamId) {
      setError("팀을 선택해주세요.");
      return;
    }
    setLoading(true);
    const { data, error: insertError } = await supabase
      .from("players")
      .insert({ nickname: nickname.trim(), team_id: teamId })
      .select("id")
      .single();

    setLoading(false);
    if (insertError || !data) {
      setError("입장에 실패했어요. 다시 시도해주세요.");
      return;
    }
    localStorage.setItem("bb_player_id", data.id);
    localStorage.setItem("bb_team_id", String(teamId));
    localStorage.setItem("bb_nickname", nickname.trim());
    router.push("/round1");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-navy text-white rounded-3xl p-8 shadow-xl">
        <p className="text-sm text-blue-200 tracking-widest mb-1">
          동아리 연합 세미나
        </p>
        <h1 className="text-4xl font-extrabold mb-8">BALANCE BINGO</h1>

        <label className="block text-sm text-blue-200 mb-2">닉네임</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="예: 홍길동"
          className="w-full rounded-xl px-4 py-3 mb-6 text-ink bg-white outline-none focus:ring-2 focus:ring-accentA"
        />

        <label className="block text-sm text-blue-200 mb-2">팀 선택</label>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => setTeamId(t.id)}
              className={`py-3 rounded-xl font-semibold transition ${
                teamId === t.id
                  ? "bg-accentA text-white"
                  : "bg-white/10 text-blue-100 hover:bg-white/20"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {error && <p className="text-accentB text-sm mb-4">{error}</p>}

        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full bg-accentA hover:bg-blue-500 transition text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {loading ? "입장 중..." : "입장하기"}
        </button>
      </div>
    </main>
  );
}
