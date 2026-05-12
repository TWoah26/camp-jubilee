import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import StoreInterface from "@/components/store/StoreInterface";

export default async function StorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || !["director", "store"].includes(profile.role)) redirect("/login");

  const { data: campers } = await supabase
    .from("campers")
    .select("id, first_name, last_name, store_balance, cabin")
    .order("last_name");

  const { data: transactions } = await supabase
    .from("store_transactions")
    .select("*, camper:campers(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="min-h-screen bg-jubilee-cream">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-jubilee-green-dark">🏪 Camp Store</h1>
            <p className="text-sm text-gray-500">Staff: {profile.name}</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button className="text-sm text-gray-500 hover:text-gray-700">Sign Out</button>
          </form>
        </div>
        <StoreInterface campers={campers ?? []} transactions={transactions ?? []} staffId={user.id} />
      </div>
    </div>
  );
}
