"use client";

import { useState } from "react";

interface Props {
  camperId: string;
  currentUserId?: string | null;
  staffUsers: { id: string; name: string; email: string }[];
}

export default function StaffAccountLink({ camperId, currentUserId, staffUsers }: Props) {
  const [selectedUserId, setSelectedUserId] = useState(currentUserId ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/campers/link-user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camper_id: camperId, user_id: selectedUserId || null }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const current = staffUsers.find(u => u.id === currentUserId);

  return (
    <div className="space-y-3">
      {current ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="w-6 h-6 rounded-full bg-jubilee-green/10 flex items-center justify-center text-xs">✓</span>
          <span className="font-medium text-jubilee-navy">{current.name}</span>
          <span className="text-gray-400">{current.email}</span>
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">No staff account linked yet.</p>
      )}

      <div className="flex gap-2 items-center">
        <select
          value={selectedUserId}
          onChange={e => setSelectedUserId(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
        >
          <option value="">— No linked account —</option>
          {staffUsers.map(u => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={saving || selectedUserId === (currentUserId ?? "")}
          className="bg-jubilee-navy text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Linking a staff account lets this person log in and see their store balance, photos, and messages.
        Their parents can also link to this camper record to manage their info.
      </p>
    </div>
  );
}
