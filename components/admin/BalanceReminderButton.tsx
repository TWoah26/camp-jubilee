"use client";

import { useState } from "react";
import NotifyModal from "./NotifyModal";
import { formatCurrency } from "@/lib/utils";

interface Parent { id: string; name: string; balance: number; campers: string[]; }

export default function BalanceReminderButton() {
  const [loading, setLoading] = useState(false);
  const [parents, setParents] = useState<Parent[] | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/notifications/balance-parents");
    const data = await res.json();
    setLoading(false);
    if (!data.parents?.length) {
      alert("No parents with outstanding balances found.");
      return;
    }
    setParents(data.parents);
    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 bg-jubilee-navy text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-jubilee-gold transition-colors disabled:opacity-50"
      >
        🔔 {loading ? "Loading…" : "Notify parents with balances"}
      </button>

      {showModal && parents && (
        <NotifyModal
          recipients={parents}
          defaultTitle="Reminder: Your camper has a remaining store balance"
          defaultBody={`The following camper${parents.length !== 1 ? "s have" : " has"} an outstanding balance: ${parents.flatMap(p => p.campers).join(", ")}. Please log in to review.`}
          onClose={() => { setShowModal(false); setParents(null); }}
        />
      )}
    </>
  );
}
