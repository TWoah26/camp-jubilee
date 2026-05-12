import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!profile || !["director", "store"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { camper_id, amount, note, staff_id } = await req.json();
    if (!camper_id || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { data: camper } = await supabase
      .from("campers")
      .select("store_balance")
      .eq("id", camper_id)
      .single();

    if (!camper) return NextResponse.json({ error: "Camper not found" }, { status: 404 });
    if (camper.store_balance < amount) {
      return NextResponse.json({ error: `Insufficient balance. Current: $${camper.store_balance.toFixed(2)}` }, { status: 400 });
    }

    const newBalance = parseFloat((camper.store_balance - amount).toFixed(2));

    const [txResult, balResult] = await Promise.all([
      supabase.from("store_transactions").insert({
        camper_id,
        amount,
        type: "debit",
        note: note || null,
        staff_id: staff_id || user.id,
      }),
      supabase.from("campers").update({ store_balance: newBalance }).eq("id", camper_id),
    ]);

    if (txResult.error) return NextResponse.json({ error: txResult.error.message }, { status: 500 });
    if (balResult.error) return NextResponse.json({ error: balResult.error.message }, { status: 500 });

    return NextResponse.json({ success: true, new_balance: newBalance });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
