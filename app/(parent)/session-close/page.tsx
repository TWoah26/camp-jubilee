import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import SessionCloseChoice from "@/components/SessionCloseChoice";

export default async function SessionClosePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { data: session } = await supabase.from("sessions").select("*").eq("session_closed", true).order("created_at", { ascending: false }).limit(1).single();
  if (!session) redirect("/dashboard");

  const { data: links } = await supabase
    .from("parent_camper_links")
    .select("camper:campers(id, first_name, last_name, store_balance, session_id, is_staff)")
    .eq("parent_id", user.id)
    .eq("approved", true);

  const { data: existingChoices } = await supabase
    .from("session_balance_choices")
    .select("camper_id")
    .eq("parent_id", user.id)
    .eq("session_id", session.id);

  const chosenCamperIds = new Set((existingChoices ?? []).map((c: any) => c.camper_id));
  const campers = (links ?? [])
    .map((l: any) => l.camper)
    .filter((c: any) => {
      if (c.store_balance <= 0) return false;
      if (chosenCamperIds.has(c.id)) return false;
      // Only show campers registered for this specific session (staff see all sessions)
      if (!c.is_staff && c.session_id !== session.id) return false;
      return true;
    });

  if (campers.length === 0) redirect("/dashboard");

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-jubilee-green-dark">Session Ended</h1>
          <p className="text-gray-600 mt-1">{session.name} has concluded. Please choose what to do with remaining store balances.</p>
        </div>
        <SessionCloseChoice campers={campers} sessionId={session.id} parentId={user.id} />
      </div>
    </AppShell>
  );
}
