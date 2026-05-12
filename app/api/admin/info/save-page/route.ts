import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!["director","administrator"].includes(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { page_id, content } = await req.json();
    const { error } = await supabase.from("info_pages").update({
      content,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }).eq("id", page_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
