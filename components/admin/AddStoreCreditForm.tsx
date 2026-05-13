"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  camperId: string;
  currentBalance: number;
  onSuccess: (newBalance: number) => void;
}

export default function AddStoreCreditForm({ camperId, currentBalance, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount."); return; }

    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/store/credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camper_id: camperId, amount: amt, note }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
    onSuccess(data.new_balance);
    setAmount("");
    setNote("");
    setOpen(false);
  };

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-white/70 hover:text-white font-medium hover:underline"
        >
          + Add Store Credit
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 p-4 bg-gray-50 rounded-xl space-y-3">
          <p className="text-sm font-medium text-jubilee-navy">Add Store Credit</p>
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
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                autoFocus
              />
            </div>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !amount}
              className="bg-jubilee-navy text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Adding…" : `Add ${amount ? formatCurrency(parseFloat(amount) || 0) : "Credit"}`}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setAmount(""); setNote(""); setError(""); }}
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
