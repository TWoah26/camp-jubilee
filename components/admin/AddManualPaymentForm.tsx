"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  camperId: string;
  sessionId: string | null;
  onSuccess: (amount: number) => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export default function AddManualPaymentForm({ camperId, sessionId, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount."); return; }

    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/payments/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        camper_id: camperId,
        amount: amt,
        payment_method: method,
        notes,
        session_id: sessionId,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
    onSuccess(amt);
    setAmount("");
    setNotes("");
    setMethod("cash");
    setOpen(false);
  };

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-jubilee-navy font-medium hover:underline"
        >
          + Record Payment
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 p-4 bg-gray-50 rounded-xl space-y-3">
          <p className="text-sm font-medium text-jubilee-navy">Record Manual Payment</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError(""); }}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                autoFocus
              />
            </div>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !amount}
              className="bg-jubilee-green text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : `Record ${amount ? formatCurrency(parseFloat(amount) || 0) : "Payment"}`}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setAmount(""); setNotes(""); setError(""); }}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
