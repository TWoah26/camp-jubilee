import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { Camper, Session, ParentCamperLink } from "@/types";
import UnlinkCamperButton from "@/components/UnlinkCamperButton";
import NotificationPrompt from "@/components/NotificationPrompt";
import NotificationsSeenMarker from "@/components/NotificationsSeenMarker";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  // Staff roles should never see the parent dashboard
  if (profile.role === "director" || profile.role === "administrator") redirect("/admin");
  if (profile.role === "nurse") redirect("/admin/medical");
  if (profile.role === "media") redirect("/admin/photos");
  if (profile.role === "store") redirect("/admin/store");
  if (profile.role === "staff") redirect("/staff");

  const { data: links } = await supabase
    .from("parent_camper_links")
    .select("*, camper:campers(*, session:sessions(name))")
    .eq("parent_id", user.id)
    .eq("approved", true);

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);
  const session = sessions?.[0] ?? null;

  // Check for a closed session with unresolved store balances
  const { data: closedSession } = await supabase
    .from("sessions")
    .select("id, name")
    .eq("session_closed", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let hasPendingBalances = false;
  if (closedSession) {
    const { data: existingChoices } = await supabase
      .from("session_balance_choices")
      .select("camper_id")
      .eq("parent_id", user.id)
      .eq("session_id", closedSession.id);

    const chosenIds = new Set((existingChoices ?? []).map((c: any) => c.camper_id));
    const { data: balanceLinks } = await supabase
      .from("parent_camper_links")
      .select("camper:campers(id, store_balance)")
      .eq("parent_id", user.id)
      .eq("approved", true);

    hasPendingBalances = (balanceLinks ?? []).some((l: any) =>
      l.camper?.store_balance > 0 && !chosenIds.has(l.camper?.id)
    );
  }

  const { data: updates } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const lastSeen: string | null = (profile as any).notifications_last_seen_at ?? null;
  const unreadIds = new Set(
    (updates ?? [])
      .filter((u: any) => !lastSeen || new Date(u.created_at) > new Date(lastSeen))
      .map((u: any) => u.id)
  );

  const pendingLinks = await supabase
    .from("parent_camper_links")
    .select("*, camper:campers(*)")
    .eq("parent_id", user.id)
    .eq("approved", false);

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <NotificationsSeenMarker />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-jubilee-navy">Welcome back, {profile.name.split(" ")[0]}!</h1>
          {session && (
            <p className="text-jubilee-brown-light mt-1">
              {session.name} is {session.is_active ? "in session" : "coming up"}
            </p>
          )}
        </div>

        {hasPendingBalances && (
          <Link
            href="/session-close"
            className="block bg-jubilee-coral text-white rounded-xl p-4 hover:opacity-90"
          >
            <p className="font-semibold">⚠️ Action Required: {closedSession?.name} has ended</p>
            <p className="text-sm mt-1 text-white/80">Your camper(s) have remaining store balances. Tap here to choose refund or donate.</p>
          </Link>
        )}

        {pendingLinks.data && pendingLinks.data.length > 0 && (
          <div className="bg-jubilee-amber/10 border border-jubilee-amber rounded-xl p-4">
            <p className="text-sm font-medium text-jubilee-brown">
              ⏳ {pendingLinks.data.length} camper link(s) pending admin approval
            </p>
          </div>
        )}

        {(!links || links.length === 0) && (
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <div className="text-4xl mb-3">🧒</div>
            <h2 className="font-semibold text-jubilee-navy mb-2">Link Your Camper</h2>
            <p className="text-gray-600 text-sm mb-4">Enter your camper&apos;s unique code to connect their account.</p>
            <LinkCamperForm parentId={user.id} />
          </div>
        )}

        {links && links.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {links.map((link: any) => {
              const camper: Camper = link.camper;
              return (
                <Link
                  key={link.id}
                  href={`/camper/${camper.id}`}
                  className="bg-white rounded-2xl shadow p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-jubilee-green-light flex items-center justify-center text-2xl text-white font-bold">
                      {camper.first_name[0]}{camper.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-jubilee-navy">{camper.first_name} {camper.last_name}</h3>
                        {camper.is_staff && <span className="text-xs bg-jubilee-gold/20 text-jubilee-brown px-1.5 py-0.5 rounded-full">Staff</span>}
                      </div>
                      {(camper as any).session?.name && (
                        <p className="text-xs text-jubilee-gold font-medium">{(camper as any).session.name}</p>
                      )}
                      <p className="text-sm text-gray-500">Store balance: <span className="font-medium text-jubilee-green">{formatCurrency(camper.store_balance)}</span></p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-gray-400">→</span>
                      <UnlinkCamperButton linkId={link.id} camperName={camper.first_name} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {links && links.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold text-jubilee-navy mb-3">Add Another Camper</h3>
            <LinkCamperForm parentId={user.id} />
          </div>
        )}

        <NotificationPrompt userId={user.id} />

        {updates && updates.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold text-jubilee-navy mb-3 flex items-center gap-2">
              📢 Updates
              {unreadIds.size > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadIds.size} new</span>
              )}
            </h3>
            <div className="space-y-3">
              {updates.map((u: any) => (
                <div key={u.id} className={`border-l-4 pl-3 ${unreadIds.has(u.id) ? "border-red-400 bg-red-50 rounded-r-lg pr-2 py-1" : "border-jubilee-gold"}`}>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-jubilee-navy">{u.title}</p>
                    {unreadIds.has(u.id) && <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">NEW</span>}
                  </div>
                  <p className="text-gray-600 text-sm mt-0.5">{u.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}

function LinkCamperForm({ parentId }: { parentId: string }) {
  return (
    <form action="/api/parent/link-camper" method="POST" className="flex gap-2">
      <input type="hidden" name="parent_id" value={parentId} />
      <input
        name="camper_code"
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
        placeholder="Enter camper code (e.g. AB12CD34)"
        required
      />
      <button
        type="submit"
        className="bg-jubilee-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold"
      >
        Link
      </button>
    </form>
  );
}
