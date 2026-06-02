"use client";

import { useState, useRef } from "react";
import { format, parseISO } from "date-fns";

type Photo = { id: string; url: string; caption: string | null; date_taken: string; session_id?: string | null };

interface Props {
  photos: Photo[];
  sessions: { id: string; name: string; start_date: string; end_date: string }[];
  uploaderId: string;
  currentSessionId?: string | null;
}

export default function PhotoManager({ photos, sessions, uploaderId, currentSessionId }: Props) {
  const [tab, setTab] = useState<"gallery" | "upload">("gallery");
  const [sessionFilter, setSessionFilter] = useState(currentSessionId ?? "all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [localPhotos, setLocalPhotos] = useState(photos);

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadSessionId, setUploadSessionId] = useState(currentSessionId ?? sessions[0]?.id ?? "");
  const [dateTaken, setDateTaken] = useState(format(new Date(), "yyyy-MM-dd"));
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const filtered = localPhotos.filter(p =>
    sessionFilter === "all" ? true : p.session_id === sessionFilter
  );

  const grouped = filtered.reduce((acc, photo) => {
    if (!acc[photo.date_taken]) acc[photo.date_taken] = [];
    acc[photo.date_taken].push(photo);
    return acc;
  }, {} as Record<string, Photo[]>);
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const handleDelete = async (photo: Photo) => {
    if (!confirm("Delete this photo permanently?")) return;
    setDeleting(photo.id);
    const res = await fetch("/api/admin/photos/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_id: photo.id, url: photo.url }),
    });
    setDeleting(null);
    if (res.ok) {
      setLocalPhotos(prev => prev.filter(p => p.id !== photo.id));
      setLightbox(null);
    }
  };

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected);
    setFiles(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
    setDone(false);
  };

  const [uploadSummary, setUploadSummary] = useState<{ succeeded: number; failed: number; errors: string[] } | null>(null);

  // Compress image to JPEG ≤ 1920px wide, 85% quality — keeps files well under any upload limit
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      // Skip non-images or types the browser can't decode via canvas
      if (!file.type.startsWith("image/") && file.type !== "") {
        resolve(file);
        return;
      }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX = 1920;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }) : file),
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
      img.src = objectUrl;
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);
    setUploadSummary(null);

    const BATCH_SIZE = 4;
    let completed = 0;
    let succeeded = 0;
    const errors: string[] = [];

    const uploadOne = async (file: File) => {
      try {
        // Compress before sending — reduces iPhone photos from 5-8MB to ~300-800KB
        const compressed = await compressImage(file);

        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("date_taken", dateTaken);
        formData.append("caption", caption);
        formData.append("uploaded_by", uploaderId);
        if (uploadSessionId) formData.append("session_id", uploadSessionId);

        const res = await fetch("/api/media/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error ?? `HTTP ${res.status}`);
        succeeded += 1;
      } catch (err) {
        errors.push(`${file.name}: ${err instanceof Error ? err.message : "unknown error"}`);
      } finally {
        completed += 1;
        setProgress(Math.round((completed / files.length) * 100));
      }
    };

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      await Promise.all(files.slice(i, i + BATCH_SIZE).map(uploadOne));
    }

    setUploading(false);
    setDone(true);
    setUploadSummary({ succeeded, failed: errors.length, errors });
    setFiles([]);
    setPreviews([]);
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";

    // Only reload to show new photos if at least some succeeded
    if (succeeded > 0) setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setTab("gallery")} className={`px-4 py-1.5 rounded-full text-sm font-medium ${tab === "gallery" ? "bg-jubilee-navy text-white" : "bg-white border border-gray-300"}`}>
          🖼️ Gallery ({localPhotos.length})
        </button>
        <button onClick={() => setTab("upload")} className={`px-4 py-1.5 rounded-full text-sm font-medium ${tab === "upload" ? "bg-jubilee-navy text-white" : "bg-white border border-gray-300"}`}>
          📤 Upload Photos
        </button>
      </div>

      {tab === "gallery" && (
        <>
          <div className="flex items-center gap-3">
            <select value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold">
              <option value="all">All Sessions</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <p className="text-sm text-gray-500">{filtered.length} photo{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {days.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
              <div className="text-4xl mb-3">📷</div>
              <p>No photos yet — use the Upload tab to add some.</p>
            </div>
          ) : days.map(day => (
            <div key={day}>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">{format(parseISO(day), "EEEE, MMMM d")}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {grouped[day].map(photo => (
                  <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer" onClick={() => setLightbox(photo)}>
                    <img src={photo.url} alt={photo.caption || ""} className="w-full h-full object-cover group-hover:brightness-90 transition" />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-1.5 pointer-events-none">
                        <p className="text-white text-xs truncate">{photo.caption}</p>
                      </div>
                    )}
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); handleDelete(photo); }} disabled={deleting === photo.id}
                        className="bg-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-red-700">
                        {deleting === photo.id ? "…" : "✕"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "upload" && (
        <form onSubmit={handleUpload} className="bg-white rounded-2xl shadow p-5 space-y-4">
          <div className="border-2 border-dashed border-jubilee-gold rounded-xl p-8 text-center cursor-pointer hover:bg-jubilee-cream transition-colors" onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
            {previews.length === 0 ? (
              <>
                <div className="text-3xl mb-2">📷</div>
                <p className="text-jubilee-navy font-medium">Click to select photos</p>
                <p className="text-gray-400 text-sm mt-1">JPG, PNG, HEIC · Multiple OK</p>
              </>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                <button type="button" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-jubilee-gold text-xl">+</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
              <select value={uploadSessionId} onChange={e => setUploadSessionId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold">
                <option value="">— No session —</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Taken</label>
              <input type="date" value={dateTaken} onChange={e => setDateTaken(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
            <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. Swim time!" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          {uploading && <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-jubilee-gold h-2 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>}
          {done && uploadSummary && (
            <div className={`text-sm rounded-lg p-3 ${uploadSummary.failed > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-jubilee-green"}`}>
              {uploadSummary.failed === 0
                ? `✓ All ${uploadSummary.succeeded} photos uploaded!`
                : `⚠️ ${uploadSummary.succeeded} uploaded, ${uploadSummary.failed} failed:`}
              {uploadSummary.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs">
                  {uploadSummary.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              )}
            </div>
          )}

          <button type="submit" disabled={uploading || files.length === 0}
            className="w-full bg-jubilee-navy text-white py-2.5 rounded-lg font-medium hover:bg-jubilee-gold disabled:opacity-50">
            {uploading ? `Uploading... ${progress}%` : `Upload ${files.length > 0 ? `${files.length} Photo${files.length > 1 ? "s" : ""}` : "Photos"}`}
          </button>
        </form>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt="" className="w-full max-h-[80vh] rounded-xl object-contain" />
            {lightbox.caption && (
              <p className="text-white/70 text-sm text-center mt-3">{lightbox.caption}</p>
            )}
            <div className="flex gap-3 justify-center mt-4">
              <button onClick={() => handleDelete(lightbox)} disabled={deleting === lightbox.id}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                🗑️ Delete Photo
              </button>
              <button onClick={() => setLightbox(null)} className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/30">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
