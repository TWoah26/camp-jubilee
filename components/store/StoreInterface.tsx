"use client";

import { useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Camper, StoreTransaction } from "@/types";

interface Props {
  campers: Pick<Camper, "id" | "first_name" | "last_name" | "store_balance" | "cabin">[];
  transactions: (StoreTransaction & { camper?: { first_name: string; last_name: string } })[];
  staffId: string;
}

export default function StoreInterface({ campers, transactions, staffId }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Props["campers"][0] | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<"deduct" | "log">("deduct");

  const filtered = search.length > 1
    ? campers.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const handleDeduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }
    if (amt > selected.store_balance) { setError(`Balance is only ${formatCurrency(selected.store_balance)}`); return; }

    setLoading(true);
    setError(null);
    const res = await fetch("/api/store/deduct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camper_id: selected.id, amount: amt, note, staff_id: staffId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
    } else {
      setSuccess(`✓ Deducted ${formatCurrency(amt)} from ${selected.first_name}'s account`);
      setSelected(prev => prev ? { ...prev, store_balance: data.new_balance } : null);
      setAmount("");
      setNote("");
      setTimeout(() => setSuccess(null), 4000);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("deduct")} className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === "deduct" ? "bg-jubilee-navy text-white" : "bg-white border border-gray-300"}`}>
          Deduct Balance
        </button>
        <button onClick={() => setTab("log")} className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === "log" ? "bg-jubilee-navy text-white" : "bg-white border border-gray-300"}`}>
          Transaction Log
        </button>
      </div>

      {tab === "deduct" && (
        <>
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-jubilee-navy mb-3">Find Camper</h2>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null); }}
              placeholder="Type camper name..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
              autoFocus
            />
            {filtered.length > 0 && !selected && (
              <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelected(c); setSearch(`${c.first_name} ${c.last_name}`); }}
                    className="w-full text-left px-4 py-3 hover:bg-jubilee-cream border-b last:border-0 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-sm">{c.first_name} {c.last_name}</p>
                      {c.cabin && <p className="text-xs text-gray-400">Cabin: {c.cabin}</p>}
                    </div>
                    <span className="text-jubilee-navy font-display font-semibold text-sm">{formatCurrency(c.store_balance)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="bg-white rounded-2xl shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-jubilee-navy text-lg">
                    {selected.first_name} {selected.last_name}
                  </h2>
                  {selected.cabin && <p className="text-sm text-gray-500">Cabin: {selected.cabin}</p>}
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-jubilee-navy font-display">{formatCurrency(selected.store_balance)}</p>
                  <p className="text-xs text-gray-400">Current Balance</p>
                </div>
              </div>

              <form onSubmit={handleDeduct} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deduction Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      min="0.01"
                      step="0.01"
                      max={selected.store_balance}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-jubilee-gold text-lg font-semibold"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="e.g. snack bar, t-shirt, canteen"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}
                {success && <p className="text-jubilee-green font-medium text-sm">{success}</p>}

                <button
                  type="submit"
                  disabled={loading || !amount}
                  className="w-full bg-jubilee-navy text-white py-3 rounded-lg font-semibold hover:bg-jubilee-gold disabled:opacity-50 transition-colors"
                >
                  {loading ? "Processing..." : `Deduct ${amount ? formatCurrency(parseFloat(amount) || 0) : "$0.00"}`}
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {tab === "log" && (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h2 className="font-semibold text-jubilee-navy">All Transactions ({transactions.length})</h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400">No transactions yet.</p>
            ) : transactions.map(tx => (
              <div key={tx.id} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">
                    {tx.camper?.first_name} {tx.camper?.last_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {tx.note || (tx.type === "credit" ? "Funds added" : "Purchase")} · {formatDateTime(tx.created_at)}
                  </p>
                </div>
                <span className={`font-semibold text-sm ${tx.type === "credit" ? "text-jubilee-green" : "text-red-500"}`}>
                  {tx.type === "credit" ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
