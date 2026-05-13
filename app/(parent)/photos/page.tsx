import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import PhotoGallery from "@/components/PhotoGallery";

export default async function PhotosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  // Staff members can see all photos
  const isStaffUser = profile.role === "staff";

  // Get parent's linked campers with their session info
  const { data: links } = await supabase
    .from("parent_camper_links")
    .select("camper:campers(id, session_id, is_staff)")
    .eq("parent_id", user.id)
    .eq("approved", true);

  const campers = (links ?? []).map((l: any) => l.camper).filter(Boolean);

  const isStaffParent = isStaffUser || campers.some((c: any) => c.is_staff);
  const sessionIds = [...new Set(
    campers.filter((c: any) => c.session_id).map((c: any) => c.session_id)
  )] as string[];

  // Fetch session details for the dropdown
  let sessions: { id: string; name: string }[] = [];
  if (isStaffParent) {
    const { data } = await supabase
      .from("sessions")
      .select("id, name")
      .order("start_date", { ascending: true });
    sessions = data ?? [];
  } else if (sessionIds.length > 0) {
    const { data } = await supabase
      .from("sessions")
      .select("id, name")
      .in("id", sessionIds)
      .order("start_date", { ascending: true });
    sessions = data ?? [];
  }

  let photos: any[] = [];

  if (isStaffParent) {
    const { data } = await supabase
      .from("photos")
      .select("id, url, caption, date_taken, session_id")
      .order("date_taken", { ascending: false });
    photos = data ?? [];
  } else if (sessionIds.length > 0) {
    const { data } = await supabase
      .from("photos")
      .select("id, url, caption, date_taken, session_id")
      .in("session_id", sessionIds)
      .order("date_taken", { ascending: false });
    photos = data ?? [];
  }

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-jubilee-green-dark">Photo Gallery</h1>
        <PhotoGallery photos={photos} sessions={sessions} />
      </div>
    </AppShell>
  );
}
