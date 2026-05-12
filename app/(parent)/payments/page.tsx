import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import { formatDateTime } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import PaymentButtons from "@/components/PaymentButtons";
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

  const { data: tuitionPayments } = await supabase
    .from("tuition_payments")
    .select("*")
    .eq("parent_id", user.id)
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
                  <div className="space-y-4">
                    {sessionCampers.map((camper: any) => {
                      const amountPaid = paidByCamperSession[`${camper.id}__${session.id}`] ?? 0;
                      return (
                        <div key={camper.id}>
                          {sessionCampers.length > 1 && (
                            <p className="text-sm font-medium text-jubilee-navy mb-2">
                              {camper.first_name} {camper.last_name}
                            </p>
                          )}
                          <PaymentButtons
                            campers={[camper]}
                            sessionId={session.id}
                            parentId={user.id}
                            depositAmount={session.deposit_amount}
                            tuitionAmount={camper.tuition_commitment > 0 ? camper.tuition_commitment : session.tuition_amount}
                            amountPaid={amountPaid}
                          />
                          {sessionCampers.indexOf(camper) < sessionCampers.length - 1 && (
                            <div className="border-t border-gray-100 mt-4" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-gray-500">No upcoming sessions at this time.</p>
          </div>
        )}

        {/* Store Account Funding — campers + staff together */}
        {allLinked.length > 0 && (
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
