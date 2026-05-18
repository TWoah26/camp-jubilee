import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!["director", "administrator"].includes(profile?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find campers with positive balance and their linked parents
    const { data: links } = await supabase
      .from("parent_camper_links")
      .select("parent_id, camper:campers(id, first_name, last_name, store_balance), parent:users(id, name)")
      .eq("approved", true)
      .gt("camper.store_balance", 0);

    // De-duplicate by parent and aggregate their campers
    const parentMap = new Map<string, { id: string; name: string; balance: number; campers: string[] }>();
    for (const link of links ?? []) {
      const camper = link.camper as any;
      const parent = link.parent as any;
      if (!camper || !parent || camper.store_balance <= 0) continue;
      if (!parentMap.has(parent.id)) {
        parentMap.set(parent.id, { id: parent.id, name: parent.name, balance: 0, campers: [] });
      }
      const entry = parentMap.get(parent.id)!;
      entry.balance += camper.store_balance;
      entry.campers.push(`${camper.first_name} ${camper.last_name}`);
    }

    return NextResponse.json({ parents: Array.from(parentMap.values()) });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
