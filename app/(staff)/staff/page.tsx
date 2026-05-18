import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import MedicalInfoForm from "@/components/MedicalInfoForm";
import StaffFeed from "@/components/staff/StaffFeed";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (!["staff", "nurse", "media", "store"].includes(profile.role)) redirect("/dashboard");

  // Find this staff member's camper record
  const { data: camper } = await supabase
    .from("campers")
    .select("*, session:sessions(name, is_active)")
    .eq("user_id", user.id)
    .single();

  // Staff board posts with comments
  const { data: staffAnnouncements } = await supabase
    .from("staff_announcements")
    .select("*, poster:users!posted_by(name), comments:staff_announcement_comments(*, commenter:users!user_id(name))")
    .order("created_at", { ascending: false });

  // Messages from linked parents (if any)
  const { data: messages } = camper ? await supabase
    .from("messages")
    .select("*, from_parent:users(name)")
    .eq("to_camper_id", camper.id)
    .order("sent_at", { ascending: false })
    .limit(5) : { data: null };

  // Medical info and medications for this staff member
  const [{ data: medicalInfo }, { data: medications }] = camper ? await Promise.all([
    supabase.from("medical_info").select("*").eq("camper_id", camper.id).single(),
    supabase.from("medications").select("*").eq("camper_id", camper.id),
  ]) : [{ data: null }, { data: null }];

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-jubilee-navy">
            Welcome, {profile.name.split(" ")[0]}! 👋
          </h1>
          {camper && (camper as any).session?.name && (
            <p className="text-jubilee-brown-light mt-1">{(camper as any).session.name}</p>
          )}
        </div>

        {!camper ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <div className="text-4xl mb-3">🏕️</div>
            <h2 className="font-semibold text-jubilee-navy mb-2">Account Not Linked Yet</h2>
            <p className="text-gray-500 text-sm">A director hasn&apos;t linked your staff account to a camper record yet. Check back soon or reach out to a director.</p>
          </div>
        ) : (
          <>
            {/* Store balance card */}
            <div className="bg-jubilee-navy rounded-2xl shadow p-5 text-white flex items-center justify-between">
              <div>
                <h2 className="font-semibold mb-1">Store Balance</h2>
                <p className="text-4xl font-bold">{formatCurrency(camper.store_balance)}</p>
              </div>
              <Link
                href="/staff/store"
                className="bg-white text-jubilee-navy px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-jubilee-cream transition-colors"
              >
                Add Funds →
              </Link>
            </div>

            {/* Messages from parents */}
            {messages && messages.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-5">
                <h2 className="font-semibold text-jubilee-navy mb-3">✉️ Messages</h2>
                <div className="space-y-3">
                  {messages.map((msg: any) => (
                    <div key={msg.id} className="border border-gray-100 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">From {msg.from_parent?.name ?? "Parent"}</p>
                      <p className="text-sm text-gray-700">{msg.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency contacts & medical info */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-semibold text-jubilee-navy mb-4">🚨 Emergency &amp; Medical Info</h2>
              <MedicalInfoForm
                camperId={camper.id}
                camperName={`${camper.first_name} ${camper.last_name}`}
                initialMedical={medicalInfo ?? {}}
                initialMedications={medications ?? []}
              />
            </div>
          </>
        )}

        {/* Staff board */}
        {staffAnnouncements && staffAnnouncements.length > 0 && (
          <StaffFeed
            announcements={staffAnnouncements.map((a: any) => ({ ...a, comments: a.comments ?? [] }))}
            currentUserId={user.id}
            currentUserRole={profile.role}
          />
        )}
      </div>
    </AppShell>
  );
}
