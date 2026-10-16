// Sends a browser push when a row is added to public.notifications.
// Triggered by a Database Webhook (see setup steps).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const TEXT: Record<string, string> = {
  task_completed: "finished a commitment",
  encouragement: "cheered you on",
  check_in_help: "needs help with a commitment",
  group_invite: "invited you to a group",
  incoming_call: "is calling you",
  collab_invite: "invited you to collaborate on a post",
  mention: "mentioned you",
};
const LABEL: Record<string, string> = { image: "Photo", video: "Video", audio: "Voice note" };

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const n = payload.record;
    if (payload.type !== "INSERT" || !n) return new Response("skip");

    const [subs, ns, actor] = await Promise.all([
      sb.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", n.user_id),
      sb.from("notification_settings").select("muted_until").eq("user_id", n.user_id).maybeSingle(),
      n.actor_id
        ? sb.from("profiles").select("username,full_name").eq("id", n.actor_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (!subs.data || !subs.data.length) return new Response("no subscriptions");
    if (ns.data && ns.data.muted_until && new Date(ns.data.muted_until) > new Date()) return new Response("muted");

    const who = actor.data?.full_name || actor.data?.username || "Someone";
    let title = "Logra";
    let body = `${who} ${TEXT[n.type] ?? "sent you an update"}`;
    let tag = `${n.type}-${n.id}`;

    if (n.type === "message") {
      const cid = n.data?.conversation_id;
      const { data } = await sb.from("messages")
        .select("body,media_type,deleted_at")
        .eq("conversation_id", cid).eq("sender_id", n.actor_id)
        .order("created_at", { ascending: false }).limit(1);
      const last = data?.[0];
      title = who;
      body = last && !last.deleted_at ? (last.body || LABEL[last.media_type] || "New message") : "New message";
      tag = `chat-${cid}`;
    }

    const msg = JSON.stringify({ title, body: body.slice(0, 140), tag });
    await Promise.all(subs.data.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, msg);
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }));
    return new Response("ok");
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
