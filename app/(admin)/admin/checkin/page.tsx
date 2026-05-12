import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSessionId } from "@/lib/admin-session";
import AppShell from "@/components/AppShell";
import CheckInRoster from "@/components/admin/CheckInRoster";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminCheckInPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director","administrator","nurse"].includes(profile.role)) redirect("/dashboard");

  const currentSessionId = await getAdminSessionId();

  // Need an active session to run check-in
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name")
    .order("start_date", { ascending: false });

  const sessionId = currentSessionId ?? sessions?.[0]?.id ?? null;
  const session = sessions?.find(s => s.id === sessionId) ?? null;

  if (!sessionId || !session) {
    return (
      <AppShell role={profile.role} userName={profile.name}>
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🏕️</div>
          <p className="font-medium">No session selected.</p>
          <p className="text-sm mt-1">Use the session switcher in the sidebar to select a session.</p>
          <Link href="/admin/session" className="mt-4 inline-block text-jubilee-navy underline text-sm">Manage Sessions →</Link>
        </div>
      </AppShell>
    );
  }

  const { data: campers } = await supabase
    .from("campers")
    .select(`
      id, first_name, last_name, cabin, counselor_name, photo_url, is_staff, session_id,
      medical_info(
        food_allergies, medication_allergies, environmental_allergies,
        conditions, insurance_provider, insurance_policy_number,
        emergency_contact_1_name, emergency_contact_1_relationship, emergency_contact_1_phone,
        emergency_contact_2_name, emergency_contact_2_relationship, emergency_contact_2_phone,
        additional_notes
      ),
      medications(id, name, dose, frequency, instructions, time_of_day),
      checkin_records(checked_in, checked_in_at, checkin_notes, picked_up, picked_up_at, pickup_notes)
    `)
    .eq("session_id", sessionId)
    .eq("is_staff", false)
    .order("last_name");

  const normalized = (campers ?? []).map((c: any) => ({
    ...c,
    medical_info: Array.isArray(c.medical_info) ? c.medical_info[0] ?? null : c.medical_info,
    medications: c.medications ?? [],
    checkin_record: Array.isArray(c.checkin_records)
      ? (c.checkin_records[0] ?? null)
      : (c.checkin_records ?? null),
  }));

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-jubilee-green-dark">Check-In</h1>
          <p className="text-gray-500 text-sm mt-1">{session.name} — {normalized.length} camper{normalized.length !== 1 ? "s" : ""} registered</p>
        </div>
        <CheckInRoster campers={normalized} sessionId={sessionId} sessionName={session.name} />
      </div>
    </AppShell>
  );
}
