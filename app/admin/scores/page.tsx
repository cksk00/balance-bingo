"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { TEAMS } from "@/lib/teams";

type Row = {
  team_id: number;
  name: string;
  icebreaking: number;
  round1: number;
  round2: number;
};

export default function AdminScoresPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [adjustingTeamId, setAdjustingTeamId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("team_scores")
      .select("team_id, icebreaking, round1, round2, teams(name)")
      .order("team_id");
    if (!data) return;
    const scoreByTeam = new Map((
      data as unknown as {
        team_id: number;
        icebreaking: number;
        round1: number;
        round2: number;
        teams: { name: string } | null;
      }[]
    ).map((row) => [row.team_id, row]));
    const mapped = TEAMS.map((team) => {
      const score = scoreByTeam.get(team.id);
      return {
        team_id: team.id,
        name: team.name,
        icebreaking: score?.icebreaking || 0,
        round1: score?.round1 || 0,
        round2: score?.round2 || 0,
      };
    });
    setRows(mapped);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("admin-scores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_scores" },
        refresh
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  async function adjustIcebreaking(teamId: number, delta: number) {
    if (adjustingTeamId !== null) return;
    setAdjustingTeamId(teamId);
    const { data } = await supabase
      .from("team_scores")
      .select("icebreaking")
      .eq("team_id", teamId)
      .maybeSingle();
    const current = data?.icebreaking || 0;
    const next = Math.max(0, current + delta);
    setRows((prev) =>
      prev.map((r) => (r.team_id === teamId ? { ...r, icebreaking: next } : r))
    );
    await supabase
      .from("team_scores")
      .upsert({ team_id: teamId, icebreaking: next }, { onConflict: "team_id" });
    setAdjustingTeamId(null);
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <Link href="/admin" className="text-sm text-navy/60 underline">
        ← 대시보드
      </Link>
      <h1 className="text-3xl font-extrabold text-navy mt-2 mb-6">
        점수 관리
      </h1>

      <div className="space-y-3">
        {rows.map((r) => {
          const total = r.icebreaking + r.round1 + r.round2;
          return (
            <div key={r.team_id} className="bg-white rounded-2xl p-5 shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-navy/40 font-bold w-5">{r.team_id}</span>
                  <p className="font-bold text-navy text-lg">{r.name}</p>
                </div>
                <p className="text-2xl font-extrabold text-accentA">{total}</p>
              </div>

              <div className="flex items-center justify-between text-sm text-navy/70 mb-3">
                <span>R1 {r.round1}점</span>
                <span>R2 {r.round2}점</span>
                <span>아이스브레이킹 {r.icebreaking}점</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustIcebreaking(r.team_id, -10)}
                  disabled={adjustingTeamId === r.team_id}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 transition rounded-xl py-2 font-bold text-navy"
                >
                  -10
                </button>
                <button
                  onClick={() => adjustIcebreaking(r.team_id, 10)}
                  disabled={adjustingTeamId === r.team_id}
                  className="flex-1 bg-accentA hover:bg-blue-500 transition rounded-xl py-2 font-bold text-white"
                >
                  +10
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href="/results"
        target="_blank"
        className="block text-center mt-6 text-accentA underline text-sm"
      >
        최종 점수판 화면 새 탭에서 보기
      </Link>
    </main>
  );
}
