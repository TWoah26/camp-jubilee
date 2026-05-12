"use client";

import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

interface CamperResult {
  id: string;
  first_name: string;
  last_name: string;
  cabin: string | null;
  store_balance: number;
  is_staff: boolean;
  session: { name: string } | null;
}

export default function CamperSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CamperResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/campers/search?q=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const handleSelect = (camper: CamperResult) => {
    setQuery(`${camper.first_name} ${camper.last_name}`);
    setOpen(false);
    window.location.href = `/admin/campers?search=${encodeURIComponent(`${camper.first_name} ${camper.last_name}`)}`;
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search any camper by name..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold bg-white shadow-sm"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs animate-pulse">Searching...</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {results.map(camper => (
            <button
              key={camper.id}
              onClick={() => handleSelect(camper)}
              className="w-full text-left px-4 py-3 hover:bg-jubilee-gold/10 transition-colors border-b last:border-0 border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-jubilee-navy text-sm">
                      {camper.first_name} {camper.last_name}
                    </p>
                    {camper.is_staff && (
                      <span className="text-xs bg-jubilee-gold/20 text-jubilee-brown px-1.5 py-0.5 rounded-full">Staff</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {camper.is_staff ? "All Sessions" : (camper.session?.name ?? "No session assigned")}
                    {camper.cabin ? ` · ${camper.cabin}` : ""}
                  </p>
                </div>
                <span className="text-xs font-medium text-jubilee-green">
                  {formatCurrency(camper.store_balance)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-400">No campers found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
