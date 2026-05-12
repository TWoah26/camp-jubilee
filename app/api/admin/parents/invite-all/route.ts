import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST — invite all campers that have parent_email but no linked account
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!["director", "administrator"].includes(profile?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { session_id } = await req.json();
    const admin = await createAdminClient();

    // Get all campers with a parent_email in the given session (or all if no session)
    let query = supabase.from("campers").select("id, first_name, last_name, parent_email, parent_name").not("parent_email", "is", null);
    if (session_id) query = query.eq("session_id", session_id) as any;
    const { data: campers } = await query;
    if (!campers?.length) return NextResponse.json({ invited: 0, skipped: 0 });

    // Get all existing approved links so we skip already-linked campers
    const camperIds = campers.map(c => c.id);
    const { data: existingLinks } = await admin.from("parent_camper_links").select("camper_id").eq("approved", true).in("camper_id", camperIds);
    const linkedCamperIds = new Set((existingLinks ?? []).map((l: any) => l.camper_id));

    const toInvite = campers.filter(c => c.parent_email && !linkedCamperIds.has(c.id));
    if (!toInvite.length) return NextResponse.json({ invited: 0, skipped: campers.length });

    // Fetch all existing auth users once
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const authByEmail = Object.fromEntries((existingUsers?.users ?? []).map(u => [u.email?.toLowerCase(), u]));

    let invited = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const camper of toInvite) {
      const email = camper.parent_email!.toLowerCase();
      const name = camper.parent_name || email;
      try {
        let parentUserId: string | null = null;
        const existing = authByEmail[email];

        if (existing) {
          const { data: existingProfile } = await admin.from("users").select("id").eq("id", existing.id).maybeSingle();
          if (!existingProfile) {
            await admin.from("users").insert({ id: existing.id, email, name, role: "parent" });
          }
          parentUserId = existing.id;
          skipped++;
        } else {
          const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
            data: { name, role: "parent" },
          });
          if (invErr || !inv?.user) { errors.push(`${email}: ${invErr?.message ?? "failed"}`); continue; }
          await admin.from("users").insert({ id: inv.user.id, email, name, role: "parent" });
          parentUserId = inv.user.id;
          invited++;
        }

        if (parentUserId) {
          await admin.from("parent_camper_links").upsert(
            { parent_id: parentUserId, camper_id: camper.id, approved: true },
            { onConflict: "parent_id,camper_id" }
          );
        }
      } catch (e) {
        errors.push(`${email}: ${String(e)}`);
      }
    }

    return NextResponse.json({ invited, skipped, errors });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
