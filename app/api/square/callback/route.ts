import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Public endpoint — no user session required.
// Called by the pos-callback page after Square redirects back.
// The camper_id and amount come from localStorage (saved before opening Square).

export async function POST(req: Request) {
  try {
    const { camper_id, amount, transaction_id, status } = await req.json();

    if (status !== "ok") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    if (!camper_id || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
    }

    const admin = await createAdminClient();

    const { data: camper } = await admin
      .from("campers")
      .select("store_balance")
      .eq("id", camper_id)
      .single();

    if (!camper) return NextResponse.json({ error: "Camper not found" }, { status: 404 });

    const newBalance = camper.store_balance + amount;

    const [{ error: txError }, { error: balError }] = await Promise.all([
      admin.from("store_transactions").insert({
        camper_id,
        amount,
        type: "credit",
        note: `Square POS payment${transaction_id ? ` (${transaction_id})` : ""}`,
        payment_method: "in_person",
      }),
      admin.from("campers").update({ store_balance: newBalance }).eq("id", camper_id),
    ]);

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });
    if (balError) return NextResponse.json({ error: balError.message }, { status: 500 });

    return NextResponse.json({ success: true, new_balance: newBalance, amount });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
