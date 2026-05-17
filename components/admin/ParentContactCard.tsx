"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  camperId: string;
  parentEmail: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentLinks: { id: string; parent: { id: string; name: string; email: string } }[];
}

export default function ParentContactCard({ camperId, parentEmail, parentName, parentPhone, parentLinks }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(parentEmail ?? "");
  const [name, setName] = useState(parentName ?? "");
  const [phone, setPhone] = useState(parentPhone ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch("/api/admin/campers/parent-contact", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camper_id: camperId, parent_email: email, parent_name: name, parent_phone: phone }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  const cancel = () => {
    setEditing(false);
    setEmail(parentEmail ?? "");
    setName(parentName ?? "");
    setPhone(parentPhone ?? "");
  };

  const linkedEmails = new Set(parentLinks.map(l => l.parent?.email));
  const displayEmail = editing ? email : (parentEmail ?? "");
  const displayName = editing ? name : (parentName ?? "");
  const displayPhone = editing ? phone : (parentPhone ?? "");

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-jubilee-navy">Parent / Contact</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-400 hover:text-jubilee-navy border border-gray-200 px-2 py-1 rounded-lg"
          >
            {parentEmail ? "Edit" : "+ Add"}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Linked app accounts */}
        {parentLinks.length > 0 && (
          <div className="space-y-2">
            {parentLinks.map((l: any) => (
              <div key={l.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-jubilee-green/10 flex items-center justify-center text-xs shrink-0">✓</div>
                <div>
                  <p className="text-sm font-medium">{l.parent?.name}</p>
                  <p className="text-xs text-gray-400">{l.parent?.email} <span className="text-jubilee-green font-medium">· App linked</span></p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Saved contact info (if not editing) */}
        {!editing && parentEmail && !linkedEmails.has(parentEmail) && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs shrink-0">✉️</div>
            <div>
              <p className="text-sm font-medium">{parentName || "Parent"}</p>
              <p className="text-xs text-gray-400">{parentEmail} <span className="text-amber-500 font-medium">· Invite pending</span></p>
              {parentPhone && <p className="text-xs text-gray-400">{parentPhone}</p>}
            </div>
          </div>
        )}

        {/* Linked account but show phone if present */}
        {!editing && parentLinks.length > 0 && parentPhone && (
          <p className="text-xs text-gray-400 pl-10">{parentPhone}</p>
        )}

        {/* No contact */}
        {!editing && !parentEmail && parentLinks.length === 0 && (
          <p className="text-sm text-gray-400 italic">No parent contact on file.</p>
        )}

        {/* Edit form */}
        {editing && (
          <div className="space-y-2 pt-1">
            <input
              type="text"
              placeholder="Parent name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
            />
            <input
              type="email"
              placeholder="Parent email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={save}
                disabled={saving}
                className="bg-jubilee-navy text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={cancel}
                className="border border-gray-200 text-gray-600 px-4 py-1.5 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
