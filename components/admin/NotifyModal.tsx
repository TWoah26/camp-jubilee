"use client";

import { useState } from "react";

interface Recipient { id: string; name: string; }

interface Props {
  recipients: Recipient[];
  defaultTitle?: string;
  defaultBody?: string;
  onClose: () => void;
}

export default function NotifyModal({ recipients, defaultTitle = "", defaultBody = "", onClose }: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [result, setResult] = useState<{ sent: number; total: number; noTokens?: boolean } | null>(null);

  const send = async () => {
    if (!title.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: recipients.map(r => r.id), title, body }),
      });
      const data = await res.json();
      setResult(data);
      setStatus(data.error ? "error" : "done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-jubilee-navy text-lg">Send Notification</h2>
          <p className="text-sm text-gray-500 mt-1">
            To {recipients.length} parent{recipients.length !== 1 ? "s" : ""}
            {recipients.length <= 3 && `: ${recipients.map(r => r.name).join(", ")}`}
          </p>
        </div>

        {status === "done" ? (
          <div className="p-6 text-center">
            <div className="text-3xl mb-3">{result?.noTokens ? "⚠️" : "✅"}</div>
            {result?.noTokens ? (
              <p className="text-gray-600 text-sm">None of these parents have enabled push notifications yet.</p>
            ) : (
              <p className="text-gray-600 text-sm">Sent to {result?.sent} of {result?.total} device{result?.total !== 1 ? "s" : ""}.</p>
            )}
            <button onClick={onClose} className="mt-4 bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold transition-colors">
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                placeholder="Notification title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold resize-none"
                placeholder="Additional details..."
              />
            </div>
            {status === "error" && <p className="text-red-500 text-sm">Something went wrong. Try again.</p>}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={status === "sending" || !title.trim()}
                className="flex-1 bg-jubilee-navy text-white py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold transition-colors disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
