"use client";

import { useState } from "react";
import type { Session } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface SessionStat { revenue: number; camperCount: number }
interface Props {
  sessions: Session[];
  sessionStats?: Record<string, SessionStat>;
}

export default function SessionForm({ sessions, sessionStats = {} }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "", deposit_amount: "", tuition_amount: "", deposit_due_date: "", tuition_due_date: "" });

  const handleToggle = async (sessionId: string, field: "is_active" | "show_cabin_info", current: boolean) => {
    setLoading(`${sessionId}-${field}`);
    await fetch("/api/admin/session/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, field, value: !current }),
    });
    setLoading(null);
    window.location.reload();
  };

  const handleReopen = async (sessionId: string) => {
    if (!confirm("Reopen this session? This will mark it as active again.")) return;
    setLoading(`${sessionId}-reopen`);
    await fetch("/api/admin/session/reopen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
    setLoading(null);
    window.location.reload();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("create");
    await fetch("/api/admin/session/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        deposit_amount: parseFloat(form.deposit_amount) || 0,
        tuition_amount: parseFloat(form.tuition_amount) || 0,
      }),
    });
    setLoading(null);
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      {sessions.map(s => (
        <div key={s.id} className="bg-white rounded-2xl shadow p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-jubilee-navy text-lg">{s.name}</h3>
              <p className="text-sm text-gray-500">{s.start_date} – {s.end_date}</p>
            </div>
            <div className="flex gap-2 items-center">
              {s.session_closed && <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">Closed</span>}
              {s.is_active && !s.session_closed && <span className="bg-jubilee-navy text-white text-xs px-2 py-1 rounded-full">Active</span>}
              {!s.is_active && !s.session_closed && <span className="bg-jubilee-gold/20 text-jubilee-brown text-xs px-2 py-1 rounded-full">Upcoming</span>}
            </div>
          </div>

          {/* Enrollment stats */}
          {sessionStats[s.id] && (
            <div className="flex gap-4 mb-4 text-sm">
              <div className="bg-jubilee-green/10 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">Enrolled</p>
                <p className="font-semibold text-jubilee-green">{sessionStats[s.id].camperCount} camper{sessionStats[s.id].camperCount !== 1 ? "s" : ""}</p>
              </div>
              <div className="bg-jubilee-navy/10 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">Fees Collected</p>
                <p className="font-semibold text-jubilee-navy">{formatCurrency(sessionStats[s.id].revenue)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500">Deposit</p>
              <p className="font-semibold">{formatCurrency(s.deposit_amount)}</p>
              {s.deposit_due_date && <p className="text-xs text-gray-400">Due {s.deposit_due_date}</p>}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500">Registration Fee</p>
              <p className="font-semibold">{formatCurrency(s.tuition_amount)}</p>
              {s.tuition_due_date && <p className="text-xs text-gray-400">Due {s.tuition_due_date}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {s.session_closed ? (
              <button
                onClick={() => handleReopen(s.id)}
                disabled={loading !== null}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-jubilee-navy text-white hover:bg-jubilee-gold"
              >
                {loading === `${s.id}-reopen` ? "..." : "Reopen Session"}
              </button>
            ) : (
              <button
                onClick={() => handleToggle(s.id, "is_active", s.is_active)}
                disabled={loading !== null}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${s.is_active ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-jubilee-navy text-white hover:bg-jubilee-gold"}`}
              >
                {loading === `${s.id}-is_active` ? "..." : s.is_active ? "Deactivate Session" : "Activate Session"}
              </button>
            )}
            <button
              onClick={() => handleToggle(s.id, "show_cabin_info", s.show_cabin_info)}
              disabled={loading !== null}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${s.show_cabin_info ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
            >
              {loading === `${s.id}-show_cabin_info` ? "..." : s.show_cabin_info ? "Hide Cabin Info" : "Reveal Cabin Info"}
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={() => setShowNew(!showNew)}
        className="w-full bg-white rounded-2xl shadow p-4 text-jubilee-navy font-medium hover:shadow-md transition-shadow text-left"
      >
        + Create New Session
      </button>

      {showNew && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow p-5 space-y-4">
          <h3 className="font-semibold text-jubilee-navy">New Session</h3>
          {[
            { name: "name", label: "Session Name", type: "text", placeholder: "Summer 2025" },
            { name: "start_date", label: "Start Date", type: "date" },
            { name: "end_date", label: "End Date", type: "date" },
            { name: "deposit_amount", label: "Deposit Amount ($)", type: "number" },
            { name: "deposit_due_date", label: "Deposit Due Date", type: "date" },
            { name: "tuition_amount", label: "Full Registration Fee ($)", type: "number" },
            { name: "tuition_due_date", label: "Registration Fee Due Date", type: "date" },
          ].map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <input
                type={field.type}
                value={(form as any)[field.name]}
                onChange={e => setForm(f => ({ ...f, [field.name]: e.target.value }))}
                placeholder={(field as any).placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                required={["name", "start_date", "end_date"].includes(field.name)}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading === "create"}
            className="bg-jubilee-navy text-white px-6 py-2.5 rounded-lg text-sm font-medium"
          >
            {loading === "create" ? "Creating..." : "Create Session"}
          </button>
        </form>
      )}
    </div>
  );
}
