"use client";

import { useEffect } from "react";

export default function NotificationsSeenMarker() {
  useEffect(() => {
    fetch("/api/parent/mark-notifications-seen", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
