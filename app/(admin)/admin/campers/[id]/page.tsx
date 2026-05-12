import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import CamperFinanceSection from "@/components/admin/CamperFinanceSection";

const TIME_LABELS: Record<string, string> = {
  breakfast: "☀️ Breakfast",
  lunch: "🌤️ Lunch",
  dinner: "🌅 Dinner",
  bedtime: "🌙 Bedtime",
  as_needed: "⚡ As Needed",
};

export default async function AdminCamperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director","administrator"].includes(profile.role)) redirect("/dashboard");

  const { data: camper } = await supabase
    .from("campers")
    .select("*, session:sessions(id, name, tuition_amount)")
    .eq("id", id)
    .single();

  if (!camper) notFound();

  const [
    { data: tuitionPayments },
    { data: storeTransactions },
    { data: medicalInfo },
    { data: medications },
    { data: parentLinks },
  ] = await Promise.all([
    supabase.from("tuition_payments").select("*").eq("camper_id", id).order("paid_at", { ascending: false }),
    supabase.from("store_transactions").select("*").eq("camper_id", id).order("created_at", { ascending: false }),
    supabase.from("medical_info").select("*").eq("camper_id", id).single(),
    supabase.from("medications").select("*").eq("camper_id", id).order("created_at"),
    supabase
      .from("parent_camper_links")
      .select("*, parent:users(id, name, email)")
      .eq("camper_id", id)
      .eq("approved", true),
  ]);

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/campers" className="text-jubilee-navy hover:underline text-sm">← Roster</Link>
          <div className="flex items-center gap-3">
            {camper.photo_url ? (
              <img src={camper.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-jubilee-green-light flex items-center justify-center text-white font-bold text-lg">
                {camper.first_name[0]}{camper.last_name[0]}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-jubilee-navy">{camper.first_name} {camper.last_name}</h1>
              <div className="flex gap-2 mt-0.5">
                {camper.is_staff && <span className="text-xs bg-jubilee-gold text-white px-2 py-0.5 rounded-full">Staff</span>}
                {(camper as any).session?.name && <span className="text-xs bg-jubilee-navy/10 text-jubilee-navy px-2 py-0.5 rounded-full">{(camper as any).session.name}</span>}
                {camper.cabin && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Cabin: {camper.cabin}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Camper details */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-jubilee-navy mb-3">Camper Info</h2>
            <dl className="space-y-2 text-sm">
              {camper.dob && (
                <div className="flex justify-between"><dt className="text-gray-500">Date of Birth</dt><dd className="font-medium">{formatDate(camper.dob)}</dd></div>
              )}
              {camper.cabin && (
                <div className="flex justify-between"><dt className="text-gray-500">Cabin</dt><dd className="font-medium">{camper.cabin}</dd></div>
              )}
              {camper.counselor_name && (
                <div className="flex justify-between"><dt className="text-gray-500">Counselor</dt><dd className="font-medium">{camper.counselor_name}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-gray-500">Camper Code</dt><dd className="font-mono text-xs text-gray-600">{camper.camper_code}</dd></div>
            </dl>
          </div>

        </div>

        {/* Parents linked */}
        {parentLinks && parentLinks.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-jubilee-navy mb-3">Linked Parents</h2>
            <div className="space-y-2">
              {parentLinks.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-sm font-medium">{l.parent?.name}</p>
                    <p className="text-xs text-gray-400">{l.parent?.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <CamperFinanceSection
          camperId={camper.id}
          sessionId={camper.session_id ?? null}
          initialBalance={camper.store_balance}
          initialTransactions={storeTransactions ?? []}
          initialPayments={tuitionPayments ?? []}
          sessionTuitionAmount={(camper as any).session?.tuition_amount ?? 0}
          initialTuitionCommitment={camper.tuition_commitment ?? 0}
        />

        {/* Medical info */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-jubilee-navy mb-1">Medical Information</h2>
          {!medicalInfo ? (
            <p className="text-sm text-gray-400 mt-2">Parent has not submitted medical information yet.</p>
          ) : (
            <div className="space-y-4 mt-3">
              {/* Emergency contacts */}
              {(medicalInfo.emergency_contact_1_name || medicalInfo.emergency_contact_2_name) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🚨 Emergency Contacts</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    {medicalInfo.emergency_contact_1_name && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="font-medium">{medicalInfo.emergency_contact_1_name} <span className="text-gray-400 font-normal">({medicalInfo.emergency_contact_1_relationship})</span></p>
                        <p className="text-jubilee-navy">{medicalInfo.emergency_contact_1_phone}</p>
                      </div>
                    )}
                    {medicalInfo.emergency_contact_2_name && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="font-medium">{medicalInfo.emergency_contact_2_name} <span className="text-gray-400 font-normal">({medicalInfo.emergency_contact_2_relationship})</span></p>
                        <p className="text-jubilee-navy">{medicalInfo.emergency_contact_2_phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Allergies */}
              {(medicalInfo.food_allergies || medicalInfo.medication_allergies || medicalInfo.environmental_allergies) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">⚠️ Allergies</p>
                  <div className="space-y-1.5 text-sm">
                    {medicalInfo.food_allergies && <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2"><span className="text-red-600 font-medium">Food: </span>{medicalInfo.food_allergies}</div>}
                    {medicalInfo.medication_allergies && <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2"><span className="text-orange-600 font-medium">Medication: </span>{medicalInfo.medication_allergies}</div>}
                    {medicalInfo.environmental_allergies && <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2"><span className="text-yellow-700 font-medium">Environmental: </span>{medicalInfo.environmental_allergies}</div>}
                  </div>
                </div>
              )}

              {/* Conditions */}
              {medicalInfo.conditions && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🏥 Medical Conditions</p>
                  <p className="text-sm bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">{medicalInfo.conditions}</p>
                </div>
              )}

              {/* Medications */}
              {medications && medications.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">💊 Medications</p>
                  <div className="space-y-2">
                    {medications.map((med: any) => (
                      <div key={med.id} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm">
                        <p className="font-medium text-jubilee-navy">{med.name}{med.dose && <span className="font-normal text-gray-600"> — {med.dose}</span>}</p>
                        {med.frequency && <p className="text-gray-600 text-xs mt-0.5">{med.frequency}</p>}
                        {med.instructions && <p className="text-gray-500 text-xs mt-0.5 italic">{med.instructions}</p>}
                        {(med.time_of_day ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(med.time_of_day as string[]).map((t: string) => (
                              <span key={t} className="text-xs bg-jubilee-navy text-white px-2 py-0.5 rounded-full">{TIME_LABELS[t] ?? t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insurance */}
              {medicalInfo.insurance_provider && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🛡️ Insurance</p>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-medium">{medicalInfo.insurance_provider}</p>
                    {medicalInfo.insurance_policy_number && <p className="text-gray-500 text-xs mt-0.5">{medicalInfo.insurance_policy_number}</p>}
                  </div>
                </div>
              )}

              {/* Additional notes */}
              {medicalInfo.additional_notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📝 Additional Notes</p>
                  <p className="text-sm bg-gray-50 rounded-lg px-3 py-2">{medicalInfo.additional_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
