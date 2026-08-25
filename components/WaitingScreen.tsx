import { ParticipantGreeting } from "@/components/ParticipantGreeting";

type WaitingScreenProps = {
  round: 1 | 2;
  message?: string;
};

export function WaitingScreen({ round, message }: WaitingScreenProps) {
  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <section className="w-full max-w-md">
        <ParticipantGreeting />
        <div className="rounded-3xl bg-navy p-8 text-center text-white shadow-xl">
        <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-hit" />
        <p className="text-sm font-bold tracking-[0.2em] text-blue-200">ROUND {round}</p>
        <h1 className="mt-2 text-2xl font-extrabold">관리자의 시작을 기다리고 있어요</h1>
        <p className="mt-3 text-sm leading-relaxed text-blue-100">
          {message || "잠시만 기다려주세요. 시작 신호가 오면 모든 참가자가 동시에 이동합니다."}
        </p>
        </div>
      </section>
    </main>
  );
}
