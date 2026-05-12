"use client";

import { useState } from "react";

export default function RekognitionSetup() {
  const [setupStatus, setSetupStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [setupMessage, setSetupMessage] = useState("");
  const [reindexStatus, setReindexStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [reindexMessage, setReindexMessage] = useState("");
  const [scanStatus, setScanStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [scanMessage, setScanMessage] = useState("");

  const handleSetup = async () => {
    setSetupStatus("loading");
    const res = await fetch("/api/admin/rekognition/setup", { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      setSetupStatus("done");
      setSetupMessage(json.message);
    } else {
      setSetupStatus("error");
      setSetupMessage(json.error ?? "Something went wrong");
    }
  };

  const handleReindex = async () => {
    setReindexStatus("loading");
    setReindexMessage("");
    const res = await fetch("/api/admin/rekognition/reindex", { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      setReindexStatus("done");
      setReindexMessage(json.message);
    } else {
      setReindexStatus("error");
      setReindexMessage(json.error ?? "Something went wrong");
    }
  };

  const handleScanAll = async () => {
    setScanStatus("loading");
    setScanMessage("");
    const res = await fetch("/api/admin/rekognition/scan-all", { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      setScanStatus("done");
      setScanMessage(json.message);
    } else {
      setScanStatus("error");
      setScanMessage(json.error ?? "Something went wrong");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-5 space-y-4">
      <p className="font-semibold text-jubilee-navy">🧠 Face Recognition</p>

      {/* Collection setup */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-700 font-medium">AWS Collection</p>
          <p className="text-xs text-gray-400">One-time setup — creates the face database.</p>
          {setupMessage && (
            <p className={`text-xs mt-1 font-medium ${setupStatus === "done" ? "text-jubilee-green" : "text-red-500"}`}>
              {setupStatus === "done" ? "✓ " : "✕ "}{setupMessage}
            </p>
          )}
        </div>
        <button
          onClick={handleSetup}
          disabled={setupStatus === "loading" || setupStatus === "done"}
          className="shrink-0 bg-jubilee-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold disabled:opacity-50 transition-colors"
        >
          {setupStatus === "loading" ? "Setting up…" : setupStatus === "done" ? "✓ Done" : "Run Setup"}
        </button>
      </div>

      <div className="border-t border-gray-100" />

      {/* Re-index profile photos */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-700 font-medium">Re-index Profile Photos</p>
          <p className="text-xs text-gray-400">Run after adding or changing profile photos.</p>
          {reindexMessage && (
            <p className={`text-xs mt-1 font-medium ${reindexStatus === "done" ? "text-jubilee-green" : "text-red-500"}`}>
              {reindexStatus === "done" ? "✓ " : "✕ "}{reindexMessage}
            </p>
          )}
        </div>
        <button
          onClick={handleReindex}
          disabled={reindexStatus === "loading"}
          className="shrink-0 bg-jubilee-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {reindexStatus === "loading" ? "Indexing…" : "Re-index Faces"}
        </button>
      </div>

      <div className="border-t border-gray-100" />

      {/* Scan all photos */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-700 font-medium">Scan All Photos</p>
          <p className="text-xs text-gray-400">Auto-tag every photo at once. Run after re-indexing.</p>
          {scanMessage && (
            <p className={`text-xs mt-1 font-medium ${scanStatus === "done" ? "text-jubilee-green" : "text-red-500"}`}>
              {scanStatus === "done" ? "✓ " : "✕ "}{scanMessage}
            </p>
          )}
        </div>
        <button
          onClick={handleScanAll}
          disabled={scanStatus === "loading"}
          className="shrink-0 bg-jubilee-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold disabled:opacity-50 transition-colors"
        >
          {scanStatus === "loading" ? "Scanning…" : "Scan All Photos"}
        </button>
      </div>
    </div>
  );
}
