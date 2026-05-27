"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/utils";

interface Comment {
  id: string;
  body: string;
  created_at: string;
  commenter?: { name: string };
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
  poster?: { name: string };
  comments?: Comment[];
}

interface Props {
  initialAnnouncements: Announcement[];
  directorName?: string;
  directorId?: string;
}

export default function StaffAnnouncementsEditor({ initialAnnouncements, directorName, directorId }: Props) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [form, setForm] = useState({ title: "", body: "" });
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentSaving, setCommentSaving] = useState<string | null>(null);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/admin/staff-announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { error: `Non-JSON response: ${text.slice(0, 100)}` }; }
      if (data.id) {
        setAnnouncements(prev => [{ ...data, poster: undefined, comments: [] }, ...prev]);
        setForm({ title: "", body: "" });
      } else {
        setPostError(data.error ?? "Something went wrong. Try again.");
      }
    } catch (err: any) {
      setPostError(err?.message ?? "Network error. Try again.");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await fetch("/api/admin/staff-announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const addComment = async (announcementId: string) => {
    const body = commentDrafts[announcementId]?.trim();
    if (!body) return;
    setCommentSaving(announcementId);
    try {
      const res = await fetch(`/api/staff/announcements/${announcementId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (data.id) {
        const newComment: Comment = {
          ...data,
          commenter: { name: directorName ?? "Director" },
        };
        setAnnouncements(prev =>
          prev.map(a => a.id === announcementId
            ? { ...a, comments: [...(a.comments ?? []), newComment] }
            : a
          )
        );
        setCommentDrafts(prev => ({ ...prev, [announcementId]: "" }));
      }
    } finally {
      setCommentSaving(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-5 space-y-5">
      <h2 className="font-semibold text-jubilee-navy">📋 Staff Board</h2>

      <form onSubmit={post} className="space-y-3">
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Post title"
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
        />
        <textarea
          value={form.body}
          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          placeholder="Write your message to staff…"
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
        />
        <button
          type="submit"
          disabled={posting}
          className="bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-jubilee-gold transition-colors"
        >
          {posting ? "Posting…" : "Post to Staff"}
        </button>
        {postError && <p className="text-red-500 text-sm mt-2">{postError}</p>}
      </form>

      {announcements.length > 0 && (
        <div className="space-y-3 pt-1">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Posted</h3>
          {announcements.map(a => (
            <div key={a.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-3 flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-jubilee-navy">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(a.created_at)}</p>
                  {a.body && <p className="text-sm text-gray-600 mt-1">{a.body}</p>}
                  <button
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className="text-xs text-jubilee-gold mt-2 hover:underline"
                  >
                    {a.comments?.length
                      ? `${a.comments.length} comment${a.comments.length !== 1 ? "s" : ""} ${expanded === a.id ? "▲" : "▼"}`
                      : expanded === a.id ? "Close ▲" : "Reply ▼"}
                  </button>
                </div>
                <button onClick={() => remove(a.id)} className="text-red-400 hover:text-red-600 text-xs shrink-0">
                  Delete
                </button>
              </div>

              {expanded === a.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-3 py-3 space-y-3">
                  {(a.comments ?? []).length > 0 && (
                    <div className="space-y-2">
                      {(a.comments ?? []).map(c => (
                        <div key={c.id} className="text-sm">
                          <span className="font-medium text-jubilee-navy">{c.commenter?.name ?? "Staff"}</span>
                          <span className="text-gray-400 text-xs ml-2">{formatDateTime(c.created_at)}</span>
                          <p className="text-gray-600 mt-0.5">{c.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentDrafts[a.id] ?? ""}
                      onChange={e => setCommentDrafts(prev => ({ ...prev, [a.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addComment(a.id)}
                      placeholder="Reply as director…"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold bg-white"
                    />
                    <button
                      onClick={() => addComment(a.id)}
                      disabled={commentSaving === a.id || !commentDrafts[a.id]?.trim()}
                      className="bg-jubilee-navy text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-jubilee-gold transition-colors"
                    >
                      {commentSaving === a.id ? "…" : "Reply"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
