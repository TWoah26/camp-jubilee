import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import CamperFinanceSection from "@/components/admin/CamperFinanceSection";
import MedicalInfoForm from "@/components/MedicalInfoForm";

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
          <p className="text-xs text-gray-400 mb-4">Staff can edit this information directly. Changes are saved immediately.</p>
          <MedicalInfoForm
            camperId={camper.id}
            camperName={camper.first_name}
            initialMedical={medicalInfo ?? {}}
            initialMedications={medications ?? []}
          />
        </div>
      </div>
    </AppShell>
  );
}
