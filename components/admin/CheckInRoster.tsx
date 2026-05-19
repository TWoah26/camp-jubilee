"use client";

import { useState } from "react";
import CamperProfilePhotoUpload from "@/components/CamperProfilePhotoUpload";
import { format } from "date-fns";

const TIME_LABELS: Record<string, string> = {
  breakfast: "☀️ Breakfast",
  lunch: "🌤️ Lunch",
  dinner: "🌅 Dinner",
  bedtime: "🌙 Bedtime",
  as_needed: "⚡ As Needed",
};

type CheckinRecord = {
  checked_in: boolean;
  checked_in_at: string | null;
  checkin_notes: string | null;
  picked_up: boolean;
  picked_up_at: string | null;
  pickup_notes: string | null;
};

type Camper = {
  id: string;
  first_name: string;
  last_name: string;
  cabin: string | null;
  counselor_name: string | null;
  photo_url: string | null;
  is_staff: boolean;
  session_id: string | null;
  checkin_record: CheckinRecord | null;
  medical_info: any | null;
  medications: any[];
  tuition_commitment: number;
  tuition_paid: number;
  registration_notes: string | null;
};

interface Props {
  campers: Camper[];
  sessionId: string;
  sessionName: string;
  sessionTuitionAmount: number;
  role: string;
}

