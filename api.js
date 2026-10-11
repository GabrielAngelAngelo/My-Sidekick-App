import { supabase } from "./supabase";

export async function getProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(userId, name) {
  const { error } = await supabase.from("profiles").upsert({ id: userId, name });
  if (error) throw error;
}

export async function createInvite(role) {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("invites")
    .insert({ inviter: auth.user.id, role })
    .select("code")
    .single();
  if (error) throw error;
  return data.code;
}

// Returns the inviter's name.
export async function acceptInvite(code) {
  const { data, error } = await supabase.rpc("accept_invite", { invite_code: code });
  if (error) throw error;
  return data;
}

export async function listFriends(userId) {
  const { data: rows, error } = await supabase.from("friendships").select("id,a,b,role");
  if (error) throw error;
  const ids = rows.map((r) => (r.a === userId ? r.b : r.a));
  if (!ids.length) return [];
  const { data: profs, error: e2 } = await supabase.from("profiles").select("id,name").in("id", ids);
  if (e2) throw e2;
  return rows.map((r) => {
    const fid = r.a === userId ? r.b : r.a;
    const p = profs.find((x) => x.id === fid);
    return { id: fid, name: p ? p.name : "Friend", role: r.role };
  });
}
