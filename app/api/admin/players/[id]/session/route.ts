import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminCookieValue } from "@/lib/adminAuth";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret || request.cookies.get("bb_admin")?.value !== await getAdminCookieValue(secret)) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.from("participant_sessions").delete().eq("player_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