function StatusBadge({ record }: { record: CheckinRecord | null }) {
  if (!record || !record.checked_in) {
    return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">⏳ Not arrived</span>;
  }
  if (record.picked_up) {
    return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">🚗 Picked up</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-jubilee-green/20 text-jubilee-green font-medium">✓ Checked in</span>;
}

export default function CheckInRoster({ campers, sessionId, sessionName, sessionTuitionAmount, role }: Props) {
  const showFinances = role === "director" || role === "administrator";
  const [search, setSearch] = useState("");
  const [cabinFilter, setCabinFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "checked_in" | "picked_up">("all");
  const [selected, setSelected] = useState<Camper | null>(null);
  const [localRecords, setLocalRecords] = useState<Record<string, CheckinRecord>>(
    Object.fromEntries(campers.filter(c => c.checkin_record).map(c => [c.id, c.checkin_record!]))
  );
  const [saving, setSaving] = useState(false);
  const [checkinNotes, setCheckinNotes] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");

  const cabins = [...new Set(campers.map(c => c.cabin).filter(Boolean))].sort() as string[];

  const filtered = campers.filter(c => {
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (cabinFilter !== "all" && c.cabin !== cabinFilter) return false;
    const rec = localRecords[c.id];
    if (statusFilter === "pending" && rec?.checked_in) return false;
    if (statusFilter === "checked_in" && (!rec?.checked_in || rec?.picked_up)) return false;
    if (statusFilter === "picked_up" && !rec?.picked_up) return false;
    return true;
  }).sort((a, b) => {
    // Sort: pending first, then checked-in, then picked up; within each group by name
    const statusOrder = (c: Camper) => {
      const r = localRecords[c.id];
      if (!r?.checked_in) return 0;
      if (!r?.picked_up) return 1;
      return 2;
    };
    const diff = statusOrder(a) - statusOrder(b);
    if (diff !== 0) return diff;
    return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
  });

  const checkedInCount = campers.filter(c => localRecords[c.id]?.checked_in).length;
  const pickedUpCount = campers.filter(c => localRecords[c.id]?.picked_up).length;

  const openPanel = (camper: Camper) => {
    setSelected(camper);
    const rec = localRecords[camper.id];
    setCheckinNotes(rec?.checkin_notes ?? "");
    setPickupNotes(rec?.pickup_notes ?? "");
  };

  const closePanel = () => setSelected(null);

  const doAction = async (camper: Camper, action: string, notes?: string) => {
    setSaving(true);
    const res = await fetch("/api/admin/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camper_id: camper.id, session_id: sessionId, action, notes }),
    });
    if (res.ok) {
      const now = new Date().toISOString();
      setLocalRecords(prev => {
        const cur = prev[camper.id] ?? { checked_in: false, checked_in_at: null, checkin_notes: null, picked_up: false, picked_up_at: null, pickup_notes: null };
        let updated = { ...cur };
        if (action === "checkin") updated = { ...updated, checked_in: true, checked_in_at: now, checkin_notes: notes ?? "" };
        if (action === "undo_checkin") updated = { ...updated, checked_in: false, checked_in_at: null, checkin_notes: "" };
        if (action === "pickup") updated = { ...updated, picked_up: true, picked_up_at: now, pickup_notes: notes ?? "" };
        if (action === "undo_pickup") updated = { ...updated, picked_up: false, picked_up_at: null, pickup_notes: "" };
        if (action === "update_notes") updated = { ...updated, checkin_notes: notes ?? "" };
        return { ...prev, [camper.id]: updated };
      });
    }
    setSaving(false);
  };

  const rec = selected ? localRecords[selected.id] : null;
  const m = selected?.medical_info;
  const hasAlerts = !!(m?.food_allergies || m?.medication_allergies || m?.environmental_allergies || m?.conditions);

  return (
    <div className="flex gap-6 h-full">
      {/* Left: list */}
      <div className={`flex-1 space-y-4 ${selected ? "hidden lg:block" : ""}`}>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-jubilee-navy">{campers.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Expected</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-jubilee-green">{checkedInCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Checked In</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{pickedUpCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Picked Up</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search camper…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold flex-1 min-w-40"
          />
          {cabins.length > 0 && (
            <select
              value={cabinFilter}
              onChange={e => setCabinFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
            >
              <option value="all">All Cabins</option>
              {cabins.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap">
          {([
            { value: "all", label: "All" },
            { value: "pending", label: "⏳ Not arrived" },
            { value: "checked_in", label: "✓ Here" },
            { value: "picked_up", label: "🚗 Picked up" },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === opt.value ? "bg-jubilee-navy text-white" : "bg-white border border-gray-300 text-gray-600"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-500">{filtered.length} camper{filtered.length !== 1 ? "s" : ""}</p>

        {/* Camper list */}
        <div className="space-y-2">
          {filtered.map(camper => {
            const r = localRecords[camper.id];
            const isSelected = selected?.id === camper.id;
            const effectiveCommitment = camper.tuition_commitment > 0 ? camper.tuition_commitment : sessionTuitionAmount;
            const balanceDue = effectiveCommitment - camper.tuition_paid;
            return (
              <button
                key={camper.id}
                onClick={() => openPanel(camper)}
                className={`w-full bg-white rounded-xl shadow px-4 py-3 flex items-center gap-3 text-left hover:shadow-md transition-shadow border-2 ${isSelected ? "border-jubilee-gold" : "border-transparent"}`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-jubilee-green-light flex items-center justify-center text-white font-bold text-sm">
                  {camper.photo_url
                    ? <img src={camper.photo_url} alt="" className="w-full h-full object-cover" />
                    : <span>{camper.first_name[0]}{camper.last_name[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-jubilee-navy truncate">{camper.first_name} {camper.last_name}</p>
                  <p className="text-xs text-gray-400">{camper.cabin ?? "No cabin"}{camper.counselor_name ? ` · ${camper.counselor_name}` : ""}</p>
                  {showFinances && balanceDue > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium mt-0.5">
                      💰 Balance Due: ${balanceDue.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {camper.medical_info && (camper.medical_info.food_allergies || camper.medical_info.medication_allergies || camper.medical_info.environmental_allergies || camper.medical_info.conditions) && (
                    <span className="text-xs text-red-500" title="Has medical alerts">⚠️</span>
                  )}
                  <StatusBadge record={r ?? null} />
                  <span className="text-gray-300">›</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
              <div className="text-4xl mb-3">🏕️</div>
              <p>No campers match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: detail panel */}
      {selected && (
        <div className="w-full lg:w-[420px] shrink-0">
          <div className="bg-white rounded-2xl shadow sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
            {/* Panel header */}
            <div className="flex items-center gap-3 p-5 border-b border-gray-100">
              <div className="shrink-0">
                <CamperProfilePhotoUpload
                  camperId={selected.id}
                  camperName={`${selected.first_name} ${selected.last_name}`}
                  currentPhotoUrl={selected.photo_url}
                  size="sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-jubilee-navy text-lg leading-tight">{selected.first_name} {selected.last_name}</p>
                <p className="text-xs text-gray-400">{selected.cabin ?? "No cabin"}{selected.counselor_name ? ` · ${selected.counselor_name}` : ""}</p>
              </div>
              <button onClick={closePanel} className="text-gray-400 hover:text-gray-600 text-lg font-light ml-2">✕</button>
            </div>

            <div className="p-5 space-y-5">
              {/* Current status */}
              <div className="flex items-center justify-between">
                <StatusBadge record={rec ?? null} />
                {rec?.checked_in_at && (
                  <p className="text-xs text-gray-400">
                    {rec.picked_up ? "Picked up" : "Arrived"} {format(new Date(rec.picked_up ? rec.picked_up_at! : rec.checked_in_at), "h:mm a")}
                  </p>
                )}
              </div>

              {/* Registration notes */}
              {selected.registration_notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">📋 Registration Notes</p>
                  <p className="text-sm text-amber-800">{selected.registration_notes}</p>
                </div>
              )}

              {/* Balance due alert */}
              {showFinances && (() => {
                const effectiveCommitment = selected.tuition_commitment > 0 ? selected.tuition_commitment : sessionTuitionAmount;
                const balanceDue = effectiveCommitment - selected.tuition_paid;
                return balanceDue > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">💰 Outstanding Balance</p>
                    <p className="text-sm text-amber-800">
                      <span className="font-bold">${balanceDue.toFixed(2)}</span> remaining of {effectiveCommitment === sessionTuitionAmount ? "session default" : "custom"} commitment (${effectiveCommitment.toFixed(2)})
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">${selected.tuition_paid.toFixed(2)} paid so far</p>
                  </div>
                ) : null;
              })()}

              {/* Medical alerts */}
              {hasAlerts && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">⚠️ Medical Alerts — Verify with Parent</p>
                  {m.food_allergies && <p className="text-sm text-red-700"><span className="font-medium">Food:</span> {m.food_allergies}</p>}
                  {m.medication_allergies && <p className="text-sm text-red-700"><span className="font-medium">Meds:</span> {m.medication_allergies}</p>}
                  {m.environmental_allergies && <p className="text-sm text-orange-700"><span className="font-medium">Environmental:</span> {m.environmental_allergies}</p>}
                  {m.conditions && <p className="text-sm text-blue-700"><span className="font-medium">Conditions:</span> {m.conditions}</p>}
                </div>
              )}

              {/* Medications */}
              {selected.medications.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">💊 Medications</p>
                  <div className="space-y-2">
                    {selected.medications.map((med: any) => (
                      <div key={med.id} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm">
                        <p className="font-medium text-jubilee-navy">{med.name}{med.dose && <span className="font-normal text-gray-600"> — {med.dose}</span>}</p>
                        {med.frequency && <p className="text-gray-500 text-xs">{med.frequency}</p>}
                        {(med.time_of_day ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(med.time_of_day as string[]).map((t: string) => (
                              <span key={t} className="text-xs bg-jubilee-navy text-white px-1.5 py-0.5 rounded-full">{TIME_LABELS[t] ?? t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency contacts */}
              {m && (m.emergency_contact_1_name || m.emergency_contact_2_name) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🚨 Emergency Contacts</p>
                  <div className="space-y-2 text-sm">
                    {m.emergency_contact_1_name && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="font-medium">{m.emergency_contact_1_name} <span className="text-gray-400 font-normal">({m.emergency_contact_1_relationship})</span></p>
                        <p className="text-jubilee-navy">{m.emergency_contact_1_phone}</p>
                      </div>
                    )}
                    {m.emergency_contact_2_name && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="font-medium">{m.emergency_contact_2_name} <span className="text-gray-400 font-normal">({m.emergency_contact_2_relationship})</span></p>
                        <p className="text-jubilee-navy">{m.emergency_contact_2_phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Insurance */}
              {m?.insurance_provider && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">🛡️ Insurance</p>
                  <p className="text-sm">{m.insurance_provider}{m.insurance_policy_number ? ` — ${m.insurance_policy_number}` : ""}</p>
                </div>
              )}

              {!m && (
                <p className="text-sm text-gray-400 italic">No medical information submitted yet.</p>
              )}

              <hr className="border-gray-100" />

              {/* Check-in section */}
              {!rec?.checked_in ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-In Notes</p>
                  <textarea
                    value={checkinNotes}
                    onChange={e => setCheckinNotes(e.target.value)}
                    placeholder="Any notes from arrival (medications brought, special circumstances…)"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold resize-none"
                  />
                  <button
                    onClick={() => doAction(selected, "checkin", checkinNotes)}
                    disabled={saving}
                    className="w-full bg-jubilee-green text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-jubilee-green/90 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving…" : `✓ Check In ${selected.first_name}`}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Show/edit check-in notes */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-In Notes</p>
                    <textarea
                      value={checkinNotes}
                      onChange={e => setCheckinNotes(e.target.value)}
                      onBlur={() => doAction(selected, "update_notes", checkinNotes)}
                      placeholder="Any notes from arrival…"
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold resize-none"
                    />
                  </div>

                  {/* Pickup section */}
                  {!rec.picked_up ? (
                    <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">🚗 Mark as Picked Up</p>
                      <textarea
                        value={pickupNotes}
                        onChange={e => setPickupNotes(e.target.value)}
                        placeholder="Who picked them up? Reason for early departure?"
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold resize-none bg-white"
                      />
                      <button
                        onClick={() => doAction(selected, "pickup", pickupNotes)}
                        disabled={saving}
                        className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-purple-700 disabled:opacity-50"
                      >
                        {saving ? "Saving…" : "🚗 Mark as Picked Up"}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">🚗 Picked Up</p>
                      {rec.picked_up_at && <p className="text-xs text-gray-500">{format(new Date(rec.picked_up_at), "MMM d, h:mm a")}</p>}
                      {rec.pickup_notes && <p className="text-sm text-gray-700">{rec.pickup_notes}</p>}
                      <button
                        onClick={() => doAction(selected, "undo_pickup")}
                        disabled={saving}
                        className="text-xs text-purple-500 hover:text-purple-700 underline"
                      >
                        Undo pickup
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => doAction(selected, "undo_checkin")}
                    disabled={saving}
                    className="text-xs text-gray-400 hover:text-gray-600 underline w-full text-center"
                  >
                    Undo check-in
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
