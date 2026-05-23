"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function PosCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "cancelled" | "error">("loading");
  const [message, setMessage] = useState("");

  // Where to redirect after processing (default: store page)
  const returnTo = searchParams.get("return_to") ?? "/admin/store";

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

    const parts = clientTransactionId.split("___");

    // Determine payment type from first segment
    const paymentType = parts[0] === "store" || parts[0] === "tuition" ? parts[0] : "store";
    const isNew = parts[0] === "store" || parts[0] === "tuition";
    const dataParts = isNew ? parts.slice(1) : parts; // strip type prefix if present

    if (paymentType === "tuition") {
      // Format: tuition___camperId___sessionId___amountCents___timestamp
      const [camperId, sessionId, amountCentsStr] = dataParts;
      const amount = parseInt(amountCentsStr) / 100;

      if (!camperId || !sessionId || isNaN(amount) || amount <= 0) {
        setStatus("error");
        setMessage("Could not parse tuition payment data.");
        return;
      }

      fetch("/api/admin/payments/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camper_id: camperId,
          session_id: sessionId,
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
            setMessage(`${formatCurrency(amount)} tuition payment recorded.`);
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
      // Store credit — format: store___camperId___amountCents___timestamp  OR legacy: camperId___amountCents___timestamp
      const [camperId, amountCentsStr] = dataParts;
      const amount = parseInt(amountCentsStr) / 100;

      if (!camperId || isNaN(amount) || amount <= 0) {
        setStatus("error");
        setMessage("Could not parse payment data.");
        return;
      }

      fetch("/api/admin/store/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camper_id: camperId,
          amount,
          payment_method: "in_person",
          note: `Square in-person payment${transactionId ? ` (${transactionId})` : ""}`,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStatus("success");
            setMessage(`${formatCurrency(amount)} added to store account.`);
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

  const isCheckin = returnTo.includes("checkin");

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
              onClick={() => router.push(returnTo)}
              className="mt-6 bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold transition-colors"
            >
              {isCheckin ? "Back to Check-In" : "Back to Store"}
            </button>
          </>
        )}

        {status === "cancelled" && (
          <>
            <div className="text-5xl mb-4">↩️</div>
            <h2 className="font-bold text-jubilee-navy text-xl mb-2">Payment Cancelled</h2>
            <p className="text-gray-600">No charge was made.</p>
            <button
              onClick={() => router.push(returnTo)}
              className="mt-6 bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold transition-colors"
            >
              {isCheckin ? "Back to Check-In" : "Back to Store"}
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="font-bold text-jubilee-navy text-xl mb-2">Something went wrong</h2>
            <p className="text-gray-600 text-sm">{message}</p>
            <button
              onClick={() => router.push(returnTo)}
              className="mt-6 bg-jubilee-navy text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-jubilee-gold transition-colors"
            >
              {isCheckin ? "Back to Check-In" : "Back to Store"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function PosCallbackPage() {
  return (
    <Suspense>
      <PosCallbackContent />
    </Suspense>
  );
}
