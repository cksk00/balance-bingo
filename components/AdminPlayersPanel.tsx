"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TEAMS } from "@/lib/teams";

type Player = { id: string; nickname: string; team_id: number };

export function AdminPlayersPanel() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const { data } = await supabase.from("players").select("id, nickname, team_id").order("created_at");
    setPlayers((data || []) as Player[]);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase.channel("admin-player-count").on("postgres_changes", { event: "*", schema: "public", table: "players" }, refresh).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  async function resetPlayers() {
    if (!players.length || !confirm(`입장한 ${players.length}명과 모든 라운드 제출 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    setResetting(true);
    setError("");
    const results = await Promise.all([
      supabase.from("round2_reps").delete().not("team_id", "is", null),
      supabase.from("round2_answer_key").delete().not("team_id", "is", null),
      supabase.from("round2_team_results").update({ match_count: 0, match_percent: 0, revealed: false }).not("team_id", "is", null),
      supabase.from("round1_results").delete().not("cell_index", "is", null),
      supabase.from("team_scores").update({ round1: 0, round2: 0 }).not("team_id", "is", null),
      supabase.from("game_state").update({ round1_started: false, round1_revealed: false, round2_started: false, round2_revealed: false }).eq("id", 1),
    ]);
    const dependencyError = results.find((result) => result.error)?.error;
    if (!dependencyError) {
      const { error: deleteError } = await supabase.from("players").delete().not("id", "is", null);
      if (deleteError) setError(deleteError.message);
    } else {
      setError(dependencyError.message);
    }
    await refresh();
    setResetting(false);
  }

  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow">
      <div className="flex items-center justify-between gap-4">
        <div><p className="text-sm text-navy/60">실시간 입장 현황</p><p className="text-3xl font-extrabold text-navy">총 {players.length}명</p></div>
        <div className="flex flex-wrap justify-end gap-2"><button onClick={() => setOpen((value) => !value)} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">{open ? "상세 닫기" : "인원 상세 보기"}</button><button onClick={resetPlayers} disabled={!players.length || resetting} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{resetting ? "초기화 중..." : "인원 초기화"}</button></div>
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">초기화 실패: {error}</p>}
      {open && <div className="mt-5 grid gap-3 sm:grid-cols-2">{TEAMS.map((team) => { const members = players.filter((player) => player.team_id === team.id); return <div key={team.id} className="rounded-xl bg-blue-50 p-3"><p className="font-extrabold text-navy">{team.name} <span className="text-sm text-navy/50">{members.length}명</span></p><p className="mt-1 text-sm text-navy/70">{members.length ? members.map((member) => member.nickname).join(", ") : "아직 입장한 사람이 없어요"}</p></div>; })}</div>}
    </section>
  );
}
