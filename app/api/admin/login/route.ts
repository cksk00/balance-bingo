import { NextResponse } from "next/server";
import { getAdminCookieValue } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const { password } = await request.json();
  const correct = process.env.ADMIN_PASSWORD;

  if (!correct) {
    return NextResponse.json(
      { error: "서버에 ADMIN_PASSWORD가 설정되어 있지 않아요." },
      { status: 500 }
    );
  }

  if (password !== correct) {
    return NextResponse.json({ error: "비밀번호가 틀렸어요." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("bb_admin", await getAdminCookieValue(correct), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12시간
  });
  return res;
}
