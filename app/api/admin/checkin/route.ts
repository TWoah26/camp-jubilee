import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!["director","administrator","nurse"].includes(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { camper_id, session_id, action, notes } = await req.json();
    // action: "checkin" | "undo_checkin" | "pickup" | "undo_pickup"

    const now = new Date().toISOString();

    let update: Record<string, any> = {};
    if (action === "checkin") {
      update = { checked_in: true, checked_in_at: now, checkin_notes: notes ?? "" };
    } else if (action === "undo_checkin") {
      update = { checked_in: false, checked_in_at: null, checkin_notes: "" };
    } else if (action === "pickup") {
      update = { picked_up: true, picked_up_at: now, pickup_notes: notes ?? "" };
    } else if (action === "undo_pickup") {
      update = { picked_up: false, picked_up_at: null, pickup_notes: "" };
    } else if (action === "update_notes") {
      update = { checkin_notes: notes ?? "" };
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { error } = await supabase
      .from("checkin_records")
      .upsert({ camper_id, session_id, ...update }, { onConflict: "camper_id,session_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
