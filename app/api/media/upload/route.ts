import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { searchFaces } from "@/lib/rekognition";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!profile || !["director", "media"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const dateTaken = formData.get("date_taken") as string;
    const caption = formData.get("caption") as string;
    const uploadedBy = formData.get("uploaded_by") as string;
    const sessionId = formData.get("session_id") as string | null;
    const camperIds = formData.getAll("camper_ids") as string[];

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("camp-photos")
      .upload(fileName, file, { contentType: file.type, upsert: false });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from("camp-photos").getPublicUrl(fileName);

    const { data: photo, error: photoError } = await supabase.from("photos").insert({
      url: publicUrl,
      caption: caption || null,
      date_taken: dateTaken,
      uploaded_by: uploadedBy,
      session_id: sessionId || null,
    }).select().single();

    if (photoError) return NextResponse.json({ error: photoError.message }, { status: 500 });

    if (camperIds.length > 0) {
      await supabase.from("photo_tags").insert(
        camperIds.map(id => ({ photo_id: photo.id, camper_id: id, tagged_by: uploadedBy }))
      );
    }

    // Auto-tag via Rekognition face recognition — fire and forget so it
    // doesn't block the upload response or slow down bulk uploads.
    searchFaces(publicUrl).then(async (faceMatches) => {
      if (faceMatches.length > 0) {
        const alreadyTagged = new Set(camperIds);
        const newTags = faceMatches
          .filter(m => !alreadyTagged.has(m.camperId))
          .map(m => ({ photo_id: photo.id, camper_id: m.camperId, tagged_by: uploadedBy }));
        if (newTags.length > 0) {
          await supabase.from("photo_tags").upsert(newTags, { onConflict: "photo_id,camper_id" });
        }
      }
    }).catch(() => {
      // Non-fatal — photo still uploaded even if face recognition fails
    });

    // Fire and forget push notification
    if (camperIds.length > 0) {
      fetch(new URL("/api/notifications/broadcast", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "📸 New photos just uploaded from Camp Jubilee!", body: "Check the gallery!" }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, photo_id: photo.id });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
