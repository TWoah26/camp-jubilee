"use client";

import { useState } from "react";
import type { Camper } from "@/types";

const MAX_CHARS = 500;

interface Props {
  campers: Pick<Camper, "id" | "first_name" | "last_name">[];
  parentId: string;
}

export default function MessageComposer({ campers, parentId }: Props) {
  const [selectedCamper, setSelectedCamper] = useState(campers[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camper_id: selectedCamper, body, parent_id: parentId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to send message");
    } else {
      setSuccess(true);
      setBody("");
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {campers.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <select
            value={selectedCamper}
            onChange={e => setSelectedCamper(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {campers.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value.slice(0, MAX_CHARS))}
          rows={5}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold resize-none"
          placeholder={`Write a message to ${campers.find(c => c.id === selectedCamper)?.first_name ?? "your camper"}...`}
          required
        />
        <p className="text-right text-xs text-gray-400 mt-1">{body.length}/{MAX_CHARS}</p>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-jubilee-green text-sm font-medium">✓ Message sent!</p>}

      <button
        type="submit"
        disabled={loading || body.trim().length === 0}
        className="bg-jubilee-navy text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-jubilee-gold disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
