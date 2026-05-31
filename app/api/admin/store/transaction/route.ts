import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function authCheck(allowStore = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  const allowed = allowStore
    ? ["director", "administrator", "store"]
    : ["director", "administrator"];
  if (!profile || !allowed.includes(profile.role)) return { error: "Forbidden", status: 403 };
  return { ok: true };
}

// GET — fetch recent store transactions for a camper
export async function GET(req: Request) {
  try {
    const auth = await authCheck(true);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { searchParams } = new URL(req.url);
    const camperId = searchParams.get("camper_id");
    if (!camperId) return NextResponse.json({ error: "Missing camper_id" }, { status: 400 });
    const supabase = await createClient();
    const { data } = await supabase
      .from("store_transactions")
      .select("id, amount, type, note, created_at")
      .eq("camper_id", camperId)
      .order("created_at", { ascending: false })
      .limit(6);
    return NextResponse.json({ transactions: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH — edit a transaction's amount and/or note, recompute balance
export async function PATCH(req: Request) {
  try {
    const auth = await authCheck();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id, amount, note } = await req.json();
    if (!id || !amount || amount <= 0) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const admin = await createAdminClient();

    // Fetch the existing transaction to know the old amount and type
    const { data: tx } = await admin.from("store_transactions").select("camper_id, amount, type").eq("id", id).single();
    if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    // Fetch current balance
    const { data: camper } = await admin.from("campers").select("store_balance").eq("id", tx.camper_id).single();
    if (!camper) return NextResponse.json({ error: "Camper not found" }, { status: 404 });

    // Reverse old effect, apply new effect
    const oldEffect = tx.type === "credit" ? tx.amount : -tx.amount;
    const newEffect = tx.type === "credit" ? amount : -amount;
    const newBalance = parseFloat((camper.store_balance - oldEffect + newEffect).toFixed(2));

    const [{ error: txError }, { error: balError }] = await Promise.all([
      admin.from("store_transactions").update({ amount, note: note ?? null }).eq("id", id),
      admin.from("campers").update({ store_balance: newBalance }).eq("id", tx.camper_id),
    ]);

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });
    if (balError) return NextResponse.json({ error: balError.message }, { status: 500 });

    return NextResponse.json({ success: true, new_balance: newBalance });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE — remove a transaction and reverse its effect on the balance
export async function DELETE(req: Request) {
  try {
    const auth = await authCheck(true);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const admin = await createAdminClient();

    // Fetch transaction to know what to reverse
    const { data: tx } = await admin.from("store_transactions").select("camper_id, amount, type, created_at").eq("id", id).single();
    if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    // Store workers can only undo same-day transactions
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("users").select("role").eq("id", user!.id).single();
    if (!["director", "administrator"].includes(profile?.role ?? "")) {
      const txDate = new Date(tx.created_at).toDateString();
      if (txDate !== new Date().toDateString()) {
        return NextResponse.json({ error: "Store workers can only undo same-day transactions." }, { status: 403 });
      }
    }

    // Fetch current balance
    const { data: camper } = await admin.from("campers").select("store_balance").eq("id", tx.camper_id).single();
    if (!camper) return NextResponse.json({ error: "Camper not found" }, { status: 404 });

    const effect = tx.type === "credit" ? tx.amount : -tx.amount;
    const newBalance = parseFloat((camper.store_balance - effect).toFixed(2));

    const [{ error: txError }, { error: balError }] = await Promise.all([
      admin.from("store_transactions").delete().eq("id", id),
      admin.from("campers").update({ store_balance: newBalance }).eq("id", tx.camper_id),
    ]);

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });
    if (balError) return NextResponse.json({ error: balError.message }, { status: 500 });

    return NextResponse.json({ success: true, new_balance: newBalance });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
