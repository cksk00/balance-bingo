"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TEAMS } from "@/lib/teams";

type Player = { id: string; nickname: string; team_id: number };

export function AdminPlayersPanel() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [open, setOpen] = useState(false);
  const refresh = useCallback(async () => {
    const { data } = await supabase.from("players").select("id, nickname, team_id").order("created_at");
    setPlayers((data || []) as Player[]);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase.channel("admin-player-count").on("postgres_changes", { event: "*", schema: "public", table: "players" }, refresh).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow">
      <div className="flex items-center justify-between gap-4">
        <div><p className="text-sm text-navy/60">실시간 입장 현황</p><p className="text-3xl font-extrabold text-navy">총 {players.length}명</p></div>
        <button onClick={() => setOpen((value) => !value)} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">{open ? "상세 닫기" : "인원 상세 보기"}</button>
      </div>
      {open && <div className="mt-5 grid gap-3 sm:grid-cols-2">{TEAMS.map((team) => { const members = players.filter((player) => player.team_id === team.id); return <div key={team.id} className="rounded-xl bg-blue-50 p-3"><p className="font-extrabold text-navy">{team.name} <span className="text-sm text-navy/50">{members.length}명</span></p><p className="mt-1 text-sm text-navy/70">{members.length ? members.map((member) => member.nickname).join(", ") : "아직 입장한 사람이 없어요"}</p></div>; })}</div>}
    </section>
  );
}
