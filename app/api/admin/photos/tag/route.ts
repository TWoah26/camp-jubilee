import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function authorize() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["director", "media"].includes(profile.role)) return null;
  return { supabase, user };
}

// Add a tag
export async function POST(req: Request) {
  const auth = await authorize();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { photo_id, camper_id } = await req.json();
  if (!photo_id || !camper_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { error } = await auth.supabase.from("photo_tags").upsert(
    { photo_id, camper_id, tagged_by: auth.user.id },
    { onConflict: "photo_id,camper_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Remove a tag
export async function DELETE(req: Request) {
  const auth = await authorize();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { photo_id, camper_id } = await req.json();
  if (!photo_id || !camper_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { error } = await auth.supabase.from("photo_tags")
    .delete()
    .eq("photo_id", photo_id)
    .eq("camper_id", camper_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
