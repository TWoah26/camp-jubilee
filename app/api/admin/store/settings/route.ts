import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("store_settings").select("quick_amounts").eq("id", 1).single();
  return NextResponse.json({ quick_amounts: data?.quick_amounts ?? [1, 2, 5, 10, 15, 20] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!["director", "administrator"].includes(profile?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { quick_amounts } = await req.json();
  if (!Array.isArray(quick_amounts) || quick_amounts.length !== 6) {
    return NextResponse.json({ error: "Must provide exactly 6 amounts" }, { status: 400 });
  }

  await supabase.from("store_settings").upsert({ id: 1, quick_amounts });
  return NextResponse.json({ success: true });
}
