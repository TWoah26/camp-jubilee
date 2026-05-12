import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import SessionForm from "@/components/admin/SessionForm";

export default async function AdminSessionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director","administrator"].includes(profile.role)) redirect("/dashboard");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .order("start_date", { ascending: true });

  // Per-session enrollment and revenue from tuition_payments
  const { data: payments } = await supabase
    .from("tuition_payments")
    .select("session_id, camper_id, amount");

  // Build stats map: session_id -> { revenue, camperCount }
  const statsMap: Record<string, { revenue: number; camperIds: Set<string> }> = {};
  for (const p of payments ?? []) {
    const key = p.session_id;
    if (!key) continue;
    if (!statsMap[key]) statsMap[key] = { revenue: 0, camperIds: new Set() };
    statsMap[key].revenue += p.amount;
    statsMap[key].camperIds.add(p.camper_id);
  }

  // Serialize for client (Sets aren't JSON-serializable)
  const sessionStats: Record<string, { revenue: number; camperCount: number }> = {};
  for (const [key, val] of Object.entries(statsMap)) {
    sessionStats[key] = { revenue: val.revenue, camperCount: val.camperIds.size };
  }

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-jubilee-green-dark">Session Management</h1>
        <SessionForm sessions={sessions ?? []} sessionStats={sessionStats} />
      </div>
    </AppShell>
  );
}
