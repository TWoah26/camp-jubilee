"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function PosCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "cancelled" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const paymentStatus = searchParams.get("status");
    const transactionId = searchParams.get("transaction_id");

    if (paymentStatus === "cancel") {
      localStorage.removeItem("sq_pending");
      setStatus("cancelled");
      return;
    }

    if (paymentStatus !== "ok") {
      setStatus("error");
      setMessage("Payment was not completed.");
      return;
    }

    // Read pending payment metadata saved before launching Square
    let pending: { type: string; camper_id: string; session_id?: string; amount: number } | null = null;
    try {
      const raw = localStorage.getItem("sq_pending");
      if (raw) pending = JSON.parse(raw);
    } catch {}
    localStorage.removeItem("sq_pending");

    if (!pending?.camper_id || !pending?.amount) {
      setStatus("error");
      setMessage("Could not find payment details. Please record the payment manually.");
      return;
    }

    const { type, camper_id, session_id, amount } = pending;

    if (type === "tuition") {
      fetch("/api/admin/payments/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camper_id,
          session_id,
          amount,
          type: "tuition",
          payment_method: "in_person",
          notes: `Square in-person payment${transactionId ? ` (${transactionId})` : ""}`,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStatus("success");
            setMessage(`$${amount.toFixed(2)} tuition payment recorded.`);
          } else {
            setStatus("error");
            setMessage(data.error ?? "Failed to record tuition payment.");
          }
        })
        .catch(() => {
          setStatus("error");
          setMessage("Network error. Please record the payment manually.");
        });
    } else {
      fetch("/api/admin/store/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camper_id,
          amount,
          payment_method: "in_person",
          note: `Square in-person payment${transactionId ? ` (${transactionId})` : ""}`,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStatus("success");
            setMessage(`$${amount.toFixed(2)} added to store account.`);
          } else {
            setStatus("error");
            setMessage(data.error ?? "Failed to credit account.");
          }
        })
        .catch(() => {
          setStatus("error");
          setMessage("Network error. Please add the funds manually.");
        });
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-jubilee-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        {status === "loading" && (
          <>
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="font-semibold text-jubilee-navy">Processing payment…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-bold text-jubilee-navy text-xl mb-2">Payment Complete</h2>
            <p className="text-gray-600">{message}</p>
            <button
              onClick={() => router.push("/admin/checkin")}
              className="mt-6 bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold transition-colors"
            >
              Back to Check-In
            </button>
          </>
        )}
        {status === "cancelled" && (
          <>
            <div className="text-5xl mb-4">↩️</div>
            <h2 className="font-bold text-jubilee-navy text-xl mb-2">Payment Cancelled</h2>
            <p className="text-gray-600">No charge was made.</p>
            <button
              onClick={() => router.push("/admin/checkin")}
              className="mt-6 bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold transition-colors"
            >
              Back to Check-In
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="font-bold text-jubilee-navy text-xl mb-2">Something went wrong</h2>
            <p className="text-gray-600 text-sm">{message}</p>
            <button
              onClick={() => router.push("/admin/checkin")}
              className="mt-6 bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold transition-colors"
            >
              Back to Check-In
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PosCallbackPage() {
  return (
    <Suspense>
      <PosCallbackContent />
    </Suspense>
  );
}
