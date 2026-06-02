"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  camperId: string;
  camperName: string;
  currentPhotoUrl?: string | null;
  size?: "sm" | "md";
}

type Mode = "idle" | "menu" | "camera" | "crop";

const CROP_SIZE = 280; // px — crop preview container
const OUTPUT_SIZE = 600; // px — exported canvas resolution

export default function CamperProfilePhotoUpload({ camperId, camperName, currentPhotoUrl, size = "md" }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("idle");

  // Camera state
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);        // object URL
  const [cropNatural, setCropNatural] = useState({ w: 1, h: 1 });     // natural image size
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });             // pan offset
  const [cropScale, setCropScale] = useState(1);
  const cropDragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const cropPinchRef = useRef<number | null>(null); // initial pinch distance

  const initials = camperName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  // ─── Camera helpers ─────────────────────────────────────────────────────────

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (id: string) => {
    stopStream();
    if (!id) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: id }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError("Could not access camera.");
    }
  }, [stopStream]);

  const openCameraModal = useCallback(async () => {
    setMode("camera");
    setError(null);
    try {
      const temp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      temp.getTracks().forEach(t => t.stop());
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter(d => d.kind === "videoinput");
      setDevices(cams);
      const firstId = cams[0]?.deviceId ?? "";
      setDeviceId(firstId);
      await startCamera(firstId);
    } catch {
      setError("Camera permission denied.");
    }
  }, [startCamera]);

  useEffect(() => {
    if (mode === "camera" && deviceId) startCamera(deviceId);
  }, [deviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    stopStream();
    canvas.toBlob(blob => {
      if (!blob) return;
      openCropModal(URL.createObjectURL(blob), video.videoWidth, video.videoHeight);
    }, "image/jpeg", 0.92);
  }, [stopStream]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Crop helpers ────────────────────────────────────────────────────────────

  const openCropModal = (src: string, natW: number, natH: number) => {
    // Initial scale: image covers the entire crop square
    const initialScale = Math.max(CROP_SIZE / natW, CROP_SIZE / natH);
    setCropSrc(src);
    setCropNatural({ w: natW, h: natH });
    setCropScale(initialScale);
    setCropPan({ x: 0, y: 0 });
    setMode("crop");
  };

  const clampPan = (px: number, py: number, scale: number) => {
    const dispW = cropNatural.w * scale;
    const dispH = cropNatural.h * scale;
    const maxX = Math.max(0, (dispW - CROP_SIZE) / 2);
    const maxY = Math.max(0, (dispH - CROP_SIZE) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, px)), y: Math.max(-maxY, Math.min(maxY, py)) };
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    cropDragRef.current = { startX: e.clientX, startY: e.clientY, panX: cropPan.x, panY: cropPan.y };
  };
  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!cropDragRef.current) return;
    const dx = e.clientX - cropDragRef.current.startX;
    const dy = e.clientY - cropDragRef.current.startY;
    setCropPan(clampPan(cropDragRef.current.panX + dx, cropDragRef.current.panY + dy, cropScale));
  };
  const handleCropMouseUp = () => { cropDragRef.current = null; };

  const handleCropTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      cropDragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, panX: cropPan.x, panY: cropPan.y };
      cropPinchRef.current = null;
    } else if (e.touches.length === 2) {
      cropDragRef.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      cropPinchRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };
  const handleCropTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && cropDragRef.current) {
      const dx = e.touches[0].clientX - cropDragRef.current.startX;
      const dy = e.touches[0].clientY - cropDragRef.current.startY;
      setCropPan(clampPan(cropDragRef.current.panX + dx, cropDragRef.current.panY + dy, cropScale));
    } else if (e.touches.length === 2 && cropPinchRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / cropPinchRef.current;
      cropPinchRef.current = dist;
      const minScale = Math.max(CROP_SIZE / cropNatural.w, CROP_SIZE / cropNatural.h);
      const newScale = Math.max(minScale, Math.min(cropScale * ratio, minScale * 5));
      setCropScale(newScale);
      setCropPan(p => clampPan(p.x, p.y, newScale));
    }
  };
  const handleCropTouchEnd = () => { cropDragRef.current = null; cropPinchRef.current = null; };

  const adjustZoom = (delta: number) => {
    const minScale = Math.max(CROP_SIZE / cropNatural.w, CROP_SIZE / cropNatural.h);
    const newScale = Math.max(minScale, Math.min(cropScale + delta, minScale * 5));
    setCropScale(newScale);
    setCropPan(p => clampPan(p.x, p.y, newScale));
  };

  const confirmCrop = useCallback(async () => {
    if (!cropSrc) return;
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d")!;

      // Compute what region of the original image is visible in the crop area
      const srcX = cropNatural.w / 2 - (CROP_SIZE / 2 + cropPan.x) / cropScale;
      const srcY = cropNatural.h / 2 - (CROP_SIZE / 2 + cropPan.y) / cropScale;
      const srcW = CROP_SIZE / cropScale;
      const srcH = CROP_SIZE / cropScale;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      canvas.toBlob(blob => {
        if (blob) uploadBlob(blob);
      }, "image/jpeg", 0.88);
    };
    img.src = cropSrc;
  }, [cropSrc, cropNatural, cropPan, cropScale]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Upload ──────────────────────────────────────────────────────────────────

  const uploadBlob = useCallback(async (blob: Blob) => {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", blob, "profile.jpg");
    formData.append("camper_id", camperId);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch("/api/admin/campers/profile-photo", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      let json: Record<string, unknown> = {};
      try { json = await res.json(); } catch { /* non-JSON response */ }
      if (!res.ok) {
        setError(String(json.error ?? `Upload failed (${res.status})`));
      } else {
        setPhotoUrl(`${json.url}?t=${Date.now()}`);
        closeCropModal();
        setMode("idle");
      }
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg.includes("abort") ? "Upload timed out — try again." : `Upload failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  }, [camperId]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeCropModal = useCallback(() => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setMode("idle");
    setError(null);
  }, [cropSrc]);

  const closeCamera = useCallback(() => {
    stopStream();
    setMode("idle");
    setError(null);
  }, [stopStream]);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => openCropModal(url, img.naturalWidth, img.naturalHeight);
    img.onerror = () => { URL.revokeObjectURL(url); setError("Could not read image."); };
    img.src = url;
  };

  // ─── Image transform style ───────────────────────────────────────────────────

  const cropImgStyle: React.CSSProperties = {
    position: "absolute",
    width: cropNatural.w * cropScale,
    height: cropNatural.h * cropScale,
    left: "50%",
    top: "50%",
    transform: `translate(calc(-50% + ${cropPan.x}px), calc(-50% + ${cropPan.y}px))`,
    userSelect: "none",
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className={`flex flex-col items-center ${size === "md" ? "gap-3" : "gap-1"}`}>
        {/* Avatar */}
        <div
          className={`relative rounded-full overflow-hidden cursor-pointer group border-4 border-jubilee-gold shadow-md ${size === "md" ? "w-24 h-24" : "w-12 h-12"}`}
          onClick={() => !uploading && setMode(m => m === "menu" ? "idle" : "menu")}
        >
          {photoUrl ? (
            <img src={photoUrl} alt={camperName} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-jubilee-navy flex items-center justify-center text-white font-bold ${size === "md" ? "text-2xl" : "text-sm"}`}>
              {initials}
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xs text-center">{uploading ? "Uploading…" : photoUrl ? "Change\nPhoto" : "Add\nPhoto"}</span>
          </div>
        </div>

        {mode === "menu" && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden w-44">
            <button onClick={() => { setMode("idle"); fileRef.current?.click(); }}
              className="w-full text-left px-4 py-2.5 text-sm text-jubilee-navy hover:bg-jubilee-cream flex items-center gap-2">
              <span>📁</span> Upload file
            </button>
            <button onClick={openCameraModal}
              className="w-full text-left px-4 py-2.5 text-sm text-jubilee-navy hover:bg-jubilee-cream flex items-center gap-2 border-t border-gray-50">
              <span>📷</span> Take photo
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); if (fileRef.current) fileRef.current.value = ""; }} />

        {error && (mode === "idle" || mode === "menu") && <p className="text-xs text-red-500 text-center">{error}</p>}
      </div>

      {/* ── Camera modal ─────────────────────────────────────────────────────── */}
      {mode === "camera" && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeCamera(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-jubilee-navy">Take Photo — {camperName}</h3>
              <button onClick={closeCamera} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {devices.length > 1 && (
                <select value={deviceId} onChange={e => setDeviceId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                  {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
                </select>
              )}
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2">
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                </div>
              </div>
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <button onClick={captureFrame}
                className="w-full bg-jubilee-navy text-white py-3 rounded-xl font-bold text-sm hover:bg-jubilee-green transition-colors">
                📸 Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Crop modal ───────────────────────────────────────────────────────── */}
      {mode === "crop" && cropSrc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-jubilee-navy">Crop Photo</h3>
              <button onClick={closeCropModal} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-400 text-center">Drag to reposition · Pinch or use buttons to zoom</p>

              {/* Crop preview */}
              <div className="mx-auto relative overflow-hidden rounded-full border-4 border-jubilee-gold shadow-lg"
                style={{ width: CROP_SIZE, height: CROP_SIZE, cursor: "grab", touchAction: "none" }}
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                onMouseLeave={handleCropMouseUp}
                onTouchStart={handleCropTouchStart}
                onTouchMove={handleCropTouchMove}
                onTouchEnd={handleCropTouchEnd}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cropSrc} alt="Crop preview" style={cropImgStyle} draggable={false} />
              </div>

              {/* Zoom controls */}
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => adjustZoom(-cropScale * 0.1)}
                  className="w-9 h-9 rounded-full border border-gray-200 text-lg font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center">−</button>
                <span className="text-xs text-gray-400 w-16 text-center">
                  {Math.round((cropScale / Math.max(CROP_SIZE / cropNatural.w, CROP_SIZE / cropNatural.h)) * 100)}%
                </span>
                <button onClick={() => adjustZoom(cropScale * 0.1)}
                  className="w-9 h-9 rounded-full border border-gray-200 text-lg font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center">+</button>
              </div>

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

              <div className="flex gap-3">
                <button onClick={closeCropModal} disabled={uploading}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={confirmCrop} disabled={uploading}
                  className="flex-1 bg-jubilee-navy text-white py-2.5 rounded-xl text-sm font-bold hover:bg-jubilee-gold transition-colors disabled:opacity-50">
                  {uploading ? "Uploading…" : "Use This Crop"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
