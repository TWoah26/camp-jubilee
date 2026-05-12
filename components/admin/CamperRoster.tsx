"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { Camper } from "@/types";
import { formatCurrency } from "@/lib/utils";

type CamperWithSession = Camper & { session?: { name: string } | null };

interface Props {
  campers: CamperWithSession[];
  staff: CamperWithSession[];
  sessions: { id: string; name: string }[];
  initialSearch?: string;
}

export default function CamperRoster({ campers, staff, sessions, initialSearch = "" }: Props) {
  const [tab, setTab] = useState<"campers" | "staff">("campers");
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [cabinFilter, setCabinFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [camperForm, setCamperForm] = useState({ first_name: "", last_name: "", dob: "", cabin: "", counselor_name: "", session_id: "" });
  const [staffForm, setStaffForm] = useState({ first_name: "", last_name: "", dob: "", cabin: "" });
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>(
    Object.fromEntries([...campers, ...staff].filter(c => c.photo_url).map(c => [c.id, c.photo_url!]))
  );
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pendingCamperId = useRef<string | null>(null);

  const isStaffTab = tab === "staff";
  const list = isStaffTab ? staff : campers;

  // Unique cabin list from campers (excluding blanks), sorted
  const cabins = [...new Set(campers.map(c => c.cabin).filter(Boolean))].sort() as string[];

  const filtered = list
    .filter(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()))
    .filter(c => cabinFilter === "all" || c.cabin === cabinFilter)
    .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));

  const handleAddCamper = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/campers/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...camperForm, is_staff: false }),
    });
    setLoading(false);
    window.location.reload();
  };

  const handleProfilePhotoClick = (camperId: string) => {
    pendingCamperId.current = camperId;
    photoInputRef.current?.click();
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const camperId = pendingCamperId.current;
    if (!file || !camperId) return;
    setUploadingPhotoFor(camperId);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("camper_id", camperId);
    const res = await fetch("/api/admin/campers/profile-photo", { method: "POST", body: formData });
    const data = await res.json();
    if (data.url) setPhotoUrls(prev => ({ ...prev, [camperId]: data.url }));
    setUploadingPhotoFor(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/campers/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...staffForm, is_staff: true }),
    });
    setLoading(false);
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => { setTab("campers"); setShowAdd(false); }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${tab === "campers" ? "bg-jubilee-navy text-white" : "bg-white border border-gray-300 text-gray-600"}`}
        >
          🧒 Campers ({campers.length})
        </button>
        <button
          onClick={() => { setTab("staff"); setShowAdd(false); }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${tab === "staff" ? "bg-jubilee-navy text-white" : "bg-white border border-gray-300 text-gray-600"}`}
        >
          🎽 Staff ({staff.length})
        </button>
      </div>

      {/* Search + Sort + Add */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${isStaffTab ? "staff" : "campers"}...`}
          className="flex-1 min-w-40 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
        />
        {!isStaffTab && cabins.length > 0 && (
          <select
            value={cabinFilter}
            onChange={e => setCabinFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
          >
            <option value="all">All Cabins</option>
            {cabins.map(cabin => (
              <option key={cabin} value={cabin}>{cabin}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-jubilee-navy text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Add {isStaffTab ? "Staff" : "Camper"}
        </button>
      </div>

      {/* Add Camper form */}
      {showAdd && !isStaffTab && (
        <form onSubmit={handleAddCamper} className="bg-white rounded-2xl shadow p-5 space-y-3">
          <h3 className="font-semibold text-jubilee-navy">New Camper</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "first_name", label: "First Name" },
              { name: "last_name", label: "Last Name" },
              { name: "dob", label: "Date of Birth", type: "date" },
              { name: "cabin", label: "Cabin" },
              { name: "counselor_name", label: "Counselor" },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input
                  type={f.type ?? "text"}
                  value={(camperForm as any)[f.name]}
                  onChange={e => setCamperForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  required={["first_name", "last_name"].includes(f.name)}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Session</label>
              <select
                value={camperForm.session_id}
                onChange={e => setCamperForm(prev => ({ ...prev, session_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="">None</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading} className="bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? "Adding..." : "Add Camper"}
          </button>
        </form>
      )}

      {/* Add Staff form */}
      {showAdd && isStaffTab && (
        <form onSubmit={handleAddStaff} className="bg-white rounded-2xl shadow p-5 space-y-3">
          <h3 className="font-semibold text-jubilee-navy">New Staff Member</h3>
          <p className="text-xs text-gray-500">Staff work across all sessions — no session assignment needed. Share their camper code with their parents to link accounts.</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "first_name", label: "First Name" },
              { name: "last_name", label: "Last Name" },
              { name: "dob", label: "Date of Birth", type: "date" },
              { name: "cabin", label: "Team / Area (optional)", placeholder: "e.g. Counselor, Kitchen" },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input
                  type={f.type ?? "text"}
                  value={(staffForm as any)[f.name]}
                  onChange={e => setStaffForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                  placeholder={(f as any).placeholder ?? ""}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  required={["first_name", "last_name"].includes(f.name)}
                />
              </div>
            ))}
          </div>
          <button type="submit" disabled={loading} className="bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? "Adding..." : "Add Staff Member"}
          </button>
        </form>
      )}

      {/* Hidden profile photo input */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoChange} />

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Photo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              {!isStaffTab && <th className="text-left px-4 py-3 font-medium text-gray-600">Session</th>}
              <th className="text-left px-4 py-3 font-medium text-gray-600">{isStaffTab ? "Team / Area" : "Cabin"}</th>
              {!isStaffTab && <th className="text-left px-4 py-3 font-medium text-gray-600">Counselor</th>}
              <th className="text-left px-4 py-3 font-medium text-gray-600">Balance</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-jubilee-cream/50 cursor-pointer group">
                <td className="px-4 py-3">
                  <button
                    onClick={e => { e.stopPropagation(); handleProfilePhotoClick(c.id); }}
                    title="Upload profile photo"
                    className="relative w-9 h-9 rounded-full overflow-hidden bg-jubilee-green-light flex items-center justify-center text-white font-bold text-sm hover:opacity-80 transition group/photo"
                  >
                    {uploadingPhotoFor === c.id ? (
                      <span className="text-xs animate-pulse">…</span>
                    ) : photoUrls[c.id] ? (
                      <img src={photoUrls[c.id]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{c.first_name[0]}{c.last_name[0]}</span>
                    )}
                    <span className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center text-white text-xs transition">📷</span>
                  </button>
                </td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/campers/${c.id}`} className="hover:text-jubilee-gold transition-colors">
                    {c.last_name}, {c.first_name}
                  </Link>
                  {c.is_staff && <span className="ml-2 text-xs bg-jubilee-gold/20 text-jubilee-brown px-1.5 py-0.5 rounded-full">Staff</span>}
                </td>
                {!isStaffTab && <td className="px-4 py-3 text-gray-500">{c.session?.name ?? "—"}</td>}
                <td className="px-4 py-3 text-gray-500">{c.cabin || "—"}</td>
                {!isStaffTab && <td className="px-4 py-3 text-gray-500">{c.counselor_name || "—"}</td>}
                <td className="px-4 py-3">{formatCurrency(c.store_balance)}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.camper_code}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={isStaffTab ? 5 : 7} className="px-4 py-8 text-center text-gray-400">
                No {isStaffTab ? "staff" : "campers"} found
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
