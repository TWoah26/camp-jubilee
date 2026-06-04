import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SMALL_BALANCE_THRESHOLD = 25; // balances at or below this are absorbed at close

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!["director","administrator"].includes(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { session_id } = await req.json();
    const admin = await createAdminClient();

    // Mark session closed
    const { error } = await admin.from("sessions").update({
      session_closed: true,
      is_active: false,
    }).eq("id", session_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Zero out balances ≤ $25 — too small to refund, absorbed at close.
    // Parents with these balances will see $0 and won't be shown the refund/donate page.
    await admin
      .from("campers")
      .update({ store_balance: 0 })
      .eq("session_id", session_id)
      .lte("store_balance", SMALL_BALANCE_THRESHOLD)
      .gt("store_balance", 0);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
