"use client";

import { useState } from "react";
import type { UserRole } from "@/types";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

interface UserManagerProps {
  users: UserRow[];
  currentUserId: string;
}

const ALL_ROLES: UserRole[] = ["parent", "director", "administrator", "nurse", "media", "store"];

const ROLE_LABELS: Record<UserRole, string> = {
  parent: "Parent",
  director: "Director",
  administrator: "Administrator",
  nurse: "Nurse",
  media: "Media",
  store: "Store",
};

const ROLE_COLORS: Record<UserRole, string> = {
  parent: "bg-blue-100 text-blue-800",
  director: "bg-jubilee-navy/10 text-jubilee-navy",
  administrator: "bg-jubilee-gold/20 text-jubilee-brown",
  nurse: "bg-green-100 text-green-800",
  media: "bg-purple-100 text-purple-800",
  store: "bg-jubilee-coral/20 text-jubilee-coral",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UserManager({ users: initialUsers, currentUserId }: UserManagerProps) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  async function handleRoleChange(userId: string, newRole: UserRole) {
    const prevUsers = users;
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    setSavingId(userId);
    setErrorId(null);

    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to update role");
    } catch {
      // Revert on failure
      setUsers(prevUsers);
      setErrorId(userId);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search by name, email, or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold/40 bg-white"
        />
      </div>

      {/* Summary line */}
      <p className="text-sm text-gray-500">
        {filtered.length} {filtered.length === 1 ? "user" : "users"}
        {search ? ` matching "${search}"` : " total"}
      </p>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-jubilee-navy text-white text-left">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Joined</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((u) => {
              const isMe = u.id === currentUserId;
              const isSaving = savingId === u.id;
              const hasError = errorId === u.id;
              return (
                <tr
                  key={u.id}
                  className={`transition-colors ${isMe ? "bg-jubilee-gold/5" : "hover:bg-gray-50"}`}
                >
                  <td className="px-5 py-3.5 font-medium text-jubilee-navy">
                    <div className="flex items-center gap-2">
                      {u.name || <span className="text-gray-400 italic">No name</span>}
                      {isMe && (
                        <span className="text-xs bg-jubilee-gold/20 text-jubilee-brown px-1.5 py-0.5 rounded-full font-medium">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3.5">
                    {isMe ? (
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        disabled={isSaving}
                        className={`border rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-jubilee-gold/40 transition-opacity ${
                          isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        } ${ROLE_COLORS[u.role]} border-transparent`}
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{formatDate(u.created_at)}</td>
                  <td className="px-5 py-3.5 text-xs">
                    {isSaving && <span className="text-jubilee-gold animate-pulse">Saving…</span>}
                    {hasError && <span className="text-jubilee-coral font-medium">Save failed</span>}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {filtered.map((u) => {
          const isMe = u.id === currentUserId;
          const isSaving = savingId === u.id;
          const hasError = errorId === u.id;
          return (
            <div
              key={u.id}
              className={`bg-white rounded-2xl shadow p-4 space-y-2 ${isMe ? "ring-2 ring-jubilee-gold/40" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-jubilee-navy">
                    {u.name || <span className="text-gray-400 italic text-sm">No name</span>}
                    {isMe && (
                      <span className="ml-2 text-xs bg-jubilee-gold/20 text-jubilee-brown px-1.5 py-0.5 rounded-full font-medium">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Joined {formatDate(u.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 font-medium">Role:</span>
                {isMe ? (
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                ) : (
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    disabled={isSaving}
                    className={`border rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-jubilee-gold/40 ${
                      isSaving ? "opacity-50 cursor-not-allowed" : ""
                    } ${ROLE_COLORS[u.role]} border-transparent`}
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                )}
                {isSaving && <span className="text-xs text-jubilee-gold animate-pulse">Saving…</span>}
                {hasError && <span className="text-xs text-jubilee-coral font-medium">Save failed</span>}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">
            No users found
          </div>
        )}
      </div>
    </div>
  );
}
