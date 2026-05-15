import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import CamperFinanceSection from "@/components/admin/CamperFinanceSection";
import CamperInfoCard from "@/components/admin/CamperInfoCard";
import MedicalInfoForm from "@/components/MedicalInfoForm";
import StaffAccountLink from "@/components/admin/StaffAccountLink";
import ParentContactCard from "@/components/admin/ParentContactCard";

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
    { data: staffUsers },
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
    // Only fetch staff users if this is a staff camper
    camper.is_staff
      ? supabase.from("users").select("id, name, email").eq("role", "staff").order("name")
      : Promise.resolve({ data: [] }),
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
          <CamperInfoCard
            camperId={camper.id}
            firstName={camper.first_name}
            lastName={camper.last_name}
            dob={camper.dob ?? null}
            cabin={camper.cabin ?? null}
            counselorName={camper.counselor_name ?? null}
            camperCode={camper.camper_code}
            registrationNotes={(camper as any).registration_notes ?? null}
          />
        </div>

        {/* Parent / Contact — editable */}
        <ParentContactCard
          camperId={camper.id}
          parentEmail={(camper as any).parent_email ?? null}
          parentName={(camper as any).parent_name ?? null}
          parentLinks={parentLinks ?? []}
        />

        {/* Staff account link — only shown for staff campers */}
        {camper.is_staff && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-jubilee-navy mb-1">Staff Portal Account</h2>
            <p className="text-xs text-gray-400 mb-4">Link a staff user account so this person can log in to the portal.</p>
            <StaffAccountLink
              camperId={camper.id}
              currentUserId={(camper as any).user_id ?? null}
              staffUsers={staffUsers ?? []}
            />
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
