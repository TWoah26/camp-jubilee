"use client";

import { useState } from "react";

type Medication = { id: string; name: string; dose: string; frequency: string; instructions: string; time_of_day?: string[] };

const TIME_OPTIONS = [
  { value: "breakfast", label: "☀️ Breakfast" },
  { value: "lunch",     label: "🌤️ Lunch" },
  { value: "dinner",    label: "🌅 Dinner" },
  { value: "bedtime",   label: "🌙 Bedtime" },
  { value: "as_needed", label: "⚡ As Needed" },
];
type MedInfo = {
  food_allergies?: string;
  medication_allergies?: string;
  environmental_allergies?: string;
  conditions?: string;
  doctor_name?: string;
  doctor_phone?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  emergency_contact_1_name?: string;
  emergency_contact_1_relationship?: string;
  emergency_contact_1_phone?: string;
  emergency_contact_2_name?: string;
  emergency_contact_2_relationship?: string;
  emergency_contact_2_phone?: string;
  additional_notes?: string;
  updated_at?: string;
};

type Parent = { id: string; name: string; email: string };

type Camper = {
  id: string;
  first_name: string;
  last_name: string;
  cabin?: string;
  is_staff: boolean;
  session_id?: string;
  session?: { name: string } | null;
  medical_info?: MedInfo | null;
  medications?: Medication[];
  parents?: Parent[];
};

interface Props {
  campers: Camper[];
  sessions: { id: string; name: string }[];
}

function hasAlerts(c: Camper) {
  const m = c.medical_info;
  if (!m) return false;
  return !!(m.food_allergies || m.medication_allergies || m.environmental_allergies || m.conditions);
}

function Pill({ label, color }: { label: string; color: string }) {
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>;
}

