import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { indexFace, removeFacesForCamper } from "@/lib/rekognition";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const camperId = formData.get("camper_id") as string;

    if (!file || !camperId) return NextResponse.json({ error: "Missing file or camper_id" }, { status: 400 });

    // Directors can update any camper; parents can only update their linked campers
    if (!["director", "administrator"].includes(profile.role)) {
      const { data: link } = await supabase
        .from("parent_camper_links")
        .select("id")
        .eq("parent_id", user.id)
        .eq("camper_id", camperId)
        .eq("approved", true)
        .single();
      if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use admin client for storage + DB writes to bypass RLS
    const admin = await createAdminClient();
    const fileName = `profiles/${camperId}.jpg`;

    const { error: uploadError } = await admin.storage
      .from("camp-photos")
      .upload(fileName, file, { contentType: "image/jpeg", upsert: true });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = admin.storage.from("camp-photos").getPublicUrl(fileName);

    const { error: updateError } = await admin
      .from("campers")
      .update({ photo_url: publicUrl })
      .eq("id", camperId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // Re-index face in Rekognition (remove old, add new) — fire and forget
    removeFacesForCamper(camperId)
      .then(() => indexFace(camperId, publicUrl))
      .catch(() => {});

    return NextResponse.json({ success: true, url: publicUrl });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
