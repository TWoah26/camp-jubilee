"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";

interface Props {
  camperId: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  cabin: string | null;
  counselorName: string | null;
  camperCode: string;
}

export default function CamperInfoCard({ camperId, firstName, lastName, dob, cabin, counselorName, camperCode }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    first_name: firstName,
    last_name: lastName,
    dob: dob ?? "",
    cabin: cabin ?? "",
    counselor_name: counselorName ?? "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/campers/${camperId}/info`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  if (editing) {
    return (
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-jubilee-navy">Camper Info</h2>
          <button onClick={() => { setEditing(false); setError(""); }} className="text-sm text-gray-400 hover:text-gray-600">✕ Cancel</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
              <input value={form.first_name} onChange={set("first_name")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-jubilee-gold" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
              <input value={form.last_name} onChange={set("last_name")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-jubilee-gold" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date of Birth</label>
            <input type="date" value={form.dob} onChange={set("dob")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-jubilee-gold" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cabin</label>
            <input value={form.cabin} onChange={set("cabin")} placeholder="e.g. Cabin 4, Eagles…" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-jubilee-gold" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Counselor Name</label>
            <input value={form.counselor_name} onChange={set("counselor_name")} placeholder="e.g. Jake" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-jubilee-gold" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Camper Code</label>
            <p className="font-mono text-xs text-gray-400 px-3 py-2">{camperCode}</p>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-jubilee-navy text-white py-2.5 rounded-lg text-sm font-medium hover:bg-jubilee-gold transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-jubilee-navy">Camper Info</h2>
        <button onClick={() => setEditing(true)} className="text-sm text-jubilee-navy hover:text-jubilee-gold font-medium">✏️ Edit</button>
      </div>
      <dl className="space-y-2 text-sm">
        {dob && <div className="flex justify-between"><dt className="text-gray-500">Date of Birth</dt><dd className="font-medium">{formatDate(dob)}</dd></div>}
        {form.cabin ? (
          <div className="flex justify-between"><dt className="text-gray-500">Cabin</dt><dd className="font-medium">{form.cabin}</dd></div>
        ) : (
          <div className="flex justify-between"><dt className="text-gray-500">Cabin</dt><dd className="text-gray-400 italic">Not assigned</dd></div>
        )}
        {form.counselor_name && <div className="flex justify-between"><dt className="text-gray-500">Counselor</dt><dd className="font-medium">{form.counselor_name}</dd></div>}
        <div className="flex justify-between"><dt className="text-gray-500">Camper Code</dt><dd className="font-mono text-xs text-gray-600">{camperCode}</dd></div>
      </dl>
      {saved && <p className="text-jubilee-green text-xs mt-2 font-medium">✓ Saved!</p>}
    </div>
  );
}
