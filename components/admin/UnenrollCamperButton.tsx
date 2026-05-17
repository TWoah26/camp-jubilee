"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UnenrollCamperButton({ camperId, sessionName }: { camperId: string; sessionName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const unenroll = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/campers/${camperId}/unenroll`, { method: "PATCH" });
    setLoading(false);
    if (res.ok) {
      router.push("/admin/campers");
      router.refresh();
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Remove from {sessionName}?</span>
        <button
          onClick={unenroll}
          disabled={loading}
          className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Removing…" : "Yes, remove"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
    >
      Remove from session
    </button>
  );
}
