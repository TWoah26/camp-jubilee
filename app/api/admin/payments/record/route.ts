import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { camper_id, parent_id, amount, type, payment_method, notes, session_id } = await req.json();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!profile || !["director","administrator"].includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const { error } = await supabase.from("tuition_payments").insert({
      camper_id,
      parent_id: parent_id || null,
      amount,
      type: type ?? "tuition",
      payment_method: payment_method ?? "in_person",
      notes: notes ?? null,
      session_id: session_id || null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
