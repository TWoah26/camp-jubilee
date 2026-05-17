"use client";

import { useState } from "react";

interface Camper {
  id: string;
  first_name: string;
  last_name: string;
  parent_email?: string | null;
  parent_name?: string | null;
  session_id?: string | null;
}
interface Link {
  id: string;
  approved: boolean;
  parent: { id: string; name: string; email: string };
  camper: { id: string; first_name: string; last_name: string };
}
interface Props {
  campers: Camper[];
  links: Link[];
  parents: { id: string; name: string; email: string }[];
  selectedSessionId: string | null;
  lastSignInMap: Record<string, string | null>;
}

type Status = "linked" | "pending" | "none";

function statusOf(camper: Camper, linkedCamperIds: Set<string>, invitedCamperIds?: Set<string>): Status {
  if (linkedCamperIds.has(camper.id)) return "linked";
  if (invitedCamperIds?.has(camper.id) || camper.parent_email) return "pending";
  return "none";
}

function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return "Never logged in";
  const d = new Date(iso);
  return `Last seen ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function ParentList({ campers, links, parents, selectedSessionId, lastSignInMap }: Props) {
  const approvedLinks = links.filter(l => l.approved);
  const pendingLinks = links.filter(l => !l.approved);
  const invitedLinks = pendingLinks; // approved: false means invite sent, not yet accepted
  const linkedCamperIds = new Set(approvedLinks.map(l => l.camper.id));
  const invitedCamperIds = new Set(invitedLinks.map(l => l.camper.id));

  // Map camper_id → linked parent(s)
  const linkedParentsByCamper: Record<string, { id: string; name: string; email: string }[]> = {};
  for (const l of approvedLinks) {
    if (!linkedParentsByCamper[l.camper.id]) linkedParentsByCamper[l.camper.id] = [];
    linkedParentsByCamper[l.camper.id].push(l.parent);
  }

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [loading, setLoading] = useState<string | null>(null);
  const [massResult, setMassResult] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ parent_email: "", parent_name: "" });

  // Manual link form
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ parent_id: "", camper_id: "" });

  const filtered = campers.filter(c => {
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    const email = (c.parent_email ?? "").toLowerCase();
    const pname = (c.parent_name ?? "").toLowerCase();
    if (search && !name.includes(search.toLowerCase()) && !email.includes(search.toLowerCase()) && !pname.includes(search.toLowerCase())) return false;
    if (filter !== "all" && statusOf(c, linkedCamperIds, invitedCamperIds) !== filter) return false;
    return true;
  });

  const unlinkedWithEmail = campers.filter(c => c.parent_email && !linkedCamperIds.has(c.id));

  const sendInvite = async (camper: Camper) => {
    if (!camper.parent_email) return;
    setLoading(`invite-${camper.id}`);
    const res = await fetch("/api/admin/parents/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camper_id: camper.id, email: camper.parent_email, name: camper.parent_name }),
    });
    setLoading(null);
    if (res.ok) window.location.reload();
    else alert("Invite failed — check the email address.");
  };

  const massInvite = async () => {
    if (!confirm(`Send invites to ${unlinkedWithEmail.length} parent(s) who don't have linked accounts yet?`)) return;
    setLoading("mass");
    const res = await fetch("/api/admin/parents/invite-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: selectedSessionId }),
    });
    const data = await res.json();
    setLoading(null);
    setMassResult(`Done — ${data.invited} new invite${data.invited !== 1 ? "s" : ""} sent, ${data.skipped} already had accounts.${data.errors?.length ? ` ${data.errors.length} failed.` : ""}`);
    window.location.reload();
  };

  const saveEdit = async (camper: Camper) => {
    setLoading(`edit-${camper.id}`);
    await fetch("/api/admin/campers/parent-contact", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camper_id: camper.id, parent_email: editData.parent_email, parent_name: editData.parent_name }),
    });
    setLoading(null);
    setEditingId(null);
    window.location.reload();
  };

  const manualLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("manual");
    await fetch("/api/admin/parents/manual-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manual),
    });
    setLoading(null);
    setShowManual(false);
    window.location.reload();
  };

  const removeLink = async (linkId: string) => {
    if (!confirm("Remove this link?")) return;
    setLoading(`rm-${linkId}`);
    await fetch("/api/admin/parents/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link_id: linkId }),
    });
    setLoading(null);
    window.location.reload();
  };

  const deleteAccount = async (parentId: string, parentName: string) => {
    if (!confirm(`Permanently delete ${parentName}'s account from Supabase? This cannot be undone.`)) return;
    setLoading(`del-${parentId}`);
    const res = await fetch(`/api/admin/parents/${parentId}`, { method: "DELETE" });
    setLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(`Delete failed: ${data.error ?? res.status}`);
      return;
    }
    window.location.reload();
  };

  const approveLink = async (linkId: string) => {
    setLoading(linkId);
    await fetch("/api/admin/parents/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link_id: linkId }),
    });
    setLoading(null);
    window.location.reload();
  };

  const linkedCount = campers.filter(c => linkedCamperIds.has(c.id)).length;
  const pendingCount = campers.filter(c => c.parent_email && !linkedCamperIds.has(c.id)).length;
  const noneCount = campers.filter(c => !c.parent_email && !linkedCamperIds.has(c.id)).length;

  return (
    <div className="space-y-5">

      {/* Pending approvals */}
      {pendingLinks.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-jubilee-navy mb-3">⏳ Pending Approvals ({pendingLinks.length})</h2>
          <div className="space-y-3">
            {pendingLinks.map(link => (
              <div key={link.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                <div className="text-sm">
                  <p className="font-medium">{link.parent.name} <span className="text-gray-400">({link.parent.email})</span></p>
                  <p className="text-gray-500">→ {link.camper.first_name} {link.camper.last_name}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveLink(link.id)} disabled={loading !== null} className="bg-jubilee-navy text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
                    {loading === link.id ? "..." : "Approve"}
                  </button>
                  <button onClick={() => removeLink(link.id)} disabled={loading !== null} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium">Deny</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats + mass invite */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-jubilee-green">{linkedCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">App Linked</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Invite Pending</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{noneCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">No Contact</p>
        </div>
      </div>

      {unlinkedWithEmail.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-amber-800 text-sm">{unlinkedWithEmail.length} camper{unlinkedWithEmail.length !== 1 ? "s" : ""} have a parent email but no linked account yet.</p>
            <p className="text-xs text-amber-600 mt-0.5">Send all invites at once — parents receive a link to create their account.</p>
          </div>
          <button
            onClick={massInvite}
            disabled={loading === "mass"}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shrink-0 disabled:opacity-50 transition-colors"
          >
            {loading === "mass" ? "Sending…" : "✉️ Invite All"}
          </button>
        </div>
      )}

      {massResult && (
        <div className="bg-jubilee-green/10 border border-jubilee-green/30 rounded-xl p-3 text-sm text-jubilee-green font-medium">{massResult}</div>
      )}

      {/* Search + filter */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search camper or parent…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
        />
        {(["all", "linked", "pending", "none"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-jubilee-navy text-white" : "bg-white border border-gray-200 text-gray-600"}`}
          >
            {f === "all" ? "All" : f === "linked" ? "✓ Linked" : f === "pending" ? "✉️ Pending" : "⚠️ No Contact"}
          </button>
        ))}
      </div>

      {/* Camper list */}
      <div className="bg-white rounded-2xl shadow divide-y">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">No campers match your filters.</p>
        ) : filtered.map(camper => {
          const status = statusOf(camper, linkedCamperIds, invitedCamperIds);
          const linkedParents = linkedParentsByCamper[camper.id] ?? [];
          const linkEntry = approvedLinks.find(l => l.camper.id === camper.id);
          const isEditing = editingId === camper.id;

          return (
            <div key={camper.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${status === "linked" ? "bg-jubilee-green" : status === "pending" ? "bg-amber-400" : "bg-gray-300"}`} />
                  <div className="min-w-0">
                    <p className="font-semibold text-jubilee-navy text-sm">{camper.first_name} {camper.last_name}</p>

                    {/* Linked accounts */}
                    {linkedParents.map(p => {
                      const lastSeen = lastSignInMap[p.id];
                      const hasLoggedIn = !!lastSeen;
                      return (
                        <div key={p.id} className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-xs text-gray-500">{p.name} · <span className="text-jubilee-green font-medium">{p.email}</span></p>
                          <span className={`text-xs font-medium ${hasLoggedIn ? "text-jubilee-green" : "text-amber-500"}`}>
                            · {formatLastSeen(lastSeen)}
                          </span>
                          <button
                            onClick={() => { const l = approvedLinks.find(lk => lk.camper.id === camper.id && lk.parent.id === p.id); if (l) removeLink(l.id); }}
                            className="text-xs text-gray-400 hover:text-red-500"
                          >Unlink</button>
                          <button
                            onClick={() => deleteAccount(p.id, p.name)}
                            disabled={loading === `del-${p.id}`}
                            className="text-xs text-red-400 hover:text-red-600 font-medium disabled:opacity-50"
                          >{loading === `del-${p.id}` ? "…" : "Delete account"}</button>
                        </div>
                      );
                    })}

                    {/* CSV email (if different from linked) */}
                    {camper.parent_email && !linkedParents.some(p => p.email === camper.parent_email) && !isEditing && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        {camper.parent_name ? `${camper.parent_name} · ` : ""}{camper.parent_email}
                        {status === "pending" && <span className="ml-1 text-amber-400">· invite not yet accepted</span>}
                      </p>
                    )}

                    {/* No contact */}
                    {status === "none" && !isEditing && (
                      <p className="text-xs text-gray-400 mt-0.5 italic">No parent contact on file</p>
                    )}

                    {/* Inline edit form */}
                    {isEditing && (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          placeholder="Parent name"
                          value={editData.parent_name}
                          onChange={e => setEditData(d => ({ ...d, parent_name: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                        />
                        <input
                          type="email"
                          placeholder="Parent email"
                          value={editData.parent_email}
                          onChange={e => setEditData(d => ({ ...d, parent_email: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(camper)}
                            disabled={loading === `edit-${camper.id}`}
                            className="bg-jubilee-navy text-white px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-50"
                          >
                            {loading === `edit-${camper.id}` ? "Saving…" : "Save"}
                          </button>
                          <button onClick={() => setEditingId(null)} className="border border-gray-200 text-gray-600 px-3 py-1 rounded-lg text-xs">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {!isEditing && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setEditingId(camper.id); setEditData({ parent_email: camper.parent_email ?? "", parent_name: camper.parent_name ?? "" }); }}
                      className="text-xs text-gray-400 hover:text-jubilee-navy border border-gray-200 px-2 py-1 rounded-lg"
                    >
                      {status === "none" ? "+ Add" : "Edit"}
                    </button>
                    {camper.parent_email && status !== "linked" && (
                      <button
                        onClick={() => sendInvite(camper)}
                        disabled={loading === `invite-${camper.id}`}
                        className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-2 py-1 rounded-lg font-medium disabled:opacity-50"
                      >
                        {loading === `invite-${camper.id}` ? "…" : "Resend Invite"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual link by existing account */}
      <button onClick={() => setShowManual(!showManual)} className="bg-white rounded-2xl shadow p-4 w-full text-left text-jubilee-navy font-medium hover:shadow-md text-sm">
        + Link an existing parent account to a camper
      </button>
      {showManual && (
        <form onSubmit={manualLink} className="bg-white rounded-2xl shadow p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent account</label>
            <select value={manual.parent_id} onChange={e => setManual(m => ({ ...m, parent_id: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required>
              <option value="">Select parent</option>
              {parents.map(p => <option key={p.id} value={p.id}>{p.name} ({p.email})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Camper</label>
            <select value={manual.camper_id} onChange={e => setManual(m => ({ ...m, camper_id: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required>
              <option value="">Select camper</option>
              {campers.map(c => <option key={c.id} value={c.id}>{c.last_name}, {c.first_name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading === "manual"} className="bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium">
            {loading === "manual" ? "Linking…" : "Link (Auto-Approved)"}
          </button>
        </form>
      )}
    </div>
  );
}
