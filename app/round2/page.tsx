"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Round2EntryPage() {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [repPlayerId, setRepPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const pid = localStorage.getItem("bb_player_id");
    const tid = localStorage.getItem("bb_team_id");
    if (!pid || !tid) {
      router.push("/");
      return;
    }
    setPlayerId(pid);
    setTeamId(Number(tid));

    supabase
      .from("teams")
      .select("name")
      .eq("id", Number(tid))
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTeamName(data.name);
      });

    supabase
      .from("round2_reps")
      .select("player_id")
      .eq("team_id", Number(tid))
      .maybeSingle()
      .then(({ data }) => {
        if (data) setRepPlayerId(data.player_id);
      });
  }, [router]);

  async function claimRep() {
    if (!teamId || !playerId) return;
    setLoading(true);
    setError("");
    const { error: insertError } = await supabase
      .from("round2_reps")
      .insert({ team_id: teamId, player_id: playerId });
    setLoading(false);
    if (insertError) {
      setError("이미 다른 팀원이 대표자로 지정됐어요. 새로고침해서 확인해주세요.");
      const { data } = await supabase
        .from("round2_reps")
        .select("player_id")
        .eq("team_id", teamId)
        .maybeSingle();
      if (data) setRepPlayerId(data.player_id);
      return;
    }
    router.push("/round2/answer");
  }

  const iAmRep = repPlayerId === playerId;

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-navy text-white rounded-3xl p-8 shadow-xl">
        <p className="text-sm text-blue-200 mb-1">ROUND 2 · 대표자 밸런스 빙고</p>
        <h1 className="text-2xl font-extrabold mb-6">{teamName}</h1>

        {error && <p className="text-accentB text-sm mb-4">{error}</p>}

        {repPlayerId === null && (
          <>
            <p className="text-sm text-blue-100 mb-6">
              가위바위보로 정한 대표자만 아래 버튼을 눌러주세요. 나머지
              팀원은 대표자의 답을 예측해서 빙고판을 완성하게 돼요.
            </p>
            <button
              onClick={claimRep}
              disabled={loading}
              className="w-full bg-hit text-ink font-bold py-3 rounded-xl mb-3 disabled:opacity-50"
            >
              {loading ? "확인 중..." : "저는 대표자예요"}
            </button>
            <button
              onClick={() => router.push("/round2/guess")}
              className="w-full bg-white/10 hover:bg-white/20 transition font-semibold py-3 rounded-xl"
            >
              저는 예측할게요 (팀원)
            </button>
          </>
        )}

        {repPlayerId !== null && iAmRep && (
          <button
            onClick={() => router.push("/round2/answer")}
            className="w-full bg-hit text-ink font-bold py-3 rounded-xl"
          >
            제 답안 작성하러 가기
          </button>
        )}

        {repPlayerId !== null && !iAmRep && (
          <button
            onClick={() => router.push("/round2/guess")}
            className="w-full bg-accentA hover:bg-blue-500 transition font-bold py-3 rounded-xl"
          >
            대표자 답 예측하러 가기
          </button>
        )}
      </div>
    </main>
  );
}
