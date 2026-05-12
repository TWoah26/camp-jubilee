import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSessionId } from "@/lib/admin-session";
import AppShell from "@/components/AppShell";
import MessageInbox from "@/components/admin/MessageInbox";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director","administrator"].includes(profile.role)) redirect("/dashboard");

  const selectedSessionId = await getAdminSessionId();

  let camperIdFilter: string[] | null = null;
  if (selectedSessionId) {
    const { data: sessionCampers } = await supabase.from("campers").select("id").eq("session_id", selectedSessionId);
    camperIdFilter = (sessionCampers ?? []).map((c: any) => c.id);
  }

  const msgQuery = supabase
    .from("messages")
    .select("*, from_parent:users(name), to_camper:campers(first_name, last_name)")
    .order("sent_at", { ascending: false });

  const { data: messages } = await (camperIdFilter ? msgQuery.in("to_camper_id", camperIdFilter) : msgQuery);

  const { data: sessions } = await supabase.from("sessions").select("id, name").order("start_date", { ascending: true });

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-jubilee-green-dark">
          Message Inbox{selectedSessionId && sessions ? ` — ${sessions.find(s => s.id === selectedSessionId)?.name ?? ""}` : ""}
        </h1>
        <MessageInbox messages={messages ?? []} />
      </div>
    </AppShell>
  );
}
