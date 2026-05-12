"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import type { Camper } from "@/types";
import { format } from "date-fns";

interface Props {
  campers: Pick<Camper, "id" | "first_name" | "last_name" | "cabin">[];
  recentPhotos: any[];
  uploaderId: string;
}

export default function MediaUploader({ campers, recentPhotos, uploaderId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dateTaken, setDateTaken] = useState(format(new Date(), "yyyy-MM-dd"));
  const [caption, setCaption] = useState("");
  const [taggedCampers, setTaggedCampers] = useState<string[]>([]);
  const [camperSearch, setCamperSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected);
    setFiles(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
    setDone(false);
  };

  const toggleCamper = (id: string) => {
    setTaggedCampers(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const filteredCampers = campers.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(camperSearch.toLowerCase())
  );

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
      formData.append("date_taken", dateTaken);
      formData.append("caption", caption);
      formData.append("uploaded_by", uploaderId);
      taggedCampers.forEach(id => formData.append("camper_ids", id));

      await fetch("/api/media/upload", { method: "POST", body: formData });
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setUploading(false);
    setDone(true);
    setFiles([]);
    setPreviews([]);
    setTaggedCampers([]);
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";
    window.location.reload();
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleUpload} className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h2 className="font-semibold text-jubilee-navy">Upload Photos</h2>

        <div
          className="border-2 border-dashed border-jubilee-gold rounded-xl p-8 text-center cursor-pointer hover:bg-jubilee-cream transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          {previews.length === 0 ? (
            <>
              <div className="text-3xl mb-2">📷</div>
              <p className="text-jubilee-navy font-medium">Click to select photos</p>
              <p className="text-gray-400 text-sm mt-1">JPG, PNG, HEIC supported · Multiple files OK</p>
            </>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-jubilee-gold"
              >
                +
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Taken</label>
            <input
              type="date"
              value={dateTaken}
              onChange={e => setDateTaken(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Caption..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tag Campers</label>
          <input
            value={camperSearch}
            onChange={e => setCamperSearch(e.target.value)}
            placeholder="Search campers..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
          />
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {filteredCampers.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCamper(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  taggedCampers.includes(c.id)
                    ? "bg-jubilee-navy text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {c.first_name} {c.last_name}
              </button>
            ))}
          </div>
          {taggedCampers.length > 0 && (
            <p className="text-xs text-jubilee-green mt-1">{taggedCampers.length} camper(s) tagged</p>
          )}
        </div>

        {uploading && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-jubilee-gold h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {done && <p className="text-jubilee-green font-medium text-sm">✓ Upload complete!</p>}

        <button
          type="submit"
          disabled={uploading || files.length === 0}
          className="w-full bg-jubilee-navy text-white py-2.5 rounded-lg font-medium hover:bg-jubilee-gold disabled:opacity-50"
        >
          {uploading ? `Uploading... ${progress}%` : `Upload ${files.length > 0 ? `${files.length} Photo${files.length > 1 ? "s" : ""}` : "Photos"}`}
        </button>
      </form>

      {recentPhotos.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-jubilee-navy mb-3">Recently Uploaded</h2>
          <div className="grid grid-cols-4 gap-2">
            {recentPhotos.map((photo: any) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
                <img src={photo.url} alt={photo.caption || ""} className="w-full h-full object-cover" />
                {photo.tags && photo.tags.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                    <p className="text-white text-xs truncate">
                      {photo.tags.map((t: any) => t.camper?.first_name).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
