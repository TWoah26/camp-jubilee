import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import { formatDateTime } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import TuitionMultiForm from "@/components/TuitionMultiForm";
import AddFundsMultiForm from "@/components/AddFundsMultiForm";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { data: links } = await supabase
    .from("parent_camper_links")
    .select("*, camper:campers(*)")
    .eq("parent_id", user.id)
    .eq("approved", true);

  // All upcoming + active sessions (not closed)
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("session_closed", false)
    .order("start_date", { ascending: true });

  // Get all camper IDs this parent is linked to
  const camperIds = (links ?? []).map((l: any) => l.camper.id);

  const { data: tuitionPayments } = await supabase
    .from("tuition_payments")
    .select("*")
    .in("camper_id", camperIds.length > 0 ? camperIds : ["none"])
    .order("paid_at", { ascending: false });

  // Track payments per camper+session independently
  const paidByCamperSession: Record<string, number> = {};
  for (const p of tuitionPayments ?? []) {
    const key = `${p.camper_id}__${p.session_id ?? "__none__"}`;
    paidByCamperSession[key] = (paidByCamperSession[key] ?? 0) + p.amount;
  }

  const allLinked = (links ?? []).map((l: any) => l.camper);
  const campers = allLinked.filter((c: any) => !c.is_staff);

  // Group non-staff campers by their registered session
  const campersBySession: Record<string, any[]> = {};
  for (const camper of campers) {
    if (camper.session_id) {
      if (!campersBySession[camper.session_id]) campersBySession[camper.session_id] = [];
      campersBySession[camper.session_id].push(camper);
    }
  }

  // Only show sessions that this parent has campers in
  const relevantSessions = (sessions ?? []).filter(
    (s: any) => (campersBySession[s.id] ?? []).length > 0
  );

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-jubilee-navy">Payments</h1>

        {/* Registration Fees — one card per session, per-camper tracking */}
        {relevantSessions.length > 0 ? (
          <div className="space-y-4">
            <h2 className="font-semibold text-jubilee-navy">Registration Fees</h2>
            {relevantSessions.map((session: any) => {
              const sessionCampers = campersBySession[session.id] ?? [];
              return (
                <div key={session.id} className="bg-white rounded-2xl shadow p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-jubilee-navy">{session.name}</h3>
                      {session.start_date && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {session.start_date}{session.end_date ? ` – ${session.end_date}` : ""}
                        </p>
                      )}
                    </div>
                    {session.is_active && (
                      <span className="text-xs bg-jubilee-green/10 text-jubilee-green font-medium px-2 py-0.5 rounded-full">In Session</span>
                    )}
                  </div>
                  <TuitionMultiForm
                    sessionId={session.id}
                    parentId={user.id}
                    campers={sessionCampers.map((camper: any) => ({
                      id: camper.id,
                      first_name: camper.first_name,
                      last_name: camper.last_name,
                      session_id: session.id,
                      tuition_commitment: camper.tuition_commitment ?? 0,
                      amountPaid: paidByCamperSession[`${camper.id}__${session.id}`] ?? 0,
                      sessionTuitionAmount: session.tuition_amount ?? 0,
                    }))}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-gray-500">No upcoming sessions at this time.</p>
          </div>
        )}

        {/* Store Account Funding — hidden after session closes to prevent post-close top-ups */}
        {allLinked.length > 0 && (sessions ?? []).length > 0 && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-jubilee-navy mb-4">Store Accounts</h2>
            <AddFundsMultiForm campers={allLinked} parentId={user.id} />
          </div>
        )}

        {/* Payment History */}
        {tuitionPayments && tuitionPayments.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-jubilee-navy mb-3">Payment History</h2>
            <div className="space-y-2">
              {tuitionPayments.map((p: any) => (
                <div key={p.id} className="flex justify-between py-2 border-b last:border-0 text-sm">
                  <div>
                    <p className="font-medium">Registration fee payment</p>
                    <p className="text-gray-400 text-xs">{formatDateTime(p.paid_at)}</p>
                  </div>
                  <span className="font-semibold text-jubilee-green">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
