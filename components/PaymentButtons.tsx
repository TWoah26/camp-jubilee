"use client";

import { useState } from "react";
import type { Camper } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface PaymentButtonsProps {
  campers: Camper[];
  sessionId: string;
  parentId: string;
  depositAmount: number;
  tuitionAmount: number;
  amountPaid: number;
}

export default function PaymentButtons({ campers, sessionId, parentId, depositAmount, tuitionAmount, amountPaid }: PaymentButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const camper = campers[0];
  const remaining = Math.max(0, (tuitionAmount ?? 0) - amountPaid);

  const handlePay = async () => {
    const amount = parseFloat(customAmount);
    if (!amount || amount <= 0) return alert("Please enter a valid amount.");
    if (amount > remaining) return alert(`Amount cannot exceed the remaining balance of ${formatCurrency(remaining)}.`);

    setLoading(true);
    try {
      const res = await fetch("/api/payments/tuition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camper_id: camper.id,
          parent_id: parentId,
          amount,
          session_id: sessionId,
        }),
      });
      const data = await res.json();
      if (data.payment_link) window.location.href = data.payment_link;
      else alert("Payment error: " + (data.error ?? "Something went wrong."));
    } finally {
      setLoading(false);
    }
  };

  if (!tuitionAmount) {
    return <p className="text-sm text-gray-400 italic">Registration fee not yet set for this session.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Remaining balance</span>
        <span className="font-semibold text-jubilee-navy">{formatCurrency(remaining)}</span>
      </div>

      {remaining > 0 ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              min="1"
              max={remaining}
              step="0.01"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
            />
          </div>
          <button
            onClick={() => { setCustomAmount(remaining.toFixed(2)); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            title="Pay full remaining"
          >
            Pay all
          </button>
          <button
            onClick={handlePay}
            disabled={loading || !customAmount}
            className="bg-jubilee-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold disabled:opacity-50"
          >
            {loading ? "..." : "Pay Now"}
          </button>
        </div>
      ) : (
        <p className="text-jubilee-green font-medium text-sm">✓ Registration fee fully paid</p>
      )}

      <div className="flex gap-3 text-xs text-gray-400">
        {depositAmount > 0 && <><span>Deposit: {formatCurrency(depositAmount)}</span><span>·</span></>}
        <span>Total fee: {formatCurrency(tuitionAmount)}</span>
        <span>·</span>
        <span>Paid: {formatCurrency(amountPaid)}</span>
      </div>
    </div>
  );
}
