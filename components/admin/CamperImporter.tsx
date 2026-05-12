"use client";

import { useState, useRef } from "react";

interface CamperRow {
  first_name: string;
  last_name: string;
  grade: string;
  shirt_size: string;
  cabin: string;
  dietary_restrictions: string;
  medications: string;
  tuition_commitment: string;
  tuition_paid: string;
  parent_name: string;
  parent_email: string;
}

const CSV_COLUMNS: (keyof CamperRow)[] = [
  "first_name",
  "last_name",
  "grade",
  "shirt_size",
  "cabin",
  "dietary_restrictions",
  "medications",
  "tuition_commitment",
  "tuition_paid",
  "parent_name",
  "parent_email",
];

const TEMPLATE_CSV =
  "first_name,last_name,grade,shirt_size,cabin,dietary_restrictions,medications,tuition_commitment,tuition_paid,parent_name,parent_email\n" +
  "Jane,Smith,5th,M,Birch,Nut allergy,,1200,600,Sarah Smith,sarah@example.com\n" +
  "Tom,Jones,7th,L,Oak,,,1200,0,David Jones,david@example.com\n";

function parseCSV(text: string): CamperRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  // Detect header row
  const headerLine = lines[0].toLowerCase();
  const headers = splitCSVLine(headerLine);

  // Build index map from CSV headers to our expected columns
  const indexMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    indexMap[h.trim()] = i;
  });

  const rows: CamperRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    const row: Partial<CamperRow> = {};
    for (const col of CSV_COLUMNS) {
      const idx = indexMap[col];
      row[col] = idx !== undefined ? (cells[idx] ?? "").trim() : "";
    }
    // Skip rows where both first and last name are empty
    if (!row.first_name && !row.last_name) continue;
    rows.push(row as CamperRow);
  }
  return rows;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "camper_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface ImportError {
  row: number;
  error: string;
}

interface Props {
  sessionId?: string | null;
}

