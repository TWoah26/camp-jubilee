import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// PATCH — update parent_email and/or parent_name on a camper record
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!["director", "administrator"].includes(profile?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { camper_id, parent_email, parent_name, parent_phone } = await req.json();
    if (!camper_id) return NextResponse.json({ error: "Missing camper_id" }, { status: 400 });

    const admin = await createAdminClient();
    const { error } = await admin.from("campers").update({
      parent_email: parent_email?.trim().toLowerCase() || null,
      parent_name: parent_name?.trim() || null,
      parent_phone: parent_phone?.trim() || null,
    }).eq("id", camper_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
