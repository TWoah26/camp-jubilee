"use client";

import { useState } from "react";

export default function UnlinkCamperButton({ linkId, camperName }: { linkId: string; camperName: string }) {
  const [loading, setLoading] = useState(false);

  const handleUnlink = async () => {
    if (!confirm(`Remove ${camperName} from your account?`)) return;
    setLoading(true);
    const res = await fetch("/api/parent/unlink-camper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link_id: linkId }),
    });
    if (res.ok) window.location.reload();
    else setLoading(false);
  };

  return (
    <button
      onClick={handleUnlink}
      disabled={loading}
      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
    >
      {loading ? "Removing..." : "Unlink"}
    </button>
  );
}
