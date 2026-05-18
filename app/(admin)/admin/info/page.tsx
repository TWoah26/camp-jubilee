import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import InfoEditor from "@/components/admin/InfoEditor";
import StaffAnnouncementsEditor from "@/components/admin/StaffAnnouncementsEditor";

export const dynamic = "force-dynamic";

export default async function AdminInfoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director","administrator"].includes(profile.role)) redirect("/dashboard");

  const [
    { data: pages },
    { data: announcements },
    { data: staffAnnouncements },
  ] = await Promise.all([
    supabase.from("info_pages").select("*"),
    supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    supabase
      .from("staff_announcements")
      .select("*, poster:users!posted_by(name), comments:staff_announcement_comments(*, commenter:users!user_id(name))")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-jubilee-green-dark">Info Pages</h1>
        <StaffAnnouncementsEditor initialAnnouncements={staffAnnouncements ?? []} />
        <InfoEditor pages={pages ?? []} announcements={announcements ?? []} directorId={user.id} />
      </div>
    </AppShell>
  );
}
