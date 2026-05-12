import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MediaUploader from "@/components/media/MediaUploader";

export default async function MediaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director", "media"].includes(profile.role)) redirect("/login");

  const { data: campers } = await supabase
    .from("campers")
    .select("id, first_name, last_name, cabin")
    .order("last_name");

  const { data: recentPhotos } = await supabase
    .from("photos")
    .select("*, tags:photo_tags(camper_id, camper:campers(first_name, last_name))")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-jubilee-cream">
      <div className="max-w-3xl mx-auto p-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-jubilee-green-dark">📸 Media Upload</h1>
            <p className="text-sm text-gray-500">{profile.name}</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button className="text-sm text-gray-500 hover:text-gray-700">Sign Out</button>
          </form>
        </div>
        <MediaUploader campers={campers ?? []} recentPhotos={recentPhotos ?? []} uploaderId={user.id} />
      </div>
    </div>
  );
}
