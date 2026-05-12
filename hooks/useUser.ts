"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) { setLoading(false); return; }
      const { data } = await supabase.from("users").select("*").eq("id", authUser.id).single();
      setUser(data);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
