"use client";

import { useRef, useState } from "react";

interface Props {
  camperId: string;
  camperName: string;
  currentPhotoUrl?: string | null;
}

export default function CamperProfilePhotoUpload({ camperId, camperName, currentPhotoUrl }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = camperName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("camper_id", camperId);
    try {
      const res = await fetch("/api/admin/campers/profile-photo", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
      } else {
        // Bust cache by appending timestamp
        setPhotoUrl(`${json.url}?t=${Date.now()}`);
      }
    } catch {
      setError("Upload failed — please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar */}
      <div
        className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group border-4 border-jubilee-gold shadow-md"
        onClick={() => !uploading && fileRef.current?.click()}
        title="Click to upload profile photo"
      >
        {photoUrl ? (
          <img src={photoUrl} alt={camperName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-jubilee-navy flex items-center justify-center text-white text-2xl font-bold">
            {initials}
          </div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <span className="text-white text-xs">Uploading…</span>
          ) : (
            <span className="text-white text-xs text-center px-1">
              {photoUrl ? "Change\nPhoto" : "Upload\nPhoto"}
            </span>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="text-xs text-jubilee-navy underline hover:text-jubilee-gold disabled:opacity-50"
      >
        {uploading ? "Uploading…" : photoUrl ? "Change profile photo" : "Upload profile photo"}
      </button>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
