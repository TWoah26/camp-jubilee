import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function generateCamperCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface CamperRow {
  first_name: string;
  last_name: string;
  grade?: string;
  shirt_size?: string;
  cabin?: string;
  dietary_restrictions?: string;
  medications?: string;
  tuition_commitment?: string;
  tuition_paid?: string;
  parent_name?: string;
  parent_email?: string;
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

    // Get active session
    const { data: activeSession } = await supabase
      .from("sessions")
      .select("id")
      .eq("is_active", true)
      .single();

    if (!activeSession) {
      return NextResponse.json({ error: "No active session found. Please activate a session before importing campers." }, { status: 400 });
    }

    const { rows }: { rows: CamperRow[] } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const admin = await createAdminClient();
    const errors: Array<{ row: number; error: string }> = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.first_name?.trim() || !row.last_name?.trim()) {
        errors.push({ row: rowNum, error: "Missing first_name or last_name" });
        continue;
      }

      // Generate a unique camper_code (retry on collision)
      let camperCode = generateCamperCode();
      let attempts = 0;
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from("campers")
          .select("id")
          .eq("camper_code", camperCode)
          .maybeSingle();
        if (!existing) break;
        camperCode = generateCamperCode();
        attempts++;
      }

      const tuitionCommitment = parseFloat(row.tuition_commitment ?? "") || 0;
      const tuitionPaid = parseFloat(row.tuition_paid ?? "") || 0;

      // Insert camper using admin client (bypasses RLS for director-level import)
      const { data: camper, error: camperError } = await admin
        .from("campers")
        .insert({
          first_name: row.first_name.trim(),
          last_name: row.last_name.trim(),
          grade: row.grade?.trim() || null,
          shirt_size: row.shirt_size?.trim() || null,
          cabin: row.cabin?.trim() || null,
          dietary_restrictions: row.dietary_restrictions?.trim() || null,
          medications: row.medications?.trim() || null,
          tuition_commitment: tuitionCommitment,
          tuition_paid: tuitionPaid,
          session_id: activeSession.id,
          store_balance: 0,
          camper_code: camperCode,
          is_staff: false,
        })
        .select("id")
        .single();

      if (camperError || !camper) {
        errors.push({ row: rowNum, error: camperError?.message ?? "Failed to insert camper" });
        continue;
      }

      // Handle parent linking if parent_email provided
      const parentEmail = row.parent_email?.trim().toLowerCase();
      if (parentEmail) {
        try {
          // Check if user with this email already exists
          const { data: existingUsers } = await admin.auth.admin.listUsers();
          const existingAuthUser = existingUsers?.users.find(
            (u) => u.email?.toLowerCase() === parentEmail
          );

          let parentUserId: string | null = null;

          if (existingAuthUser) {
            // User exists in auth — check if they have a users table row
            const { data: existingProfile } = await admin
              .from("users")
              .select("id")
              .eq("id", existingAuthUser.id)
              .maybeSingle();

            if (existingProfile) {
              parentUserId = existingProfile.id;
            } else {
              // Auth user exists but no profile row — create one
              const { error: profileError } = await admin.from("users").insert({
                id: existingAuthUser.id,
                email: parentEmail,
                name: row.parent_name?.trim() || parentEmail,
                role: "parent",
              });
              if (!profileError) {
                parentUserId = existingAuthUser.id;
              }
            }
          } else {
            // Invite new user
            const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
              parentEmail,
              {
                data: {
                  name: row.parent_name?.trim() || parentEmail,
                  role: "parent",
                },
              }
            );

            if (inviteError || !invited?.user) {
              errors.push({ row: rowNum, error: `Camper imported but failed to invite parent (${parentEmail}): ${inviteError?.message ?? "unknown error"}` });
              imported++;
              continue;
            }

            // Create users table row for invited user
            const { error: profileError } = await admin.from("users").insert({
              id: invited.user.id,
              email: parentEmail,
              name: row.parent_name?.trim() || parentEmail,
              role: "parent",
            });

            if (profileError) {
              errors.push({ row: rowNum, error: `Camper imported, parent invited, but profile creation failed: ${profileError.message}` });
              imported++;
              continue;
            }

            parentUserId = invited.user.id;
          }

          if (parentUserId) {
            // Upsert parent_camper_links with approved = true
            const { error: linkError } = await admin
              .from("parent_camper_links")
              .upsert(
                { parent_id: parentUserId, camper_id: camper.id, approved: true },
                { onConflict: "parent_id,camper_id" }
              );

            if (linkError) {
              errors.push({ row: rowNum, error: `Camper imported but parent link failed: ${linkError.message}` });
            }
          }
        } catch (parentErr) {
          errors.push({ row: rowNum, error: `Camper imported but parent processing failed: ${String(parentErr)}` });
        }
      }

      imported++;
    }

    return NextResponse.json({ imported, errors });
  } catch (err) {
    return NextResponse.json({ error: `Server error: ${String(err)}` }, { status: 500 });
  }
}
