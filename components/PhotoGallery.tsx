"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import Image from "next/image";

type Photo = { id: string; url: string; caption: string | null; date_taken: string; session_id?: string | null };
type Session = { id: string; name: string };

interface Props {
  photos: Photo[];
  sessions: Session[];
}

export default function PhotoGallery({ photos, sessions }: Props) {
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  const filtered = sessionFilter === "all"
    ? photos
    : photos.filter(p => p.session_id === sessionFilter);

  const grouped = filtered.reduce((acc, photo) => {
    const day = photo.date_taken;
    if (!acc[day]) acc[day] = [];
    acc[day].push(photo);
    return acc;
  }, {} as Record<string, Photo[]>);

  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const handleDownload = async (url: string, date: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `camp-jubilee-${date}.jpg`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Session filter — only show if there's more than one session */}
      {sessions.length > 1 && (
        <div className="flex items-center gap-3">
          <select
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold"
          >
            <option value="all">All Sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <p className="text-sm text-gray-500">{filtered.length} photo{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      )}

      {days.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📸</div>
          <p>No photos yet — check back soon!</p>
        </div>
      ) : days.map(day => (
        <div key={day}>
          <h3 className="text-sm font-semibold text-gray-500 mb-2">
            {format(parseISO(day), "EEEE, MMMM d")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {grouped[day].map(photo => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                onClick={() => setLightbox(photo)}
              >
                <Image
                  src={photo.url}
                  alt={photo.caption || "Camp photo"}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-2">
                    <p className="text-white text-xs">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt="" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
            {lightbox.caption && (
              <p className="text-white/70 text-sm text-center mt-3">{lightbox.caption}</p>
            )}
            <div className="flex gap-3 justify-center mt-3">
              <button
                onClick={() => handleDownload(lightbox.url, lightbox.date_taken)}
                className="bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-medium"
              >
                ⬇️ Download
              </button>
              <button
                onClick={() => setLightbox(null)}
                className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
