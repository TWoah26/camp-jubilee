import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import AddFundsMultiForm from "@/components/AddFundsMultiForm";

export const dynamic = "force-dynamic";

export default async function StaffStorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (!["staff", "nurse", "media", "store"].includes(profile.role)) redirect("/dashboard");

  const { data: camper } = await supabase
    .from("campers")
    .select("id, first_name, last_name, store_balance, is_staff")
    .eq("user_id", user.id)
    .single();

  const { data: transactions } = camper ? await supabase
    .from("store_transactions")
    .select("*")
    .eq("camper_id", camper.id)
    .order("created_at", { ascending: false }) : { data: null };

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-jubilee-navy">My Store Account</h1>

        {!camper ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-gray-500 text-sm">Your staff account hasn&apos;t been linked to a camper record yet. Contact a director.</p>
          </div>
        ) : (
          <>
            {/* Balance */}
            <div className="bg-jubilee-navy rounded-2xl shadow p-5 text-white">
              <h2 className="font-semibold mb-1">Current Balance</h2>
              <p className="text-5xl font-bold">{formatCurrency(camper.store_balance)}</p>
            </div>

            {/* Add funds */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-semibold text-jubilee-navy mb-4">Add Funds</h2>
              <AddFundsMultiForm
                campers={[camper]}
                parentId={user.id}
              />
            </div>

            {/* Transaction history */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-semibold text-jubilee-navy mb-3">Transaction History</h2>
              {!transactions || transactions.length === 0 ? (
                <p className="text-sm text-gray-400">No transactions yet.</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                      <div>
                        <p className="font-medium">{tx.type === "credit" ? "Funds added" : "Purchase"}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(tx.created_at)}</p>
                      </div>
                      <span className={`font-semibold ${tx.type === "credit" ? "text-jubilee-green" : "text-red-500"}`}>
                        {tx.type === "credit" ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