function CamperCard({ camper, timeFilter }: { camper: Camper; timeFilter: string }) {
  const [open, setOpen] = useState(false);
  const m = camper.medical_info;
  const allMeds = camper.medications ?? [];
  // When a time filter is active, only show meds matching that time
  const meds = timeFilter === "all"
    ? allMeds
    : allMeds.filter(med => (med.time_of_day ?? []).includes(timeFilter));
  const alerts = hasAlerts(camper);
  const hasInfo = !!m;

  return (
    <div className={`bg-white rounded-2xl shadow border-l-4 ${alerts ? "border-red-400" : hasInfo ? "border-jubilee-green" : "border-gray-200"}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-jubilee-navy">{camper.first_name} {camper.last_name}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {camper.session?.name && (
                <Pill label={camper.session.name} color="bg-jubilee-navy/10 text-jubilee-navy" />
              )}
              {camper.cabin && (
                <Pill label={`Cabin: ${camper.cabin}`} color="bg-gray-100 text-gray-600" />
              )}
              {camper.is_staff && (
                <Pill label="Staff" color="bg-jubilee-gold/20 text-jubilee-brown" />
              )}
              {alerts && (
                <Pill label="⚠ Alerts" color="bg-red-100 text-red-700" />
              )}
              {allMeds.length > 0 && (
                <Pill label={`💊 ${allMeds.length} med${allMeds.length !== 1 ? "s" : ""}`} color="bg-blue-100 text-blue-700" />
              )}
              {m?.insurance_provider && (
                <Pill label="🛡️ Insurance on file" color="bg-green-100 text-green-700" />
              )}
              {!hasInfo && (
                <Pill label="No info submitted" color="bg-gray-100 text-gray-400" />
              )}
            </div>
          </div>
        </div>
        <span className="text-gray-400 text-sm ml-4 shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 space-y-4 pt-4">

          {/* Linked Parents / Contacts */}
          {(camper.parents ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">👨‍👩‍👧 Linked Parents</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {(camper.parents ?? []).map(p => (
                  <div key={p.id} className="bg-jubilee-navy/5 rounded-lg p-3 text-sm">
                    <p className="font-medium text-jubilee-navy">{p.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{p.email}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Contacts from medical form */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🚨 Emergency Contacts</p>
            {!hasInfo ? (
              <p className="text-xs text-gray-400 italic">Medical form not yet submitted — no emergency contacts on file.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {m?.emergency_contact_1_name ? (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium">{m.emergency_contact_1_name}
                      {m.emergency_contact_1_relationship && <span className="text-gray-400 font-normal"> ({m.emergency_contact_1_relationship})</span>}
                    </p>
                    {m.emergency_contact_1_phone && <p className="text-jubilee-navy mt-0.5">{m.emergency_contact_1_phone}</p>}
                  </div>
                ) : <p className="text-gray-400 text-xs">Contact 1 not provided</p>}
                {m?.emergency_contact_2_name && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium">{m.emergency_contact_2_name}
                      {m.emergency_contact_2_relationship && <span className="text-gray-400 font-normal"> ({m.emergency_contact_2_relationship})</span>}
                    </p>
                    {m.emergency_contact_2_phone && <p className="text-jubilee-navy mt-0.5">{m.emergency_contact_2_phone}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Allergies */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">⚠️ Allergies</p>
            {!hasInfo || !(m?.food_allergies || m?.medication_allergies || m?.environmental_allergies) ? (
              <p className="text-xs text-gray-400 italic">{hasInfo ? "None reported" : "No form submitted yet"}</p>
            ) : (
              <div className="space-y-1.5 text-sm">
                {m?.food_allergies && <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2"><span className="text-red-600 font-medium">Food: </span>{m.food_allergies}</div>}
                {m?.medication_allergies && <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2"><span className="text-orange-600 font-medium">Medication: </span>{m.medication_allergies}</div>}
                {m?.environmental_allergies && <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2"><span className="text-yellow-700 font-medium">Environmental: </span>{m.environmental_allergies}</div>}
              </div>
            )}
          </div>

          {/* Conditions */}
          {hasInfo && m?.conditions && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🏥 Medical Conditions</p>
              <p className="text-sm bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">{m.conditions}</p>
            </div>
          )}

          {/* Medications */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              💊 Medications{timeFilter !== "all" ? ` — ${TIME_OPTIONS.find(t => t.value === timeFilter)?.label}` : ""}
            </p>
            {meds.length === 0 ? (
              <p className="text-xs text-gray-400 italic">{hasInfo ? "No medications on file" : "No form submitted yet"}</p>
            ) : (
              <div className="space-y-2">
                {meds.map(med => (
                  <div key={med.id} className={`border rounded-lg px-3 py-2 text-sm ${timeFilter !== "all" ? "bg-jubilee-gold/10 border-jubilee-gold/30" : "bg-blue-50 border-blue-100"}`}>
                    <p className="font-medium text-jubilee-navy">{med.name} {med.dose && <span className="font-normal text-gray-600">— {med.dose}</span>}</p>
                    {med.frequency && <p className="text-gray-600 text-xs mt-0.5">{med.frequency}</p>}
                    {med.instructions && <p className="text-gray-500 text-xs mt-0.5 italic">{med.instructions}</p>}
                    {(med.time_of_day ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(med.time_of_day ?? []).map(t => {
                          const opt = TIME_OPTIONS.find(o => o.value === t);
                          return opt ? (
                            <span key={t} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${t === timeFilter ? "bg-jubilee-gold text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
                              {opt.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Doctor & Insurance */}
          {hasInfo && (m?.doctor_name || m?.insurance_provider) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {m?.doctor_name && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🩺 Doctor</p>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-medium">{m.doctor_name}</p>
                    {m.doctor_phone && <p className="text-gray-500 text-xs mt-0.5">{m.doctor_phone}</p>}
                  </div>
                </div>
              )}
              {m?.insurance_provider && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🛡️ Insurance</p>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-medium">{m.insurance_provider}</p>
                    {m.insurance_policy_number && <p className="text-gray-500 text-xs mt-0.5">{m.insurance_policy_number}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Additional Notes */}
          {hasInfo && m?.additional_notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📝 Additional Notes</p>
              <p className="text-sm bg-gray-50 rounded-lg px-3 py-2">{m.additional_notes}</p>
            </div>
          )}

          {m?.updated_at && (
            <p className="text-xs text-gray-300 text-right">Last updated {new Date(m.updated_at).toLocaleDateString()}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MedicalRoster({ campers, sessions }: Props) {
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [showStaff, setShowStaff] = useState(false);

  const visibleCampers = campers.filter(c => showStaff ? c.is_staff : !c.is_staff);

  const filtered = visibleCampers.filter(c => {
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (sessionFilter !== "all" && c.session_id !== sessionFilter) return false;
    if (alertsOnly && !hasAlerts(c)) return false;
    if (timeFilter !== "all") {
      const hasMedAtTime = (c.medications ?? []).some(m => (m.time_of_day ?? []).includes(timeFilter));
      if (!hasMedAtTime) return false;
    }
    return true;
  });

  const alertCount = visibleCampers.filter(hasAlerts).length;
  const noInfoCount = visibleCampers.filter(c => !c.medical_info).length;
  const staffCount = campers.filter(c => c.is_staff).length;

  return (
    <div className="space-y-4">
      {/* Campers / Staff toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowStaff(false)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${!showStaff ? "bg-jubilee-navy text-white" : "bg-white border border-gray-200 text-gray-600"}`}
        >
          🧒 Campers ({campers.filter(c => !c.is_staff).length})
        </button>
        {staffCount > 0 && (
          <button
            onClick={() => setShowStaff(true)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${showStaff ? "bg-jubilee-gold text-white" : "bg-white border border-gray-200 text-gray-600"}`}
          >
            👷 Staff ({staffCount})
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-jubilee-navy">{visibleCampers.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">{showStaff ? "Staff" : "Campers"}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{alertCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">With Alerts</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{noInfoCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">No Info Yet</p>
        </div>
      </div>

      {/* Medication time-of-day filter */}
      <div className="bg-white rounded-2xl shadow p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter by Medication Time</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTimeFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${timeFilter === "all" ? "bg-jubilee-navy text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            All Campers
          </button>
          {TIME_OPTIONS.map(opt => {
            const count = campers.filter(c =>
              (c.medications ?? []).some(m => (m.time_of_day ?? []).includes(opt.value))
            ).length;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeFilter(opt.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${timeFilter === opt.value ? "bg-jubilee-gold text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {opt.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${timeFilter === opt.value ? "bg-white/30 text-white" : "bg-white text-gray-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search / session / alerts filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search camper…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold flex-1 min-w-40"
        />
        {sessions.length > 1 && (
          <select
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
          >
            <option value="all">All Sessions</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <button
          type="button"
          onClick={() => setAlertsOnly(a => !a)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${alertsOnly ? "bg-red-100 text-red-700" : "bg-white border border-gray-300 text-gray-600"}`}
        >
          ⚠️ Alerts Only
        </button>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} {showStaff ? "staff member" : "camper"}{filtered.length !== 1 ? "s" : ""}{timeFilter !== "all" ? ` need medication at ${TIME_OPTIONS.find(t => t.value === timeFilter)?.label.replace(/.*? /, "")}` : ""}</p>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🏥</div>
          <p>No campers match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(camper => (
            <CamperCard key={camper.id} camper={camper} timeFilter={timeFilter} />
          ))}
        </div>
      )}
    </div>
  );
}
