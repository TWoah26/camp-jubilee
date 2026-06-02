import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Returns a signed upload URL so the browser can PUT the file directly
// to Supabase Storage, bypassing Vercel's 4.5 MB body size limit.
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!profile || !["director", "media"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { filename, content_type } = await req.json();
    if (!filename) return NextResponse.json({ error: "Missing filename" }, { status: 400 });

    const ext = filename.split(".").pop() ?? "jpg";
    const path = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const admin = await createAdminClient();
    const { data, error } = await admin.storage
      .from("camp-photos")
      .createSignedUploadUrl(path);

    if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to create upload URL" }, { status: 500 });

    const { data: { publicUrl } } = admin.storage.from("camp-photos").getPublicUrl(path);

    return NextResponse.json({ signed_url: data.signedUrl, path, public_url: publicUrl, token: data.token });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
