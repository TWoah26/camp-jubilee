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
  return { ok: true, userId: user.id };
}

// POST — add a new competition activity
export async function POST(req: Request) {
  try {
    const auth = await authCheck();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const sessionId = await getAdminSessionId();
    if (!sessionId) return NextResponse.json({ error: "No session selected" }, { status: 400 });

    const { name, type, category, scores } = await req.json();
    if (!name || !type || !Array.isArray(scores)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const admin = await createAdminClient();

    const { data: event, error: eventErr } = await admin
      .from("competition_events")
      .insert({ session_id: sessionId, name, type, category: category || null, created_by: auth.userId })
      .select()
      .single();

    if (eventErr || !event) return NextResponse.json({ error: eventErr?.message ?? "Failed to create event" }, { status: 500 });

    const scoreRows = scores.map((s: { color: string; points: number; cabin_name?: string; note?: string }) => ({
      event_id: event.id,
      session_id: sessionId,
      color: s.color,
      points: s.points,
      cabin_name: s.cabin_name ?? null,
      note: s.note ?? null,
    }));

    const { error: scoresErr } = await admin.from("competition_scores").insert(scoreRows);
    if (scoresErr) return NextResponse.json({ error: scoresErr.message }, { status: 500 });

    // Return full event with scores
    const { data: fullScores } = await admin.from("competition_scores").select("*").eq("event_id", event.id);
    return NextResponse.json({ success: true, event: { ...event, scores: fullScores ?? [] } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE — remove an activity (scores cascade)
export async function DELETE(req: Request) {
  try {
    const auth = await authCheck();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const admin = await createAdminClient();
    const { error } = await admin.from("competition_events").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
