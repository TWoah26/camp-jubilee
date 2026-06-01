import NavBar from "./NavBar";
import type { UserRole } from "@/types";
import type { Session } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { getAdminSessionId } from "@/lib/admin-session";

interface AppShellProps {
  children: React.ReactNode;
  role: UserRole;
  userName: string;
}

export default async function AppShell({ children, role, userName }: AppShellProps) {
  let sessions: Session[] = [];
  let currentSessionId: string | null = null;

  if (role === "director" || role === "administrator") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("start_date", { ascending: true });
    sessions = data ?? [];
    currentSessionId = await getAdminSessionId();
  }

  return (
    <div className="min-h-screen bg-jubilee-cream">
      <NavBar role={role} userName={userName} sessions={sessions} currentSessionId={currentSessionId} />
      <main className="md:ml-60 pb-28 md:pb-0">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
