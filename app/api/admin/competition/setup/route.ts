import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminSessionId } from "@/lib/admin-session";
import { NextResponse } from "next/server";

async function authCheck() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["director", "administrator"].includes(profile.role)) return { error: "Forbidden", status: 403 };
  return { ok: true };
}

// GET — return cabin names + existing color assignments for this session
export async function GET() {
  try {
    const auth = await authCheck();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = await createClient();
    const sessionId = await getAdminSessionId();
    if (!sessionId) return NextResponse.json({ cabins: [], assignments: [] });

    const admin = await createAdminClient();
    const [campersRes, assignmentsRes] = await Promise.all([
      supabase
        .from("campers")
        .select("cabin")
        .eq("session_id", sessionId)
        .not("cabin", "is", null),
      admin
        .from("competition_cabin_colors")
        .select("cabin_name, color")
        .eq("session_id", sessionId),
    ]);

    const cabins = [...new Set((campersRes.data ?? []).map(c => c.cabin).filter(Boolean))].sort();
    const assignments = assignmentsRes.data ?? [];

    return NextResponse.json({ cabins, assignments });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — upsert cabin-to-color assignments
export async function POST(req: Request) {
  try {
    const auth = await authCheck();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const sessionId = await getAdminSessionId();
    if (!sessionId) return NextResponse.json({ error: "No session selected" }, { status: 400 });

    const { assignments } = await req.json();
    if (!Array.isArray(assignments)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const admin = await createAdminClient();

    const rows = assignments.map((a: { cabin_name: string; color: string }) => ({
      session_id: sessionId,
      cabin_name: a.cabin_name,
      color: a.color,
    }));

    const { error } = await admin
      .from("competition_cabin_colors")
      .upsert(rows, { onConflict: "session_id,cabin_name" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
