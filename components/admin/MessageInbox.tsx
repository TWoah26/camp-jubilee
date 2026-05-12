"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/utils";

interface Msg {
  id: string;
  body: string;
  sent_at: string;
  status: string;
  delivered_at: string | null;
  from_parent: { name: string };
  to_camper: { first_name: string; last_name: string };
}

interface Props { messages: Msg[] }

export default function MessageInbox({ messages: initial }: Props) {
  const [messages, setMessages] = useState(initial);
  const [filter, setFilter] = useState<"unread" | "delivered" | "all">("unread");
  const [loading, setLoading] = useState<string | null>(null);

  const unreadCount = messages.filter(m => m.status === "unread").length;
  const deliveredCount = messages.filter(m => m.status === "delivered").length;

  const filtered = messages
    .filter(m => filter === "all" || m.status === filter)
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());

  const markDelivered = async (msg: Msg) => {
    setLoading(msg.id);
    const res = await fetch("/api/admin/messages/deliver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: msg.id }),
    });
    if (res.ok) {
      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, status: "delivered", delivered_at: new Date().toISOString() } : m
      ));
    }
    setLoading(null);
  };

  const printMsg = (msg: Msg) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Message for ${msg.to_camper.first_name}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 560px; margin: 48px auto; padding: 24px; }
        h2 { font-size: 20px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
        .body { font-size: 16px; line-height: 1.6; border-left: 3px solid #ccc; padding-left: 16px; margin: 24px 0; }
        .footer { font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 16px; margin-top: 32px; }
      </style>
      </head><body>
        <h2>✉️ Message for ${msg.to_camper.first_name} ${msg.to_camper.last_name}</h2>
        <div class="meta">From: ${msg.from_parent.name} &nbsp;·&nbsp; Sent: ${formatDateTime(msg.sent_at)}</div>
        <div class="body">${msg.body.replace(/\n/g, "<br>")}</div>
        <div class="footer">
          Delivered by: ___________________________ &nbsp;&nbsp; Time: ___________
        </div>
      </body></html>
    `);
    w.print();
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs with counts */}
      <div className="flex gap-2">
        {([
          { value: "unread", label: "Unread", count: unreadCount },
          { value: "delivered", label: "Delivered", count: deliveredCount },
          { value: "all", label: "All", count: messages.length },
        ] as const).map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${filter === f.value ? "bg-jubilee-navy text-white" : "bg-white border border-gray-300 text-gray-700"}`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${filter === f.value ? "bg-white/20 text-white" : f.value === "unread" ? "bg-jubilee-gold text-white" : "bg-gray-100 text-gray-500"}`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">✉️</div>
          <p>{filter === "unread" ? "No unread messages — all caught up!" : `No ${filter} messages.`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(msg => (
            <div
              key={msg.id}
              className={`bg-white rounded-2xl shadow p-5 border-l-4 transition-colors ${
                msg.status === "unread" ? "border-jubilee-gold" : "border-jubilee-green/40"
              }`}
            >
              <div className="flex justify-between items-start gap-4 mb-3">
                <div>
                  <p className="font-semibold text-jubilee-navy">
                    To: {msg.to_camper.first_name} {msg.to_camper.last_name}
                  </p>
                  <p className="text-sm text-gray-500">From: {msg.from_parent.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(msg.sent_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  {msg.status === "unread" ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-jubilee-gold/20 text-jubilee-navy font-medium">Unread</span>
                  ) : (
                    <div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-jubilee-green/10 text-jubilee-green font-medium">✓ Delivered</span>
                      {msg.delivered_at && (
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(msg.delivered_at)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{msg.body}</p>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => printMsg(msg)}
                  className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                  🖨️ Print Slip
                </button>
                {msg.status === "unread" && (
                  <button
                    onClick={() => markDelivered(msg)}
                    disabled={loading === msg.id}
                    className="bg-jubilee-navy text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-jubilee-gold transition-colors disabled:opacity-50"
                  >
                    {loading === msg.id ? "…" : "✓ Mark Delivered"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
