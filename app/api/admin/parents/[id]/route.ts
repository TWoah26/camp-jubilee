import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!["director", "administrator"].includes(profile?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = await createAdminClient();

  // Verify the target user exists before trying
  const { data: targetUser, error: lookupError } = await admin.auth.admin.getUserById(id);
  if (lookupError) {
    return NextResponse.json({ error: `Lookup failed: ${lookupError.message}` }, { status: 500 });
  }
  if (!targetUser?.user) {
    return NextResponse.json({ error: `No auth user found with id ${id}` }, { status: 404 });
  }

  // Explicitly delete each layer
  const { error: linksError } = await admin.from("parent_camper_links").delete().eq("parent_id", id);
  if (linksError) return NextResponse.json({ error: `Links delete failed: ${linksError.message}` }, { status: 500 });

  const { error: profileError } = await admin.from("users").delete().eq("id", id);
  if (profileError) return NextResponse.json({ error: `Profile delete failed: ${profileError.message}` }, { status: 500 });

  const { error: authError } = await admin.auth.admin.deleteUser(id);
  if (authError) return NextResponse.json({ error: `Auth delete failed: ${authError.message}` }, { status: 500 });

  // Confirm it's actually gone
  const { data: confirm } = await admin.auth.admin.getUserById(id);
  if (confirm?.user) {
    return NextResponse.json({ error: "Delete appeared to succeed but user still exists in auth" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
