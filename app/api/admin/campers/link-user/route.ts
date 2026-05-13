import { createClient, createAdminClient } from "@/lib/supabase/server";
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

    const { camper_id, user_id } = await req.json();
    if (!camper_id) return NextResponse.json({ error: "Missing camper_id" }, { status: 400 });

    const admin = await createAdminClient();

    // Clear user_id from any other camper that had this user linked
    if (user_id) {
      await admin.from("campers").update({ user_id: null }).eq("user_id", user_id).neq("id", camper_id);
    }

    const { error } = await admin
      .from("campers")
      .update({ user_id: user_id || null })
      .eq("id", camper_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
