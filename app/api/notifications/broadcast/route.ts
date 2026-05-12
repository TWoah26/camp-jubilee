import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length && process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function POST(req: Request) {
  try {
    const { title, body } = await req.json();
    const supabase = await createClient();

    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token, platform");

    if (!tokens || tokens.length === 0) return NextResponse.json({ sent: 0 });

    const webTokens = tokens
      .filter((t: any) => t.platform === "web")
      .map((t: any) => t.token);

    if (webTokens.length === 0 || !admin.apps.length) {
      return NextResponse.json({ sent: 0 });
    }

    const results = await Promise.allSettled(
      webTokens.map((token: string) =>
        admin.messaging().send({
          token,
          notification: { title, body },
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ sent });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
