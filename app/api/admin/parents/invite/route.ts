import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST — invite a single parent email for a camper (or mass invite if no camper_id provided)
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!["director", "administrator"].includes(profile?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { camper_id, email, name } = await req.json();
    if (!camper_id || !email) return NextResponse.json({ error: "Missing camper_id or email" }, { status: 400 });

    const admin = await createAdminClient();

    // Check if user already exists — getUserByEmail is exact and doesn't paginate
    const { data: existingUserData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existingAuthUser = existingUserData?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let parentUserId: string | null = null;

    if (existingAuthUser) {
      // Already has an account — just ensure profile + link exist
      const { data: existingProfile } = await admin.from("users").select("id").eq("id", existingAuthUser.id).maybeSingle();
      if (!existingProfile) {
        await admin.from("users").insert({ id: existingAuthUser.id, email: email.toLowerCase(), name: name || email, role: "parent" });
      }
      parentUserId = existingAuthUser.id;
    } else {
      // Invite new user
      const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.campjubilee.org";
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email.toLowerCase(), {
        data: { name: name || email, role: "parent" },
        redirectTo: `${siteUrl}/auth/accept-invite`,
      });
      if (inviteError || !invited?.user) {
        return NextResponse.json({ error: inviteError?.message ?? "Invite failed" }, { status: 500 });
      }
      await admin.from("users").insert({ id: invited.user.id, email: email.toLowerCase(), name: name || email, role: "parent" });
      parentUserId = invited.user.id;
    }

    // Upsert link
    if (parentUserId) {
      await admin.from("parent_camper_links").upsert(
        { parent_id: parentUserId, camper_id, approved: false },
        { onConflict: "parent_id,camper_id" }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
