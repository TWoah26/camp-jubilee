import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSessionId } from "@/lib/admin-session";
import AppShell from "@/components/AppShell";
import ParentList from "@/components/admin/ParentList";

export const dynamic = "force-dynamic";

export default async function AdminParentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director","administrator"].includes(profile.role)) redirect("/dashboard");

  const selectedSessionId = await getAdminSessionId();

  // If a session is selected, limit to campers in that session
  let camperIdFilter: string[] | null = null;
  if (selectedSessionId) {
    const { data: sessionCampers } = await supabase.from("campers").select("id").eq("session_id", selectedSessionId);
    camperIdFilter = (sessionCampers ?? []).map((c: any) => c.id);
  }

  const linksQuery = supabase
    .from("parent_camper_links")
    .select("*, parent:users(id, name, email), camper:campers(id, first_name, last_name)")
    .order("linked_at", { ascending: false });

  const { data: links } = await (camperIdFilter ? linksQuery.in("camper_id", camperIdFilter) : linksQuery);

  const camperQuery = supabase.from("campers").select("id, first_name, last_name").order("last_name");
  const { data: campers } = await (selectedSessionId ? camperQuery.eq("session_id", selectedSessionId) : camperQuery);

  const { data: parents } = await supabase.from("users").select("id, name, email").eq("role", "parent").order("name");

  const { data: sessions } = await supabase.from("sessions").select("id, name").order("start_date", { ascending: true });

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-jubilee-green-dark">
          Parent Accounts{selectedSessionId && sessions ? ` — ${sessions.find(s => s.id === selectedSessionId)?.name ?? ""}` : ""}
        </h1>
        <ParentList links={links ?? []} campers={campers ?? []} parents={parents ?? []} />
      </div>
    </AppShell>
  );
}
