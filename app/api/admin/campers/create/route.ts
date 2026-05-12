import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!["director","administrator"].includes(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { error } = await supabase.from("campers").insert({
      first_name: body.first_name,
      last_name: body.last_name,
      dob: body.dob || null,
      cabin: body.cabin || null,
      counselor_name: body.counselor_name || null,
      session_id: body.is_staff ? null : (body.session_id || null),
      is_staff: body.is_staff ?? false,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
