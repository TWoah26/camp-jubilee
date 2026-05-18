import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("users")
    .update({ notifications_last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}
