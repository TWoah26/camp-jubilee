"use client";

import { useEffect, useState } from "react";
import { requestPushPermission } from "@/lib/firebase";

export default function NotificationPrompt({ userId }: { userId: string }) {
  const [status, setStatus] = useState<"idle" | "asking" | "granted" | "denied" | "unsupported">("idle");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "granted") setStatus("granted");
    else if (Notification.permission === "denied") setStatus("denied");
    else setStatus("idle");
  }, []);

  const handleEnable = async () => {
    setStatus("asking");
    const token = await requestPushPermission(userId);
    setStatus(token ? "granted" : "denied");
  };

  if (status !== "idle") return null;

  return (
    <div className="bg-jubilee-navy/5 border border-jubilee-navy/10 rounded-2xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-jubilee-navy text-sm">Stay in the loop</p>
        <p className="text-gray-500 text-xs mt-0.5">Get notified when photos are posted or announcements go out.</p>
      </div>
      <button
        onClick={handleEnable}
        className="shrink-0 bg-jubilee-navy text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-jubilee-gold transition-colors"
      >
        Enable
      </button>
    </div>
  );
}
