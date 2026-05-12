import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { indexFace, removeFacesForCamper } from "@/lib/rekognition";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "director") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get all campers with a profile photo
  const { data: campers } = await supabase
    .from("campers")
    .select("id, first_name, last_name, photo_url")
    .not("photo_url", "is", null);

  if (!campers || campers.length === 0) {
    return NextResponse.json({ success: true, indexed: 0, message: "No profile photos found." });
  }

  let indexed = 0;
  let failed = 0;

  for (const camper of campers) {
    try {
      await removeFacesForCamper(camper.id);
      const faceId = await indexFace(camper.id, camper.photo_url);
      if (faceId) indexed++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    indexed,
    failed,
    message: `Indexed ${indexed} face${indexed !== 1 ? "s" : ""}${failed > 0 ? `, ${failed} failed` : ""}.`,
  });
}
