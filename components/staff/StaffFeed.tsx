"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  commenter?: { name: string };
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
  poster?: { name: string };
  comments: Comment[];
}

interface Props {
  announcements: Announcement[];
  currentUserId: string;
  currentUserRole: string;
}

export default function StaffFeed({ announcements: initial, currentUserId, currentUserRole }: Props) {
  const [announcements, setAnnouncements] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(initial[0]?.id ?? null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const router = useRouter();

  const isAdmin = ["director", "administrator"].includes(currentUserRole);

  const toggle = (id: string) => setExpanded(e => e === id ? null : id);

  const setDraft = (announcementId: string, text: string) =>
    setDrafts(d => ({ ...d, [announcementId]: text }));

  const submitComment = async (announcementId: string) => {
    const body = drafts[announcementId]?.trim();
    if (!body) return;
    setSubmitting(announcementId);

    const res = await fetch(`/api/staff/announcements/${announcementId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const newComment = await res.json();
    setSubmitting(null);

    if (newComment.id) {
      setAnnouncements(prev =>
        prev.map(a =>
          a.id === announcementId
            ? { ...a, comments: [...a.comments, newComment] }
            : a
        )
      );
      setDrafts(d => ({ ...d, [announcementId]: "" }));
      router.refresh();
    }
  };

  const deleteComment = async (announcementId: string, commentId: string) => {
    await fetch(`/api/staff/announcements/${announcementId}/comments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: commentId }),
    });
    setAnnouncements(prev =>
      prev.map(a =>
        a.id === announcementId
          ? { ...a, comments: a.comments.filter(c => c.id !== commentId) }
          : a
      )
    );
    router.refresh();
  };

  if (announcements.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h2 className="font-semibold text-jubilee-navy mb-4">📋 Staff Board</h2>
      <div className="space-y-4">
        {announcements.map(a => (
          <div key={a.id} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Post header */}
            <button
              onClick={() => toggle(a.id)}
              className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-jubilee-navy">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.poster?.name ?? "Director"} · {formatDateTime(a.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.comments.length > 0 && (
                    <span className="text-xs bg-jubilee-gold/20 text-jubilee-navy px-2 py-0.5 rounded-full font-medium">
                      {a.comments.length} {a.comments.length === 1 ? "reply" : "replies"}
                    </span>
                  )}
                  <span className="text-gray-400 text-xs">{expanded === a.id ? "▲" : "▼"}</span>
                </div>
              </div>
            </button>

            {/* Expanded body + comments */}
            {expanded === a.id && (
              <div className="border-t border-gray-100">
                {a.body && (
                  <div className="px-4 py-3 bg-jubilee-cream/30">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.body}</p>
                  </div>
                )}

                {/* Comments */}
                {a.comments.length > 0 && (
                  <div className="px-4 py-3 space-y-3 border-t border-gray-100">
                    {a.comments.map(c => (
                      <div key={c.id} className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-jubilee-navy/10 flex items-center justify-center shrink-0 text-xs font-bold text-jubilee-navy">
                          {(c.commenter?.name ?? "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-medium text-sm text-jubilee-navy">{c.commenter?.name ?? "Staff"}</span>
                            <span className="text-xs text-gray-400">{formatDateTime(c.created_at)}</span>
                            {(c.user_id === currentUserId || isAdmin) && (
                              <button
                                onClick={() => deleteComment(a.id, c.id)}
                                className="text-xs text-gray-300 hover:text-red-400 ml-auto transition-colors"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">{c.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment input */}
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex gap-2">
                  <input
                    value={drafts[a.id] ?? ""}
                    onChange={e => setDraft(a.id, e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(a.id); } }}
                    placeholder="Add a reply…"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                  />
                  <button
                    onClick={() => submitComment(a.id)}
                    disabled={submitting === a.id || !drafts[a.id]?.trim()}
                    className="bg-jubilee-navy text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-jubilee-gold transition-colors shrink-0"
                  >
                    {submitting === a.id ? "…" : "Reply"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
