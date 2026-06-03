"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Color = "blue" | "red" | "green" | "yellow";
const COLORS: Color[] = ["blue", "red", "green", "yellow"];

const COLOR_CONFIG: Record<Color, {
  bg: string; light: string; text: string; border: string; label: string; emoji: string;
}> = {
  blue:   { bg: "bg-blue-600",   light: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-300",   label: "Blue",   emoji: "🔵" },
  red:    { bg: "bg-red-600",    light: "bg-red-50",    text: "text-red-700",    border: "border-red-300",    label: "Red",    emoji: "🔴" },
  green:  { bg: "bg-green-600",  light: "bg-green-50",  text: "text-green-700",  border: "border-green-300",  label: "Green",  emoji: "🟢" },
  yellow: { bg: "bg-yellow-400", light: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-300", label: "Yellow", emoji: "🟡" },
};

type ScoreEntry = {
  id: string;
  color: Color;
  cabin_name?: string | null;
  points: number;
  note?: string | null;
};

type CompEvent = {
  id: string;
  name: string;
  type: string;
  category?: string | null;
  created_at: string;
  scores: ScoreEntry[];
};

type CabinColor = { cabin_name: string; color: Color };

interface Props {
  sessionId: string;
  role: string;
  initialEvents: CompEvent[];
  initialLeaderboard: Record<string, number>;
  initialCabinColors: CabinColor[];
  availableCabins: string[];
}

// ─── Activity type definitions ────────────────────────────────────────────────

type ActivityType = "game_4way" | "game_2v2" | "cleanliness" | "manual";

const ACTIVITY_TYPES: { value: ActivityType; label: string; desc: string }[] = [
  { value: "game_4way", label: "4-Way Game",       desc: "400 / 300 / 200 / 100 pts by place" },
  { value: "game_2v2",  label: "2v2 Game",          desc: "Two teams win 400, two lose 200" },
  { value: "cleanliness", label: "Cabin Cleanliness", desc: "Score each cabin 1–10, rolls up to team color" },
  { value: "manual",    label: "Manual Award",      desc: "Set custom points per color (e.g. kindness, bribes)" },
];

const PLACE_POINTS: Record<1 | 2 | 3 | 4, number> = { 1: 400, 2: 300, 3: 200, 4: 100 };

const CATEGORY_SUGGESTIONS = ["Kindness Award", "Bribes", "Spirit Award", "Bonus Points", "Penalty"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function medalFor(rank: number) {
  return ["🥇", "🥈", "🥉", "4️⃣"][rank - 1] ?? "";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function typeBadge(type: string) {
  const map: Record<string, string> = {
    game_4way: "4-Way",
    game_2v2: "2v2",
    cleanliness: "Cabin",
    manual: "Manual",
  };
  return map[type] ?? type;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function CompetitionPanel({
  role,
  initialEvents,
  initialLeaderboard,
  initialCabinColors,
  availableCabins,
}: Props) {
  const isDirector = role === "director" || role === "administrator";

  const [events, setEvents] = useState<CompEvent[]>(initialEvents);
  const [leaderboard, setLeaderboard] = useState<Record<string, number>>(initialLeaderboard);
  const [cabinColors, setCabinColors] = useState<CabinColor[]>(initialCabinColors);

  const [showModal, setShowModal] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // ── Add Activity modal state ──────────────────────────────────────────────

  const [actName, setActName] = useState("");
  const [actType, setActType] = useState<ActivityType>("game_4way");

  // game_4way: which color placed 1st/2nd/3rd/4th
  const [placings, setPlacings] = useState<Record<number, Color | "">>({ 1: "", 2: "", 3: "", 4: "" });

  // game_2v2: two winning colors
  const [winners2v2, setWinners2v2] = useState<Color[]>([]);

  // cleanliness: cabin → score
  const [cleanScores, setCleanScores] = useState<Record<string, string>>({});

  // manual: color → points + note
  const [manualCategory, setManualCategory] = useState("");
  const [manualPoints, setManualPoints] = useState<Record<Color, string>>({ blue: "", red: "", green: "", yellow: "" });
  const [manualNotes, setManualNotes] = useState<Record<Color, string>>({ blue: "", red: "", green: "", yellow: "" });

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // ── Setup state ───────────────────────────────────────────────────────────

  const [setupDraft, setSetupDraft] = useState<Record<string, Color | "">>(
    Object.fromEntries(cabinColors.map(cc => [cc.cabin_name, cc.color]))
  );
  const [setupSaving, setSetupSaving] = useState(false);

  // ─── Derived ────────────────────────────────────────────────────────────────

  const cabinColorMap = Object.fromEntries(cabinColors.map(cc => [cc.cabin_name, cc.color as Color]));
  const hasSetup = cabinColors.length > 0;

  const rankedColors = [...COLORS].sort((a, b) => (leaderboard[b] ?? 0) - (leaderboard[a] ?? 0));

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function resetModal() {
    setActName("");
    setActType("game_4way");
    setPlacings({ 1: "", 2: "", 3: "", 4: "" });
    setWinners2v2([]);
    setCleanScores({});
    setManualCategory("");
    setManualPoints({ blue: "", red: "", green: "", yellow: "" });
    setManualNotes({ blue: "", red: "", green: "", yellow: "" });
    setSaveErr("");
  }

  function buildScores(): { color: Color; points: number; cabin_name?: string; note?: string }[] | null {
    if (actType === "game_4way") {
      const vals = Object.values(placings);
      if (vals.some(v => !v) || new Set(vals).size !== 4) return null;
      return ([1, 2, 3, 4] as const).map(place => ({
        color: placings[place] as Color,
        points: PLACE_POINTS[place],
      }));
    }

    if (actType === "game_2v2") {
      if (winners2v2.length !== 2) return null;
      return COLORS.map(c => ({
        color: c,
        points: winners2v2.includes(c) ? 400 : 200,
      }));
    }

    if (actType === "cleanliness") {
      const entries: { color: Color; points: number; cabin_name: string; note?: string }[] = [];
      for (const cabin of availableCabins) {
        const raw = cleanScores[cabin];
        if (!raw && raw !== "0") continue;
        const pts = parseFloat(raw);
        if (isNaN(pts)) continue;
        const color = cabinColorMap[cabin];
        if (!color) continue;
        entries.push({ color, points: pts * 5, cabin_name: cabin });
      }
      if (entries.length === 0) return null;
      return entries;
    }

    if (actType === "manual") {
      const entries: { color: Color; points: number; note?: string }[] = [];
      for (const c of COLORS) {
        const raw = manualPoints[c];
        if (!raw && raw !== "0") continue;
        const pts = parseFloat(raw);
        if (isNaN(pts)) continue;
        entries.push({ color: c, points: pts, note: manualNotes[c] || undefined });
      }
      if (entries.length === 0) return null;
      return entries;
    }

    return null;
  }

  async function handleSaveActivity() {
    if (!actName.trim()) { setSaveErr("Activity name is required."); return; }
    const scores = buildScores();
    if (!scores) { setSaveErr("Please complete all scoring fields."); return; }

    setSaving(true);
    setSaveErr("");
    try {
      const res = await fetch("/api/admin/competition/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: actName.trim(),
          type: actType,
          category: actType === "manual" ? manualCategory || null : null,
          scores,
        }),
      });
      const data = await res.json();
      if (!data.success) { setSaveErr(data.error ?? "Failed to save."); return; }

      // Update local state
      setEvents(prev => [data.event, ...prev]);
      const newLb = { ...leaderboard };
      for (const s of data.event.scores as ScoreEntry[]) {
        newLb[s.color] = (newLb[s.color] ?? 0) + Number(s.points);
      }
      setLeaderboard(newLb);
      setShowModal(false);
      resetModal();
    } catch {
      setSaveErr("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this activity? This cannot be undone.")) return;
    const event = events.find(e => e.id === id);
    const res = await fetch("/api/admin/competition/event", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) {
      setEvents(prev => prev.filter(e => e.id !== id));
      if (event) {
        const newLb = { ...leaderboard };
        for (const s of event.scores) {
          newLb[s.color] = (newLb[s.color] ?? 0) - Number(s.points);
        }
        setLeaderboard(newLb);
      }
    }
  }

  async function handleSaveSetup() {
    const assignments = Object.entries(setupDraft)
      .filter(([, color]) => !!color)
      .map(([cabin_name, color]) => ({ cabin_name, color }));

    setSetupSaving(true);
    try {
      const res = await fetch("/api/admin/competition/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
      const data = await res.json();
      if (data.success) {
        setCabinColors(assignments as CabinColor[]);
        setShowSetup(false);
      }
    } finally {
      setSetupSaving(false);
    }
  }

  // ─── 2v2 toggle helper ────────────────────────────────────────────────────

  function toggle2v2(color: Color) {
    setWinners2v2(prev => {
      if (prev.includes(color)) return prev.filter(c => c !== color);
      if (prev.length < 2) return [...prev, color];
      return prev;
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-jubilee-green-dark">🏆 Color War</h1>
          <p className="text-gray-500 text-sm mt-1">Track activities and scores across all four color teams.</p>
        </div>
        <div className="flex gap-2">
          {isDirector && (
            <>
              <button
                onClick={() => setShowSetup(true)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ⚙️ Cabin Setup
              </button>
              <button
                onClick={() => { resetModal(); setShowModal(true); }}
                className="text-sm px-4 py-2 rounded-lg bg-jubilee-navy text-white hover:bg-jubilee-gold transition-colors font-medium"
              >
                + Add Activity
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main layout: activity feed + leaderboard sidebar */}
      <div className="flex flex-col-reverse gap-6 md:flex-row flex-1 min-h-0">

        {/* Activity Feed */}
        <div className="flex-1 min-w-0 space-y-3 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <div className="text-4xl mb-3">🏅</div>
              <p className="font-medium">No activities yet</p>
              {isDirector && (
                <p className="text-sm mt-1">Click <strong>+ Add Activity</strong> to log the first event.</p>
              )}
            </div>
          ) : (
            events.map(event => <EventCard key={event.id} event={event} onDelete={isDirector ? handleDelete : undefined} />)
          )}
        </div>

        {/* Leaderboard Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="md:sticky md:top-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-jubilee-navy text-sm uppercase tracking-wide">Leaderboard</h2>
            {rankedColors.map((color, i) => {
              const cfg = COLOR_CONFIG[color];
              const pts = leaderboard[color] ?? 0;
              return (
                <div
                  key={color}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${i === 0 ? cfg.light + " " + cfg.border + " border" : "bg-gray-50"}`}
                >
                  <span className="text-xl w-7 text-center">{medalFor(i + 1)}</span>
                  <span className="text-lg">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${i === 0 ? cfg.text : "text-gray-700"}`}>{cfg.label}</p>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${i === 0 ? cfg.text : "text-gray-500"}`}>{pts}</span>
                </div>
              );
            })}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                {events.length} {events.length === 1 ? "activity" : "activities"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Activity Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <Modal title="Add Activity" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
              <input
                type="text"
                value={actName}
                onChange={e => setActName(e.target.value)}
                placeholder="e.g. Morning Olympics, Cabin Inspection"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-navy"
              />
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITY_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setActType(t.value)}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      actType === t.value
                        ? "border-jubilee-navy bg-jubilee-navy text-white"
                        : "border-gray-200 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className={`text-xs mt-0.5 ${actType === t.value ? "text-white/70" : "text-gray-400"}`}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic scoring form */}
            {actType === "game_4way" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Place Rankings</label>
                <div className="space-y-2">
                  {([1, 2, 3, 4] as const).map(place => (
                    <div key={place} className="flex items-center gap-3">
                      <span className="w-16 text-sm font-medium text-gray-600">{medalFor(place)} {PLACE_POINTS[place]}pts</span>
                      <div className="flex gap-1.5 flex-1">
                        {COLORS.map(c => {
                          const cfg = COLOR_CONFIG[c];
                          const selectedElsewhere = Object.entries(placings).some(([p, v]) => Number(p) !== place && v === c);
                          const isSelected = placings[place] === c;
                          return (
                            <button
                              key={c}
                              disabled={selectedElsewhere}
                              onClick={() => setPlacings(prev => ({ ...prev, [place]: c }))}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                isSelected
                                  ? `${cfg.bg} text-white border-transparent`
                                  : selectedElsewhere
                                  ? "bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed"
                                  : `${cfg.light} ${cfg.text} ${cfg.border} hover:opacity-80`
                              }`}
                            >
                              {cfg.emoji}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {actType === "game_2v2" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Winning Teams (pick 2 — they get 400 pts)</label>
                <p className="text-xs text-gray-400 mb-2">The other two teams each receive 200 pts.</p>
                <div className="grid grid-cols-4 gap-2">
                  {COLORS.map(c => {
                    const cfg = COLOR_CONFIG[c];
                    const isWinner = winners2v2.includes(c);
                    const disabled = !isWinner && winners2v2.length >= 2;
                    return (
                      <button
                        key={c}
                        disabled={disabled}
                        onClick={() => toggle2v2(c)}
                        className={`py-3 rounded-xl border-2 text-sm font-bold transition-colors ${
                          isWinner
                            ? `${cfg.bg} text-white border-transparent`
                            : disabled
                            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                            : `${cfg.light} ${cfg.text} ${cfg.border} hover:opacity-80`
                        }`}
                      >
                        <div className="text-xl">{cfg.emoji}</div>
                        <div className="mt-0.5 text-xs">{isWinner ? "400" : disabled ? "200" : cfg.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {actType === "cleanliness" && (
              <div>
                {!hasSetup ? (
                  <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700 border border-yellow-200">
                    ⚠️ Cabin colors aren&apos;t set up yet. Click <strong>Cabin Setup</strong> first to assign cabins to teams.
                  </div>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Score Each Cabin (1–10 × 5 pts)</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {availableCabins.map(cabin => {
                        const color = cabinColorMap[cabin];
                        const cfg = color ? COLOR_CONFIG[color] : null;
                        return (
                          <div key={cabin} className="flex items-center gap-3">
                            <div className="flex-1 flex items-center gap-2">
                              {cfg && <span>{cfg.emoji}</span>}
                              <span className="text-sm text-gray-700">{cabin}</span>
                              {!color && <span className="text-xs text-red-400">(unassigned)</span>}
                            </div>
                            <input
                              type="number"
                              min={-99}
                              max={99}
                              step={1}
                              value={cleanScores[cabin] ?? ""}
                              onChange={e => setCleanScores(prev => ({ ...prev, [cabin]: e.target.value }))}
                              placeholder="—"
                              className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-jubilee-navy"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Each score is multiplied by 5 (e.g. 10 → 50 pts). Rolls up to each cabin&apos;s color team total.</p>
                  </>
                )}
              </div>
            )}

            {actType === "manual" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={manualCategory}
                    onChange={e => setManualCategory(e.target.value)}
                    placeholder="e.g. Kindness Award"
                    list="category-suggestions"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-navy"
                  />
                  <datalist id="category-suggestions">
                    {CATEGORY_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Points per Team (leave blank to skip)</label>
                  <div className="space-y-2">
                    {COLORS.map(c => {
                      const cfg = COLOR_CONFIG[c];
                      return (
                        <div key={c} className="flex items-center gap-3">
                          <span className="w-20 flex items-center gap-1.5 text-sm font-medium">
                            {cfg.emoji} {cfg.label}
                          </span>
                          <input
                            type="number"
                            value={manualPoints[c]}
                            onChange={e => setManualPoints(prev => ({ ...prev, [c]: e.target.value }))}
                            placeholder="0"
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-jubilee-navy"
                          />
                          <input
                            type="text"
                            value={manualNotes[c]}
                            onChange={e => setManualNotes(prev => ({ ...prev, [c]: e.target.value }))}
                            placeholder="Note (optional)"
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-navy"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {saveErr && <p className="text-sm text-red-500">{saveErr}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveActivity}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium bg-jubilee-navy text-white rounded-lg hover:bg-jubilee-gold transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Activity"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Cabin Setup Modal ──────────────────────────────────────────────── */}
      {showSetup && (
        <Modal title="Cabin Color Setup" onClose={() => setShowSetup(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Assign each cabin to a color team. Used for Cabin Cleanliness scoring.</p>
            {availableCabins.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No cabins found for this session.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {availableCabins.map(cabin => (
                  <div key={cabin} className="flex items-center gap-3">
                    <span className="flex-1 text-sm font-medium text-gray-700">{cabin}</span>
                    <div className="flex gap-1">
                      {COLORS.map(c => {
                        const cfg = COLOR_CONFIG[c];
                        const isSelected = setupDraft[cabin] === c;
                        return (
                          <button
                            key={c}
                            onClick={() => setSetupDraft(prev => ({ ...prev, [cabin]: c }))}
                            title={cfg.label}
                            className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm transition-colors ${
                              isSelected
                                ? `${cfg.bg} border-transparent text-white`
                                : `bg-gray-50 border-gray-200 hover:${cfg.light}`
                            }`}
                          >
                            {cfg.emoji}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSetup(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSetup}
                disabled={setupSaving}
                className="px-5 py-2 text-sm font-medium bg-jubilee-navy text-white rounded-lg hover:bg-jubilee-gold transition-colors disabled:opacity-50"
              >
                {setupSaving ? "Saving…" : "Save Setup"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Event Card ────────────────────────────────────────────────────────────────

function EventCard({ event, onDelete }: { event: CompEvent; onDelete?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  // Summarize scores — for cabin cleanliness, aggregate per color
  const colorTotals: Record<string, number> = {};
  for (const s of event.scores) {
    colorTotals[s.color] = (colorTotals[s.color] ?? 0) + Number(s.points);
  }

  const hasCabinBreakdown = event.type === "cleanliness" && event.scores.some(s => s.cabin_name);

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{event.name}</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{typeBadge(event.type)}</span>
            {event.category && (
              <span className="text-xs bg-jubilee-gold/10 text-jubilee-gold px-2 py-0.5 rounded-full">{event.category}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(event.created_at)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasCabinBreakdown && (
            <button
              onClick={() => setExpanded(p => !p)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition-colors"
            >
              {expanded ? "▲" : "▼"}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(event.id)}
              className="text-gray-300 hover:text-red-400 transition-colors px-1 text-lg leading-none"
              title="Delete activity"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div className="flex border-t border-gray-50">
        {COLORS.map(c => {
          const pts = colorTotals[c];
          if (pts === undefined) return null;
          const cfg = COLOR_CONFIG[c];
          return (
            <div key={c} className={`flex-1 ${cfg.light} flex flex-col items-center py-2 border-r last:border-r-0 border-white`}>
              <span className="text-sm">{cfg.emoji}</span>
              <span className={`font-bold text-sm tabular-nums ${cfg.text}`}>{pts > 0 ? `+${pts}` : pts}</span>
            </div>
          );
        })}
      </div>

      {/* Cabin breakdown (expandable for cleanliness) */}
      {expanded && hasCabinBreakdown && (
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Cabin Scores</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {event.scores.map(s => {
              const cfg = COLOR_CONFIG[s.color as Color];
              return (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{cfg.emoji} {s.cabin_name}</span>
                  <span className={`font-semibold tabular-nums ${cfg.text}`}>{s.points}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-jubilee-navy text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
