import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { searchFaces } from "@/lib/rekognition";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "director") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: photos } = await supabase.from("photos").select("id, url");
  if (!photos || photos.length === 0) {
    return NextResponse.json({ success: true, scanned: 0, tagged: 0, message: "No photos to scan." });
  }

  let scanned = 0;
  let totalTagged = 0;

  for (const photo of photos) {
    try {
      const faceMatches = await searchFaces(photo.url);
      if (faceMatches.length > 0) {
        const tags = faceMatches.map(m => ({
          photo_id: photo.id,
          camper_id: m.camperId,
          tagged_by: user.id,
        }));
        await supabase.from("photo_tags").upsert(tags, { onConflict: "photo_id,camper_id" });
        totalTagged += faceMatches.length;
      }
      scanned++;
    } catch {
      // Skip failed photos, keep going
    }
  }

  return NextResponse.json({
    success: true,
    scanned,
    tagged: totalTagged,
    message: `Scanned ${scanned} photo${scanned !== 1 ? "s" : ""}, found ${totalTagged} face match${totalTagged !== 1 ? "es" : ""}.`,
  });
}
