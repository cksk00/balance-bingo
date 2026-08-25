"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { WaitingScreen } from "@/components/WaitingScreen";

export default function Round2EntryPage() {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [rankingRevealed, setRankingRevealed] = useState(false);
  const [roundStarted, setRoundStarted] = useState<boolean | null>(null);

  useEffect(() => {
    const pid = localStorage.getItem("bb_player_id");
    const tid = localStorage.getItem("bb_team_id");
    if (!pid || !tid) {
      router.push("/");
      return;
    }
    setPlayerId(pid);
    setTeamId(Number(tid));
    supabase.from("players").update({ current_round: 2 }).eq("id", pid).then();

    supabase
      .from("teams")
      .select("name")
      .eq("id", Number(tid))
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTeamName(data.name);
      });

    supabase
      .from("round2_answer_key")
      .select("submitted_by")
      .eq("team_id", Number(tid))
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCaptainId(data.submitted_by);
      });
    supabase
      .from("game_state")
      .select("round2_started, round2_revealed")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const isRevealed = Boolean(data?.round2_revealed);
        setRoundStarted(Boolean(data?.round2_started));
        setRankingRevealed(isRevealed);
        if (isRevealed) router.push("/round2/results");
      });
  }, [router]);

  useEffect(() => {
    const channel = supabase
      .channel("round2-ranking-reveal")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_state", filter: "id=eq.1" },
        (payload) => {
          const state = payload.new as { round2_started?: boolean; round2_revealed?: boolean };
          setRoundStarted(Boolean(state.round2_started));
          setRankingRevealed(Boolean(state.round2_revealed));
          if (state.round2_revealed) router.push("/round2/results");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const iAmCaptain = captainId === playerId;

  if (roundStarted === null) return <WaitingScreen round={2} message="게임 상태를 확인하고 있어요." />;
  if (!roundStarted) return <WaitingScreen round={2} />;

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-navy text-white rounded-3xl p-8 shadow-xl">
        <p className="text-sm text-blue-200 mb-1">seKUrity 빙고 세션</p>
        <h1 className="text-2xl font-extrabold mb-6">{teamName}</h1>

        <p className="text-sm text-blue-100 mb-6">
          대표자는 왼쪽에서 CAPTAIN 빙고를 먼저 제출하고, 나머지 팀원은
          오른쪽에서 대표자의 답을 예측해 제출하세요.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push("/round2/answer")}
            disabled={captainId !== null && !iAmCaptain}
            className="bg-hit text-ink font-extrabold py-4 px-2 rounded-xl disabled:opacity-40"
          >
            {iAmCaptain ? "CAPTAIN 제출 완료" : "CAPTAIN으로 제출하기"}
          </button>
          <button
            onClick={() => router.push("/round2/guess")}
            disabled={captainId === null || iAmCaptain}
            className="bg-accentA hover:bg-blue-500 transition font-bold py-4 px-2 rounded-xl disabled:opacity-40"
          >
            {captainId === null ? "CAPTAIN 제출 대기" : "일반 제출하기"}
          </button>
        </div>

        {rankingRevealed && (
          <button
            onClick={() => router.push("/round2/results")}
            className="w-full mt-4 bg-accentB text-white font-bold py-3 rounded-xl"
          >
            ROUND 2 순위 보기
          </button>
        )}
      </div>
    </main>
  );
}
