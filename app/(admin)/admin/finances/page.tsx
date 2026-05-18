import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSessionId } from "@/lib/admin-session";
import AppShell from "@/components/AppShell";
import FinancesPanel from "@/components/admin/FinancesPanel";
import BalanceReminderButton from "@/components/admin/BalanceReminderButton";

export const dynamic = "force-dynamic";

export default async function AdminFinancesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director","administrator"].includes(profile.role)) redirect("/dashboard");

  const selectedSessionId = await getAdminSessionId();

  const [
    { data: storeTransactions },
    { data: tuitionPayments },
    { data: balanceChoices },
    { data: sessions },
    { data: campers },
    { data: parents },
  ] = await Promise.all([
    supabase.from("store_transactions").select("*, camper:campers(first_name, last_name), staff:users(name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("tuition_payments").select("*, camper:campers(first_name, last_name), parent:users(name)").order("paid_at", { ascending: false }).limit(100),
    supabase.from("session_balance_choices").select("*, camper:campers(first_name, last_name), parent:users(name)").order("chosen_at", { ascending: false }),
    supabase.from("sessions").select("*").order("start_date", { ascending: true }),
    supabase.from("campers").select("id, first_name, last_name").order("first_name"),
    supabase.from("users").select("id, name").eq("role", "parent").order("name"),
  ]);

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-jubilee-green-dark">Finances</h1>
          <BalanceReminderButton />
        </div>
        <FinancesPanel
          storeTransactions={storeTransactions ?? []}
          tuitionPayments={tuitionPayments ?? []}
          balanceChoices={balanceChoices ?? []}
          sessions={sessions ?? []}
          campers={campers ?? []}
          parents={parents ?? []}
          defaultSessionId={selectedSessionId}
        />
      </div>
    </AppShell>
  );
}
