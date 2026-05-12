"use client";

import { useState } from "react";
import type { InfoPage, Announcement } from "@/types";
import { formatDateTime } from "@/lib/utils";

interface Props {
  pages: InfoPage[];
  announcements: Announcement[];
  directorId: string;
}

export default function InfoEditor({ pages, announcements, directorId }: Props) {
  const [saving, setSaving] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState<Record<string, string>>(
    Object.fromEntries(pages.map(p => [p.slug, p.content]))
  );
  const [localAnnouncements, setLocalAnnouncements] = useState(announcements);
  const [newUpdate, setNewUpdate] = useState({ title: "", body: "" });
  const [posting, setPosting] = useState(false);

  const savePage = async (slug: string, pageId: string) => {
    setSaving(slug);
    await fetch("/api/admin/info/save-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_id: pageId, content: pageContent[slug] }),
    });
    setSaving(null);
  };

  const postUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    const res = await fetch("/api/admin/info/announcement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newUpdate, posted_by: directorId }),
    });
    const data = await res.json();
    setPosting(false);
    if (data.id || data.success) {
      setLocalAnnouncements(prev => [{
        id: data.id ?? `temp-${Date.now()}`,
        title: newUpdate.title,
        body: newUpdate.body,
        created_at: new Date().toISOString(),
        posted_by: directorId,
      } as any, ...prev]);
    }
    setNewUpdate({ title: "", body: "" });
  };

  const deleteUpdate = async (id: string) => {
    if (!confirm("Delete this update?")) return;
    await fetch("/api/admin/info/announcement", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setLocalAnnouncements(prev => prev.filter((a: any) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Updates manager */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-semibold text-jubilee-navy mb-4">📢 Post an Update</h2>
        <form onSubmit={postUpdate} className="space-y-3">
          <input
            value={newUpdate.title}
            onChange={e => setNewUpdate(u => ({ ...u, title: e.target.value }))}
            placeholder="Update title"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
            required
          />
          <textarea
            value={newUpdate.body}
            onChange={e => setNewUpdate(u => ({ ...u, body: e.target.value }))}
            placeholder="Write your update…"
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
            required
          />
          <button type="submit" disabled={posting} className="bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {posting ? "Posting…" : "Post Update"}
          </button>
        </form>

        {localAnnouncements.length > 0 && (
          <div className="mt-5 space-y-3">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Posted Updates</h3>
            {localAnnouncements.map((a: any) => (
              <div key={a.id} className="border border-gray-200 rounded-xl p-3 flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm text-jubilee-navy">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(a.created_at)}</p>
                  <p className="text-sm text-gray-600 mt-1">{a.body}</p>
                </div>
                <button onClick={() => deleteUpdate(a.id)} className="text-red-400 hover:text-red-600 text-xs ml-4 shrink-0">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info page editors */}
      {pages.map(page => (
        <div key={page.slug} className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-jubilee-navy mb-3">{page.title}</h2>
          <textarea
            value={pageContent[page.slug] ?? ""}
            onChange={e => setPageContent(c => ({ ...c, [page.slug]: e.target.value }))}
            rows={8}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y font-mono focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
            placeholder={`Enter content for ${page.title}…`}
          />
          <button
            onClick={() => savePage(page.slug, page.id)}
            disabled={saving === page.slug}
            className="mt-2 bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving === page.slug ? "Saving…" : "Save"}
          </button>
        </div>
      ))}
    </div>
  );
}
