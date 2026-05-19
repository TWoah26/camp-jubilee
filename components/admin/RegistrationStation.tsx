"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Camper {
  id: string;
  first_name: string;
  last_name: string;
  cabin: string | null;
  photo_url: string | null;
}

type TabId = "photo" | "live";
type TVId = "tv1" | "tv2";
type CamKey = "cam1" | "cam2";

interface TVAssignment {
  tv1: CamKey | null;
  tv2: CamKey | null;
}

export default function RegistrationStation() {
  const [tab, setTab] = useState<TabId>("photo");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Photo station state
  const [photoDeviceId, setPhotoDeviceId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Camper[]>([]);
  const [selectedCamper, setSelectedCamper] = useState<Camper | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Live feeds state
  const [cam1DeviceId, setCam1DeviceId] = useState<string>("");
  const [cam2DeviceId, setCam2DeviceId] = useState<string>("");
  const [tvAssignment, setTvAssignment] = useState<TVAssignment>({ tv1: null, tv2: null });

  // Refs
  const photoVideoRef = useRef<HTMLVideoElement>(null);
  const live1VideoRef = useRef<HTMLVideoElement>(null);
  const live2VideoRef = useRef<HTMLVideoElement>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const live1StreamRef = useRef<MediaStream | null>(null);
  const live2StreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopStream = (streamRef: React.MutableRefObject<MediaStream | null>) => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startStream = useCallback(async (
    deviceId: string,
    videoRef: React.RefObject<HTMLVideoElement | null>,
    streamRef: React.MutableRefObject<MediaStream | null>
  ) => {
    stopStream(streamRef);
    if (!deviceId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error("Camera start failed:", e);
    }
  }, []);

  const initDevices = useCallback(async () => {
    try {
      // Request permission first so labels are populated
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      tempStream.getTracks().forEach(t => t.stop());
      setPermissionGranted(true);

      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter(d => d.kind === "videoinput");
      setDevices(cams);

      if (cams[0]) setPhotoDeviceId(cams[0].deviceId);
      if (cams[0]) setCam1DeviceId(cams[0].deviceId);
      if (cams[1]) setCam2DeviceId(cams[1].deviceId);
      else if (cams[0]) setCam2DeviceId(cams[0].deviceId);
    } catch {
      setPermissionGranted(false);
    }
  }, []);

  // Init channel and devices on mount
  useEffect(() => {
    channelRef.current = new BroadcastChannel("jubilee-display");
    initDevices();
    return () => {
      channelRef.current?.close();
      stopStream(photoStreamRef);
      stopStream(live1StreamRef);
      stopStream(live2StreamRef);
    };
  }, [initDevices]);

  // Start photo camera when device or tab changes
  useEffect(() => {
    if (tab === "photo" && photoDeviceId) {
      startStream(photoDeviceId, photoVideoRef, photoStreamRef);
    } else {
      stopStream(photoStreamRef);
    }
    return () => stopStream(photoStreamRef);
  }, [tab, photoDeviceId, startStream]);

  // Start live cameras when on live tab
  useEffect(() => {
    if (tab === "live") {
      if (cam1DeviceId) startStream(cam1DeviceId, live1VideoRef, live1StreamRef);
      if (cam2DeviceId) startStream(cam2DeviceId, live2VideoRef, live2StreamRef);
    } else {
      stopStream(live1StreamRef);
      stopStream(live2StreamRef);
    }
    return () => {
      stopStream(live1StreamRef);
      stopStream(live2StreamRef);
    };
  }, [tab, cam1DeviceId, cam2DeviceId, startStream]);

  // Camper search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/campers/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch { setSearchResults([]); }
    }, 300);
  }, [searchQuery]);

  const captureFrame = useCallback(() => {
    const video = photoVideoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      setCapturedBlob(blob);
      setCapturedUrl(URL.createObjectURL(blob));
      setUploadStatus("idle");
      setUploadError(null);
    }, "image/jpeg", 0.92);
  }, [capturedUrl]);

  const retake = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    setUploadStatus("idle");
    setUploadError(null);
  }, [capturedUrl]);

  const uploadPhoto = useCallback(async () => {
    if (!capturedBlob || !selectedCamper) return;
    setUploading(true);
    setUploadStatus("idle");
    const formData = new FormData();
    formData.append("file", capturedBlob, "capture.jpg");
    formData.append("camper_id", selectedCamper.id);
    try {
      const res = await fetch("/api/admin/campers/profile-photo", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setUploadStatus("error");
        setUploadError(json.error ?? "Upload failed");
      } else {
        setUploadStatus("success");
        setSelectedCamper(c => c ? { ...c, photo_url: json.url } : c);
        setCapturedUrl(null);
        setCapturedBlob(null);
      }
    } catch {
      setUploadStatus("error");
      setUploadError("Network error — please try again.");
    } finally {
      setUploading(false);
    }
  }, [capturedBlob, selectedCamper]);

  const assignToTV = useCallback((tv: TVId, camKey: CamKey) => {
    const deviceId = camKey === "cam1" ? cam1DeviceId : cam2DeviceId;
    const label = camKey === "cam1"
      ? (devices.find(d => d.deviceId === cam1DeviceId)?.label || "Camera 1")
      : (devices.find(d => d.deviceId === cam2DeviceId)?.label || "Camera 2");
    setTvAssignment(prev => ({ ...prev, [tv]: camKey }));
    channelRef.current?.postMessage({ type: "camera", displayId: tv, deviceId, label });
  }, [cam1DeviceId, cam2DeviceId, devices]);

  const openTVWindow = useCallback((tvId: TVId) => {
    const url = `/admin/display?id=${tvId}`;
    window.open(url, `jubilee-${tvId}`, "noopener");
  }, []);

  const deviceLabel = (d: MediaDeviceInfo, idx: number) =>
    d.label || `Camera ${idx + 1}`;

  if (!permissionGranted && devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="text-5xl">📷</div>
        <h2 className="text-xl font-bold text-jubilee-navy">Camera Access Required</h2>
        <p className="text-gray-500 max-w-sm text-sm">
          Click below to grant camera access. Your browser will prompt for permission.
        </p>
        <button
          onClick={initDevices}
          className="bg-jubilee-green text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-jubilee-green-light transition-colors"
        >
          Grant Camera Access
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([["photo", "📷 Photo Station"], ["live", "📺 Live Feeds"]] as [TabId, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === id
                ? "bg-white text-jubilee-navy shadow"
                : "text-gray-500 hover:text-jubilee-navy"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── PHOTO STATION ── */}
      {tab === "photo" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: camera preview */}
          <div className="space-y-3">
            {/* Camera selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Camera:</label>
              <select
                value={photoDeviceId}
                onChange={e => { setPhotoDeviceId(e.target.value); retake(); }}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-jubilee-green"
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>{deviceLabel(d, i)}</option>
                ))}
              </select>
            </div>

            {/* Video / captured frame */}
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
              <video
                ref={photoVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${capturedUrl ? "hidden" : "block"}`}
              />
              {capturedUrl && (
                <img src={capturedUrl} alt="Captured" className="w-full h-full object-cover" />
              )}
              {!capturedUrl && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                    LIVE
                  </span>
                </div>
              )}
            </div>

            {/* Capture / retake buttons */}
            {!capturedUrl ? (
              <button
                onClick={captureFrame}
                className="w-full bg-jubilee-navy text-white py-3 rounded-xl font-bold text-sm hover:bg-jubilee-green transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-lg">📸</span> Capture Photo
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={retake}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Retake
                </button>
                <button
                  onClick={uploadPhoto}
                  disabled={!selectedCamper || uploading}
                  className="flex-1 bg-jubilee-green text-white py-2.5 rounded-xl font-bold text-sm hover:bg-jubilee-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? "Uploading…" : "Confirm Upload"}
                </button>
              </div>
            )}

            {/* Status messages */}
            {uploadStatus === "success" && (
              <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-2.5 text-center font-medium">
                Profile photo updated for {selectedCamper?.first_name}!
              </div>
            )}
            {uploadStatus === "error" && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2.5 text-center">
                {uploadError}
              </div>
            )}
            {capturedUrl && !selectedCamper && (
              <p className="text-xs text-amber-600 text-center">
                Select a camper on the right before uploading.
              </p>
            )}
          </div>

          {/* Right: camper search */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1.5">Search Camper</label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Type a name…"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-green bg-white"
              />
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                {searchResults.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCamper(c);
                      setSearchQuery(`${c.first_name} ${c.last_name}`);
                      setSearchResults([]);
                      setUploadStatus("idle");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-jubilee-cream text-left border-b border-gray-50 last:border-0 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-jubilee-navy flex-shrink-0 flex items-center justify-center">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">
                          {c.first_name[0]}{c.last_name[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-jubilee-navy text-sm">{c.first_name} {c.last_name}</p>
                      {c.cabin && <p className="text-xs text-gray-400">Cabin {c.cabin}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected camper card */}
            {selectedCamper && (
              <div className="bg-jubilee-cream border border-jubilee-gold/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-jubilee-navy flex-shrink-0 flex items-center justify-center border-2 border-jubilee-gold shadow">
                    {selectedCamper.photo_url ? (
                      <img
                        src={`${selectedCamper.photo_url}?t=${Date.now()}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {selectedCamper.first_name[0]}{selectedCamper.last_name[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-jubilee-navy text-lg">
                      {selectedCamper.first_name} {selectedCamper.last_name}
                    </p>
                    {selectedCamper.cabin && (
                      <p className="text-sm text-gray-500">Cabin {selectedCamper.cabin}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedCamper.photo_url ? "Has profile photo" : "No profile photo yet"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCamper(null);
                    setSearchQuery("");
                    retake();
                  }}
                  className="text-xs text-gray-400 hover:text-jubilee-coral underline"
                >
                  Clear selection
                </button>
              </div>
            )}

            {!selectedCamper && searchQuery.length < 2 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <div className="text-3xl mb-2">🔍</div>
                Type a camper&apos;s name to find them
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LIVE FEEDS ── */}
      {tab === "live" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Camera 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-jubilee-navy flex-shrink-0" />
                <label className="text-sm font-bold text-jubilee-navy">Camera 1 (FX3)</label>
                <select
                  value={cam1DeviceId}
                  onChange={e => setCam1DeviceId(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-jubilee-navy"
                >
                  {devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>{deviceLabel(d, i)}</option>
                  ))}
                </select>
              </div>

              <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
                <video ref={live1VideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 flex gap-1.5">
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">LIVE</span>
                  {tvAssignment.tv1 === "cam1" && (
                    <span className="bg-jubilee-gold text-white text-xs px-1.5 py-0.5 rounded-full">TV1</span>
                  )}
                  {tvAssignment.tv2 === "cam1" && (
                    <span className="bg-jubilee-blue text-white text-xs px-1.5 py-0.5 rounded-full">TV2</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => assignToTV("tv1", "cam1")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    tvAssignment.tv1 === "cam1"
                      ? "bg-jubilee-gold text-white shadow"
                      : "border border-jubilee-gold text-jubilee-gold hover:bg-jubilee-gold/10"
                  }`}
                >
                  {tvAssignment.tv1 === "cam1" ? "✓ On TV1" : "Send to TV1"}
                </button>
                <button
                  onClick={() => assignToTV("tv2", "cam1")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    tvAssignment.tv2 === "cam1"
                      ? "bg-jubilee-blue text-white shadow"
                      : "border border-jubilee-blue text-jubilee-blue hover:bg-jubilee-blue/10"
                  }`}
                >
                  {tvAssignment.tv2 === "cam1" ? "✓ On TV2" : "Send to TV2"}
                </button>
              </div>
            </div>

            {/* Camera 2 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-jubilee-blue flex-shrink-0" />
                <label className="text-sm font-bold text-jubilee-navy">Camera 2 (DJI)</label>
                <select
                  value={cam2DeviceId}
                  onChange={e => setCam2DeviceId(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-jubilee-blue"
                >
                  {devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>{deviceLabel(d, i)}</option>
                  ))}
                </select>
              </div>

              <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
                <video ref={live2VideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 flex gap-1.5">
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">LIVE</span>
                  {tvAssignment.tv1 === "cam2" && (
                    <span className="bg-jubilee-gold text-white text-xs px-1.5 py-0.5 rounded-full">TV1</span>
                  )}
                  {tvAssignment.tv2 === "cam2" && (
                    <span className="bg-jubilee-blue text-white text-xs px-1.5 py-0.5 rounded-full">TV2</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => assignToTV("tv1", "cam2")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    tvAssignment.tv1 === "cam2"
                      ? "bg-jubilee-gold text-white shadow"
                      : "border border-jubilee-gold text-jubilee-gold hover:bg-jubilee-gold/10"
                  }`}
                >
                  {tvAssignment.tv1 === "cam2" ? "✓ On TV1" : "Send to TV1"}
                </button>
                <button
                  onClick={() => assignToTV("tv2", "cam2")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    tvAssignment.tv2 === "cam2"
                      ? "bg-jubilee-blue text-white shadow"
                      : "border border-jubilee-blue text-jubilee-blue hover:bg-jubilee-blue/10"
                  }`}
                >
                  {tvAssignment.tv2 === "cam2" ? "✓ On TV2" : "Send to TV2"}
                </button>
              </div>
            </div>
          </div>

          {/* TV window launchers */}
          <div className="bg-jubilee-navy rounded-2xl p-5 space-y-3">
            <h3 className="text-white font-bold text-sm">TV Display Windows</h3>
            <p className="text-white/60 text-xs">
              Open each window below, drag it to the correct TV, then press F11 (or ⌘+Ctrl+F) to go fullscreen.
              Use the &quot;Send to TV&quot; buttons above to switch what each TV shows.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => openTVWindow("tv1")}
                className="flex-1 bg-jubilee-gold text-white py-2.5 rounded-xl font-bold text-sm hover:bg-jubilee-amber-light transition-colors flex items-center justify-center gap-2"
              >
                <span>↗</span> Open TV1 Window
              </button>
              <button
                onClick={() => openTVWindow("tv2")}
                className="flex-1 bg-jubilee-blue text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
              >
                <span>↗</span> Open TV2 Window
              </button>
            </div>
            <div className="flex gap-3 text-xs text-white/50 text-center">
              <div className="flex-1">
                TV1 currently showing: {tvAssignment.tv1 ? (tvAssignment.tv1 === "cam1" ? "Camera 1 (FX3)" : "Camera 2 (DJI)") : "—"}
              </div>
              <div className="flex-1">
                TV2 currently showing: {tvAssignment.tv2 ? (tvAssignment.tv2 === "cam1" ? "Camera 1 (FX3)" : "Camera 2 (DJI)") : "—"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
