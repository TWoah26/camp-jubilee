import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Called after parent sets their password — approves all their pending links
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("parent_camper_links")
    .update({ approved: true })
    .eq("parent_id", user.id)
    .eq("approved", false);

  return NextResponse.json({ success: true });
}
