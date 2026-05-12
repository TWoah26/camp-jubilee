import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { camper_id, body, parent_id } = await req.json();

    if (!body?.trim() || body.length > 500) {
      return NextResponse.json({ error: "Message body is required (max 500 chars)" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== parent_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: sessions } = await supabase
      .from("sessions")
      .select("is_active")
      .eq("is_active", true)
      .limit(1);

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: "Messaging is not available — session is not active" }, { status: 403 });
    }

    const { data: link } = await supabase
      .from("parent_camper_links")
      .select("id")
      .eq("parent_id", parent_id)
      .eq("camper_id", camper_id)
      .eq("approved", true)
      .single();

    if (!link) {
      return NextResponse.json({ error: "Not authorized for this camper" }, { status: 403 });
    }

    const { error } = await supabase.from("messages").insert({
      from_parent_id: parent_id,
      to_camper_id: camper_id,
      body: body.trim(),
      status: "unread",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
