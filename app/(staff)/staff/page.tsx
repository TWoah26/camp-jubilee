import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (profile.role !== "staff") redirect("/dashboard");

  // Find this staff member's camper record
  const { data: camper } = await supabase
    .from("campers")
    .select("*, session:sessions(name, is_active)")
    .eq("user_id", user.id)
    .single();

  // Recent announcements
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);

  // Messages from linked parents (if any)
  const { data: messages } = camper ? await supabase
    .from("messages")
    .select("*, from_parent:users(name)")
    .eq("to_camper_id", camper.id)
    .order("sent_at", { ascending: false })
    .limit(5) : { data: null };

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
          </>
        )}

        {/* Announcements */}
        {announcements && announcements.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-jubilee-navy mb-3">📢 Updates</h2>
            <div className="space-y-3">
              {announcements.map((a: any) => (
                <div key={a.id} className="border-l-4 border-jubilee-gold pl-3">
                  <p className="font-medium text-sm text-jubilee-navy">{a.title}</p>
                  <p className="text-gray-600 text-sm mt-0.5">{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
