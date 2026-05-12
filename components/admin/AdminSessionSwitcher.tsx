"use client";

import { useState } from "react";
import type { Session } from "@/types";

interface Props {
  sessions: Session[];
  currentSessionId: string | null;
}

export default function AdminSessionSwitcher({ sessions, currentSessionId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setLoading(true);
    await fetch("/api/admin/session/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: value || null }),
    });
    // router.refresh() doesn't reliably re-run server components after a cookie
    // change — do a hard navigation to the current path instead.
    window.location.reload();
  };

  return (
    <div className="px-4 pb-3 border-b border-white/10">
      <p className="text-white/40 text-xs uppercase tracking-widest mb-1.5">Session</p>
      <select
        value={currentSessionId ?? ""}
        onChange={handleChange}
        disabled={loading}
        className="w-full bg-white/10 text-white text-sm rounded-lg px-3 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-jubilee-gold disabled:opacity-50 cursor-pointer"
      >
        <option value="">All Sessions</option>
        {sessions.map(s => (
          <option key={s.id} value={s.id}>
            {s.name}{s.is_active ? " ●" : s.session_closed ? " ✓" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
