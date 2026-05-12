import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import MedicalRoster from "@/components/admin/MedicalRoster";

export default async function AdminMedicalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director","administrator","nurse"].includes(profile.role)) redirect("/dashboard");

  const [{ data: campers }, { data: sessions }, { data: parentLinks }] = await Promise.all([
    supabase
      .from("campers")
      .select(`
        id, first_name, last_name, cabin, is_staff, session_id,
        session:sessions(name),
        medical_info(
          food_allergies, medication_allergies, environmental_allergies,
          conditions, doctor_name, doctor_phone,
          insurance_provider, insurance_policy_number,
          emergency_contact_1_name, emergency_contact_1_relationship, emergency_contact_1_phone,
          emergency_contact_2_name, emergency_contact_2_relationship, emergency_contact_2_phone,
          additional_notes, updated_at
        ),
        medications(id, name, dose, frequency, instructions, time_of_day)
      `)
      .eq("is_staff", false)
      .order("last_name"),
    supabase
      .from("sessions")
      .select("id, name")
      .order("start_date", { ascending: true }),
    supabase
      .from("parent_camper_links")
      .select("camper_id, parent:users(id, name, email)")
      .eq("approved", true),
  ]);

  // Build a map of camper_id → linked parents
  const parentsByCamper: Record<string, { id: string; name: string; email: string }[]> = {};
  for (const link of parentLinks ?? []) {
    if (!parentsByCamper[link.camper_id]) parentsByCamper[link.camper_id] = [];
    if (link.parent) parentsByCamper[link.camper_id].push(link.parent as any);
  }

  // Normalize: Supabase returns medical_info as array when joined (take first element)
  const normalized = (campers ?? []).map((c: any) => ({
    ...c,
    medical_info: Array.isArray(c.medical_info) ? c.medical_info[0] ?? null : c.medical_info,
    medications: c.medications ?? [],
    parents: parentsByCamper[c.id] ?? [],
  }));

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-jubilee-green-dark">Medical Information</h1>
          <p className="text-gray-500 text-sm mt-1">Confidential — for director and nursing staff only.</p>
        </div>
        <MedicalRoster campers={normalized} sessions={sessions ?? []} />
      </div>
    </AppShell>
  );
}