export default function CamperImporter({ sessionId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState<CamperRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "importing" | "done" | "error">("idle");
  const [importedCount, setImportedCount] = useState(0);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    setRows([]);
    setStatus("idle");
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setParseError("No valid rows found. Make sure your CSV has a header row and data rows.");
        } else {
          setRows(parsed);
        }
      } catch {
        setParseError("Failed to parse CSV. Please check the file format.");
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setStatus("importing");
    setImportErrors([]);

    try {
      const res = await fetch("/api/admin/campers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setImportErrors([{ row: 0, error: data.error ?? "Unknown server error" }]);
        return;
      }
      setImportedCount(data.imported ?? 0);
      setImportErrors(data.errors ?? []);
      setStatus("done");
      // Clear file input and rows after success
      setRows([]);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setStatus("error");
      setImportErrors([{ row: 0, error: String(err) }]);
    }
  }

  function handleReset() {
    setRows([]);
    setFileName(null);
    setParseError(null);
    setStatus("idle");
    setImportErrors([]);
    setImportedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const previewRows = rows.slice(0, 5);
  const remaining = rows.length - previewRows.length;

  return (
    <div className="rounded-xl border border-jubilee-navy/10 bg-white shadow-sm overflow-hidden">
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-jubilee-navy/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-jubilee-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="font-semibold text-jubilee-navy">Import Campers</span>
          <span className="text-sm text-jubilee-navy/50">— bulk CSV upload</span>
        </div>
        <svg
          className={`w-5 h-5 text-jubilee-navy/50 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-jubilee-navy/10">

          {/* Instructions */}
          <div className="mt-4 rounded-lg bg-jubilee-navy/5 p-4 space-y-2">
            <p className="text-sm font-medium text-jubilee-navy">CSV Format</p>
            <p className="text-xs text-jubilee-navy/70 leading-relaxed">
              Your CSV must have a header row with these exact column names:
            </p>
            <code className="block text-xs bg-white rounded border border-jubilee-navy/10 px-3 py-2 text-jubilee-brown leading-relaxed font-mono">
              {CSV_COLUMNS.join(", ")}
            </code>
            <ul className="text-xs text-jubilee-navy/70 list-disc list-inside space-y-0.5 mt-1">
              <li><span className="font-medium">first_name</span> and <span className="font-medium">last_name</span> are required.</li>
              <li><span className="font-medium">tuition_commitment</span> and <span className="font-medium">tuition_paid</span> should be numbers (e.g. 1200.00). Defaults to 0.</li>
              <li>All other fields are optional and can be left blank.</li>
              <li>Campers will be assigned to the currently active session.</li>
              <li>If a parent email is provided and the account doesn&apos;t exist, an invite email will be sent automatically.</li>
            </ul>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-jubilee-green hover:text-jubilee-green-dark transition-colors mt-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download template CSV
            </button>
          </div>

          {/* No active session warning */}
          {!sessionId && (
            <div className="rounded-lg bg-jubilee-coral/10 border border-jubilee-coral/30 px-4 py-3 text-sm text-jubilee-coral">
              No active session detected. Please activate a session before importing campers.
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-jubilee-navy">
              Select CSV file
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="block w-full text-sm text-jubilee-navy/70
                file:mr-3 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-jubilee-navy file:text-white
                hover:file:bg-jubilee-navy/80
                file:cursor-pointer file:transition-colors"
            />
            {fileName && (
              <p className="text-xs text-jubilee-navy/50">
                Selected: <span className="font-medium text-jubilee-navy">{fileName}</span>
              </p>
            )}
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="rounded-lg bg-jubilee-coral/10 border border-jubilee-coral/30 px-4 py-3 text-sm text-jubilee-coral">
              {parseError}
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && status !== "done" && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-jubilee-navy">
                Preview — {rows.length} camper{rows.length !== 1 ? "s" : ""} ready to import
                {remaining > 0 && (
                  <span className="text-jubilee-navy/50 font-normal"> (showing first 5)</span>
                )}
              </p>
              <div className="overflow-x-auto rounded-lg border border-jubilee-navy/10">
                <table className="min-w-full text-xs">
                  <thead className="bg-jubilee-navy/5">
                    <tr>
                      {["First", "Last", "Grade", "Shirt", "Cabin", "Diet", "Meds", "Commitment", "Paid", "Parent", "Parent Email"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-jubilee-navy/70 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-jubilee-navy/5">
                    {previewRows.map((row, i) => (
                      <tr key={i} className="hover:bg-jubilee-navy/5">
                        <td className="px-3 py-2 whitespace-nowrap text-jubilee-navy">{row.first_name || <span className="text-jubilee-coral">—</span>}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-jubilee-navy">{row.last_name || <span className="text-jubilee-coral">—</span>}</td>
                        <td className="px-3 py-2 text-jubilee-navy/70">{row.grade || "—"}</td>
                        <td className="px-3 py-2 text-jubilee-navy/70">{row.shirt_size || "—"}</td>
                        <td className="px-3 py-2 text-jubilee-navy/70">{row.cabin || "—"}</td>
                        <td className="px-3 py-2 text-jubilee-navy/70 max-w-[100px] truncate">{row.dietary_restrictions || "—"}</td>
                        <td className="px-3 py-2 text-jubilee-navy/70 max-w-[100px] truncate">{row.medications || "—"}</td>
                        <td className="px-3 py-2 text-jubilee-navy/70">{row.tuition_commitment ? `$${row.tuition_commitment}` : "—"}</td>
                        <td className="px-3 py-2 text-jubilee-navy/70">{row.tuition_paid ? `$${row.tuition_paid}` : "—"}</td>
                        <td className="px-3 py-2 text-jubilee-navy/70 whitespace-nowrap">{row.parent_name || "—"}</td>
                        <td className="px-3 py-2 text-jubilee-navy/70">{row.parent_email || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {remaining > 0 && (
                  <div className="px-3 py-2 bg-jubilee-navy/5 text-xs text-jubilee-navy/50 border-t border-jubilee-navy/10">
                    + {remaining} more row{remaining !== 1 ? "s" : ""} not shown
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import button */}
          {rows.length > 0 && status === "idle" && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleImport}
                disabled={!sessionId}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-jubilee-green text-white font-semibold text-sm hover:bg-jubilee-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import {rows.length} camper{rows.length !== 1 ? "s" : ""}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-lg border border-jubilee-navy/20 text-jubilee-navy/60 text-sm hover:bg-jubilee-navy/5 transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* Importing spinner */}
          {status === "importing" && (
            <div className="flex items-center gap-3 text-sm text-jubilee-navy/70">
              <svg className="w-4 h-4 animate-spin text-jubilee-green" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Importing campers, please wait…
            </div>
          )}

          {/* Success */}
          {status === "done" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-jubilee-green/10 border border-jubilee-green/30 px-4 py-3 flex items-start gap-2">
                <svg className="w-5 h-5 text-jubilee-green flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-jubilee-green">
                    Successfully imported {importedCount} camper{importedCount !== 1 ? "s" : ""}
                  </p>
                  {importErrors.length > 0 && (
                    <p className="text-xs text-jubilee-navy/60 mt-0.5">
                      {importErrors.length} row{importErrors.length !== 1 ? "s" : ""} had errors (see below).
                    </p>
                  )}
                </div>
              </div>
              {importErrors.length > 0 && (
                <div className="rounded-lg border border-jubilee-coral/30 bg-jubilee-coral/5 divide-y divide-jubilee-coral/10 overflow-hidden">
                  <div className="px-4 py-2 text-xs font-semibold text-jubilee-coral bg-jubilee-coral/10">
                    Import warnings / errors
                  </div>
                  {importErrors.map((e, i) => (
                    <div key={i} className="px-4 py-2 text-xs text-jubilee-navy/70">
                      <span className="font-medium text-jubilee-navy">Row {e.row}:</span> {e.error}
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => { handleReset(); window.location.reload(); }}
                className="px-4 py-2 rounded-lg bg-jubilee-navy text-white text-sm font-medium hover:bg-jubilee-navy/80 transition-colors"
              >
                Done — refresh roster
              </button>
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-jubilee-coral/10 border border-jubilee-coral/30 px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-jubilee-coral">Import failed</p>
                {importErrors.map((e, i) => (
                  <p key={i} className="text-xs text-jubilee-navy/70">{e.error}</p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="px-4 py-2 rounded-lg border border-jubilee-navy/20 text-jubilee-navy/60 text-sm hover:bg-jubilee-navy/5 transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
