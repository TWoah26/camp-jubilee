import { cookies } from "next/headers";

export async function getAdminSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("admin_session_id")?.value ?? null;
}
