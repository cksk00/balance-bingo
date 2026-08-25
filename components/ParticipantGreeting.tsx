"use client";

import { useEffect, useState } from "react";
import { TEAMS } from "@/lib/teams";

export function ParticipantGreeting({ light = false }: { light?: boolean }) {
  const [participant, setParticipant] = useState<{ nickname: string; teamName: string } | null>(null);

  useEffect(() => {
    const nickname = localStorage.getItem("bb_nickname");
    const teamId = Number(localStorage.getItem("bb_team_id"));
    if (!nickname || !teamId) return;
    setParticipant({ nickname, teamName: TEAMS.find((team) => team.id === teamId)?.name || `TEAM ${teamId}` });
  }, []);

  if (!participant) return null;
  return (
    <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-bold shadow-sm ${light ? "border-white/15 bg-white/10 text-blue-100" : "border-blue-200 bg-white/80 text-navy"}`}>
      <strong className={light ? "text-white" : "text-accentA"}>{participant.nickname}님</strong>, 반가워요! {participant.teamName}으로 참여 중이에요.
    </div>
  );
}
