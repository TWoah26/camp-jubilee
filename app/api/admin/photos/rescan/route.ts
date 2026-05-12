import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { searchFaces } from "@/lib/rekognition";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["director", "media"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { photo_id, url } = await req.json();
  if (!photo_id || !url) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Run face recognition
  const faceMatches = await searchFaces(url);

  if (faceMatches.length > 0) {
    const newTags = faceMatches.map(m => ({
      photo_id,
      camper_id: m.camperId,
      tagged_by: user.id,
    }));
    await supabase.from("photo_tags").upsert(newTags, { onConflict: "photo_id,camper_id" });
  }

  // Return full updated tag list
  const { data: tags } = await supabase
    .from("photo_tags")
    .select("camper_id, camper:campers(first_name, last_name)")
    .eq("photo_id", photo_id);

  return NextResponse.json({ success: true, tags: tags ?? [], found: faceMatches.length });
}
