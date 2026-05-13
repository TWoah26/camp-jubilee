import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { UserRole } from "@/types";

const VALID_ROLES: UserRole[] = ["parent", "staff", "director", "administrator", "nurse", "media", "store"];

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["director", "administrator"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { user_id, role } = body as { user_id: string; role: UserRole };

    if (!user_id || !role) {
      return NextResponse.json({ error: "Missing user_id or role" }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const admin = await createAdminClient();
    const { error } = await admin
      .from("users")
      .update({ role })
      .eq("id", user_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If promoting to staff, auto-create + link a camper record if one doesn't exist
    if (role === "staff") {
      const { data: existingCamper } = await admin
        .from("campers")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (!existingCamper) {
        // Get their name from the users table
        const { data: targetUser } = await admin
          .from("users")
          .select("name, email")
          .eq("id", user_id)
          .single();

        const nameParts = (targetUser?.name || targetUser?.email || "Staff").trim().split(" ");
        const firstName = nameParts[0] ?? "Staff";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Generate unique camper code
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let camperCode = "";
        for (let i = 0; i < 8; i++) camperCode += chars.charAt(Math.floor(Math.random() * chars.length));

        // Get active session (optional — staff may not be tied to one session)
        const { data: activeSession } = await admin
          .from("sessions")
          .select("id")
          .eq("is_active", true)
          .maybeSingle();

        await admin.from("campers").insert({
          first_name: firstName,
          last_name: lastName,
          is_staff: true,
          user_id,
          store_balance: 0,
          camper_code: camperCode,
          session_id: activeSession?.id ?? null,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["director", "administrator"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    if (user_id === user.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

    const admin = await createAdminClient();
    const { error } = await admin.from("users").delete().eq("id", user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
