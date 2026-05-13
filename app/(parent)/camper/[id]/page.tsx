import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import MessageComposer from "@/components/MessageComposer";
import CamperProfilePhotoUpload from "@/components/CamperProfilePhotoUpload";
import MedicalInfoForm from "@/components/MedicalInfoForm";

export default async function CamperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { data: link } = await supabase
    .from("parent_camper_links")
    .select("*, camper:campers(*, session:sessions(name))")
    .eq("parent_id", user.id)
    .eq("camper_id", id)
    .eq("approved", true)
    .single();

  if (!link) notFound();

  const camper = link.camper;

  // Fetch the camper's own session; fall back to any active session if not assigned
  let session = null;
  if (camper.session_id) {
    const { data: sessionRow } = await supabase
      .from("sessions")
      .select("show_cabin_info, is_active, session_closed, tuition_amount")
      .eq("id", camper.session_id)
      .single();
    session = sessionRow ?? null;
  }
  // If no session found (staff, or camper without session_id), use any active session
  if (!session) {
    const { data: sessionRows } = await supabase
      .from("sessions")
      .select("show_cabin_info, is_active, session_closed, tuition_amount")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);
    session = sessionRows?.[0] ?? null;
  }

  const { data: transactions } = await supabase
    .from("store_transactions")
    .select("*")
    .eq("camper_id", camper.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: tuitionPayments } = await supabase
    .from("tuition_payments")
    .select("*")
    .eq("camper_id", camper.id)
    .order("paid_at", { ascending: false });

  const { data: photoTags } = await supabase
    .from("photo_tags")
    .select("photo:photos(id, url, caption, date_taken)")
    .eq("camper_id", camper.id)
    .order("created_at", { ascending: false });

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("from_parent_id", user.id)
    .eq("to_camper_id", camper.id)
    .order("sent_at", { ascending: false });

  const [{ data: medicalInfo }, { data: medicationsData }] = await Promise.all([
    supabase.from("medical_info").select("*").eq("camper_id", camper.id).single(),
    supabase.from("medications").select("*").eq("camper_id", camper.id).order("created_at"),
  ]);

  const showCabinInfo = session?.show_cabin_info ?? false;
  const sessionTuitionAmount = (session as any)?.tuition_amount ?? 0;
  const effectiveCommitment = camper.tuition_commitment > 0 ? camper.tuition_commitment : sessionTuitionAmount;
  const totalPaid = (tuitionPayments ?? []).reduce((sum: number, p: any) => sum + p.amount, 0);
  const balanceDue = Math.max(0, effectiveCommitment - totalPaid);

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-jubilee-navy hover:underline text-sm">← Back</Link>
          <h1 className="text-2xl font-bold text-jubilee-navy">
            {camper.first_name} {camper.last_name}
          </h1>
          {camper.is_staff && (
            <span className="text-xs bg-jubilee-gold text-white px-2 py-0.5 rounded-full font-medium">Staff</span>
          )}
        </div>

        {/* Profile Photo */}
        <div className="bg-white rounded-2xl shadow p-5 flex items-center gap-6">
          <CamperProfilePhotoUpload
            camperId={camper.id}
            camperName={`${camper.first_name} ${camper.last_name}`}
            currentPhotoUrl={camper.photo_url}
          />
          <div>
            <p className="font-semibold text-jubilee-navy text-lg">{camper.first_name} {camper.last_name}</p>
            <p className="text-sm text-gray-500 mt-0.5">Upload a profile photo so staff can greet {camper.first_name} when they arrive.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-jubilee-navy mb-3">Camper Info</h2>
            <dl className="space-y-2 text-sm">
              {(camper as any).session?.name && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Session</dt>
                  <dd className="font-medium text-jubilee-gold">{(camper as any).session.name}</dd>
                </div>
              )}
              {camper.is_staff && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Role</dt>
                  <dd className="font-medium">Staff — All Sessions</dd>
                </div>
              )}
              {camper.dob && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Date of Birth</dt>
                  <dd className="font-medium">{formatDate(camper.dob)}</dd>
                </div>
              )}
              {showCabinInfo && camper.cabin && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Cabin</dt>
                  <dd className="font-medium">{camper.cabin}</dd>
                </div>
              )}
              {showCabinInfo && camper.counselor_name && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Counselor</dt>
                  <dd className="font-medium">{camper.counselor_name}</dd>
                </div>
              )}
              {!showCabinInfo && (
                <p className="text-gray-400 italic text-xs">Cabin info will be revealed by the director</p>
              )}
            </dl>
          </div>

          <div className="bg-jubilee-navy rounded-2xl shadow p-5 text-white">
            <h2 className="font-semibold mb-1">Store Balance</h2>
            <p className="text-4xl font-bold">{formatCurrency(camper.store_balance)}</p>
            <Link href="/payments" className="mt-3 inline-block bg-white text-jubilee-navy px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-jubilee-cream">
              Add Funds →
            </Link>
          </div>

          {effectiveCommitment > 0 && (
            <div className={`rounded-2xl shadow p-5 ${balanceDue > 0 ? "bg-jubilee-coral" : "bg-jubilee-green"} text-white`}>
              <h2 className="font-semibold mb-1">Registration Fee</h2>
              <p className="text-4xl font-bold">{formatCurrency(balanceDue)}</p>
              <p className="text-sm mt-1 text-white/80">
                {balanceDue > 0 ? `${formatCurrency(totalPaid)} paid of ${formatCurrency(effectiveCommitment)}` : "Paid in full ✓"}
              </p>
              {balanceDue > 0 && (
                <Link href="/payments" className="mt-3 inline-block bg-white text-jubilee-coral px-4 py-1.5 rounded-lg text-sm font-medium">
                  Make Payment →
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-jubilee-navy mb-3">Store Transactions</h2>
          {(!transactions || transactions.length === 0) ? (
            <p className="text-gray-500 text-sm">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{tx.type === "credit" ? "Funds added" : "Purchase"}</p>
                    <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                  </div>
                  <span className={`font-semibold text-sm ${tx.type === "credit" ? "text-jubilee-green" : "text-red-500"}`}>
                    {tx.type === "credit" ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {tuitionPayments && tuitionPayments.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-jubilee-navy mb-3">Registration Fee Payments</h2>
            <div className="space-y-2">
              {tuitionPayments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">Registration fee payment</p>
                    <p className="text-xs text-gray-400">{formatDate(p.paid_at)}</p>
                  </div>
                  <span className="font-semibold text-sm text-jubilee-green">+{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-jubilee-navy mb-4">Send a Message</h2>
          {session?.is_active ? (
            <MessageComposer
              campers={[{ id: camper.id, first_name: camper.first_name, last_name: camper.last_name }]}
              parentId={user.id}
            />
          ) : (
            <p className="text-sm text-gray-400 italic">Messaging opens when camp session is active.</p>
          )}
          {messages && messages.length > 0 && (
            <div className="mt-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Sent Messages</h3>
              {messages.map((msg: any) => (
                <div key={msg.id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs text-gray-400">{formatDateTime(msg.sent_at)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${msg.status === "delivered" ? "bg-jubilee-green/10 text-jubilee-green" : "bg-gray-100 text-gray-500"}`}>
                      {msg.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{msg.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-jubilee-navy mb-1">Medical Information</h2>
          <p className="text-xs text-gray-400 mb-4">This information is only visible to you and camp directors. Keep it up to date before camp begins.</p>
          <MedicalInfoForm
            camperId={camper.id}
            camperName={camper.first_name}
            initialMedical={medicalInfo ?? {}}
            initialMedications={medicationsData ?? []}
          />
        </div>
      </div>
    </AppShell>
  );
}
