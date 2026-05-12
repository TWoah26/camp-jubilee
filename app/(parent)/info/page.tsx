import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

export default async function InfoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { data: pages } = await supabase.from("info_pages").select("*");
  const packingPage = pages?.find((p: any) => p.slug === "packing-list");
  const emergencyPage = pages?.find((p: any) => p.slug === "emergency-contacts");

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-jubilee-green-dark">Camp Information</h1>

        {/* Website link */}
        <a
          href="https://campjubilee.org"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-jubilee-navy text-white rounded-2xl shadow p-5 hover:bg-jubilee-navy/90 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <p className="font-semibold">Camp Jubilee Website</p>
              <p className="text-white/60 text-sm">campjubilee.org</p>
            </div>
          </div>
          <span className="text-white/50 text-lg">→</span>
        </a>

        {emergencyPage && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-jubilee-green-dark mb-3">🚨 Emergency Contacts & Address</h2>
            {emergencyPage.content ? (
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{emergencyPage.content}</div>
            ) : (
              <p className="text-gray-400 text-sm">Contact information will be posted here.</p>
            )}
          </div>
        )}

        {packingPage && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-jubilee-green-dark mb-3">🎒 Packing List</h2>
            {packingPage.content ? (
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{packingPage.content}</div>
            ) : (
              <p className="text-gray-400 text-sm">Packing list will be posted here.</p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
