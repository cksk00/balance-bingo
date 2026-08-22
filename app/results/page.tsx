"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  team_id: number;
  name: string;
  icebreaking: number;
  round1: number;
  round2: number;
};

export default function ResultsPage() {
  const [rows, setRows] = useState<Row[]>([]);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("team_scores")
      .select("team_id, icebreaking, round1, round2, teams(name)")
      .order("team_id");
    if (!data) return;
    const mapped = (
      data as unknown as {
        team_id: number;
        icebreaking: number;
        round1: number;
        round2: number;
        teams: { name: string } | null;
      }[]
    ).map((r) => ({
      team_id: r.team_id,
      name: r.teams?.name || `TEAM ${r.team_id}`,
      icebreaking: r.icebreaking,
      round1: r.round1,
      round2: r.round2,
    }));
    setRows(mapped);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("results-scores")
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

  const sorted = [...rows].sort(
    (a, b) =>
      b.icebreaking + b.round1 + b.round2 - (a.icebreaking + a.round1 + a.round2)
  );

  const medal = ["🥇", "🥈", "🥉"];

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      <h1 className="text-4xl font-extrabold text-navy text-center mb-2">
        최종 결과
      </h1>
      <p className="text-center text-navy/60 mb-8">
        아이스브레이킹 + ROUND 1 + ROUND 2 합산 점수
      </p>

      <div className="space-y-3">
        {sorted.map((r, idx) => {
          const total = r.icebreaking + r.round1 + r.round2;
          return (
            <div
              key={r.team_id}
              className={`rounded-2xl p-5 shadow flex items-center justify-between ${
                idx === 0 ? "bg-navy text-white" : "bg-white text-navy"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl w-8">{medal[idx] || idx + 1}</span>
                <div>
                  <p className="font-bold text-lg">{r.name}</p>
                  <p
                    className={`text-xs ${
                      idx === 0 ? "text-blue-200" : "text-navy/60"
                    }`}
                  >
                    R1 {r.round1} · R2 {r.round2} · 아이스브레이킹{" "}
                    {r.icebreaking}
                  </p>
                </div>
              </div>
              <p className="text-3xl font-extrabold">{total}</p>
            </div>
          );
        })}
      </div>
    </main>
  );
}
