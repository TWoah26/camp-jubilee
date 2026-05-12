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
  const { data: sessions } = await supabase.from("sessions").select("id, name").order("start_date", { ascending: true });

  // All campers (filtered by session if selected)
  let camperQuery = supabase
    .from("campers")
    .select("id, first_name, last_name, parent_email, parent_name, session_id")
    .eq("is_staff", false)
    .order("last_name");
  if (selectedSessionId) camperQuery = camperQuery.eq("session_id", selectedSessionId) as any;
  const { data: campers } = await camperQuery;

  // All approved links for those campers
  const camperIds = (campers ?? []).map((c: any) => c.id);
  const { data: links } = await supabase
    .from("parent_camper_links")
    .select("*, parent:users(id, name, email), camper:campers(id, first_name, last_name)")
    .in("camper_id", camperIds.length > 0 ? camperIds : ["none"])
    .order("linked_at", { ascending: false });

  // All parent users (for manual link dropdown)
  const { data: parents } = await supabase.from("users").select("id, name, email").eq("role", "parent").order("name");

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-jubilee-green-dark">
          Parent Directory{selectedSessionId && sessions ? ` — ${sessions.find((s: any) => s.id === selectedSessionId)?.name ?? ""}` : ""}
        </h1>
        <ParentList
          campers={campers ?? []}
          links={links ?? []}
          parents={parents ?? []}
          selectedSessionId={selectedSessionId ?? null}
        />
      </div>
    </AppShell>
  );
}
