"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface CamperWithBalance {
  id: string;
  first_name: string;
  last_name: string;
  session_id: string;
  tuition_commitment: number;
  amountPaid: number;
  sessionTuitionAmount: number;
}

interface Props {
  campers: CamperWithBalance[];
  sessionId: string;
  parentId: string;
}

export default function TuitionMultiForm({ campers, sessionId, parentId }: Props) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const campersWithBalance = campers.map(c => {
    const effective = c.tuition_commitment > 0 ? c.tuition_commitment : c.sessionTuitionAmount;
    const remaining = Math.max(0, effective - c.amountPaid);
    return { ...c, effective, remaining };
  });

  const anyRemaining = campersWithBalance.some(c => c.remaining > 0);
  const total = Object.entries(amounts).reduce((sum, [, v]) => sum + (parseFloat(v) || 0), 0);

  const handlePayAll = (camperId: string, remaining: number) => {
    setAmounts(a => ({ ...a, [camperId]: remaining.toFixed(2) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allocations = campersWithBalance
      .map(c => ({ camper_id: c.id, amount: parseFloat(amounts[c.id] || "0"), session_id: sessionId }))
      .filter(a => a.amount > 0);

    if (allocations.length === 0) return alert("Enter an amount for at least one camper.");

    setLoading(true);
    try {
      const res = await fetch("/api/payments/tuition-multi", {
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

  if (!anyRemaining) {
    return <p className="text-jubilee-green font-medium text-sm">✓ All registration fees fully paid</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {campersWithBalance.map(camper => (
        <div key={camper.id} className="space-y-2">
          {campers.length > 1 && (
            <p className="text-sm font-medium text-jubilee-navy">{camper.first_name} {camper.last_name}</p>
          )}
          {camper.remaining <= 0 ? (
            <p className="text-jubilee-green text-sm font-medium">✓ Paid in full</p>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Remaining: <span className="font-semibold text-jubilee-navy">{formatCurrency(camper.remaining)}</span></span>
                <span>{formatCurrency(camper.amountPaid)} paid of {formatCurrency(camper.effective)}</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="1"
                    max={camper.remaining}
                    step="0.01"
                    value={amounts[camper.id] ?? ""}
                    onChange={e => setAmounts(a => ({ ...a, [camper.id]: e.target.value }))}
                    placeholder="Enter amount"
                    className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handlePayAll(camper.id, camper.remaining)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                >
                  Pay all
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {total > 0 && campers.length > 1 && (
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
