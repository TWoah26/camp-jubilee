import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!profile || !["director", "administrator"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { first_name, last_name, dob, cabin, counselor_name, registration_notes } = await req.json();

    const admin = await createAdminClient();
    const { error } = await admin
      .from("campers")
      .update({
        first_name: first_name?.trim() || undefined,
        last_name: last_name?.trim() || undefined,
        dob: dob || null,
        cabin: cabin?.trim() || null,
        counselor_name: counselor_name?.trim() || null,
        registration_notes: registration_notes?.trim() || null,
      })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
