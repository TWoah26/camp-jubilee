"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole, Session } from "@/types";
import AdminSessionSwitcher from "./admin/AdminSessionSwitcher";

interface NavBarProps {
  role: UserRole;
  userName: string;
  sessions?: Session[];
  currentSessionId?: string | null;
}

const parentLinks = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/payments", label: "Payments", icon: "💳" },
  { href: "/messages", label: "Messages", icon: "✉️" },
  { href: "/photos", label: "Photos", icon: "📸" },
  { href: "/info", label: "Info", icon: "ℹ️" },
];

const adminLinks = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/checkin", label: "Check-In", icon: "✅" },
  { href: "/admin/campers", label: "Campers", icon: "🧒" },
  { href: "/admin/parents", label: "Parents", icon: "👨‍👩‍👧" },
  { href: "/admin/medical", label: "Medical", icon: "🏥" },
  { href: "/admin/messages", label: "Messages", icon: "✉️" },
  { href: "/admin/photos", label: "Photos", icon: "📸" },
  { href: "/admin/store", label: "Camp Store", icon: "🛍️" },
  { href: "/admin/finances", label: "Finances", icon: "💰" },
  { href: "/admin/session", label: "Session", icon: "⚙️" },
  { href: "/admin/info", label: "Info Pages", icon: "📝" },
  { href: "/admin/users", label: "Users", icon: "👥" },
];

const nurseLinks = [
  { href: "/admin/checkin", label: "Check-In", icon: "✅" },
  { href: "/admin/medical", label: "Medical", icon: "🏥" },
];

const mediaLinks = [
  { href: "/admin/photos", label: "Photos", icon: "📸" },
];

const storeLinks = [
  { href: "/admin/store", label: "Camp Store", icon: "🛍️" },
];

const staffLinks = [
  { href: "/staff", label: "Home", icon: "🏠" },
  { href: "/staff/store", label: "My Store", icon: "🛍️" },
  { href: "/photos", label: "Photos", icon: "📸" },
  { href: "/info", label: "Info", icon: "ℹ️" },
];

export default function NavBar({ role, userName, sessions = [], currentSessionId = null }: NavBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const links =
    role === "director" || role === "administrator" ? adminLinks
    : role === "nurse" ? nurseLinks
    : role === "media" ? mediaLinks
    : role === "store" ? storeLinks
    : role === "staff" ? staffLinks
    : role === "parent" ? parentLinks
    : [];

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Desktop sidebar — brand navy #3a4755 */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-jubilee-navy text-white fixed left-0 top-0">
        <div className="p-6 border-b border-white/10">
          {/* Wordmark in Nunito to match brand logo feel */}
          <div className="font-display font-black text-xl leading-tight tracking-tight">
            <span className="text-jubilee-gold">camp</span>{" "}
            <span className="text-white">jubilee</span>
          </div>
          <p className="text-white/40 text-xs mt-1 tracking-widest uppercase">Rest. Restore. Rejoice.</p>
          <p className="text-white/50 text-xs mt-2">{userName}</p>
        </div>
        {(role === "director" || role === "administrator") && sessions.length > 0 && (
          <AdminSessionSwitcher sessions={sessions} currentSessionId={currentSessionId} />
        )}
        <nav className="flex-1 p-4 space-y-0.5">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href))
                  ? "bg-jubilee-gold text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="w-full text-left text-white/40 hover:text-white text-sm px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      {links.length > 0 && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-jubilee-navy border-t border-white/10 z-50">
          <div className="flex overflow-x-auto scrollbar-none">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "shrink-0 flex flex-col items-center py-2 px-3 text-xs transition-colors min-w-[64px]",
                  pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href))
                    ? "text-jubilee-gold"
                    : "text-white/50"
                )}
              >
                <span className="text-lg">{link.icon}</span>
                <span className="mt-0.5">{link.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
