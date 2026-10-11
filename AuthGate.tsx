import { useEffect, useState } from "react";
import App from "./App";
import { supabase } from "./supabase";
import { getProfile, saveProfile, acceptInvite } from "./api";

const font = 'Inter,-apple-system,"SF Pro Text",system-ui,sans-serif';
const wrap = { minHeight: "100vh", display: "grid", placeItems: "center", background: "#0A0A0B", color: "#F3F3F4", fontFamily: font, padding: 20 };
const input = { width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid #232326", background: "#1D1D20", color: "#F3F3F4", fontSize: 16, fontFamily: font, outline: "none", marginTop: 10, boxSizing: "border-box" };
const btn = { width: "100%", marginTop: 16, padding: "14px", borderRadius: 12, border: 0, background: "#D8B36A", color: "#111", fontWeight: 650, fontSize: 16, fontFamily: font, cursor: "pointer" };

function Center({ children }) {
  return <div style={wrap}><div style={{ opacity: 0.7 }}>{children}</div></div>;
}

function AuthScreen() {
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const invited = !!localStorage.getItem("sk_invite");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Add your first name.");
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name: name.trim() } } });
        if (error) throw error;
        if (!data.session) setMsg("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMsg(err.message || "Something went wrong.");
    }
    setBusy(false);
  }

  return (
    <div style={wrap}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ fontSize: 34, fontWeight: 760, letterSpacing: "-.03em" }}>Sidekick</div>
        <p style={{ opacity: 0.7, marginTop: 8, lineHeight: 1.4 }}>
          {invited ? "A friend invited you. Create an account to join them." : "Get things done with a friend."}
        </p>
        {mode === "signup" && <input style={input} aria-label="First name" placeholder="First name" value={name} onChange={(e) => setName(e.target.value)} />}
        <input style={input} type="email" aria-label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input style={input} type="password" aria-label="Password" placeholder="Password (6 or more characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        <button style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy}>{mode === "signup" ? "Create account" : "Sign in"}</button>
        {msg && <p style={{ marginTop: 12, color: "#F0A0A0", fontSize: 14 }} role="alert">{msg}</p>}
        <button type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMsg(""); }} style={{ ...btn, background: "transparent", color: "#8E8E93", marginTop: 8 }}>
          {mode === "signup" ? "I already have an account" : "Create a new account"}
        </button>
      </form>
    </div>
  );
}

export default function AuthGate() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");

  // Keep an invite code from the link so it survives sign-up.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("invite");
    if (code) {
      localStorage.setItem("sk_invite", code);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    let off = false;
    (async () => {
      try {
        let p = await getProfile(session.user.id);
        if (!p) {
          const nm = (session.user.user_metadata && session.user.user_metadata.name) || session.user.email.split("@")[0];
          await saveProfile(session.user.id, nm);
          p = { id: session.user.id, name: nm };
        }
        const code = localStorage.getItem("sk_invite");
        if (code) {
          try {
            const who = await acceptInvite(code);
            setNotice(`You and ${who} are now friends.`);
          } catch (e) {
            setNotice(e.message || "That invite did not work.");
          }
          localStorage.removeItem("sk_invite");
        }
        if (!off) setProfile(p);
      } catch (e) {
        if (!off) setProblem("The database is not set up yet. Run supabase/schema.sql in the Supabase SQL editor.");
      }
    })();
    return () => { off = true; };
  }, [session]);

  if (!supabase) return <App demo />;
  if (session === undefined) return <Center>Loading</Center>;
  if (!session) return <AuthScreen />;
  if (problem) return <Center>{problem}</Center>;
  if (!profile) return <Center>Loading</Center>;

  return (
    <>
      <App demo={false} user={{ id: session.user.id, name: profile.name, email: session.user.email }} onSignOut={() => supabase.auth.signOut()} />
      {notice && (
        <div onClick={() => setNotice("")} style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "#F3F3F4", color: "#111", padding: "12px 18px", borderRadius: 14, fontFamily: font, fontWeight: 600, fontSize: 14, cursor: "pointer", boxShadow: "0 10px 30px rgba(0,0,0,.35)" }}>
          {notice}
        </div>
      )}
    </>
  );
}
