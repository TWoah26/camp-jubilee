import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["director","administrator"].includes(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { session_id } = await req.json();
  const cookieStore = await cookies();

  if (session_id) {
    cookieStore.set("admin_session_id", session_id, { path: "/", httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
  } else {
    cookieStore.delete("admin_session_id");
  }

  return NextResponse.json({ success: true });
}
