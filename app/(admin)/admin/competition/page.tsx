import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getAdminSessionId } from "@/lib/admin-session";
import AppShell from "@/components/AppShell";
import CompetitionPanel from "@/components/admin/CompetitionPanel";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CompetitionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director", "administrator"].includes(profile.role)) redirect("/admin");

  const sessionId = await getAdminSessionId();

  if (!sessionId) {
    return (
      <AppShell role={profile.role} userName={profile.name}>
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🏆</div>
          <p className="font-medium">No session selected.</p>
          <p className="text-sm mt-1">Use the session switcher in the sidebar to select a session.</p>
          <Link href="/admin/session" className="mt-4 inline-block text-jubilee-navy underline text-sm">Manage Sessions →</Link>
        </div>
      </AppShell>
    );
  }

  // Use admin client for competition tables — RLS is enabled on these tables
  // and there are no read policies; auth is already verified above.
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
  const cabins = [...new Set((campersRes.data ?? []).map((c: { cabin: string }) => c.cabin).filter(Boolean))].sort() as string[];

  // Build leaderboard
  const leaderboard: Record<string, number> = { blue: 0, red: 0, green: 0, yellow: 0 };
  for (const s of scores) {
    leaderboard[s.color] = (leaderboard[s.color] ?? 0) + Number(s.points);
  }

  // Attach scores to events
  const eventsWithScores = events.map(e => ({
    ...e,
    scores: scores.filter(s => s.event_id === e.id),
  }));

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <CompetitionPanel
        sessionId={sessionId}
        role={profile.role}
        initialEvents={eventsWithScores}
        initialLeaderboard={leaderboard}
        initialCabinColors={cabinColors}
        availableCabins={cabins}
      />
    </AppShell>
  );
}
