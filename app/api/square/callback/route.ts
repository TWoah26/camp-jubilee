import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Public endpoint — no user session required.
// Square redirects here after a payment; we credit the camper's store account.
// Security: client_transaction_id is a UUID+amount+timestamp that only our own
// app generates, and the timestamp must be within 2 hours.

export async function POST(req: Request) {
  try {
    const { client_transaction_id, transaction_id, status } = await req.json();

    if (status !== "ok") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    if (!client_transaction_id) {
      return NextResponse.json({ error: "Missing transaction data" }, { status: 400 });
    }

    // Format: camperId___amountCents___timestamp
    const parts = (client_transaction_id as string).split("___");
    if (parts.length < 3) {
      return NextResponse.json({ error: "Invalid transaction format" }, { status: 400 });
    }

    const [camperId, amountCentsStr, timestampStr] = parts;
    const amountCents = parseInt(amountCentsStr);
    const timestamp = parseInt(timestampStr);
    const amount = amountCents / 100;

    if (!camperId || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid transaction data" }, { status: 400 });
    }

    // Reject if transaction is older than 2 hours (replay protection)
    if (!isNaN(timestamp) && Date.now() - timestamp > 2 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "Transaction expired" }, { status: 400 });
    }

    const admin = await createAdminClient();

    const { data: camper } = await admin
      .from("campers")
      .select("store_balance")
      .eq("id", camperId)
      .single();

    if (!camper) return NextResponse.json({ error: "Camper not found" }, { status: 404 });

    const newBalance = camper.store_balance + amount;

    const [{ error: txError }, { error: balError }] = await Promise.all([
      admin.from("store_transactions").insert({
        camper_id: camperId,
        amount,
        type: "credit",
        note: `Square POS payment${transaction_id ? ` (${transaction_id})` : ""}`,
        payment_method: "in_person",
      }),
      admin.from("campers").update({ store_balance: newBalance }).eq("id", camperId),
    ]);

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });
    if (balError) return NextResponse.json({ error: balError.message }, { status: 500 });

    return NextResponse.json({ success: true, new_balance: newBalance, amount });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
