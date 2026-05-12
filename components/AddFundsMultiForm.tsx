"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Camper {
  id: string;
  first_name: string;
  last_name: string;
  store_balance: number;
}

export default function AddFundsMultiForm({ campers, parentId }: { campers: Camper[]; parentId: string }) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const total = Object.values(amounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allocations = campers
      .map(c => ({ camper_id: c.id, amount: parseFloat(amounts[c.id] || "0") }))
      .filter(a => a.amount > 0);

    if (allocations.length === 0) return alert("Enter an amount for at least one camper.");

    setLoading(true);
    try {
      const res = await fetch("/api/payments/add-funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_id: parentId, allocations, total }),
      });
      const data = await res.json();
      if (data.payment_link) {
        window.location.href = data.payment_link;
      } else {
        alert("Payment error: " + (data.error ?? "Something went wrong."));
        setLoading(false);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {campers.map(camper => (
        <div key={camper.id} className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-jubilee-navy">{camper.first_name} {camper.last_name}</p>
            <p className="text-xs text-gray-400">Balance: {formatCurrency(camper.store_balance)}</p>
          </div>
          <div className="relative w-36">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amounts[camper.id] ?? ""}
              onChange={e => setAmounts(a => ({ ...a, [camper.id]: e.target.value }))}
              className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
              placeholder="0.00"
            />
          </div>
        </div>
      ))}

      {total > 0 && (
        <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-sm font-medium">
          <span className="text-gray-600">Total</span>
          <span className="text-jubilee-navy">{formatCurrency(total)}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || total <= 0}
        className="w-full bg-jubilee-navy text-white py-2.5 rounded-lg text-sm font-medium hover:bg-jubilee-gold disabled:opacity-50"
      >
        {loading ? "..." : `Pay ${total > 0 ? formatCurrency(total) : ""} via Square`}
      </button>
    </form>
  );
}
