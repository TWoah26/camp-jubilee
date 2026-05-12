import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireDirector(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  return profile?.role === "director" ? user : null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const user = await requireDirector(supabase);
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, body, posted_by } = await req.json();
    const { error } = await supabase.from("announcements").insert({ title, body, posted_by });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fire and forget push notification
    fetch(new URL("/api/notifications/broadcast", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "📢 New announcement from Camp Jubilee", body: title }),
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const user = await requireDirector(supabase);
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await req.json();
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
