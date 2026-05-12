import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) return NextResponse.json([]);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["director","administrator"].includes(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: campers } = await supabase
    .from("campers")
    .select("id, first_name, last_name, cabin, store_balance, is_staff, session:sessions(name)")
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    .order("last_name")
    .limit(8);

  return NextResponse.json(campers ?? []);
}
