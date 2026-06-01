import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getAdminSessionId } from "@/lib/admin-session";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!profile || !["director", "administrator"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sessionId = await getAdminSessionId();
    if (!sessionId) return NextResponse.json({ events: [], leaderboard: {}, cabinColors: [], cabins: [] });

    // Use admin client for competition tables — RLS enabled, no read policies
    const admin = await createAdminClient();

    const [eventsRes, scoresRes, cabinColorsRes, campersRes] = await Promise.all([
      admin
        .from("competition_events")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false }),
      admin
        .from("competition_scores")
        .select("*")
        .eq("session_id", sessionId),
      admin
        .from("competition_cabin_colors")
        .select("cabin_name, color")
        .eq("session_id", sessionId),
      supabase
        .from("campers")
        .select("cabin")
        .eq("session_id", sessionId)
        .not("cabin", "is", null),
    ]);

    const events = eventsRes.data ?? [];
    const scores = scoresRes.data ?? [];
    const cabinColors = cabinColorsRes.data ?? [];

    // Attach scores to events
    const eventsWithScores = events.map(e => ({
      ...e,
      scores: scores.filter(s => s.event_id === e.id),
    }));

    // Build leaderboard
    const leaderboard: Record<string, number> = { blue: 0, red: 0, green: 0, yellow: 0 };
    for (const s of scores) {
      leaderboard[s.color] = (leaderboard[s.color] ?? 0) + Number(s.points);
    }

    // Unique cabin names
    const cabins = [...new Set((campersRes.data ?? []).map(c => c.cabin).filter(Boolean))].sort();

    return NextResponse.json({ events: eventsWithScores, leaderboard, cabinColors, cabins });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
