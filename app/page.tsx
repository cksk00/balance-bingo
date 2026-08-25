"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const previewQuestions = [
  ["다크모드", "라이트모드"], ["Claude", "Codex"], ["VS Code", "JetBrains"], ["Mac", "Windows"], ["Tab", "Space"],
  ["프론트엔드", "백엔드"], ["SQL", "NoSQL"], ["모놀리식", "MSA"], ["Vim", "Nano"], ["GitHub", "GitLab"],
  ["REST", "GraphQL"], ["Docker", "로컬 실행"], ["Python", "JavaScript"], ["터미널", "GUI"], ["마우스", "트랙패드"],
  ["클라우드", "온프레미스"], ["문서 먼저", "코드 먼저"], ["테스트 먼저", "배포 먼저"], ["아침 코딩", "새벽 코딩"], ["오픈소스", "상용 SW"],
  ["AI 페어코딩", "혼자 코딩"], ["PR 리뷰", "라이브 리뷰"], ["재택근무", "오피스"], ["핫픽스", "롤백"], ["CLI", "IDE"],
];

const stars = [
  [6, 20, 18], [13, 72, 12], [20, 34, 9], [28, 88, 15], [36, 14, 10],
  [44, 66, 18], [52, 26, 11], [61, 91, 8], [69, 12, 15], [76, 75, 10],
  [84, 31, 17], [92, 62, 12], [9, 91, 8], [24, 54, 14], [39, 42, 8],
  [57, 56, 15], [72, 44, 9], [88, 84, 18], [95, 17, 10], [48, 6, 12],
];

