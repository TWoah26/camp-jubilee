import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("Register: creating supabase client");
    const supabase = await createClient();

    console.log("Register: calling signUp for", email);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (authError) {
      console.error("Register: signUp error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      console.error("Register: no user returned from signUp");
      return NextResponse.json({ error: "Registration failed" }, { status: 500 });
    }

    console.log("Register: inserting user profile for", authData.user.id);
    const { error: profileError } = await supabase.from("users").insert({
      id: authData.user.id,
      email,
      name,
      role: "parent",
    });

    if (profileError) {
      console.error("Register: profile insert error:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Registration error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Internal server error", detail: message }, { status: 500 });
  }
}
