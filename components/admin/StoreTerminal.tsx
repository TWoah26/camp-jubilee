"use client";

import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

type Camper = { id: string; first_name: string; last_name: string; cabin: string | null; photo_url: string | null; store_balance: number };

interface Props {
  campers: Camper[];
  role: string;
  initialQuickAmounts: number[];
}

export default function StoreTerminal({ campers: initial, role, initialQuickAmounts }: Props) {
  const [campers, setCampers] = useState(initial);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Camper | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{ name: string; amount: number; balance: number; note: string } | null>(null);
  const [error, setError] = useState("");

  // Add funds via Square POS
  const [fundAmount, setFundAmount] = useState("");
  const [fundError, setFundError] = useState("");

  // Quick amounts
  const [quickAmounts, setQuickAmounts] = useState<number[]>(initialQuickAmounts);
  const [editingAmounts, setEditingAmounts] = useState(false);
  const [draftAmounts, setDraftAmounts] = useState<string[]>(initialQuickAmounts.map(String));
  const [savingAmounts, setSavingAmounts] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canEdit = role === "director" || role === "administrator";

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = campers
    .filter(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));

  const selectCamper = (c: Camper) => {
    setSelected(c);
    setAmount("");
    setNote("");
    setError("");
    setLastReceipt(null);
  };

  const handlePurchase = async () => {
    if (!selected || !amount) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount."); return; }
    if (amt > selected.store_balance) { setError(`Insufficient balance. Max: ${formatCurrency(selected.store_balance)}`); return; }

    setProcessing(true);
    setError("");
    const res = await fetch("/api/admin/store/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camper_id: selected.id, amount: amt, note }),
    });
    const data = await res.json();
    setProcessing(false);

    if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }

    setCampers(prev => prev.map(c => c.id === selected.id ? { ...c, store_balance: data.new_balance } : c));
    setSelected({ ...selected, store_balance: data.new_balance });
    setLastReceipt({ name: `${selected.first_name} ${selected.last_name}`, amount: amt, balance: data.new_balance, note });
    setAmount("");
    setNote("");
  };

  const handleSquareCharge = () => {
    const amt = parseFloat(fundAmount);
    if (isNaN(amt) || amt <= 0) { setFundError("Enter a valid amount."); return; }
    if (!selected) return;
    setFundError("");
    const amountCents = Math.round(amt * 100);
    const callbackUrl = `${window.location.origin}/admin/store/pos-callback`;
    const clientTransactionId = `${selected.id}___${amountCents}___${Date.now()}`;
    const payload = JSON.stringify({
      amount_money: { amount: amountCents, currency_code: "USD" },
      callback_url: callbackUrl,
      client_transaction_id: clientTransactionId,
      version: "1.3",
      notes: `Store credit - ${selected.first_name} ${selected.last_name}`,
    });
    const encoded = btoa(payload);
    window.location.href = `square-commerce-v1://payment/create?data=${encodeURIComponent(encoded)}`;
  };

  const openEdit = () => {
    setDraftAmounts(quickAmounts.map(String));
    setEditingAmounts(true);
    setMenuOpen(false);
  };

  const saveAmounts = async () => {
    const parsed = draftAmounts.map(v => parseFloat(v));
    if (parsed.some(v => isNaN(v) || v <= 0)) return;
    setSavingAmounts(true);
    await fetch("/api/admin/store/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quick_amounts: parsed }),
    });
    setQuickAmounts(parsed);
    setEditingAmounts(false);
    setSavingAmounts(false);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left: camper list */}
      <div className={`flex-1 space-y-3 ${selected ? "hidden lg:block" : ""}`}>
        <input
          type="text"
          placeholder="Search camper…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
        />
        <div className="space-y-2">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => selectCamper(c)}
              className={`w-full bg-white rounded-xl shadow px-4 py-3 flex items-center gap-3 text-left hover:shadow-md transition-shadow border-2 ${selected?.id === c.id ? "border-jubilee-gold" : "border-transparent"}`}
            >
              <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-jubilee-green-light flex items-center justify-center text-white font-bold text-sm">
                {c.photo_url
                  ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                  : <span>{c.first_name[0]}{c.last_name[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-jubilee-navy truncate">{c.first_name} {c.last_name}</p>
                {c.cabin && <p className="text-xs text-gray-400">{c.cabin}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className={`font-bold text-sm ${c.store_balance > 0 ? "text-jubilee-green" : "text-gray-400"}`}>
                  {formatCurrency(c.store_balance)}
                </p>
                <p className="text-xs text-gray-400">balance</p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">
              <div className="text-3xl mb-2">🛍️</div>
              <p>No campers found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: purchase panel */}
      {selected && (
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white rounded-2xl shadow sticky top-4">
            {/* Header */}
            <div className="bg-jubilee-navy text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-white/20 flex items-center justify-center text-white font-bold">
                  {selected.photo_url
                    ? <img src={selected.photo_url} alt="" className="w-full h-full object-cover" />
                    : <span>{selected.first_name[0]}{selected.last_name[0]}</span>}
                </div>
                <div>
                  <p className="font-bold leading-tight">{selected.first_name} {selected.last_name}</p>
                  {selected.cabin && <p className="text-white/60 text-xs">{selected.cabin}</p>}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/50 hover:text-white text-lg">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Balance */}
              <div className="text-center py-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Store Balance</p>
                <p className={`text-4xl font-bold ${selected.store_balance > 0 ? "text-jubilee-green" : "text-gray-400"}`}>
                  {formatCurrency(selected.store_balance)}
                </p>
              </div>

              {/* Success receipt */}
              {lastReceipt && (
                <div className="bg-jubilee-green/10 border border-jubilee-green/20 rounded-xl p-3 text-center">
                  <p className="text-jubilee-green font-semibold text-sm">✓ Purchase complete!</p>
                  {lastReceipt.note && <p className="text-xs text-gray-500 mt-0.5 italic">{lastReceipt.note}</p>}
                  <p className="text-sm text-gray-600 mt-1">{formatCurrency(lastReceipt.amount)} charged</p>
                  <p className="text-xs text-gray-400">New balance: {formatCurrency(lastReceipt.balance)}</p>
                </div>
              )}

              {selected.store_balance > 0 ? (
                <div className="space-y-4">
                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Purchase Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={selected.store_balance}
                        value={amount}
                        onChange={e => { setAmount(e.target.value); setError(""); }}
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-xl pl-7 pr-3 py-3 text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-jubilee-gold text-center"
                      />
                    </div>
                    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                  </div>

                  {/* Note / Item */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Item / Note</label>
                    <input
                      type="text"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="e.g. T-shirt, snack, etc."
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                    />
                  </div>

                  {/* Quick amounts */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-500">Quick Amounts</span>
                      {canEdit && (
                        <div className="relative" ref={menuRef}>
                          <button
                            onClick={() => setMenuOpen(o => !o)}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                            title="Edit quick amounts"
                          >
                            ⋯
                          </button>
                          {menuOpen && (
                            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 w-44">
                              <button
                                onClick={openEdit}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-jubilee-navy"
                              >
                                ✏️ Edit quick amounts
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {editingAmounts ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          {draftAmounts.map((v, i) => (
                            <div key={i} className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={v}
                                onChange={e => {
                                  const next = [...draftAmounts];
                                  next[i] = e.target.value;
                                  setDraftAmounts(next);
                                }}
                                className="w-full border border-jubilee-gold rounded-lg pl-5 pr-1 py-1.5 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={saveAmounts}
                            disabled={savingAmounts}
                            className="flex-1 bg-jubilee-navy text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                          >
                            {savingAmounts ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingAmounts(false)}
                            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {quickAmounts.map(v => (
                          <button key={v} type="button" onClick={() => setAmount(String(v))}
                            className="py-2 border border-gray-200 rounded-lg text-sm font-medium hover:border-jubilee-gold hover:text-jubilee-navy transition-colors">
                            {formatCurrency(v)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handlePurchase}
                    disabled={processing || !amount}
                    className="w-full bg-jubilee-gold text-white py-3 rounded-xl font-bold text-base hover:bg-jubilee-navy transition-colors disabled:opacity-50"
                  >
                    {processing ? "Processing…" : `Charge ${amount ? formatCurrency(parseFloat(amount) || 0) : "$0.00"}`}
                  </button>
                </div>
              ) : (
                <p className="text-center text-gray-400 text-sm py-4">No balance available.</p>
              )}


              {/* Add Funds via Square POS */}
              {canEdit && (
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <p className="text-xs font-medium text-gray-500">Add Funds via Square</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={fundAmount}
                      onChange={e => { setFundAmount(e.target.value); setFundError(""); }}
                      placeholder="0.00"
                      className="w-full border border-gray-300 rounded-xl pl-7 pr-3 py-3 text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-jubilee-gold text-center"
                    />
                  </div>
                  {fundError && <p className="text-red-500 text-xs">{fundError}</p>}
                  <button
                    onClick={handleSquareCharge}
                    disabled={!fundAmount}
                    className="w-full bg-jubilee-navy text-white py-3 rounded-xl font-bold text-sm hover:bg-jubilee-gold transition-colors disabled:opacity-50"
                  >
                    💳 Charge with Square
                  </button>
                  <p className="text-xs text-gray-400 text-center">Card · Apple Pay · Google Pay</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
