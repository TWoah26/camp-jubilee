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

    // Adjust balances FIRST (before marking closed) to eliminate the race
    // condition where a parent loads the session-close page between the two steps.
    // - Balance ≤ $25 → $0   (absorbed, parent sees nothing)
    // - Balance  > $25 → balance - $25   (parent sees/chooses the overage only)
    const { data: sessionCampers } = await admin
      .from("campers")
      .select("id, store_balance")
      .eq("session_id", session_id)
      .gt("store_balance", 0);

    if (sessionCampers && sessionCampers.length > 0) {
      await Promise.all(sessionCampers.map(c => {
        const newBalance = c.store_balance <= SMALL_BALANCE_THRESHOLD
          ? 0
          : parseFloat((c.store_balance - SMALL_BALANCE_THRESHOLD).toFixed(2));
        return admin.from("campers").update({ store_balance: newBalance }).eq("id", c.id);
      }));
    }

    // Mark session closed only after balances are set — prevents parents from
    // seeing the session-close page with pre-deduction balances.
    const { error } = await admin.from("sessions").update({
      session_closed: true,
      is_active: false,
    }).eq("id", session_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
