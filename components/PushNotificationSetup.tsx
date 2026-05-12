"use client";

import { useEffect } from "react";
import { requestPushPermission } from "@/lib/firebase";

interface Props {
  userId: string;
}

export default function PushNotificationSetup({ userId }: Props) {
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      // Delay to avoid immediate prompt on page load
      const timer = setTimeout(() => {
        requestPushPermission(userId).catch(() => {});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  return null;
}
