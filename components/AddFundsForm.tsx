"use client";

import { useState } from "react";

export default function AddFundsForm({ camperId, parentId }: { camperId: string; parentId: string }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) return alert("Enter a valid amount.");
    setLoading(true);
    try {
      const res = await fetch("/api/payments/add-funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camper_id: camperId, parent_id: parentId, amount: value }),
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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
        <input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
          placeholder="0.00"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-jubilee-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold disabled:opacity-50"
      >
        {loading ? "..." : "Add Funds"}
      </button>
    </form>
  );
}
