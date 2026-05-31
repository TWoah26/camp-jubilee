"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function PosCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "cancelled" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Square returns everything as a single ?data=<json> parameter
    const dataParam = searchParams.get("data");

    if (!dataParam) {
      setStatus("error");
      setMessage("No callback data received from Square.");
      return;
    }

    let callbackData: { status?: string; transaction_id?: string; client_transaction_id?: string };
    try {
      callbackData = JSON.parse(dataParam);
    } catch {
      setStatus("error");
      setMessage("Could not parse Square response.");
      return;
    }

    const { status: paymentStatus, transaction_id: transactionId, client_transaction_id: camperId } = callbackData;

    if (paymentStatus === "cancel") {
      setStatus("cancelled");
      return;
    }

    if (paymentStatus !== "ok" || !camperId) {
      setStatus("error");
      setMessage("Payment was not completed.");
      return;
    }

    // Read the pending amount from localStorage (saved before opening Square)
    const pendingRaw = localStorage.getItem(`sq_pending_${camperId}`);
    if (!pendingRaw) {
      setStatus("error");
      setMessage("Payment was processed in Square but the pending record was not found. Please add funds manually.");
      return;
    }

    let amount: number;
    try {
      ({ amount } = JSON.parse(pendingRaw));
      localStorage.removeItem(`sq_pending_${camperId}`);
    } catch {
      setStatus("error");
      setMessage("Could not read pending payment data.");
      return;
    }

    if (!amount || amount <= 0) {
      setStatus("error");
      setMessage("Invalid payment amount.");
      return;
    }

    fetch("/api/square/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        camper_id: camperId,
        amount,
        transaction_id: transactionId,
        status: paymentStatus,
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
              onClick={() => router.push("/admin/store")}
              className="mt-6 bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold transition-colors"
            >
              Back to Store
            </button>
          </>
        )}
        {status === "cancelled" && (
          <>
            <div className="text-5xl mb-4">↩️</div>
            <h2 className="font-bold text-jubilee-navy text-xl mb-2">Payment Cancelled</h2>
            <p className="text-gray-600">No charge was made.</p>
            <button
              onClick={() => router.push("/admin/store")}
              className="mt-6 bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold transition-colors"
            >
              Back to Store
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="font-bold text-jubilee-navy text-xl mb-2">Something went wrong</h2>
            <p className="text-gray-600 text-sm">{message}</p>
            <button
              onClick={() => router.push("/admin/store")}
              className="mt-6 bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold transition-colors"
            >
              Back to Store
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
