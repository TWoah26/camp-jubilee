"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RecoveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const supabase = createClient();
    const code = searchParams.get("code");

    if (code) {
      // PKCE flow — code in query param
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setStatus("error");
        } else {
          router.replace("/reset-password");
        }
      });
    } else {
      // Implicit / hash flow — token is in the URL fragment (#access_token=...)
      // The Supabase client auto-detects the hash and fires onAuthStateChange
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          router.replace("/reset-password");
        }
      });

      // Fallback: if nothing fires within 8 seconds, show error
      const timeout = setTimeout(() => setStatus("error"), 8000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    }
  }, []);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jubilee-cream p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-jubilee-navy font-semibold mb-1">Link expired or already used</p>
          <p className="text-gray-500 text-sm mb-5">Password reset links can only be used once and expire after 1 hour.</p>
          <button
            onClick={() => router.replace("/forgot-password")}
            className="w-full bg-jubilee-navy text-white py-2.5 rounded-lg font-medium hover:bg-jubilee-gold transition-colors"
          >
            Request a new link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-jubilee-cream p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
        <div className="text-3xl mb-3 animate-pulse">🔐</div>
        <p className="text-jubilee-navy font-semibold">Verifying your link…</p>
        <p className="text-gray-400 text-sm mt-1">You'll be redirected in a moment.</p>
      </div>
    </div>
  );
}
