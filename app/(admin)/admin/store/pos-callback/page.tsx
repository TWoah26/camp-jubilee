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
    const clientTransactionId = searchParams.get("client_transaction_id");
    const transactionId = searchParams.get("transaction_id");

    if (paymentStatus === "cancel") {
      setStatus("cancelled");
      return;
    }

    if (paymentStatus !== "ok" || !clientTransactionId) {
      setStatus("error");
      setMessage("Payment was not completed.");
      return;
    }

    // Call the public Square callback endpoint — no user session required
    fetch("/api/square/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_transaction_id: clientTransactionId,
        transaction_id: transactionId,
        status: paymentStatus,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus("success");
          setMessage(`$${data.amount?.toFixed(2)} added to store account.`);
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
