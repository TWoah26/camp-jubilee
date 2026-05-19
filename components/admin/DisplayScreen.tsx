"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  displayId: string;
}

export default function DisplayScreen({ displayId }: Props) {
  const [status, setStatus] = useState<"waiting" | "connecting" | "live" | "error">("waiting");
  const [cameraLabel, setCameraLabel] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel("jubilee-display");

    channel.onmessage = async (event) => {
      const msg = event.data;
      if (msg.type !== "camera" || msg.displayId !== displayId) return;

      setStatus("connecting");
      setCameraLabel(msg.label || "Camera");

      // Stop any existing stream
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: msg.deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus("live");
      } catch (e) {
        console.error("Display camera error:", e);
        setStatus("error");
      }
    };

    return () => {
      channel.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [displayId]);

  const tvNumber = displayId === "tv1" ? "1" : "2";

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      {/* Video element always present, hidden until live */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${status === "live" ? "opacity-100" : "opacity-0"}`}
      />

      {/* Overlay shown when not live */}
      {status !== "live" && (
        <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8">
          {/* Camp Jubilee logo area */}
          <div className="space-y-2">
            <div className="text-6xl font-display font-bold text-[#c18d31] tracking-wide">
              Camp Jubilee
            </div>
            <div className="text-white/40 text-lg font-sans tracking-widest uppercase">
              TV Display {tvNumber}
            </div>
          </div>

          {status === "waiting" && (
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-6 py-3">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-white/70 text-sm">
                  Waiting for signal from Registration Station…
                </span>
              </div>
              <p className="text-white/30 text-xs">
                Use the Live Feeds panel to assign a camera to this TV
              </p>
            </div>
          )}

          {status === "connecting" && (
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-6 py-3">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span className="text-white/70 text-sm">Connecting to {cameraLabel}…</span>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-red-500/20 rounded-full px-6 py-3">
                <span className="text-red-400 text-sm">Camera connection failed</span>
              </div>
              <p className="text-white/30 text-xs">
                Try sending the camera again from the control panel
              </p>
            </div>
          )}
        </div>
      )}

      {/* Live indicator badge */}
      {status === "live" && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="bg-black/50 backdrop-blur rounded-full px-3 py-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-medium">LIVE · {cameraLabel}</span>
          </span>
          <span className="bg-[#c18d31]/80 backdrop-blur rounded-full px-3 py-1 text-white text-xs font-bold">
            TV {tvNumber}
          </span>
        </div>
      )}
    </div>
  );
}
