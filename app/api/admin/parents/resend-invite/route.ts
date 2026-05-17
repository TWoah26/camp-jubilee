import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!["director", "administrator"].includes(profile?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { parent_id } = await req.json();
  if (!parent_id) return NextResponse.json({ error: "Missing parent_id" }, { status: 400 });

  const admin = await createAdminClient();

  const { data: parentProfile } = await admin.from("users").select("email, name").eq("id", parent_id).single();
  if (!parentProfile) return NextResponse.json({ error: "Parent not found" }, { status: 404 });

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.campjubilee.org";
  const { error } = await admin.auth.admin.inviteUserByEmail(parentProfile.email, {
    data: { name: parentProfile.name, role: "parent" },
    redirectTo: `${siteUrl}/auth/accept-invite`,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
