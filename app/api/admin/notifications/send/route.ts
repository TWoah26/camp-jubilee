import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length && process.env.FIREBASE_SERVICE_ACCOUNT) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!["director", "administrator"].includes(profile?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { user_ids, title, body } = await req.json();
    if (!user_ids?.length || !title) {
      return NextResponse.json({ error: "Missing user_ids or title" }, { status: 400 });
    }

    const db = await createAdminClient();
    const { data: tokens } = await db
      .from("push_tokens")
      .select("token")
      .in("user_id", user_ids)
      .eq("platform", "web");

    if (!tokens?.length || !admin.apps.length) {
      return NextResponse.json({ sent: 0, noTokens: true });
    }

    const results = await Promise.allSettled(
      tokens.map((t: any) =>
        admin.messaging().send({ token: t.token, notification: { title, body: body ?? "" } })
      )
    );

    const sent = results.filter(r => r.status === "fulfilled").length;
    return NextResponse.json({ sent, total: tokens.length });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
