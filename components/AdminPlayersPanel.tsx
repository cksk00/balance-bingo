"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TEAMS } from "@/lib/teams";

type Player = { id: string; nickname: string; team_id: number; current_round: number };

export function AdminPlayersPanel({ round }: { round?: 1 | 2 }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const enteredRound = (player: Player, targetRound: 1 | 2) =>
    targetRound === 1 ? player.current_round >= 1 : player.current_round === 2;
  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from("players").select("id, nickname, team_id, current_round").order("created_at");
    if (!error) {
      setPlayers((data || []) as Player[]);
      setError("");
    } else {
      setError(`입장 현황 조회 실패: ${error.message}`);
    }
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
        <div><p className="text-sm text-navy/60">{round ? `ROUND ${round} 실시간 입장 현황` : "실시간 입장 현황"}</p>{round ? <p className="mt-1 text-navy"><strong className="text-3xl">{players.filter((player) => enteredRound(player, round)).length}</strong>명</p> : <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-navy"><p><strong className="text-2xl">{players.filter((player) => enteredRound(player, 1)).length}</strong>명 <span className="text-sm text-navy/60">ROUND 1</span></p><p><strong className="text-2xl">{players.filter((player) => enteredRound(player, 2)).length}</strong>명 <span className="text-sm text-navy/60">ROUND 2</span></p><p className="self-end text-sm text-navy/50">전체 {players.length}명</p></div>}</div>
        <div className="flex flex-wrap justify-end gap-2"><button onClick={() => setOpen((value) => !value)} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">{open ? "상세 닫기" : "인원 상세 보기"}</button><button onClick={resetPlayers} disabled={!players.length || resetting} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{resetting ? "초기화 중..." : "인원 초기화"}</button></div>
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      {open && <div className="mt-5 space-y-5">{(round ? [round] : [1, 2] as const).map((shownRound) => <div key={shownRound}><h3 className="mb-2 font-extrabold text-navy">ROUND {shownRound} 입장 · {players.filter((player) => enteredRound(player, shownRound)).length}명</h3><div className="grid gap-3 sm:grid-cols-2">{TEAMS.map((team) => { const members = players.filter((player) => player.team_id === team.id && enteredRound(player, shownRound)); return <div key={team.id} className="rounded-xl bg-blue-50 p-3"><p className="font-extrabold text-navy">{team.name} <span className="text-sm text-navy/50">{members.length}명</span></p><p className="mt-1 text-sm text-navy/70">{members.length ? members.map((member) => member.nickname).join(", ") : "없음"}</p></div>; })}</div></div>)}</div>}
    </section>
  );
}
