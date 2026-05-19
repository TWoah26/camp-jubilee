"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  camperId: string;
  camperName: string;
  currentPhotoUrl?: string | null;
}

type Mode = "idle" | "menu" | "camera";

export default function CamperProfilePhotoUpload({ camperId, camperName, currentPhotoUrl }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("idle");

  // Camera modal state
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const initials = camperName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
    } catch (e) {
      console.error("Camera error:", e);
      setError("Could not access camera.");
    }
  }, [stopStream]);

  const openCameraModal = useCallback(async () => {
    setMode("camera");
    setCapturedUrl(null);
    setCapturedBlob(null);
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

  // Restart camera when device selection changes
  useEffect(() => {
    if (mode === "camera" && deviceId && !capturedUrl) {
      startCamera(deviceId);
    }
  }, [deviceId, mode, capturedUrl, startCamera]);

  const closeModal = useCallback(() => {
    stopStream();
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    setMode("idle");
    setError(null);
  }, [stopStream, capturedUrl]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      stopStream();
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      setCapturedBlob(blob);
      setCapturedUrl(URL.createObjectURL(blob));
    }, "image/jpeg", 0.92);
  }, [capturedUrl, stopStream]);

  const retake = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    startCamera(deviceId);
  }, [capturedUrl, deviceId, startCamera]);

  const uploadBlob = useCallback(async (blob: Blob) => {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", blob, "capture.jpg");
    formData.append("camper_id", camperId);
    try {
      const res = await fetch("/api/admin/campers/profile-photo", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
      } else {
        setPhotoUrl(`${json.url}?t=${Date.now()}`);
        closeModal();
      }
    } catch {
      setError("Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  }, [camperId, closeModal]);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("camper_id", camperId);
    try {
      const res = await fetch("/api/admin/campers/profile-photo", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
      } else {
        setPhotoUrl(`${json.url}?t=${Date.now()}`);
      }
    } catch {
      setError("Upload failed — please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [camperId]);

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        {/* Avatar */}
        <div
          className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group border-4 border-jubilee-gold shadow-md"
          onClick={() => !uploading && setMode(m => m === "menu" ? "idle" : "menu")}
          title="Click to update profile photo"
        >
          {photoUrl ? (
            <img src={photoUrl} alt={camperName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-jubilee-navy flex items-center justify-center text-white text-2xl font-bold">
              {initials}
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading ? (
              <span className="text-white text-xs">Uploading…</span>
            ) : (
              <span className="text-white text-xs text-center px-1">{photoUrl ? "Change\nPhoto" : "Add\nPhoto"}</span>
            )}
          </div>
        </div>

        {/* Dropdown menu */}
        {mode === "menu" && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden w-44">
            <button
              onClick={() => { setMode("idle"); fileRef.current?.click(); }}
              className="w-full text-left px-4 py-2.5 text-sm text-jubilee-navy hover:bg-jubilee-cream flex items-center gap-2"
            >
              <span>📁</span> Upload file
            </button>
            <button
              onClick={openCameraModal}
              className="w-full text-left px-4 py-2.5 text-sm text-jubilee-navy hover:bg-jubilee-cream flex items-center gap-2 border-t border-gray-50"
            >
              <span>📷</span> Take photo
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {error && !mode.startsWith("camera") && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>

      {/* Camera modal */}
      {mode === "camera" && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-jubilee-navy">Take Photo — {camperName}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Camera selector */}
              {devices.length > 1 && (
                <select
                  value={deviceId}
                  onChange={e => setDeviceId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-jubilee-green"
                >
                  {devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}

              {/* Video / captured frame */}
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${capturedUrl ? "hidden" : "block"}`}
                />
                {capturedUrl && (
                  <img src={capturedUrl} alt="Captured" className="w-full h-full object-cover" />
                )}
                {!capturedUrl && (
                  <div className="absolute bottom-2 left-2">
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

              {/* Actions */}
              {!capturedUrl ? (
                <button
                  onClick={captureFrame}
                  className="w-full bg-jubilee-navy text-white py-3 rounded-xl font-bold text-sm hover:bg-jubilee-green transition-colors"
                >
                  📸 Capture Photo
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={retake}
                    disabled={uploading}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    Retake
                  </button>
                  <button
                    onClick={() => capturedBlob && uploadBlob(capturedBlob)}
                    disabled={uploading}
                    className="flex-1 bg-jubilee-green text-white py-2.5 rounded-xl font-bold text-sm hover:bg-jubilee-green-light disabled:opacity-50 transition-colors"
                  >
                    {uploading ? "Uploading…" : "Use This Photo"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
