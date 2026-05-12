import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  switch (profile.role) {
    case "director":
    case "administrator":
      redirect("/admin");
    case "nurse":
      redirect("/admin/medical");
    case "media":
      redirect("/admin/photos");
    case "store":
      redirect("/admin/store");
    default:
      redirect("/dashboard");
  }
}
