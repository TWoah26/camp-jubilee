import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { searchFaces } from "@/lib/rekognition";

// Called after the browser has uploaded a file directly to Supabase Storage.
// Records the photo metadata in the DB and triggers face recognition.
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!profile || !["director", "media"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { public_url, date_taken, caption, uploaded_by, session_id } = await req.json();
    if (!public_url) return NextResponse.json({ error: "Missing public_url" }, { status: 400 });

    const { data: photo, error: photoError } = await supabase.from("photos").insert({
      url: public_url,
      caption: caption || null,
      date_taken: date_taken,
      uploaded_by: uploaded_by,
      session_id: session_id || null,
    }).select().single();

    if (photoError) return NextResponse.json({ error: photoError.message }, { status: 500 });

    // Fire-and-forget face recognition
    searchFaces(public_url).then(async (faceMatches) => {
      if (faceMatches.length > 0) {
        const tags = faceMatches.map(m => ({ photo_id: photo.id, camper_id: m.camperId, tagged_by: uploaded_by }));
        await supabase.from("photo_tags").upsert(tags, { onConflict: "photo_id,camper_id" });
      }
    }).catch(() => {});

    return NextResponse.json({ success: true, photo_id: photo.id });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
