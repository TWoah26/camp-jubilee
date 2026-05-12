import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSessionId } from "@/lib/admin-session";
import AppShell from "@/components/AppShell";
import CamperRoster from "@/components/admin/CamperRoster";

export const dynamic = "force-dynamic";

export default async function AdminCampersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director","administrator"].includes(profile.role)) redirect("/dashboard");

  const { search: initialSearch } = await searchParams;
  const selectedSessionId = await getAdminSessionId();

  // Campers: session-filtered (bypass filter when searching across all sessions)
  const camperQuery = supabase
    .from("campers")
    .select("*, session:sessions(name)")
    .eq("is_staff", false)
    .order("last_name");

  const { data: campers } = await (selectedSessionId && !initialSearch
    ? camperQuery.eq("session_id", selectedSessionId)
    : camperQuery);

  // Staff: always all sessions, no session filter
  const { data: staff } = await supabase
    .from("campers")
    .select("*, session:sessions(name)")
    .eq("is_staff", true)
    .order("last_name");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name")
    .order("start_date", { ascending: true });

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-jubilee-green-dark">
          {initialSearch
            ? `Search: "${initialSearch}"`
            : `Roster${selectedSessionId && sessions ? ` — ${sessions.find(s => s.id === selectedSessionId)?.name ?? ""}` : ""}`}
        </h1>
        <CamperRoster
          campers={campers ?? []}
          staff={staff ?? []}
          sessions={sessions ?? []}
          initialSearch={initialSearch ?? ""}
        />
      </div>
    </AppShell>
  );
}
