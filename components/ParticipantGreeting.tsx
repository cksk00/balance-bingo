"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { TEAMS } from "@/lib/teams";

export function ParticipantGreeting({ light = false }: { light?: boolean }) {
  const router = useRouter();
  const [participant, setParticipant] = useState<{ nickname: string; teamName: string } | null>(null);

  useEffect(() => {
    const nickname = localStorage.getItem("bb_nickname");
    const teamId = Number(localStorage.getItem("bb_team_id"));
    if (!nickname || !teamId) return;
    setParticipant({ nickname, teamName: TEAMS.find((team) => team.id === teamId)?.name || `TEAM ${teamId}` });
  }, []);

  useEffect(() => {
    const validate = async () => {
      const token = localStorage.getItem("bb_session_token");
      if (!token) return;
      const { data, error } = await supabase.rpc("resume_participant", { p_session_token: token }).maybeSingle();
      if (!error && !data) {
        localStorage.removeItem("bb_session_token");
        localStorage.removeItem("bb_player_id");
        localStorage.removeItem("bb_team_id");
        localStorage.removeItem("bb_nickname");
        router.replace("/");
      }
    };
    const interval = window.setInterval(validate, 10000);
    window.addEventListener("focus", validate);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", validate); };
  }, [router]);

  if (!participant) return null;
  return (
    <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-bold shadow-sm ${light ? "border-white/15 bg-white/10 text-blue-100" : "border-blue-200 bg-white/80 text-navy"}`}>
      <strong className={light ? "text-white" : "text-accentA"}>{participant.nickname}님</strong>, 반가워요! {participant.teamName}으로 참여 중이에요.
    </div>
  );
}
