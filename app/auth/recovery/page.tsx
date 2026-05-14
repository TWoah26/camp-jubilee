"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RecoveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      router.replace("/forgot-password?error=invalid-link");
      return;
    }

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setStatus("error");
        setTimeout(() => router.replace("/forgot-password?error=invalid-link"), 2000);
      } else {
        router.replace("/reset-password");
      }
    });
  }, []);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jubilee-cream p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-jubilee-navy font-semibold">Link expired or already used.</p>
          <p className="text-gray-500 text-sm mt-1">Redirecting you to request a new one…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-jubilee-cream p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm">
        <div className="text-3xl mb-3 animate-pulse">🔐</div>
        <p className="text-jubilee-navy font-semibold">Verifying your link…</p>
      </div>
    </div>
  );
}