export default function HomePage() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState("");
  const [pendingParticipant, setPendingParticipant] = useState<{ nickname: string; team_id: number; team_name: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("bb_session_token");
    if (!token) {
      setRestoring(false);
      return;
    }
    let cancelled = false;

    const restore = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error: resumeError } = await supabase
          .rpc("resume_participant", { p_session_token: token })
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          const player = data as { player_id: string; nickname: string; team_id: number; current_round: number };
          localStorage.setItem("bb_player_id", player.player_id);
          localStorage.setItem("bb_team_id", String(player.team_id));
          localStorage.setItem("bb_nickname", player.nickname);
          router.replace(player.current_round === 2 ? "/round2" : "/round1");
          return;
        }
        if (!resumeError) {
          localStorage.removeItem("bb_session_token");
          localStorage.removeItem("bb_player_id");
          localStorage.removeItem("bb_team_id");
          localStorage.removeItem("bb_nickname");
          setRestoring(false);
          return;
        }
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }

      // 일시적인 RPC 장애라면 세션 토큰을 삭제하지 않고 기존 참가자 정보로 복구한다.
      const cachedPlayerId = localStorage.getItem("bb_player_id");
      if (cachedPlayerId) {
        const { data: cachedPlayer } = await supabase
          .from("players")
          .select("id, nickname, team_id, current_round")
          .eq("id", cachedPlayerId)
          .maybeSingle();
        if (cancelled) return;
        if (cachedPlayer) {
          localStorage.setItem("bb_team_id", String(cachedPlayer.team_id));
          localStorage.setItem("bb_nickname", cachedPlayer.nickname);
          router.replace(cachedPlayer.current_round === 2 ? "/round2" : "/round1");
          return;
        }
      }
      setError("세션 확인에 실패했어요. 네트워크를 확인한 뒤 새로고침해주세요.");
      setStarted(true);
      setRestoring(false);
    };

    restore();
    return () => { cancelled = true; };
  }, [router]);

  async function handleJoin() {
    setError("");
    if (!nickname.trim()) return setError("닉네임을 입력해주세요.");
    setLoading(true);
    const { data, error: lookupError } = await supabase
      .rpc("lookup_participant", { p_name: nickname.trim() })
      .maybeSingle();
    setLoading(false);
    if (lookupError || !data) {
      if (!data && !lookupError) return setError("참가자 명단에서 이름을 찾을 수 없습니다. 실명을 정확히 입력해주세요.");
      return setError("참가자 정보를 확인하지 못했어요. 다시 시도해주세요.");
    }
    setPendingParticipant(data as { nickname: string; team_id: number; team_name: string });
  }

  async function confirmJoin() {
    if (!pendingParticipant) return;
    setError("");
    setClaiming(true);
    const sessionToken = localStorage.getItem("bb_session_token") || crypto.randomUUID();
    const { data, error: claimError } = await supabase
      .rpc("claim_participant", { p_name: pendingParticipant.nickname, p_session_token: sessionToken })
      .maybeSingle();
    setClaiming(false);
    if (claimError || !data) {
      if (claimError?.message.includes("ALREADY_CLAIMED")) return setError("이미 다른 브라우저에서 입장한 이름입니다. 운영진에게 문의해주세요.");
      if (claimError?.message.includes("NAME_NOT_FOUND")) return setError("참가자 명단에서 이름을 찾을 수 없습니다. 실명을 정확히 입력해주세요.");
      return setError("입장에 실패했어요. 다시 시도해주세요.");
    }
    const player = data as { player_id: string; nickname: string; team_id: number };
    localStorage.setItem("bb_session_token", sessionToken);
    localStorage.setItem("bb_player_id", player.player_id);
    localStorage.setItem("bb_team_id", String(player.team_id));
    localStorage.setItem("bb_nickname", player.nickname);
    router.push("/round1");
  }

  if (restoring) return <main className="landing-page min-h-screen flex items-center justify-center"><div className="h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-[#fff0c8]" /></main>;

  return (
    <main className="landing-page min-h-screen overflow-hidden px-5 py-6 md:px-10 md:py-8">
      <div className="landing-stars" aria-hidden="true">
        {stars.map(([left, top, size], index) => (
          <span key={index} style={{ left: `${left}%`, top: `${top}%`, fontSize: `${size}px` }}>★</span>
        ))}
      </div>
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between border-b border-white/20 pb-5">
        <div className="retro-logo landing-header-logo">BINGO<span>★</span></div>
        <p className="hidden text-sm font-bold tracking-[0.25em] text-blue-100 md:block">seKUrity BINGO SESSION</p>
      </header>

      {!started ? (
        <section className="relative z-10 mx-auto grid min-h-[calc(100vh-100px)] max-w-7xl items-center gap-12 py-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="landing-clouds landing-clouds-left" aria-hidden="true"><i /></div>
          <div className="landing-clouds landing-clouds-right" aria-hidden="true"><i /></div>
          <div className="landing-copy max-w-2xl text-white">
            <p className="mb-6 text-xl font-extrabold tracking-wide text-blue-100 md:text-2xl">seKUrity 빙고 세션</p>
            <h1 className="retro-title mb-7 text-6xl leading-[1.18] md:text-7xl">밸런스 빙고<br />챌린지</h1>
            <p className="mb-10 max-w-xl text-xl leading-relaxed text-blue-100 md:text-2xl">서로의 선택을 맞혀 빙고를 완성하고<br />우리 팀의 순위를 확인해보세요.</p>
            <button onClick={() => setStarted(true)} className="cream-button px-12 py-5 text-xl font-extrabold md:text-2xl">빙고판 시작하기 <span className="ml-4">→</span></button>
          </div>

          <div className="relative mx-auto w-full max-w-[420px] lg:-translate-x-6">
            <div className="board-ornaments" aria-hidden="true">
              <span className="ornament ornament-code">&lt;/&gt;</span>
              <span className="ornament ornament-shield">◆</span>
              <span className="ornament ornament-star-one">★</span>
              <span className="ornament ornament-star-two">✦</span>
              <span className="ornament ornament-star-three">★</span>
              <span className="ornament ornament-spark-one">✦</span>
              <span className="ornament ornament-spark-two">✧</span>
              <span className="ornament ornament-braces">&#123; &#125;</span>
              <span className="ornament ornament-diamond">✦</span>
            </div>
            <div className="mb-4 text-center text-white"><div className="retro-logo hero-logo">BINGO<span>★</span></div><p className="mt-1 inline-block rounded-full bg-blue-100 px-8 py-1 text-sm font-extrabold tracking-wider text-blue-800">seKUrity 빙고 세션</p></div>
            <div className="preview-board-stack relative">
              <div className="preview-board-back" aria-hidden="true" />
              <div className="preview-board relative z-[2] grid grid-cols-5 overflow-hidden rounded-2xl border-[6px] border-[#143d9e] bg-[#fff8e8] shadow-2xl">
                {previewQuestions.map(([left, right], index) => <div key={index} className="flex aspect-square flex-col items-center justify-center border border-blue-900/35 p-1 text-center text-[10px] font-extrabold leading-tight text-[#14316f] sm:text-[12px] md:text-[13px]"><span>{left}</span><span className="my-0.5 text-[8px] text-blue-500 sm:text-[10px]">VS</span><span>{right}</span></div>)}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-100px)] max-w-xl items-center py-12">
          <div className="w-full rounded-[2rem] border border-white/25 bg-[#073fae]/80 p-7 text-white shadow-2xl backdrop-blur md:p-10">
            <button onClick={() => setStarted(false)} className="mb-5 text-sm font-bold text-blue-200">← 돌아가기</button>
            <p className="text-sm font-bold tracking-[0.2em] text-blue-200">JOIN THE SESSION</p>
            {!pendingParticipant ? <>
              <h1 className="retro-title mb-3 mt-2 text-4xl">이름으로 입장하세요</h1>
              <p className="mb-8 text-sm font-semibold text-blue-100">등록된 참가자 이름을 입력하면 배정된 팀으로 자동 입장합니다.</p>
              <label className="mb-2 block text-sm font-bold text-blue-100">참가자 실명</label>
              <input value={nickname} onChange={(event) => setNickname(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleJoin(); }} placeholder="예: 홍길동" autoComplete="name" maxLength={20} className="mb-6 w-full rounded-xl border-2 border-white/20 bg-white px-4 py-3 font-semibold text-ink outline-none focus:border-[#ffe8a8]" />
              {error && <p className="mb-4 rounded-lg bg-red-500/20 p-3 text-sm font-bold text-red-100">{error}</p>}
              <button onClick={handleJoin} disabled={loading} className="cream-button w-full py-4 text-lg font-extrabold disabled:opacity-50">{loading ? "계정 확인 중..." : "확인하기 →"}</button>
            </> : <>
              <p className="text-sm font-bold tracking-[0.2em] text-blue-200">CONFIRM YOUR ACCOUNT</p>
              <h1 className="retro-title mb-4 mt-2 text-3xl">정말 {pendingParticipant.nickname}님이 맞으신가요?</h1>
              <p className="mb-8 rounded-2xl bg-white/10 p-5 text-center text-xl font-extrabold"><span className="text-hit">{pendingParticipant.team_name}</span>으로 입장합니다.</p>
              {error && <p className="mb-4 rounded-lg bg-red-500/20 p-3 text-sm font-bold text-red-100">{error}</p>}
              <div className="grid grid-cols-2 gap-3"><button onClick={() => { setPendingParticipant(null); setNickname(""); setError(""); }} disabled={claiming} className="rounded-full bg-white/10 py-4 font-extrabold text-white disabled:opacity-50">취소하기</button><button onClick={confirmJoin} disabled={claiming} className="cream-button py-4 font-extrabold disabled:opacity-50">{claiming ? "입장 중..." : "입장하기"}</button></div>
            </>}
          </div>
        </section>
      )}
    </main>
  );
}
