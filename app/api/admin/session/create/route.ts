import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!["director","administrator"].includes(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { error } = await supabase.from("sessions").insert({
      name: body.name,
      start_date: body.start_date,
      end_date: body.end_date,
      deposit_amount: body.deposit_amount ?? 0,
      deposit_due_date: body.deposit_due_date || null,
      tuition_amount: body.tuition_amount ?? 0,
      tuition_due_date: body.tuition_due_date || null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
