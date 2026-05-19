import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import RegistrationStation from "@/components/admin/RegistrationStation";

export default async function RegistrationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("role, name").eq("id", user.id).single();
  if (!profile || !["director", "administrator"].includes(profile.role)) redirect("/dashboard");

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-jubilee-navy">Registration Station</h1>
          <p className="text-gray-500 text-sm mt-1">
            Capture camper profile photos and manage live camera feeds to TVs.
          </p>
        </div>
        <RegistrationStation />
      </div>
    </AppShell>
  );
}
