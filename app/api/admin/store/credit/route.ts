import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!["director", "administrator"].includes(profile?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { camper_id, amount, note, payment_method } = await req.json();
    if (!camper_id || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { data: camper } = await supabase
      .from("campers")
      .select("store_balance")
      .eq("id", camper_id)
      .single();

    if (!camper) return NextResponse.json({ error: "Camper not found" }, { status: 404 });

    const newBalance = camper.store_balance + amount;

    const { error: txError } = await supabase.from("store_transactions").insert({
      camper_id,
      amount,
      type: "credit",
      note: note || "Manual deposit",
      payment_method: payment_method || "cash",
      staff_id: user.id,
    });
    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

    const { error: balError } = await supabase
      .from("campers")
      .update({ store_balance: newBalance })
      .eq("id", camper_id);
    if (balError) return NextResponse.json({ error: balError.message }, { status: 500 });

    return NextResponse.json({ success: true, new_balance: newBalance });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
