import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!profile || !["director", "media"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { photo_id, url } = await req.json();
    if (!photo_id) return NextResponse.json({ error: "Missing photo_id" }, { status: 400 });

    // Extract storage path from URL (everything after /camp-photos/)
    if (url) {
      const match = url.match(/camp-photos\/(.+)$/);
      if (match) {
        await supabase.storage.from("camp-photos").remove([match[1]]);
      }
    }

    // Delete tags then photo (or rely on cascade)
    await supabase.from("photo_tags").delete().eq("photo_id", photo_id);
    const { error } = await supabase.from("photos").delete().eq("id", photo_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
