"use client";

import { useState } from "react";

interface Link { id: string; approved: boolean; parent: { id: string; name: string; email: string }; camper: { id: string; first_name: string; last_name: string } }
interface Props {
  links: Link[];
  campers: { id: string; first_name: string; last_name: string }[];
  parents: { id: string; name: string; email: string }[];
}

export default function ParentList({ links, campers, parents }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ parent_id: "", camper_id: "" });

  const pending = links.filter(l => !l.approved);
  const approved = links.filter(l => l.approved);

  const approve = async (id: string) => {
    setLoading(id);
    await fetch("/api/admin/parents/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link_id: id }),
    });
    setLoading(null);
    window.location.reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this link?")) return;
    setLoading(`rm-${id}`);
    await fetch("/api/admin/parents/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link_id: id }),
    });
    setLoading(null);
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

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-jubilee-navy mb-3">⏳ Pending Approvals ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map(link => (
              <div key={link.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                <div className="text-sm">
                  <p className="font-medium">{link.parent.name} <span className="text-gray-400">({link.parent.email})</span></p>
                  <p className="text-gray-500">→ {link.camper.first_name} {link.camper.last_name}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(link.id)} disabled={loading !== null} className="bg-jubilee-navy text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                    {loading === link.id ? "..." : "Approve"}
                  </button>
                  <button onClick={() => remove(link.id)} disabled={loading !== null} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium">
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => setShowManual(!showManual)} className="bg-white rounded-2xl shadow p-4 w-full text-left text-jubilee-navy font-medium hover:shadow-md">
        + Manually Link Parent to Camper
      </button>

      {showManual && (
        <form onSubmit={manualLink} className="bg-white rounded-2xl shadow p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent</label>
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
            {loading === "manual" ? "Linking..." : "Create Link (Auto-Approved)"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h2 className="font-semibold text-jubilee-navy">Approved Links ({approved.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Parent</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Camper</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {approved.map(link => (
              <tr key={link.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{link.parent.name}</p>
                  <p className="text-gray-400 text-xs">{link.parent.email}</p>
                </td>
                <td className="px-4 py-3">{link.camper.first_name} {link.camper.last_name}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(link.id)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
