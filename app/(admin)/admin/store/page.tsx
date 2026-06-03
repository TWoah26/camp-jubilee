import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminSessionId } from "@/lib/admin-session";
import AppShell from "@/components/AppShell";
import StoreTerminal from "@/components/admin/StoreTerminal";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminStorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director", "administrator", "store"].includes(profile.role)) redirect("/dashboard");

  const currentSessionId = await getAdminSessionId();

  const [{ data: sessions }, { data: settings }] = await Promise.all([
    supabase.from("sessions").select("id, name").order("start_date", { ascending: false }),
    supabase.from("store_settings").select("quick_amounts").eq("id", 1).single(),
  ]);

  const sessionId = currentSessionId ?? sessions?.[0]?.id ?? null;
  const session = sessions?.find(s => s.id === sessionId) ?? null;
  const quickAmounts: number[] = settings?.quick_amounts ?? [1, 2, 5, 10, 15, 20];

  if (!sessionId || !session) {
    return (
      <AppShell role={profile.role} userName={profile.name}>
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🛍️</div>
          <p className="font-medium">No session selected.</p>
          <p className="text-sm mt-1">Use the session switcher in the sidebar to select a session.</p>
          <Link href="/admin/session" className="mt-4 inline-block text-jubilee-navy underline text-sm">Manage Sessions →</Link>
        </div>
      </AppShell>
    );
  }

  // Fetch session campers + staff (staff have null session_id so must be fetched separately)
  const [{ data: sessionCampers }, { data: staffCampers }] = await Promise.all([
    supabase
      .from("campers")
      .select("id, first_name, last_name, cabin, photo_url, store_balance")
      .eq("session_id", sessionId)
      .eq("is_staff", false)
      .order("last_name"),
    supabase
      .from("campers")
      .select("id, first_name, last_name, cabin, photo_url, store_balance")
      .eq("is_staff", true)
      .order("last_name"),
  ]);

  const campers = [
    ...(sessionCampers ?? []),
    ...(staffCampers ?? []),
  ];

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6 h-full">
        <div>
          <h1 className="text-2xl font-bold text-jubilee-green-dark">Camp Store</h1>
          <p className="text-gray-500 text-sm mt-1">{session.name} — select a camper to process a purchase</p>
        </div>
        <StoreTerminal campers={campers ?? []} role={profile.role} initialQuickAmounts={quickAmounts} squareAppId={process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? ""} />
      </div>
    </AppShell>
  );
}
