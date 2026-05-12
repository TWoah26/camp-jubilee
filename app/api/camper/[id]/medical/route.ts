import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: camper_id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Allow staff roles or linked parents
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    const isStaff = ["director", "administrator", "nurse"].includes(profile?.role);

    if (!isStaff) {
      const { data: link } = await supabase
        .from("parent_camper_links")
        .select("id")
        .eq("parent_id", user.id)
        .eq("camper_id", camper_id)
        .eq("approved", true)
        .single();

      if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { medical, medications } = await req.json();

    // Upsert medical_info
    const { error: medError } = await supabase
      .from("medical_info")
      .upsert({
        camper_id,
        ...medical,
        updated_at: new Date().toISOString(),
      }, { onConflict: "camper_id" });

    if (medError) return NextResponse.json({ error: medError.message }, { status: 500 });

    // Replace medications: delete all then re-insert
    await supabase.from("medications").delete().eq("camper_id", camper_id);

    if (medications && medications.length > 0) {
      const rows = medications
        .filter((m: any) => m.name?.trim())
        .map((m: any) => ({ camper_id, name: m.name, dose: m.dose, frequency: m.frequency, instructions: m.instructions, time_of_day: m.time_of_day ?? [] }));

      if (rows.length > 0) {
        const { error: rxError } = await supabase.from("medications").insert(rows);
        if (rxError) return NextResponse.json({ error: rxError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
