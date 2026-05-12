import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import PhotoManager from "@/components/admin/PhotoManager";
import { getAdminSessionId } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminPhotosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director","administrator","media"].includes(profile.role)) redirect("/dashboard");

  const currentSessionId = await getAdminSessionId();

  const [
    { data: photos },
    { data: sessions },
  ] = await Promise.all([
    supabase
      .from("photos")
      .select("id, url, caption, date_taken, session_id")
      .order("date_taken", { ascending: false }),
    supabase
      .from("sessions")
      .select("id, name, start_date, end_date")
      .order("start_date", { ascending: true }),
  ]);

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-jubilee-green-dark">Photos</h1>
        <PhotoManager
          photos={photos ?? []}
          sessions={sessions ?? []}
          uploaderId={user.id}
          currentSessionId={currentSessionId}
        />
      </div>
    </AppShell>
  );
}
