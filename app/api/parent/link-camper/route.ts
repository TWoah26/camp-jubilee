import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const camperCode = (formData.get("camper_code") as string)?.trim().toUpperCase();
    const parentId = formData.get("parent_id") as string;

    if (!camperCode || !parentId) {
      return NextResponse.redirect(new URL("/dashboard?error=missing", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
    }

    const supabase = await createClient();

    const { data: camper } = await supabase
      .from("campers")
      .select("id")
      .eq("camper_code", camperCode)
      .single();

    if (!camper) {
      return NextResponse.redirect(new URL("/dashboard?error=not_found", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
    }

    const { error } = await supabase.from("parent_camper_links").insert({
      parent_id: parentId,
      camper_id: camper.id,
      approved: true,
    });

    if (error && error.code !== "23505") {
      return NextResponse.redirect(new URL("/dashboard?error=link_failed", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
    }

    return NextResponse.redirect(new URL("/dashboard?linked=1", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  } catch {
    return NextResponse.redirect(new URL("/dashboard?error=server", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }
}
