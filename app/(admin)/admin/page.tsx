import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSessionId } from "@/lib/admin-session";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import CamperSearch from "@/components/admin/CamperSearch";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director","administrator"].includes(profile.role)) redirect("/dashboard");

  const selectedSessionId = await getAdminSessionId();

  // Camper count — filter by session if one is selected
  const camperQuery = supabase.from("campers").select("*", { count: "exact", head: true });
  const { count: camperCount } = await (selectedSessionId ? camperQuery.eq("session_id", selectedSessionId) : camperQuery);

  // For parents + messages scoped to a session, get camper IDs first
  let sessionCamperIds: string[] | null = null;
  if (selectedSessionId) {
    const { data: sessionCampers } = await supabase.from("campers").select("id").eq("session_id", selectedSessionId);
    sessionCamperIds = (sessionCampers ?? []).map((c: any) => c.id);
  }

  const parentQuery = supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "parent");
  const msgQuery = supabase.from("messages").select("*", { count: "exact", head: true }).eq("status", "unread");

  const [
    { count: parentCount },
    { count: unreadMessages },
    { data: selectedSession },
    { data: tuitionRows },
  ] = await Promise.all([
    // Parents: filter to those linked to session campers
    sessionCamperIds
      ? supabase.from("parent_camper_links").select("parent_id", { count: "exact", head: true }).in("camper_id", sessionCamperIds)
      : parentQuery,
    // Messages: filter to those sent to session campers
    sessionCamperIds
      ? supabase.from("messages").select("*", { count: "exact", head: true }).eq("status", "unread").in("to_camper_id", sessionCamperIds)
      : msgQuery,
    // Selected session info
    selectedSessionId
      ? supabase.from("sessions").select("*").eq("id", selectedSessionId).single()
      : supabase.from("sessions").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1).then(r => ({ data: r.data?.[0] ?? null })),
    // Revenue for selected session
    selectedSessionId
      ? supabase.from("tuition_payments").select("amount").eq("session_id", selectedSessionId)
      : supabase.from("tuition_payments").select("amount"),
  ]);

  const session = Array.isArray(selectedSession) ? selectedSession[0] ?? null : selectedSession;
  const totalRevenue = (tuitionRows ?? []).reduce((s: number, p: any) => s + p.amount, 0);

  const stats = [
    { label: "Campers", value: camperCount ?? 0, href: "/admin/campers", icon: "🧒" },
    { label: "Families", value: parentCount ?? 0, href: "/admin/parents", icon: "👨‍👩‍👧" },
    { label: "Unread Messages", value: unreadMessages ?? 0, href: "/admin/messages", icon: "✉️" },
  ];

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-jubilee-navy">Director Dashboard</h1>
        </div>

        <CamperSearch />

        {session ? (
          <div className="bg-jubilee-navy rounded-2xl p-5 text-white">
            <p className="text-jubilee-gold text-sm">{selectedSessionId ? "Selected Session" : "Active Session"}</p>
            <h2 className="text-xl font-bold">{session.name}</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm">
              <span>Messaging: {session.is_active ? "✅ Open" : "🔒 Closed"}</span>
              <span>Cabin Info: {session.show_cabin_info ? "✅ Visible" : "🔒 Hidden"}</span>
              <span>Fees Collected: <strong>{formatCurrency(totalRevenue)}</strong></span>
            </div>
            <Link href="/admin/session" className="mt-3 inline-block bg-jubilee-gold text-white px-4 py-1.5 rounded-lg text-sm font-medium">
              Manage Sessions →
            </Link>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-yellow-800 text-sm font-medium">No active session. <Link href="/admin/session" className="underline">Create one →</Link></p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map(stat => (
            <Link key={stat.label} href={stat.href} className="bg-white rounded-2xl shadow p-5 hover:shadow-md transition-shadow">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <p className="text-3xl font-bold text-jubilee-navy">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { href: "/admin/campers", label: "Manage Campers", icon: "🧒", desc: "Add, edit, view camper roster" },
            { href: "/admin/parents", label: "Parent Accounts", icon: "👨‍👩‍👧", desc: "Approve camper links" },
            { href: "/admin/messages", label: "Message Inbox", icon: "✉️", desc: "Review & mark delivered" },
            { href: "/admin/finances", label: "Finances", icon: "💰", desc: "Transactions & end-of-session" },
            { href: "/admin/info", label: "Info Pages", icon: "📝", desc: "Post announcements & edit pages" },
            { href: "/admin/session", label: "Session Settings", icon: "⚙️", desc: "Toggle messaging & cabin info" },
            { href: "/admin/registration", label: "Registration Station", icon: "📷", desc: "Photo capture & live TV feeds" },
          ].map(item => (
            <Link key={item.href} href={item.href} className="bg-white rounded-2xl shadow p-4 hover:shadow-md transition-shadow flex items-center gap-4">
              <span className="text-3xl">{item.icon}</span>
              <div>
                <p className="font-semibold text-jubilee-navy">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
