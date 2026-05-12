"use client";

import { useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Session } from "@/types";

interface Props {
  storeTransactions: any[];
  tuitionPayments: any[];
  balanceChoices: any[];
  sessions: Session[];
  campers: any[];
  parents: any[];
  defaultSessionId?: string | null;
}

const METHOD_LABELS: Record<string, string> = {
  square: "Online",
  in_person: "In Person",
  check: "Check",
  scholarship: "Scholarship",
  cash: "Cash",
};

export default function FinancesPanel({ storeTransactions, tuitionPayments, balanceChoices, sessions, campers, parents, defaultSessionId }: Props) {
  const [tab, setTab] = useState<"store" | "tuition" | "eod">("tuition");
  const [selectedSessionId, setSelectedSessionId] = useState<string>(defaultSessionId ?? "all");
  const [closing, setClosing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    camper_id: campers[0]?.id ?? "",
    parent_id: "",
    amount: "",
    payment_method: "in_person",
    notes: "",
    session_id: "",
  });

  const selectedSession = sessions.find(s => s.id === selectedSessionId) ?? null;

  // Filter data by selected session
  const filteredTuition = selectedSessionId === "all"
    ? tuitionPayments
    : tuitionPayments.filter((p: any) => p.session_id === selectedSessionId);

  const filteredChoices = selectedSessionId === "all"
    ? balanceChoices
    : balanceChoices.filter((c: any) => c.session_id === selectedSessionId);

  const totalTuition = filteredTuition.reduce((s: number, p: any) => s + p.amount, 0);
  const totalStore = storeTransactions.filter((t: any) => t.type === "credit").reduce((s: number, t: any) => s + t.amount, 0);

  const handleClose = async () => {
    const sessionToClose = selectedSession ?? sessions.find(s => s.is_active && !s.session_closed);
    if (!sessionToClose) return alert("Select or activate a session to close.");
    if (!confirm(`Close "${sessionToClose.name}"? This will prompt parents to choose refund or donate.`)) return;
    setClosing(true);
    await fetch("/api/admin/session/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionToClose.id }),
    });
    setClosing(false);
    window.location.reload();
  };

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return alert("Enter a valid amount.");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payments/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setForm(f => ({ ...f, amount: "", notes: "" }));
        window.location.reload();
      } else {
        alert(data.error ?? "Something went wrong.");
      }
    } finally {
      setSaving(false);
    }
  };

  const activeCloseable = sessions.filter(s => s.is_active && !s.session_closed);

  return (
    <div className="space-y-4">
      {/* Session filter */}
      <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-3">
        <label className="text-sm font-medium text-jubilee-navy whitespace-nowrap">Viewing:</label>
        <select
          value={selectedSessionId}
          onChange={e => setSelectedSessionId(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
        >
          <option value="all">All Sessions</option>
          {sessions.map((s: Session) => (
            <option key={s.id} value={s.id}>
              {s.name}{s.is_active ? " (Active)" : s.session_closed ? " (Closed)" : " (Upcoming)"}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-jubilee-navy rounded-xl p-4 text-white">
          <p className="text-white/70 text-sm">
            {selectedSessionId === "all" ? "Total" : selectedSession?.name} Registration Fees
          </p>
          <p className="text-2xl font-bold">{formatCurrency(totalTuition)}</p>
        </div>
        <div className="bg-jubilee-gold rounded-xl p-4 text-white">
          <p className="text-white/70 text-sm">Total Store Funded</p>
          <p className="text-2xl font-bold">{formatCurrency(totalStore)}</p>
        </div>
      </div>

      {/* End-of-session close button */}
      {activeCloseable.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-semibold text-jubilee-navy mb-2">End-of-Session</h3>
          <p className="text-sm text-gray-600 mb-3">Close a session to prompt parents to choose refund or donate for remaining store balances.</p>
          <div className="flex flex-wrap gap-2">
            {activeCloseable.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedSessionId(s.id); handleClose(); }}
                disabled={closing}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {closing ? "Closing..." : `Close "${s.name}"`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["tuition", "store", "eod"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-full text-sm font-medium ${tab === t ? "bg-jubilee-navy text-white" : "bg-white border border-gray-300"}`}>
              {t === "tuition" ? "Registration Fees" : t === "eod" ? "Balance Choices" : "Store"}
            </button>
          ))}
        </div>
        {tab === "tuition" && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="bg-jubilee-gold text-white px-4 py-1.5 rounded-full text-sm font-medium hover:opacity-90"
          >
            + Record Payment
          </button>
        )}
      </div>

      {tab === "tuition" && showForm && (
        <form onSubmit={handleRecord} className="bg-white rounded-2xl shadow p-5 space-y-3">
          <h3 className="font-semibold text-jubilee-navy">Record In-Person / Manual Registration Fee</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Session</label>
              <select
                value={form.session_id}
                onChange={e => setForm(f => ({ ...f, session_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Select session —</option>
                {sessions.map((s: Session) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Camper</label>
              <select
                value={form.camper_id}
                onChange={e => setForm(f => ({ ...f, camper_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              >
                {campers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Parent (optional)</label>
              <select
                value={form.parent_id}
                onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— No parent account —</option>
                {parents.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Method</label>
              <select
                value={form.payment_method}
                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="in_person">In Person</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="scholarship">Scholarship</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                placeholder="e.g. Check #1234"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-jubilee-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold disabled:opacity-50">
              {saving ? "Saving..." : "Save Payment"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {tab === "tuition" && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Camper</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Parent</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Session</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Method</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Amount</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Notes</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
            </tr></thead>
            <tbody className="divide-y">
              {filteredTuition.map((p: any) => {
                const session = sessions.find(s => s.id === p.session_id);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{p.camper?.first_name} {p.camper?.last_name}</td>
                    <td className="px-4 py-2 text-gray-500">{p.parent?.name}</td>
                    <td className="px-4 py-2 text-gray-500">{session?.name ?? "—"}</td>
                    <td className="px-4 py-2">{METHOD_LABELS[p.payment_method] ?? p.payment_method ?? "Online"}</td>
                    <td className="px-4 py-2 font-medium text-jubilee-green">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-2 text-gray-400">{p.notes || "—"}</td>
                    <td className="px-4 py-2 text-gray-400">{formatDateTime(p.paid_at)}</td>
                  </tr>
                );
              })}
              {filteredTuition.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No payments yet</td></tr>}
            </tbody>
          </table>
        )}

        {tab === "store" && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Camper</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Amount</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Note</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
            </tr></thead>
            <tbody className="divide-y">
              {storeTransactions.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{t.camper?.first_name} {t.camper?.last_name}</td>
                  <td className="px-4 py-2 capitalize">{t.type}</td>
                  <td className={`px-4 py-2 font-medium ${t.type === "credit" ? "text-jubilee-green" : "text-red-500"}`}>
                    {t.type === "credit" ? "+" : "-"}{formatCurrency(Math.abs(t.amount))}
                  </td>
                  <td className="px-4 py-2 text-gray-400">{t.note || "—"}</td>
                  <td className="px-4 py-2 text-gray-400">{formatDateTime(t.created_at)}</td>
                </tr>
              ))}
              {storeTransactions.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No transactions yet</td></tr>}
            </tbody>
          </table>
        )}

        {tab === "eod" && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Camper</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Parent</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">💚 Donate</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">💸 Refund</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Total</th>
            </tr></thead>
            <tbody className="divide-y">
              {filteredChoices.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{c.camper?.first_name} {c.camper?.last_name}</td>
                  <td className="px-4 py-2 text-gray-500">{c.parent?.name}</td>
                  <td className="px-4 py-2 text-jubilee-green font-medium">{c.donate_amount > 0 ? formatCurrency(c.donate_amount) : "—"}</td>
                  <td className="px-4 py-2 text-jubilee-navy font-medium">{c.refund_amount > 0 ? formatCurrency(c.refund_amount) : "—"}</td>
                  <td className="px-4 py-2 text-gray-500">{formatCurrency(c.balance_at_close)}</td>
                </tr>
              ))}
              {filteredChoices.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No choices yet</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
