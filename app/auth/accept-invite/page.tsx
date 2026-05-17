"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AcceptInviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const supabase = createClient();

    async function handle() {
      // PKCE flow — ?code=xxx in query string
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) { router.replace("/welcome"); return; }
      }

      // Implicit flow — #access_token=xxx in hash
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.replace("#", ""));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token") ?? "";
        const type = params.get("type");

        if (accessToken && (type === "invite" || type === "signup")) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (!error) { router.replace("/welcome"); return; }
        }
      }

      setStatus("error");
    }

    handle();
  }, []);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jubilee-cream p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-jubilee-navy font-semibold mb-1">Invite link expired</p>
          <p className="text-gray-500 text-sm mb-5">This link can only be used once. Ask your camp director to resend the invite.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-jubilee-cream p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
        <div className="text-3xl mb-3 animate-pulse">🏕️</div>
        <p className="text-jubilee-navy font-semibold">Setting up your account…</p>
        <p className="text-gray-400 text-sm mt-1">You'll be redirected in a moment.</p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteInner />
    </Suspense>
  );
}
