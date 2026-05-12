import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import MessageComposer from "@/components/MessageComposer";
import { formatDateTime } from "@/lib/utils";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { data: sessionRows } = await supabase.from("sessions").select("is_active, name").eq("is_active", true).order("created_at", { ascending: false }).limit(1);
  const session = sessionRows?.[0] ?? null;

  const { data: links } = await supabase
    .from("parent_camper_links")
    .select("*, camper:campers(id, first_name, last_name)")
    .eq("parent_id", user.id)
    .eq("approved", true);

  const { data: messages } = await supabase
    .from("messages")
    .select("*, to_camper:campers(id, first_name, last_name)")
    .eq("from_parent_id", user.id)
    .order("sent_at", { ascending: false });

  const campers = (links ?? []).map((l: any) => l.camper);
  const sessionActive = session?.is_active ?? false;

  // Group messages by camper
  const messagesByCamper: Record<string, { camper: any; messages: any[] }> = {};
  for (const msg of messages ?? []) {
    const camperId = msg.to_camper?.id;
    if (!camperId) continue;
    if (!messagesByCamper[camperId]) {
      messagesByCamper[camperId] = { camper: msg.to_camper, messages: [] };
    }
    messagesByCamper[camperId].messages.push(msg);
  }

  return (
    <AppShell role={profile.role} userName={profile.name}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-jubilee-green-dark">Messages</h1>

        {!sessionActive ? (
          <div className="bg-jubilee-amber/10 border border-jubilee-amber rounded-xl p-5 text-center">
            <div className="text-3xl mb-2">🔒</div>
            <p className="font-medium text-jubilee-brown">Messaging is currently closed</p>
            <p className="text-sm text-gray-600 mt-1">Messages can be sent when camp session is active.</p>
          </div>
        ) : campers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <p className="text-gray-500">No linked campers yet. Link a camper from your dashboard first.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-jubilee-green-dark mb-4">Send a Message</h2>
            <MessageComposer campers={campers} parentId={user.id} />
          </div>
        )}

        {campers.map((camper: any) => {
          const group = messagesByCamper[camper.id];
          if (!group) return (
            <div key={camper.id} className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-semibold text-jubilee-green-dark mb-2">{camper.first_name} {camper.last_name}</h2>
              <p className="text-sm text-gray-400">No messages sent yet.</p>
            </div>
          );
          return (
            <div key={camper.id} className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-semibold text-jubilee-green-dark mb-3">{camper.first_name} {camper.last_name}</h2>
              <div className="space-y-3">
                {group.messages.map((msg: any) => (
                  <div key={msg.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs text-gray-400">{formatDateTime(msg.sent_at)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${msg.status === "delivered" ? "bg-jubilee-green/10 text-jubilee-green" : "bg-gray-100 text-gray-500"}`}>
                        {msg.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{msg.body}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
