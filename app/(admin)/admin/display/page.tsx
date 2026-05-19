import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DisplayScreen from "@/components/admin/DisplayScreen";

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function DisplayPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["director", "administrator"].includes(profile.role)) redirect("/dashboard");

  const { id } = await searchParams;
  const displayId = id === "tv2" ? "tv2" : "tv1";

  return <DisplayScreen displayId={displayId} />;
}
