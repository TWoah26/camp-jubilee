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

    async function handleRecovery() {
      // --- Case 1: PKCE flow — ?code=xxx in query string ---
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) { router.replace("/reset-password"); return; }
        setStatus("error");
        return;
      }

      // --- Case 2: Implicit / hash flow — #access_token=xxx in URL fragment ---
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.replace("#", ""));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token") ?? "";
        const type = params.get("type");

        if (accessToken && type === "recovery") {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (!error) { router.replace("/reset-password"); return; }
        }
      }

      // --- Nothing worked ---
      setStatus("error");
    }

    handleRecovery();
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
