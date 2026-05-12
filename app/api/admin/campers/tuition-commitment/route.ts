import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!["director", "administrator"].includes(profile?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { camper_id, tuition_commitment } = body;

    if (!camper_id || tuition_commitment === undefined) {
      return NextResponse.json({ error: "camper_id and tuition_commitment are required" }, { status: 400 });
    }

    const commitment = parseFloat(tuition_commitment);
    if (isNaN(commitment) || commitment < 0) {
      return NextResponse.json({ error: "tuition_commitment must be a non-negative number" }, { status: 400 });
    }

    const { error } = await supabase
      .from("campers")
      .update({ tuition_commitment: commitment })
      .eq("id", camper_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, tuition_commitment: commitment });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
