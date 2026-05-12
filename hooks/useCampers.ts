"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Camper, ParentCamperLink } from "@/types";

export function useCampers(parentId: string) {
  const [campers, setCampers] = useState<Camper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!parentId) return;
    const supabase = createClient();
    supabase
      .from("parent_camper_links")
      .select("*, camper:campers(*)")
      .eq("parent_id", parentId)
      .eq("approved", true)
      .then(({ data }) => {
        setCampers((data ?? []).map((l: any) => l.camper));
        setLoading(false);
      });
  }, [parentId]);

  return { campers, loading };
}
