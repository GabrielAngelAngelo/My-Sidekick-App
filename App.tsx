import { useState, useEffect, useRef } from "react";
import { createInvite, listFriends, saveProfile } from "./api";
import {
  Home, ListChecks, Target, MessageCircle, User, Heart, Bookmark, Camera, Sun, Moon, Settings,
  Plus, Flame, Check, Play, Pause, RotateCcw, X, ChevronLeft, ChevronRight, Phone, Video, BellOff,
  Send, Droplets, Wallet, Globe, Youtube, Trash2, Mic, PhoneOff, Users,
} from "lucide-react";

/* ---------- tokens ---------- */
const MODES = {
  dark: { bg: "#0A0A0B", card: "#151517", ink: "#F3F3F4", sub: "#8E8E93", line: "#232326", fill: "#1D1D20", bar: "rgba(10,10,11,.9)" },
  light: { bg: "#FFFFFF", card: "#F4F4F6", ink: "#111113", sub: "#6E6E73", line: "#E8E8EB", fill: "#EFEFF2", bar: "rgba(255,255,255,.92)" },
};
const ACCENTS = {
  sand: { name: "Sand", dark: "#D8B36A", light: "#9A6B12" },
  blue: { name: "Blue", dark: "#6AA2FF", light: "#1F5FD6" },
  green: { name: "Green", dark: "#5CC79B", light: "#157A55" },
  rose: { name: "Rose", dark: "#F07A8F", light: "#C03352" },
  violet: { name: "Violet", dark: "#A58BFF", light: "#6B46D9" },
};
const Q = {
  do: { label: "Do first", sub: "Important and urgent", color: "#E5503F" },
  plan: { label: "Schedule it", sub: "Important, not urgent", color: "#4A8DFF" },
  hand: { label: "Hand it off", sub: "Urgent, not important", color: "#D9921C" },
  later: { label: "Let it wait", sub: "Not important, not urgent", color: "#8E8E93" },
};
const ORDER = ["do", "plan", "hand", "later"];
const HUES = ["#5B6B8A", "#7A5B8A", "#4F7F73", "#8A6B4F", "#6B7280"];
const STATUS_OPTS = {
  Reading: ["Reading now", "Reading now.", "Reading"],
  "Deep work": ["In deep work", "In deep work.", "Work"],
  "Working out": ["Working out", "Working out.", "Health"],
  Studying: ["Studying", "Studying.", "Study"],
  "On a break": ["On a break", "Taking a break.", "Life"],
  "Productive today": ["Productive today", "Had a productive day.", "Work"],
};
const UNWIND = {
  Music: "Play one album side with no screen.",
  Walk: "Walk around the block and leave your phone.",
  Gaming: "One quick round, then back to it.",
  Cooking: "Make a snack or a hot drink.",
  Friends: "Call someone for ten minutes.",
  Tea: "Drink something slowly by a window.",
};
const STREAK_LABEL = { prod: "Daily productivity", focus: "Focus", water: "Water", people: "Reach out", money: "Money check" };
const REPLIES = ["Nice. I am on my list too.", "Proud of you. Send me a photo when it is done.", "Same here. Let us both finish before lunch.", "Good. Do the hard one first."];
const CAPTIONS = ["Starting now", "Done for the day", "Need a push", "Look what I finished"];
const COURSES = [["Khan Academy", "https://www.khanacademy.org"], ["freeCodeCamp", "https://www.freecodecamp.org"], ["MIT OpenCourseWare", "https://ocw.mit.edu"]];

const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (m) => { const h = Math.floor(m / 60), mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function buildBlocks(tasks) {
  const out = [];
  let m = 9 * 60, since = 0, lunch = false, batch = false;
  const push = (label, mins, type, extra = {}) => { out.push({ start: m, end: m + mins, label, type, ...extra }); m += mins; };
  const list = [...tasks.filter((x) => x.q === "do"), ...tasks.filter((x) => x.q === "plan")];
  list.forEach((x, i) => {
    if (!lunch && m >= 12 * 60 + 30) { push("Lunch and a real break", 45, "lunch"); lunch = true; since = 0; }
    if (i === 2 && !batch) { push("Messages and calls in one batch", 15, "batch"); batch = true; }
    if (since >= 50) { push("Break", 10, "break"); since = 0; }
    push(x.text, x.mins || 25, "task", { q: x.q, done: x.done });
    since += x.mins || 25;
  });
  if (!batch) push("Messages and calls in one batch", 15, "batch");
  const hand = tasks.filter((x) => x.q === "hand");
  if (hand.length) push(`Hand off ${hand.length} ${hand.length > 1 ? "tasks" : "task"}`, 10, "hand");
  tasks.filter((x) => x.q === "later").forEach((x) => push(x.text, x.mins || 15, "later", { done: x.done }));
  push("Buffer for anything that ran over", 15, "buffer");
  return out;
}

/* ---------- small pieces ---------- */
function Ring({ size = 64, stroke = 7, pct = 0, color = "var(--a)", children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, pct))} style={{ transition: "stroke-dashoffset .6s cubic-bezier(.3,.7,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{children}</div>
    </div>
  );
}
function Avatar({ name, i = 0, size = 44, ring, live }) {
  const inner = <div className="avatar" style={{ width: size, height: size, background: HUES[i % HUES.length], fontSize: size * 0.42 }}>{(name || "?")[0].toUpperCase()}</div>;
  if (!ring) return inner;
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div className={"ringwrap " + ring}><div className="ringgap">{inner}</div></div>
      {live && <span className="livedot" />}
    </div>
  );
}
function GroupAvatar({ members, friends, size = 48 }) {
  const a = friends.find((f) => f.id === members[0]), b = friends.find((f) => f.id === members[1]);
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <div style={{ position: "absolute", left: 0, top: 0 }}><Avatar name={a ? a.name : "?"} i={a ? a.hue : 0} size={size * 0.68} /></div>
      <div style={{ position: "absolute", right: 0, bottom: 0, border: "2px solid var(--bg)", borderRadius: "50%" }}><Avatar name={b ? b.name : "+"} i={b ? b.hue : 1} size={size * 0.62} /></div>
    </div>
  );
}
function Seg({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map(([k, l]) => <button key={k} className={value === k ? "on" : ""} onClick={() => onChange(k)}>{l}</button>)}
    </div>
  );
}
function Photo({ img, h = 200, label }) {
  return img ? <img src={img} alt={label || "Photo"} style={{ width: "100%", height: h, objectFit: "cover", borderRadius: 14, display: "block" }} /> : (
    <div className="ph" style={{ height: h }}><Camera size={28} /><span>{label || "Photo"}</span></div>
  );
}
function Sheet({ children, dark }) {
  return <div className={"sheet" + (dark ? " dark" : "")}>{children}</div>;
}

/* ---------- sheets ---------- */
function CallSheet({ friend, kind, onEnd }) {
  const [sec, setSec] = useState(-2);
  const [muted, setMuted] = useState(false);
  useEffect(() => { const id = setInterval(() => setSec((s) => s + 1), 1000); return () => clearInterval(id); }, []);
  return (
    <Sheet dark>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "100px 24px 60px" }}>
        <div style={{ textAlign: "center" }}>
          <Avatar name={friend.name} i={friend.hue} size={kind === "video" ? 140 : 108} />
          <div style={{ fontSize: 28, fontWeight: 650, marginTop: 16 }}>{friend.name}</div>
          <p style={{ opacity: 0.65, marginTop: 6 }}>{sec < 0 ? (kind === "video" ? "Starting video call" : "Calling") : clock(sec)}</p>
        </div>
        <div style={{ display: "flex", gap: 22 }}>
          <button className="roundbtn" aria-label="Mute" onClick={() => setMuted(!muted)} style={{ background: muted ? "#fff" : "rgba(255,255,255,.14)", color: muted ? "#111" : "#fff" }}><Mic size={24} /></button>
          <button className="roundbtn" aria-label="End call" onClick={onEnd} style={{ background: "#E5503F", color: "#fff" }}><PhoneOff size={24} /></button>
        </div>
      </div>
    </Sheet>
  );
}

function CameraSheet({ onSend, onClose, label }) {
  const [mode, setMode] = useState("photo");
  const [phase, setPhase] = useState("ready");
  const [secs, setSecs] = useState(0);
  const [img, setImg] = useState(null);
  const [cap, setCap] = useState(CAPTIONS[0]);
  const [live, setLive] = useState(false);
  const vref = useRef(null);
  useEffect(() => {
    let stream;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then((s) => { stream = s; if (vref.current) { vref.current.srcObject = s; setLive(true); } })
        .catch(() => {});
    }
    return () => stream && stream.getTracks().forEach((x) => x.stop());
  }, []);
  useEffect(() => {
    if (phase !== "rec") return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => { if (phase === "rec" && secs >= 15) setPhase("review"); }, [secs, phase]);
  function shutter() {
    if (mode === "clip") { if (phase === "rec") setPhase("review"); else { setSecs(0); setPhase("rec"); } return; }
    const v = vref.current;
    if (live && v && v.videoWidth) {
      const c = document.createElement("canvas");
      c.width = v.videoWidth; c.height = v.videoHeight;
      const ctx = c.getContext("2d");
      ctx.translate(c.width, 0); ctx.scale(-1, 1);
      ctx.drawImage(v, 0, 0);
      setImg(c.toDataURL("image/jpeg", 0.8));
    }
    setPhase("review");
  }
  function pick(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setImg(r.result); setMode("photo"); setPhase("review"); };
    r.readAsDataURL(f);
  }
  return (
    <Sheet dark>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "44px 18px 10px" }}>
        <button className="roundbtn sm" aria-label="Close" onClick={onClose} style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}><X size={18} /></button>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{phase === "rec" ? `${clock(secs)} of 00:15` : label}</div>
        <div style={{ width: 40 }} />
      </div>
      <div style={{ flex: 1, margin: "6px 14px", borderRadius: 24, overflow: "hidden", position: "relative", background: "#14161C" }}>
        {phase === "review" && img ? <img src={img} alt="Your photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
          <>
            <video ref={vref} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: live ? "block" : "none" }} />
            {!live && (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", padding: 28 }}>
                <div>
                  <Camera size={34} />
                  <p style={{ margin: "10px 0 14px", fontSize: 14, opacity: 0.8 }}>Camera preview is off. You can still take or choose a photo.</p>
                  <label className="btn" style={{ display: "inline-block", cursor: "pointer" }}>Take or choose a photo<input type="file" accept="image/*" capture="user" onChange={pick} style={{ display: "none" }} /></label>
                </div>
              </div>
            )}
          </>
        )}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 16, textAlign: "center" }}><span style={{ background: "rgba(0,0,0,.55)", padding: "7px 14px", borderRadius: 999, fontWeight: 600, fontSize: 14 }}>{cap}</span></div>
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "12px 14px" }}>
        {CAPTIONS.map((c) => <button key={c} className={"chip" + (cap === c ? " on" : "")} onClick={() => setCap(c)} style={{ whiteSpace: "nowrap" }}>{c}</button>)}
      </div>
      <div style={{ padding: "4px 0 34px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {phase === "review" ? (
          <div style={{ display: "flex", gap: 14 }}>
            <button className="btn" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }} onClick={() => { setPhase("ready"); setImg(null); setSecs(0); }}>Retake</button>
            <button className="btn" onClick={() => onSend({ mode, img, caption: cap, secs: Math.max(secs, 1) })}>Send</button>
          </div>
        ) : (
          <>
            <button aria-label="Shutter" onClick={shutter} style={{ width: 74, height: 74, borderRadius: "50%", border: "4px solid #fff", background: "transparent", display: "grid", placeItems: "center", cursor: "pointer" }}>
              <span style={{ width: phase === "rec" ? 24 : 54, height: phase === "rec" ? 24 : 54, borderRadius: phase === "rec" ? 7 : "50%", background: mode === "clip" ? "#E5503F" : "#fff", transition: "all .2s" }} />
            </button>
            <div className="seg dk"><button className={mode === "photo" ? "on" : ""} onClick={() => setMode("photo")}>Photo</button><button className={mode === "clip" ? "on" : ""} onClick={() => setMode("clip")}>Clip</button></div>
          </>
        )}
      </div>
    </Sheet>
  );
}

function StatusSheet({ list, start, onClose, onSeen, onCheer, onNudge }) {
  const [i, setI] = useState(start);
  const f = list[i];
  useEffect(() => { if (f) onSeen(f.id); }, [i]); // eslint-disable-line
  if (!f) return null;
  const next = () => (i < list.length - 1 ? setI(i + 1) : onClose());
  const prev = () => setI(Math.max(0, i - 1));
  return (
    <Sheet dark>
      <div style={{ display: "flex", gap: 4, padding: "46px 14px 0" }}>
        {list.map((_, k) => <div key={k} style={{ flex: 1, height: 3, borderRadius: 3, background: k <= i ? "#fff" : "rgba(255,255,255,.3)" }} />)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
        <Avatar name={f.name} i={f.hue} size={36} />
        <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{f.name}</div><div style={{ fontSize: 12, opacity: 0.65 }}>{f.status.sub}</div></div>
        <button className="roundbtn sm" aria-label="Close" onClick={onClose} style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}><X size={18} /></button>
      </div>
      <div style={{ flex: 1, position: "relative", display: "grid", placeItems: "center", padding: "0 34px", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.15 }}>{f.status.text}</div>
          {f.status.live && <div style={{ marginTop: 14, display: "inline-flex", gap: 8, alignItems: "center", fontSize: 14, opacity: 0.8 }}><span className="livedot inline" />Live now</div>}
        </div>
        <button aria-label="Previous" onClick={prev} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "35%", background: "none", border: 0 }} />
        <button aria-label="Next" onClick={next} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "65%", background: "none", border: 0 }} />
      </div>
      <div style={{ display: "flex", gap: 12, padding: "0 16px 40px", position: "relative", zIndex: 2 }}>
        <button className="btn" style={{ flex: 1, background: "rgba(255,255,255,.14)", color: "#fff" }} onClick={() => onCheer(f)}>Cheer</button>
        <button className="btn" style={{ flex: 1, background: "rgba(255,255,255,.14)", color: "#fff" }} onClick={() => onNudge(f)}>Nudge</button>
      </div>
    </Sheet>
  );
}

function ThreadSheet({ thread, friends, who, onBack, onSend, onCamera, onCall }) {
  const [draft, setDraft] = useState("");
  const endRef = useRef(null);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ block: "end" }); }, [thread.msgs.length]);
  const f = thread.type === "dm" ? friends.find((x) => x.id === thread.members[0]) : null;
  const go = () => { if (draft.trim()) { onSend(draft.trim()); setDraft(""); } };
  return (
    <Sheet>
      <div className="thead">
        <button className="iconplain" aria-label="Back" onClick={onBack}><ChevronLeft size={26} /></button>
        {f ? <Avatar name={f.name} i={f.hue} size={36} /> : <GroupAvatar members={thread.members} friends={friends} size={38} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 650 }}>{thread.name}</div>
          <div className="sub" style={{ fontSize: 12 }}>{f ? (f.snap ? `Photo streak ${f.snap} days` : "Send a photo to start a streak") : `${thread.members.length + 1} people`}</div>
        </div>
        {f && <><button className="iconplain" aria-label="Voice call" onClick={() => onCall("voice", f)}><Phone size={20} /></button><button className="iconplain" aria-label="Video call" onClick={() => onCall("video", f)}><Video size={21} /></button></>}
      </div>
      <div className="tbody">
        {thread.msgs.map((m) => {
          const mine = m.from === "me";
          const sender = friends.find((x) => x.id === m.from);
          return (
            <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}>
              {!mine && thread.type === "group" && sender && <div className="sub" style={{ fontSize: 11, margin: "0 0 2px 6px" }}>{sender.name}</div>}
              {m.type === "text" && <div className={"bubble" + (mine ? " me" : "")}>{m.text}</div>}
              {m.type === "photo" && <div style={{ width: 190 }}><Photo img={m.img} h={220} label={m.caption || "Photo"} />{m.caption && <div className="sub" style={{ fontSize: 12, marginTop: 4 }}>{m.caption}</div>}</div>}
              {m.type === "clip" && <div className="ph" style={{ width: 190, height: 130 }}><Play size={26} /><span>{m.caption} · 0:{String(m.secs).padStart(2, "0")}</span></div>}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="tfoot">
        <button className="iconplain" aria-label="Send a photo" onClick={onCamera}><Camera size={24} /></button>
        <input className="input pill" aria-label="Message" placeholder={`Message ${thread.name}`} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
        <button className="iconplain acc" aria-label="Send" onClick={go}><Send size={22} /></button>
      </div>
    </Sheet>
  );
}

function ComposeSheet({ friends, onClose, onStart }) {
  const [sel, setSel] = useState([]);
  const [nm, setNm] = useState("");
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <Sheet>
      <div className="thead"><button className="iconplain" aria-label="Close" onClick={onClose}><X size={24} /></button><div style={{ flex: 1, fontWeight: 650 }}>New message</div></div>
      <div className="tbody" style={{ gap: 0 }}>
        {sel.length > 1 && <input className="input" style={{ marginBottom: 12 }} aria-label="Group name" placeholder="Group name" value={nm} onChange={(e) => setNm(e.target.value)} />}
        {friends.map((f) => (
          <button key={f.id} className="listrow" onClick={() => toggle(f.id)}>
            <Avatar name={f.name} i={f.hue} size={42} />
            <div style={{ flex: 1, textAlign: "left" }}><div style={{ fontWeight: 600 }}>{f.name}</div><div className="sub" style={{ fontSize: 13 }}>{f.role}</div></div>
            <span className={"check" + (sel.includes(f.id) ? " on" : "")}>{sel.includes(f.id) && <Check size={16} />}</span>
          </button>
        ))}
      </div>
      <div style={{ padding: "12px 16px 30px" }}>
        <button className="btn full" style={{ opacity: sel.length ? 1 : 0.4 }} disabled={!sel.length} onClick={() => onStart(sel, nm)}>{sel.length > 1 ? "Create group" : "Start chat"}</button>
      </div>
    </Sheet>
  );
}

function WatchSheet({ onClose, connected, onConnect, videos, setVideos, say, timeLabel }) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(null);
  function add() {
    const m = draft.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    if (!m) { say("That link does not look like a YouTube video."); return; }
    setVideos((v) => [...v, { id: uid(), vid: m[1] }]);
    setDraft("");
  }
  return (
    <Sheet>
      <div className="thead"><button className="iconplain" aria-label="Back" onClick={onClose}><ChevronLeft size={26} /></button><div style={{ flex: 1, fontWeight: 650 }}>Watch</div><span className="sub" style={{ fontSize: 13 }}>{timeLabel}</span></div>
      <div className="tbody" style={{ gap: 14 }}>
        {open ? (
          <>
            <iframe title="Video" src={`https://www.youtube-nocookie.com/embed/${open}?rel=0&modestbranding=1`} style={{ width: "100%", aspectRatio: "16/9", border: 0, borderRadius: 14, background: "#000" }} allow="encrypted-media; picture-in-picture" allowFullScreen />
            <p className="sub">Only the video is shown. No feed, no comments.</p>
            <button className="btn soft" onClick={() => setOpen(null)}>Back to my list</button>
          </>
        ) : (
          <>
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "#E5503F" }}><Youtube size={28} /></span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{connected ? "YouTube linked" : "Connect your YouTube account"}</div><div className="sub" style={{ fontSize: 13 }}>{connected ? "Demo link. A real build uses Google sign-in." : "Watch your learning videos here."}</div></div>
                {!connected && <button className="btn" style={{ padding: "10px 14px" }} onClick={onConnect}>Connect</button>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" aria-label="YouTube link" placeholder="Paste a YouTube link" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
              <button className="btn" onClick={add}>Add</button>
            </div>
            {videos.length === 0 && <p className="sub">Videos you add show up here, ready to watch without leaving your focus session.</p>}
            {videos.map((v) => (
              <button key={v.id} className="vid" onClick={() => setOpen(v.vid)}>
                <img src={`https://img.youtube.com/vi/${v.vid}/mqdefault.jpg`} alt="Video thumbnail" style={{ width: "100%", borderRadius: 14, display: "block", background: "var(--fill)", aspectRatio: "16/9", objectFit: "cover" }} />
                <span className="vplay"><Play size={22} fill="#fff" /></span>
              </button>
            ))}
          </>
        )}
      </div>
    </Sheet>
  );
}

function BrowserSheet({ onClose, timeLabel }) {
  const [draft, setDraft] = useState("");
  const [url, setUrl] = useState("");
  const norm = (u) => (/^https?:\/\//i.test(u) ? u : "https://" + u);
  const go = (u) => { const v = (u || draft).trim(); if (v) { setUrl(norm(v)); setDraft(norm(v)); } };
  return (
    <Sheet>
      <div className="thead">
        <button className="iconplain" aria-label="Close" onClick={onClose}><X size={24} /></button>
        <input className="input pill" aria-label="Address" placeholder="Enter a course link" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
        <span className="sub" style={{ fontSize: 12, minWidth: 44, textAlign: "right" }}>{timeLabel}</span>
      </div>
      {url ? (
        <>
          <iframe title="Course" src={url} style={{ flex: 1, border: 0, background: "#fff" }} />
          <div style={{ padding: "10px 16px 28px", display: "flex", gap: 10, alignItems: "center" }}>
            <p className="sub" style={{ flex: 1, fontSize: 12 }}>If the page stays blank, the site does not allow being shown here.</p>
            <a className="btn soft" style={{ textDecoration: "none", padding: "10px 14px" }} href={url} target="_blank" rel="noopener noreferrer">Open in browser</a>
          </div>
        </>
      ) : (
        <div className="tbody">
          <p className="sub">A quiet browser for your course. Nothing else opens while it is on.</p>
          <div className="list">
            {COURSES.map(([n, u]) => <button key={n} className="listrow" onClick={() => go(u)}><Globe size={20} /><span style={{ flex: 1, textAlign: "left" }}>{n}</span><ChevronRight size={18} /></button>)}
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ---------- app ---------- */
export default function App({ demo = true, user = null, onSignOut = null }) {
  const [saved] = useState(() => { try { return !demo && user ? JSON.parse(localStorage.getItem("sk_pref_" + user.id) || "null") : null; } catch (e) { return null; } });
  const [step, setStep] = useState(() => (!demo && user && localStorage.getItem("sk_ob_" + user.id) ? 3 : 0));
  const [name, setName] = useState(user ? user.name : "");
  const [dark, setDark] = useState(saved ? saved.dark : true);
  const [accent, setAccent] = useState(saved ? saved.accent : "sand");
  const [remind, setRemind] = useState({ on: true, mode: "morning", time: "07:00" });
  const [friends, setFriends] = useState([]);
  const [threads, setThreads] = useState([]);
  const [posts, setPosts] = useState([]);
  const [draftFriend, setDraftFriend] = useState("");
  const [roleDraft, setRoleDraft] = useState("Best friend");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);

  const [tab, setTab] = useState("home");
  const [planTab, setPlanTab] = useState("today");
  const [stage, setStage] = useState("dump");
  const [view, setView] = useState("list");
  const [tasks, setTasks] = useState([]);
  const [draft, setDraft] = useState("");
  const [ans, setAns] = useState({});
  const [handing, setHanding] = useState(null);

  const [streaks, setStreaks] = useState({ prod: 6, focus: 3, water: 6, people: 2, money: 5 });
  const bumped = useRef({});
  const toastTimer = useRef(null);
  const [toast, setToast] = useState("");

  const [mode, setMode] = useState("focus");
  const [preset, setPreset] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [focusId, setFocusId] = useState("");
  const [breakCard, setBreakCard] = useState(false);
  const [deep, setDeep] = useState(false);
  const [autoDeep, setAutoDeep] = useState(true);
  const [allowed, setAllowed] = useState([]);
  const [held, setHeld] = useState(0);
  const [chatNudge, setChatNudge] = useState(true);
  const [nudge, setNudge] = useState(null);

  const [connected, setConnected] = useState(false);
  const [videos, setVideos] = useState([]);
  const [watchOpen, setWatchOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);

  const [lifeTab, setLifeTab] = useState("health");
  const [water, setWater] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [move, setMove] = useState(20);
  const [budget] = useState(8000);
  const [spends, setSpends] = useState([]);
  const [spendLabel, setSpendLabel] = useState("");
  const [spendAmt, setSpendAmt] = useState("");
  const [reach, setReach] = useState([{ id: "r1", name: "Mum", done: false }, { id: "r2", name: "Ada", done: false }]);
  const [reachDraft, setReachDraft] = useState("");
  const [replies, setReplies] = useState([{ id: "m1", who: "Kemi", text: "Are we still on for Friday?", done: false }, { id: "m2", who: "Sam", text: "Sent you the notes.", done: false }]);
  const [unwind, setUnwind] = useState(["Music", "Walk"]);
  const [breakIdx, setBreakIdx] = useState(0);

  const [myStatus, setMyStatus] = useState(null);
  const [statusIdx, setStatusIdx] = useState(null);
  const [pickStatus, setPickStatus] = useState(false);
  const [openThread, setOpenThread] = useState(null);
  const [composing, setComposing] = useState(false);
  const [call, setCall] = useState(null);
  const [cam, setCam] = useState(null);
  const [adding, setAdding] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commentFor, setCommentFor] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");

  const refs = useRef({});
  refs.current = { deep, allowed, openThread, friends, threads };

  const m = dark ? MODES.dark : MODES.light;
  const acc = ACCENTS[accent][dark ? "dark" : "light"];
  const hr = new Date().getHours();
  const who = name.trim() || "friend";
  const main = friends[0];

  function say(text) {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }
  function bump(k) {
    if (bumped.current[k]) return;
    bumped.current[k] = 1;
    setStreaks((s) => ({ ...s, [k]: s[k] + 1 }));
    say(`${STREAK_LABEL[k]} streak is now ${streaks[k] + 1}`);
  }

  /* deliver an incoming message, respecting deep work mode */
  function deliver(threadId, fid, payload) {
    const r = refs.current;
    const f = r.friends.find((x) => x.id === fid);
    setThreads((ts) => ts.map((th) => (th.id === threadId ? { ...th, msgs: [...th.msgs, { id: uid(), from: fid, ...payload }], unread: r.openThread === threadId ? 0 : (th.unread || 0) + 1 } : th)));
    const muted = r.deep && !r.allowed.includes(fid);
    if (muted) setHeld((h) => h + 1);
    else if (r.openThread !== threadId) say(`${f ? f.name : "Friend"}: ${payload.text || "Sent a photo"}`);
  }
  function setDeepMode(v) {
    setDeep(v);
    if (!v && refs.current.deep) {
      if (held > 0) say(`While you focused, ${held} ${held > 1 ? "messages were" : "message was"} held.`);
      setHeld(0);
    }
  }
  function bumpSnap(fid) {
    const day = "snap" + fid;
    if (bumped.current[day]) return;
    bumped.current[day] = 1;
    const f = refs.current.friends.find((x) => x.id === fid);
    setFriends((fs) => fs.map((x) => (x.id === fid ? { ...x, snap: x.snap + 1 } : x)));
    if (f) say(`Photo streak with ${f.name} is now ${f.snap + 1}`);
  }
  function sendThread(id, payload) {
    const th = threads.find((x) => x.id === id);
    if (!th) return;
    const n = (th.sent || 0) + 1;
    setThreads((ts) => ts.map((x) => (x.id === id ? { ...x, msgs: [...x.msgs, { id: uid(), from: "me", ...payload }], sent: n } : x)));
    if (chatNudge && payload.type === "text" && n % 5 === 0) {
      const pending = tasks.filter((x) => !x.done).length;
      if (pending > 0 || tasks.length === 0) setNudge({ n, pending, name: th.name, empty: tasks.length === 0 });
    }
    if (!demo) {
      if (!bumped.current.chatnote) { bumped.current.chatnote = 1; say("Chat is not live yet. Messages stay on this device for now."); }
      return;
    }
    const pool = th.members;
    const fid = pool[Math.floor(Math.random() * pool.length)];
    setTimeout(() => {
      if (payload.type === "photo" && th.type === "dm") { deliver(id, fid, { type: "photo", img: null, caption: "Back at you" }); bumpSnap(fid); }
      else deliver(id, fid, { type: "text", text: REPLIES[Math.floor(Math.random() * REPLIES.length)] });
    }, 1600);
  }
  function dmFor(fid) { return threads.find((t) => t.type === "dm" && t.members[0] === fid); }

  /* real accounts: friends come from the database */
  async function syncFriends() {
    if (demo || !user) return;
    try {
      const list = await listFriends(user.id);
      setFriends((prev) => {
        const old = Object.fromEntries(prev.map((f) => [f.id, f]));
        return list.map((f, i) => old[f.id] || { ...f, hue: i + 1, done: 0, total: 0, snap: 0, status: { short: "No update yet", text: `${f.name} has not shared yet`, sub: "Nothing today", live: false, seen: true } });
      });
      setThreads((ts) => {
        const have = new Set(ts.filter((t) => t.type === "dm").map((t) => t.members[0]));
        const add = list.filter((f) => !have.has(f.id)).map((f) => ({ id: uid(), type: "dm", name: f.name, members: [f.id], unread: 0, sent: 0, msgs: [] }));
        return add.length ? [...ts, ...add] : ts;
      });
    } catch (e) { /* ignore and retry on the next tick */ }
  }
  async function makeInvite() {
    try {
      setInviteBusy(true);
      const code = await createInvite(roleDraft);
      setInviteLink(`${window.location.origin}/?invite=${code}`);
    } catch (e) { say("Could not create the invite. Check the database setup."); }
    setInviteBusy(false);
  }
  async function shareInvite() {
    const text = `Join me on Sidekick so we can keep each other accountable: ${inviteLink}`;
    if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { /* fall through to copy */ } }
    try { await navigator.clipboard.writeText(inviteLink); say("Link copied."); } catch (e) { say("Copy the link by hand."); }
  }
  useEffect(() => {
    if (demo || !user || step < 3) return;
    syncFriends();
    const id = setInterval(syncFriends, 15000);
    return () => clearInterval(id);
  }, [step]); // eslint-disable-line
  useEffect(() => { if (!demo && user) localStorage.setItem("sk_pref_" + user.id, JSON.stringify({ dark, accent })); }, [dark, accent]); // eslint-disable-line

  /* effects */
  const cur = tasks.find((x) => !x.q);
  useEffect(() => { if (stage === "sort" && !cur) { setStage("day"); } }, [stage, tasks]); // eslint-disable-line
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (running && left <= 0) {
      setRunning(false);
      if (mode === "focus") { setSessions((s) => s + 1); bump("focus"); bump("prod"); setBreakCard(true); setDeepMode(false); }
      else { setMode("focus"); setLeft(preset * 60); }
    }
  }, [left, running]); // eslint-disable-line
  useEffect(() => { if (water >= 8) bump("water"); }, [water]); // eslint-disable-line
  useEffect(() => {
    if (!deep || !demo) return;
    const id = setInterval(() => {
      const r = refs.current;
      if (!r.friends.length) return;
      const f = r.friends[Math.floor(Math.random() * r.friends.length)];
      const th = r.threads.find((x) => x.type === "dm" && x.members[0] === f.id);
      if (th) deliver(th.id, f.id, { type: "text", text: "Hey, got a minute?" });
    }, 20000);
    return () => clearInterval(id);
  }, [deep]); // eslint-disable-line

  /* helpers */
  const addTask = (text) => { const v = text.trim(); if (v) setTasks((ts) => [...ts, { id: uid(), text: v, done: false }]); };
  function answer(k, v) {
    const a = { ...ans, [k]: v };
    setAns(a);
    if (a.imp !== undefined && a.urg !== undefined) {
      const q = a.imp ? (a.urg ? "do" : "plan") : a.urg ? "hand" : "later";
      const mins = { do: 25, plan: 45, hand: 10, later: 15 }[q];
      const id = cur.id;
      setTimeout(() => { setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, q, mins } : x))); setAns({}); }, 450);
    }
  }
  function toggleDone(id) {
    const x = tasks.find((y) => y.id === id);
    setTasks((ts) => ts.map((y) => (y.id === id ? { ...y, done: !y.done } : y)));
    if (x && !x.done) {
      bump("prod");
      const pid = uid();
      setPosts((p) => [{ id: pid, from: "me", text: `Finished ${x.text}`, tag: "Work", time: "Just now", likes: [], comments: [] }, ...p]);
      if (main) setTimeout(() => setPosts((p) => p.map((q) => (q.id === pid ? { ...q, likes: [main.name] } : q))), 2200);
      say("Shared with your friends.");
    }
  }
  function sampleDay() {
    const s = [["Finish the report draft", "do", 25], ["Send the invoice", "do", 15], ["Workout", "plan", 45], ["Read 20 pages", "plan", 25], ["Book the repair visit", "hand", 10], ["Reorganize the desk", "later", 15]];
    setTasks(s.map(([text, q, mins]) => ({ id: uid(), text, q, mins, done: false })));
    setStage("day");
  }
  function planNext() { setTasks((ts) => ts.filter((x) => !x.done).map((x) => ({ id: x.id, text: x.text, done: false }))); setStage("dump"); }
  function cycleMins(id) {
    const steps = [10, 15, 25, 45, 60];
    setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, mins: steps[(steps.indexOf(x.mins) + 1) % steps.length] } : x)));
  }
  function startFocusOn(id) {
    setFocusId(id);
    const x = tasks.find((y) => y.id === id);
    if (x && x.mins) { const mm = x.mins >= 45 ? 45 : x.mins >= 25 ? 25 : x.mins >= 15 ? 15 : 5; setPreset(mm); setLeft(mm * 60); }
    setMode("focus"); setRunning(false); setTab("focus");
  }
  function toggleTimer() {
    if (!running) { setRunning(true); setBreakCard(false); if (mode === "focus" && autoDeep) setDeep(true); }
    else setRunning(false);
  }
  const breakIdea = () => { const pool = unwind.length ? unwind : Object.keys(UNWIND); return UNWIND[pool[breakIdx % pool.length]]; };
  function seed(nm, role) {
    const a = { id: uid(), name: nm, role, hue: 1, done: 3, total: 5, snap: 5, status: { short: "Reading now", text: `${nm} is reading`, sub: "Started 20 min ago", live: true, seen: false } };
    const b = { id: uid(), name: "Dayo", role: "Best friend", hue: 2, done: 2, total: 4, snap: 2, status: { short: "Read for 5 hours", text: "Dayo read for 5 hours", sub: "Finished 10 min ago", live: false, seen: false } };
    const c = { id: uid(), name: "Kemi", role: "Colleague", hue: 3, done: 6, total: 6, snap: 0, status: { short: "Productive today", text: "Kemi was productive today", sub: "Finished 6 of 6 tasks", live: false, seen: false } };
    setFriends([a, b, c]);
    setAllowed([a.id]);
    setThreads([
      { id: uid(), type: "group", name: "Accountability crew", members: [a.id, b.id, c.id], unread: 2, sent: 0, msgs: [{ id: uid(), from: b.id, type: "text", text: "Gym done. Who is next?" }, { id: uid(), from: c.id, type: "text", text: "Invoice sent." }] },
      { id: uid(), type: "dm", name: a.name, members: [a.id], unread: 1, sent: 0, msgs: [{ id: uid(), from: a.id, type: "text", text: "Morning. I am doing my hard task first today. You?" }] },
      { id: uid(), type: "dm", name: b.name, members: [b.id], unread: 0, sent: 0, msgs: [] },
      { id: uid(), type: "dm", name: c.name, members: [c.id], unread: 0, sent: 0, msgs: [] },
    ]);
    setPosts([
      { id: uid(), from: a.id, text: "Finished reading 20 pages.", tag: "Reading", time: "12m", likes: ["Dayo"], comments: [{ who: "Dayo", text: "Strong start." }] },
      { id: uid(), from: b.id, text: "Gym done before 7.", tag: "Health", time: "1h", likes: [], comments: [], clip: { secs: 9 } },
      { id: uid(), from: c.id, text: "Sent the invoice and cleared the inbox.", tag: "Work", time: "2h", likes: [a.name], comments: [] },
      { id: uid(), from: a.id, text: "Our photo streak reached 5 days.", tag: "Streak", time: "Yesterday", likes: [], comments: [] },
    ]);
  }
  function like(pid) { setPosts((ps) => ps.map((p) => (p.id === pid ? { ...p, likes: p.likes.includes("You") ? p.likes.filter((x) => x !== "You") : [...p.likes, "You"] } : p))); }
  function save(pid) { setPosts((ps) => ps.map((p) => (p.id === pid ? { ...p, saved: !p.saved } : p))); }
  function addComment(pid) {
    if (!commentDraft.trim()) return;
    setPosts((ps) => ps.map((p) => (p.id === pid ? { ...p, comments: [...p.comments, { who: "You", text: commentDraft.trim() }] } : p)));
    setCommentDraft(""); setCommentFor(null);
  }
  function setStatusFrom(k) {
    const [short, text, tag] = STATUS_OPTS[k];
    setMyStatus({ short, text });
    setPosts((p) => [{ id: uid(), from: "me", text, tag, time: "Just now", likes: [], comments: [] }, ...p]);
    setPickStatus(false);
    say("Status shared.");
  }
  function openChat(id) { setOpenThread(id); setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, unread: 0 } : t))); }
  function startChat(ids, nm) {
    if (ids.length === 1) {
      const th = dmFor(ids[0]);
      if (th) openChat(th.id);
    } else {
      const th = { id: uid(), type: "group", name: nm.trim() || "New group", members: ids, unread: 0, sent: 0, msgs: [] };
      setThreads((ts) => [th, ...ts]);
      setOpenThread(th.id);
    }
    setComposing(false);
  }
  function onCameraSend(r) {
    const target = cam;
    if (target.kind === "feed") {
      setPosts((p) => [{ id: uid(), from: "me", text: r.caption, tag: "Photo", time: "Just now", likes: [], comments: [], img: r.mode === "photo" ? r.img : null, clip: r.mode === "clip" ? { secs: r.secs } : null, photo: r.mode === "photo" }, ...p]);
      say("Shared with your friends.");
    } else if (target.kind === "thread") {
      sendThread(target.id, r.mode === "photo" ? { type: "photo", img: r.img, caption: r.caption } : { type: "clip", caption: r.caption, secs: r.secs });
      say("Sent.");
    }
    setCam(null);
  }

  const root = { "--bg": m.bg, "--card": m.card, "--ink": m.ink, "--sub": m.sub, "--line": m.line, "--fill": m.fill, "--bar": m.bar, "--a": acc, "--onA": dark ? "#111" : "#fff", "--tint": acc + "26", "--ok": dark ? "#5CC79B" : "#1E9A66" };
  const doneCount = tasks.filter((x) => x.done).length;
  const pct = tasks.length ? doneCount / tasks.length : 0;
  const nextTask = ORDER.flatMap((k) => tasks.filter((x) => x.q === k && !x.done))[0];
  const spent = spends.reduce((a, b) => a + b.amt, 0);
  const unreadTotal = threads.reduce((a, t) => a + (t.unread || 0), 0);
  const timeLabel = running ? clock(Math.max(left, 0)) : "Timer off";
  const allowedNames = friends.filter((f) => allowed.includes(f.id)).map((f) => f.name);

  /* ---------- onboarding ---------- */
  if (step < 3) {
    return (
      <div className="stage" style={root}>
        <style>{CSS}</style>
        <div className="phone">
          <div className="scroll" style={{ paddingBottom: 30, display: "flex", flexDirection: "column", padding: "50px 22px 30px" }}>
            <div style={{ display: "flex", gap: 6, margin: "0 0 30px" }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ height: 4, flex: 1, borderRadius: 9, background: i <= step ? "var(--a)" : "var(--line)", transition: "background .3s" }} />)}
            </div>
            {step === 0 && (
              <>
                <h1 className="h1">Get things done with a friend.</h1>
                <p className="sub" style={{ marginTop: 12, fontSize: 16 }}>Plan your day and see what your friends finish. Sidekick is a working name.</p>
                <input className="input" style={{ marginTop: 28 }} aria-label="Your first name" placeholder="Your first name" value={name} onChange={(e) => setName(e.target.value)} />
              </>
            )}
            {step === 1 && (
              <>
                <h1 className="h1">How should it look?</h1>
                <p className="sub" style={{ marginTop: 10 }}>You can change this later in Settings.</p>
                <div style={{ marginTop: 22 }}><Seg value={dark ? "dark" : "light"} onChange={(v) => setDark(v === "dark")} options={[["light", "Light"], ["dark", "Dark"]]} /></div>
                <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
                  {Object.entries(ACCENTS).map(([k, v]) => (
                    <button key={k} aria-label={v.name} onClick={() => setAccent(k)} style={{ width: 44, height: 44, borderRadius: "50%", border: accent === k ? "3px solid var(--ink)" : "3px solid transparent", background: v[dark ? "dark" : "light"], cursor: "pointer" }} />
                  ))}
                </div>
              </>
            )}
            {step === 2 && (demo ? (
              <>
                <h1 className="h1">Who keeps you accountable?</h1>
                <p className="sub" style={{ marginTop: 10 }}>Add a best friend, a colleague or your partner.</p>
                <input className="input" style={{ marginTop: 22 }} aria-label="Their name" placeholder="Their name" value={draftFriend} onChange={(e) => setDraftFriend(e.target.value)} />
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {["Best friend", "Colleague", "Partner"].map((r) => <button key={r} className={"chip" + (roleDraft === r ? " on" : "")} onClick={() => setRoleDraft(r)}>{r}</button>)}
                </div>
                <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => { seed("Sandra", "Best friend"); setStep(3); }}>Use a sample friend for now</button>
              </>
            ) : (
              <>
                <h1 className="h1">Invite a friend.</h1>
                <p className="sub" style={{ marginTop: 10 }}>Send them a link. When they sign up, you are paired.</p>
                <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
                  {["Best friend", "Colleague", "Partner"].map((r) => <button key={r} className={"chip" + (roleDraft === r ? " on" : "")} onClick={() => { setRoleDraft(r); setInviteLink(""); }}>{r}</button>)}
                </div>
                {!inviteLink ? (
                  <button className="btn full" style={{ marginTop: 18 }} disabled={inviteBusy} onClick={makeInvite}>{inviteBusy ? "Creating" : "Create invite link"}</button>
                ) : (
                  <div className="card" style={{ marginTop: 18 }}>
                    <div className="sub" style={{ wordBreak: "break-all" }}>{inviteLink}</div>
                    <button className="btn full" onClick={shareInvite}>Share or copy link</button>
                  </div>
                )}
                <p className="sub" style={{ marginTop: 14, fontSize: 13 }}>You can skip this and invite someone later from Home.</p>
              </>
            ))}
            <div style={{ marginTop: "auto", paddingTop: 28, display: "flex", gap: 10 }}>
              {step > 0 && <button className="btn soft" onClick={() => setStep(step - 1)}>Back</button>}
              <button className="btn" style={{ flex: 1 }} onClick={() => {
                if (!demo) {
                  if (step === 0) saveProfile(user.id, name.trim() || user.name).catch(() => {});
                  if (step === 2) localStorage.setItem("sk_ob_" + user.id, "1");
                  setStep(step + 1);
                  return;
                }
                if (step === 2) {
                  const nm = draftFriend.trim();
                  if (!nm) { say("Add a name or use a sample friend."); return; }
                  seed(nm, roleDraft); setDraftFriend("");
                }
                setStep(step + 1);
              }}>{step === 2 ? "Start" : "Continue"}</button>
            </div>
          </div>
          {toast && <div className="toast">{toast}</div>}
        </div>
      </div>
    );
  }

  /* ---------- Home ---------- */
  function renderHome() {
    const withStatus = friends.filter((f) => f.status);
    return (
      <>
        <div className="topbar">
          <div className="brand">Sidekick</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="iconplain" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setDark(!dark)}>{dark ? <Sun size={22} /> : <Moon size={22} />}</button>
            <button className="iconplain" aria-label="Take a photo" onClick={() => setCam({ kind: "feed" })}><Camera size={23} /></button>
          </div>
        </div>

        <div className="stories">
          <button className="story" onClick={() => setPickStatus(true)}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <Avatar name={who} i={0} size={62} ring={deep || myStatus ? "new" : "none"} live={deep} />
              <span className="plusbadge"><Plus size={14} /></span>
            </div>
            <div className="sname">You</div>
            <div className="scap">{deep ? "In deep work" : myStatus ? myStatus.short : "Add status"}</div>
          </button>
          {withStatus.map((f, i) => (
            <button key={f.id} className="story" onClick={() => setStatusIdx(i)}>
              <Avatar name={f.name} i={f.hue} size={62} ring={f.status.seen ? "seen" : "new"} live={f.status.live} />
              <div className="sname">{f.name}</div>
              <div className="scap">{f.status.short}</div>
            </button>
          ))}
          <button className="story" onClick={() => setAdding(true)}>
            <div className="addbubble"><Plus size={22} /></div>
            <div className="sname">Add</div>
            <div className="scap">New friend</div>
          </button>
        </div>

        <button className="dayrow" onClick={() => setTab("plan")}>
          <span style={{ flex: 1, textAlign: "left" }}>{tasks.length ? `Today: ${doneCount} of ${tasks.length} done` : "Plan your day"}</span>
          <span className="streakchip"><Flame size={15} />{streaks.prod}</span>
          <ChevronRight size={18} />
        </button>

        {!demo && posts.length === 0 && (
          <div className="pad" style={{ padding: "28px 24px", textAlign: "center" }}>
            <div style={{ fontWeight: 650, fontSize: 17 }}>{friends.length ? "Nothing shared yet" : "Invite a friend to get started"}</div>
            <p className="sub" style={{ marginTop: 6 }}>{friends.length ? "Finish a task and it shows up here for your friends." : "Their updates and yours show up here."}</p>
            {!friends.length && <button className="btn" style={{ marginTop: 14 }} onClick={() => setAdding(true)}>Invite a friend</button>}
          </div>
        )}
        {posts.map((p) => {
          const f = p.from === "me" ? null : friends.find((x) => x.id === p.from);
          const nm = p.from === "me" ? who : f ? f.name : "Friend";
          const liked = p.likes.includes("You");
          const last = p.comments[p.comments.length - 1];
          return (
            <div className="post" key={p.id}>
              <Avatar name={nm} i={f ? f.hue : 0} size={44} ring={f && f.status && !f.status.seen ? "new" : undefined} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><b>{nm}</b><span className="sub" style={{ fontSize: 14 }}>{p.time}</span></div>
                <div style={{ marginTop: 3, fontSize: 16, lineHeight: 1.4 }}>{p.text}</div>
                {(p.img || p.photo) && <div style={{ marginTop: 10 }}><Photo img={p.img} h={240} /></div>}
                {p.clip && <div className="ph" style={{ height: 150, marginTop: 10 }}><Play size={28} /><span>0:{String(p.clip.secs).padStart(2, "0")}</span></div>}
                <div className="tag">{p.tag}</div>
                <div className="actionsrow">
                  <button className={"act" + (liked ? " on" : "")} onClick={() => like(p.id)} aria-label="Cheer"><Heart size={22} fill={liked ? "currentColor" : "none"} />{p.likes.length}</button>
                  <button className="act" onClick={() => setCommentFor(commentFor === p.id ? null : p.id)} aria-label="Comment"><MessageCircle size={22} />{p.comments.length}</button>
                  <button className={"act" + (p.saved ? " on" : "")} onClick={() => save(p.id)} aria-label="Save"><Bookmark size={22} fill={p.saved ? "currentColor" : "none"} /></button>
                </div>
                {last && <div className="sub" style={{ marginTop: 8, fontSize: 14 }}><b style={{ color: "var(--ink)" }}>{last.who}</b> {last.text}</div>}
                {commentFor === p.id && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <input className="input pill" aria-label="Write a comment" placeholder="Write a comment" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment(p.id)} />
                    <button className="btn" style={{ padding: "0 16px" }} onClick={() => addComment(p.id)}>Post</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </>
    );
  }

  /* ---------- Plan ---------- */
  function renderPlanToday() {
    if (stage === "dump") {
      return (
        <>
          <div style={{ fontWeight: 650, fontSize: 19 }}>{hr >= 18 ? "What is on for tomorrow?" : "What do you want to get done today?"}</div>
          <p className="sub" style={{ marginTop: 4 }}>Write it all down first. You will sort it next.</p>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <input className="input" aria-label="Add a task" placeholder="Add a task" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { addTask(draft); setDraft(""); } }} />
            <button className="btn" aria-label="Add" style={{ padding: "0 16px" }} onClick={() => { addTask(draft); setDraft(""); }}><Plus size={20} /></button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {["Reply to messages", "Workout", "Read 20 pages"].map((s) => <button key={s} className="chip" onClick={() => addTask(s)}>{s}</button>)}
          </div>
          {tasks.length > 0 && (
            <div className="list" style={{ marginTop: 16 }}>
              {tasks.map((x) => <div key={x.id} className="row"><span style={{ flex: 1 }}>{x.text}</span><button className="iconbtn" aria-label="Remove" onClick={() => setTasks((ts) => ts.filter((y) => y.id !== x.id))}><Trash2 size={15} /></button></div>)}
            </div>
          )}
          <button className="btn full" style={{ marginTop: 16, opacity: tasks.length ? 1 : 0.4 }} disabled={!tasks.length} onClick={() => { setAns({}); setTasks((ts) => ts.map((x) => ({ id: x.id, text: x.text, done: false }))); setStage("sort"); }}>Sort my list</button>
          <button className="btn ghost full" onClick={sampleDay}>Try a sample day</button>
        </>
      );
    }
    if (stage === "sort" && cur) {
      const remaining = tasks.filter((x) => !x.q).length;
      const total = tasks.length;
      const both = ans.imp !== undefined && ans.urg !== undefined;
      const qq = both ? (ans.imp ? (ans.urg ? "do" : "plan") : ans.urg ? "hand" : "later") : null;
      const ask = (k, text) => (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{text}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[[true, "Yes"], [false, "No"]].map(([v, l]) => <button key={l} className={"chip big" + (ans[k] === v ? " on" : "")} onClick={() => answer(k, v)}>{l}</button>)}
          </div>
        </div>
      );
      return (
        <>
          <div className="sub" style={{ marginBottom: 8 }}>Task {total - remaining + 1} of {total}</div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 24, fontWeight: 680, letterSpacing: "-.02em" }}>{cur.text}</div>
            {ask("imp", "Does this matter to your goals?")}
            {ask("urg", "Does it have to happen today?")}
            <div style={{ height: 34, marginTop: 20 }}>{qq && <span className="pill" style={{ background: Q[qq].color }}>Goes to: {Q[qq].label}</span>}</div>
          </div>
        </>
      );
    }
    const blocks = buildBlocks(tasks);
    return (
      <>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="sub">{pct === 1 && tasks.length ? "Everything is done." : "Start with this"}</div>
            <span className="sub">{doneCount}/{tasks.length}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 680, marginTop: 4, letterSpacing: "-.02em" }}>{pct === 1 && tasks.length ? "Go enjoy your evening." : nextTask ? nextTask.text : ""}</div>
          <div className="bar"><div style={{ width: `${pct * 100}%` }} /></div>
        </div>
        <div style={{ margin: "16px 0 4px" }}><Seg value={view} onChange={setView} options={[["list", "By priority"], ["time", "Time blocks"]]} /></div>
        {view === "list" ? ORDER.map((k) => {
          const items = tasks.filter((x) => x.q === k);
          if (!items.length) return null;
          return (
            <div key={k} style={{ marginTop: 18 }}>
              <div className="grouphead"><span style={{ background: Q[k].color }} />{Q[k].label}<em>{Q[k].sub}</em></div>
              <div className="list">
                {items.map((x) => (
                  <div key={x.id}>
                    <div className="row">
                      <button className={"check" + (x.done ? " on" : "")} aria-label="Mark done" onClick={() => toggleDone(x.id)}>{x.done && <Check size={16} />}</button>
                      <span style={{ flex: 1, textDecoration: x.done ? "line-through" : "none", opacity: x.done ? 0.5 : 1 }}>{x.text}</span>
                      {k === "hand" && !x.done && !x.handedTo && <button className="link" onClick={() => setHanding(handing === x.id ? null : x.id)}>Hand off</button>}
                      {x.handedTo && <span className="sub" style={{ fontSize: 13 }}>With {x.handedTo}</span>}
                      <button className="link sub" aria-label="Change time box" onClick={() => cycleMins(x.id)}>{x.mins} min</button>
                      {!x.done && k !== "hand" && <button className="iconbtn" aria-label="Focus on this" onClick={() => startFocusOn(x.id)}><Play size={14} fill="currentColor" /></button>}
                    </div>
                    {handing === x.id && (
                      <div style={{ display: "flex", gap: 8, padding: "0 16px 12px 56px", flexWrap: "wrap" }}>
                        {friends.map((f) => <button key={f.id} className="chip" onClick={() => { setTasks((ts) => ts.map((y) => (y.id === x.id ? { ...y, handedTo: f.name } : y))); setHanding(null); say(`Sent to ${f.name}.`); }}>{f.name}</button>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }) : (
          <div style={{ marginTop: 14 }}>
            {blocks.map((b, i) => {
              const col = b.type === "task" ? Q[b.q].color : b.type === "later" ? Q.later.color : b.type === "hand" ? Q.hand.color : b.type === "break" || b.type === "lunch" ? "var(--ok)" : b.type === "batch" ? "var(--a)" : "var(--line)";
              return (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                  <div className="sub" style={{ width: 62, fontSize: 12, paddingTop: 12, textAlign: "right" }}>{fmt(b.start)}</div>
                  <div className="card" style={{ flex: 1, padding: "10px 14px", borderLeft: `4px solid ${col}`, borderRadius: 12, opacity: b.done ? 0.5 : 1 }}>
                    <div style={{ fontWeight: 600, textDecoration: b.done ? "line-through" : "none" }}>{b.label}</div>
                    <div className="sub" style={{ fontSize: 12 }}>{b.end - b.start} minutes</div>
                  </div>
                </div>
              );
            })}
            <p className="sub" style={{ fontSize: 13, marginTop: 10 }}>Hard work goes first. Boxes are short so you finish sooner. A break comes after about 50 minutes.</p>
          </div>
        )}
        <div className="card" style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 650 }}>Next break: 10 minutes</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
            <div className="sub" style={{ flex: 1, fontSize: 14 }}>{breakIdea()}</div>
            <button className="iconbtn" aria-label="Another idea" onClick={() => setBreakIdx(breakIdx + 1)}><RotateCcw size={15} /></button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <input className="input" aria-label="Add something new" placeholder="Add something new" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { addTask(draft); setDraft(""); setAns({}); setStage("sort"); } }} />
          <button className="btn soft" onClick={() => { if (draft.trim()) { addTask(draft); setDraft(""); setAns({}); setStage("sort"); } }}>Add</button>
        </div>
        <button className="btn ghost full" onClick={planNext}>Plan the next day</button>
      </>
    );
  }
  function renderLife() {
    const remaining = budget - spent;
    const ratio = spent / budget;
    const barColor = ratio < 0.6 ? "var(--ok)" : ratio < 0.9 ? "#D9921C" : "#E5503F";
    return (
      <>
        <Seg value={lifeTab} onChange={setLifeTab} options={[["health", "Health"], ["money", "Money"], ["people", "People"]]} />
        {lifeTab === "health" && (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between" }}><b>Water</b><span className="sub">{water} of 8 glasses</span></div>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                {[...Array(8)].map((_, i) => <button key={i} aria-label={`Glass ${i + 1}`} onClick={() => setWater(i + 1 === water ? i : i + 1)} style={{ flex: 1, height: 40, borderRadius: 10, border: 0, cursor: "pointer", background: i < water ? "#4AA8FF" : "var(--line)", color: "#fff", display: "grid", placeItems: "center" }}>{i < water && <Droplets size={15} />}</button>)}
              </div>
            </div>
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Ring size={56} stroke={6} pct={sleep / 8} color="#8A7BFF"><Moon size={18} color="#8A7BFF" /></Ring>
              <div style={{ flex: 1 }}><b>Sleep last night</b><div className="sub">{sleep} hours. Aim for 8.</div></div>
              <button className="chip small" onClick={() => setSleep(Math.max(0, sleep - 0.5))}>-</button>
              <button className="chip small" onClick={() => setSleep(Math.min(12, sleep + 0.5))}>+</button>
            </div>
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Ring size={56} stroke={6} pct={move / 30} color="var(--ok)"><Target size={18} color="var(--ok)" /></Ring>
              <div style={{ flex: 1 }}><b>Movement</b><div className="sub">{move} of 30 minutes</div></div>
              <button className="chip small" onClick={() => setMove(move + 10)}>+10</button>
            </div>
          </div>
        )}
        {lifeTab === "money" && (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div className="card">
              <div className="sub">Left to spend today</div>
              <div style={{ fontSize: 36, fontWeight: 760, letterSpacing: "-.03em" }}>{remaining.toLocaleString()}</div>
              <div className="bar"><div style={{ width: `${Math.min(100, ratio * 100)}%`, background: barColor }} /></div>
              <div className="sub" style={{ marginTop: 8, fontSize: 13 }}>Spent {spent.toLocaleString()} of {budget.toLocaleString()}</div>
            </div>
            <div className="card">
              <b>Log a spend</b>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input className="input" aria-label="What for" placeholder="What for" value={spendLabel} onChange={(e) => setSpendLabel(e.target.value)} />
                <input className="input" aria-label="Amount" style={{ width: 100 }} inputMode="numeric" placeholder="Amount" value={spendAmt} onChange={(e) => setSpendAmt(e.target.value.replace(/\D/g, ""))} />
              </div>
              <button className="btn full" onClick={() => { const a = parseInt(spendAmt, 10); if (!a) return; setSpends((s) => [...s, { id: uid(), label: spendLabel.trim() || "Spend", amt: a }]); setSpendLabel(""); setSpendAmt(""); bump("money"); }}>Add</button>
              {spends.map((s) => <div key={s.id} className="row" style={{ padding: "10px 0" }}><span style={{ flex: 1 }}>{s.label}</span><b>{s.amt.toLocaleString()}</b></div>)}
            </div>
            <button className="btn soft" onClick={() => { bump("money"); say("Money check done."); }}>I checked my money today</button>
          </div>
        )}
        {lifeTab === "people" && (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div className="card">
              <b>Did you reach out today?</b>
              {reach.map((r) => (
                <div key={r.id} className="row" style={{ padding: "10px 0" }}>
                  <button className={"check" + (r.done ? " on" : "")} aria-label={`Reached out to ${r.name}`} onClick={() => { setReach((x) => x.map((y) => (y.id === r.id ? { ...y, done: !y.done } : y))); if (!r.done) bump("people"); }}>{r.done && <Check size={16} />}</button>
                  <span style={{ flex: 1 }}>{r.name}</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input className="input" aria-label="Add someone" placeholder="Add someone" value={reachDraft} onChange={(e) => setReachDraft(e.target.value)} />
                <button className="btn soft" onClick={() => { if (reachDraft.trim()) { setReach((x) => [...x, { id: uid(), name: reachDraft.trim(), done: false }]); setReachDraft(""); } }}>Add</button>
              </div>
            </div>
            <div className="card">
              <b>Messages to answer</b>
              {replies.map((r) => (
                <div key={r.id} className="row" style={{ padding: "10px 0" }}>
                  <button className={"check" + (r.done ? " on" : "")} aria-label="Replied" onClick={() => setReplies((x) => x.map((y) => (y.id === r.id ? { ...y, done: !y.done } : y)))}>{r.done && <Check size={16} />}</button>
                  <div style={{ flex: 1, opacity: r.done ? 0.5 : 1 }}><div style={{ fontWeight: 600 }}>{r.who}</div><div className="sub" style={{ fontSize: 14 }}>{r.text}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }
  function renderPlan() {
    return (
      <div className="pad">
        <div className="topbar" style={{ padding: 0, marginBottom: 14 }}><div className="brand">Plan</div><span className="streakchip"><Flame size={15} />{streaks.prod}</span></div>
        <Seg value={planTab} onChange={setPlanTab} options={[["today", "Today"], ["life", "Life"]]} />
        <div style={{ marginTop: 16 }}>{planTab === "today" ? renderPlanToday() : renderLife()}</div>
      </div>
    );
  }

  /* ---------- Focus ---------- */
  function renderFocus() {
    const total = (mode === "focus" ? preset : 5) * 60;
    const options = tasks.filter((x) => !x.done && x.q !== "hand");
    return (
      <div className="pad">
        <div className="topbar" style={{ padding: 0, marginBottom: 14 }}><div className="brand">Focus</div></div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: deep ? "var(--a)" : "var(--sub)" }}><BellOff size={24} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 650 }}>Deep work</div>
            <div className="sub" style={{ fontSize: 13 }}>{deep ? (allowedNames.length ? `Only ${allowedNames.join(", ")} can reach you.` : "Everyone is muted.") : "Mute everyone except the people you choose."}</div>
          </div>
          <button className={"switch" + (deep ? " on" : "")} aria-label="Deep work on or off" onClick={() => setDeepMode(!deep)}><span /></button>
        </div>
        <div className="card" style={{ marginTop: 12, textAlign: "center", padding: 20 }}>
          <select className="input" value={focusId} onChange={(e) => setFocusId(e.target.value)} aria-label="Task to focus on">
            <option value="">Pick a task</option>
            {options.map((x) => <option key={x.id} value={x.id}>{x.text}</option>)}
          </select>
          <div style={{ display: "grid", placeItems: "center", margin: "18px 0" }}>
            <Ring size={200} stroke={10} pct={1 - left / total} color={mode === "focus" ? "var(--a)" : "var(--ok)"}>
              <div>
                <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums" }}>{clock(Math.max(left, 0))}</div>
                <div className="sub">{mode === "focus" ? "Focus" : "Break"}</div>
              </div>
            </Ring>
          </div>
          {mode === "focus" && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              {[5, 15, 25, 45].map((v) => <button key={v} className={"chip" + (preset === v ? " on" : "")} onClick={() => { if (!running) { setPreset(v); setLeft(v * 60); } }}>{v} min</button>)}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="btn" style={{ minWidth: 130, display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }} onClick={toggleTimer}>
              {running ? <><Pause size={18} />Pause</> : <><Play size={18} fill="currentColor" />Start</>}
            </button>
            <button className="btn soft" aria-label="Reset" onClick={() => { setRunning(false); setLeft((mode === "focus" ? preset : 5) * 60); }}><RotateCcw size={18} /></button>
          </div>
          <p className="sub" style={{ marginTop: 14, fontSize: 13 }}>A short box helps you start and finish sooner.</p>
        </div>
        {breakCard && (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700 }}>Session done. Take 5 minutes.</div>
            <p className="sub" style={{ marginTop: 4 }}>{breakIdea()}</p>
            <button className="btn full" onClick={() => { setMode("break"); setLeft(5 * 60); setRunning(true); setBreakCard(false); }}>Start the break</button>
          </div>
        )}
        <div className="sub" style={{ margin: "20px 0 8px", fontWeight: 600 }}>Study without distractions</div>
        <div className="list">
          <button className="listrow" onClick={() => setWatchOpen(true)}><span style={{ color: "#E5503F" }}><Youtube size={22} /></span><span style={{ flex: 1, textAlign: "left" }}>Watch YouTube</span><ChevronRight size={18} /></button>
          <button className="listrow" onClick={() => setBrowserOpen(true)}><Globe size={22} /><span style={{ flex: 1, textAlign: "left" }}>Open a course in a quiet browser</span><ChevronRight size={18} /></button>
        </div>
        <div className="sub" style={{ textAlign: "center", marginTop: 16 }}>{sessions} {sessions === 1 ? "session" : "sessions"} today, focus streak {streaks.focus}</div>
      </div>
    );
  }

  /* ---------- Messages ---------- */
  function renderMessages() {
    return (
      <>
        <div className="topbar"><div className="brand">Messages</div><button className="iconplain" aria-label="New message" onClick={() => setComposing(true)}><Plus size={26} /></button></div>
        {threads.map((th) => {
          const f = th.type === "dm" ? friends.find((x) => x.id === th.members[0]) : null;
          const last = th.msgs[th.msgs.length - 1];
          const lastText = !last ? "No messages yet" : last.type === "text" ? last.text : last.type === "photo" ? "Photo" : "Clip";
          return (
            <button key={th.id} className="listrow msg" onClick={() => openChat(th.id)}>
              {f ? <Avatar name={f.name} i={f.hue} size={50} /> : <GroupAvatar members={th.members} friends={friends} size={50} />}
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b style={{ fontWeight: th.unread ? 700 : 600 }}>{th.name}</b>
                  {f && f.snap > 0 && <span className="streakchip tiny"><Flame size={12} />{f.snap}</span>}
                  {th.type === "group" && <Users size={14} color="var(--sub)" />}
                </div>
                <div className="sub" style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: th.unread ? "var(--ink)" : undefined }}>{lastText}</div>
              </div>
              {th.unread > 0 && <span className="badge">{th.unread}</span>}
            </button>
          );
        })}
      </>
    );
  }

  /* ---------- You ---------- */
  function renderYou() {
    return (
      <div className="pad">
        <div className="topbar" style={{ padding: 0 }}><div className="brand">You</div><button className="iconplain" aria-label="Settings" onClick={() => setSettingsOpen(true)}><Settings size={24} /></button></div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "8px 0 18px" }}>
          <Avatar name={who} i={0} size={68} />
          <div><div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em" }}>{who}</div><div className="sub">Keeping up with {main ? main.name : "your friends"}</div></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="card"><div className="sub">Daily productivity</div><div className="bignum"><Flame size={22} color="#D9921C" />{streaks.prod}</div><div className="sub" style={{ fontSize: 12 }}>days in a row</div></div>
          <div className="card"><div className="sub">Focus</div><div className="bignum"><Flame size={22} color="#D9921C" />{streaks.focus}</div><div className="sub" style={{ fontSize: 12 }}>days in a row</div></div>
        </div>
        <div className="sub" style={{ margin: "22px 0 8px", fontWeight: 600 }}>Photo streaks</div>
        <div className="list">
          {friends.map((f) => (
            <button key={f.id} className="listrow" onClick={() => { const th = dmFor(f.id); if (th) openChat(th.id); }}>
              <Avatar name={f.name} i={f.hue} size={40} />
              <span style={{ flex: 1, textAlign: "left" }}>{f.name}</span>
              <span className="streakchip"><Flame size={15} />{f.snap}</span>
            </button>
          ))}
        </div>
        <div className="sub" style={{ margin: "22px 0 8px", fontWeight: 600 }}>Other streaks</div>
        <div className="list">
          {["water", "people", "money"].map((k) => <div key={k} className="row"><span style={{ flex: 1 }}>{STREAK_LABEL[k]}</span><span className="streakchip"><Flame size={15} />{streaks[k]}</span></div>)}
        </div>
      </div>
    );
  }

  /* ---------- Settings ---------- */
  function renderSettings() {
    return (
      <Sheet>
        <div className="thead"><button className="iconplain" aria-label="Back" onClick={() => setSettingsOpen(false)}><ChevronLeft size={26} /></button><div style={{ flex: 1, fontWeight: 650 }}>Settings</div></div>
        <div className="tbody" style={{ gap: 0 }}>
          <div className="sh">Appearance</div>
          <Seg value={dark ? "dark" : "light"} onChange={(v) => setDark(v === "dark")} options={[["light", "Light"], ["dark", "Dark"]]} />
          <div style={{ display: "flex", gap: 14, margin: "16px 0 4px" }}>
            {Object.entries(ACCENTS).map(([k, v]) => <button key={k} aria-label={v.name} onClick={() => setAccent(k)} style={{ width: 38, height: 38, borderRadius: "50%", border: accent === k ? "3px solid var(--ink)" : "3px solid transparent", background: v[dark ? "dark" : "light"], cursor: "pointer" }} />)}
          </div>

          <div className="sh">Deep work</div>
          <div className="list">
            <div className="row"><span style={{ flex: 1 }}>Start with the focus timer</span><button className={"switch" + (autoDeep ? " on" : "")} aria-label="Start deep work with the timer" onClick={() => setAutoDeep(!autoDeep)}><span /></button></div>
          </div>
          <p className="sub" style={{ fontSize: 13, margin: "10px 0 6px" }}>People who can reach you during deep work</p>
          <div className="list">
            {friends.map((f) => (
              <button key={f.id} className="listrow" onClick={() => setAllowed((a) => (a.includes(f.id) ? a.filter((x) => x !== f.id) : [...a, f.id]))}>
                <Avatar name={f.name} i={f.hue} size={34} />
                <span style={{ flex: 1, textAlign: "left" }}>{f.name}</span>
                <span className={"check" + (allowed.includes(f.id) ? " on" : "")}>{allowed.includes(f.id) && <Check size={16} />}</span>
              </button>
            ))}
          </div>

          <div className="sh">Chat balance</div>
          <div className="list"><div className="row"><div style={{ flex: 1 }}><div>Warn me when I chat too much</div><div className="sub" style={{ fontSize: 13 }}>Only when tasks are still open.</div></div><button className={"switch" + (chatNudge ? " on" : "")} aria-label="Chat warning on or off" onClick={() => setChatNudge(!chatNudge)}><span /></button></div></div>

          <div className="sh">Planning reminder</div>
          <Seg value={remind.mode} onChange={(v) => setRemind({ ...remind, mode: v, time: v === "morning" ? "07:00" : "21:00" })} options={[["morning", "Every morning"], ["night", "The night before"]]} />
          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
            <input type="time" aria-label="Reminder time" className="input" value={remind.time} onChange={(e) => setRemind({ ...remind, time: e.target.value })} />
            <button className={"switch" + (remind.on ? " on" : "")} aria-label="Reminder on or off" onClick={() => setRemind({ ...remind, on: !remind.on })}><span /></button>
          </div>
          <button className="btn soft full" onClick={() => say(remind.mode === "morning" ? "Good morning. What do you want to get done today?" : "Plan tomorrow now so you can start fast.")}>Preview the reminder</button>

          <div className="sh">Connections</div>
          <div className="list">
            <div className="row"><span style={{ color: "#E5503F" }}><Youtube size={22} /></span><span style={{ flex: 1 }}>YouTube</span>{connected ? <span className="sub">Linked</span> : <button className="link" onClick={() => { setConnected(true); say("YouTube linked (demo)."); }}>Connect</button>}</div>
          </div>

          <div className="sh">How you unwind</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.keys(UNWIND).map((k) => <button key={k} className={"chip" + (unwind.includes(k) ? " on" : "")} onClick={() => setUnwind((u) => (u.includes(k) ? u.filter((x) => x !== k) : [...u, k]))}>{k}</button>)}
          </div>
          {!demo && user && (
            <>
              <div className="sh">Account</div>
              <div className="list">
                <div className="row"><span style={{ flex: 1 }}>{user.email}</span></div>
                <button className="listrow" onClick={() => onSignOut && onSignOut()}><span style={{ flex: 1, textAlign: "left", color: "#E5503F" }}>Sign out</span></button>
              </div>
            </>
          )}
          <div style={{ height: 30 }} />
        </div>
      </Sheet>
    );
  }

  const tabs = [["home", "Home", Home], ["plan", "Plan", ListChecks], ["focus", "Focus", Target], ["messages", "Messages", MessageCircle], ["you", "You", User]];
  const ot = threads.find((t) => t.id === openThread);
  const statusList = friends.filter((f) => f.status);

  return (
    <div className="stage" style={root}>
      <style>{CSS}</style>
      <div className="phone">
        <div className="scroll" key={tab}>
          {tab === "home" && renderHome()}
          {tab === "plan" && renderPlan()}
          {tab === "focus" && renderFocus()}
          {tab === "messages" && renderMessages()}
          {tab === "you" && renderYou()}
        </div>
        <nav className="tabbar" aria-label="Main">
          {tabs.map(([k, l, Ic]) => (
            <button key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined}>
              <span style={{ position: "relative" }}><Ic size={25} strokeWidth={tab === k ? 2.4 : 1.8} />{k === "messages" && unreadTotal > 0 && <span className="tabdot" />}</span><span>{l}</span>
            </button>
          ))}
        </nav>

        {deep && <div className="deeppill"><BellOff size={13} />Deep work on</div>}

        {statusIdx !== null && <StatusSheet list={statusList} start={statusIdx} onClose={() => setStatusIdx(null)}
          onSeen={(id) => setFriends((fs) => fs.map((f) => (f.id === id ? { ...f, status: { ...f.status, seen: true } } : f)))}
          onCheer={(f) => say(`You cheered ${f.name}.`)}
          onNudge={(f) => { const th = dmFor(f.id); if (th) { sendThread(th.id, { type: "text", text: "Nudge: how is your list going?" }); say(`Nudge sent to ${f.name}.`); } }} />}
        {ot && <ThreadSheet thread={ot} friends={friends} who={who} onBack={() => setOpenThread(null)} onSend={(txt) => sendThread(ot.id, { type: "text", text: txt })} onCamera={() => setCam({ kind: "thread", id: ot.id })} onCall={(k, f) => setCall({ kind: k, friend: f })} />}
        {composing && <ComposeSheet friends={friends} onClose={() => setComposing(false)} onStart={startChat} />}
        {watchOpen && <WatchSheet onClose={() => setWatchOpen(false)} connected={connected} onConnect={() => { setConnected(true); say("YouTube linked (demo)."); }} videos={videos} setVideos={setVideos} say={say} timeLabel={timeLabel} />}
        {browserOpen && <BrowserSheet onClose={() => setBrowserOpen(false)} timeLabel={timeLabel} />}
        {settingsOpen && renderSettings()}
        {cam && <CameraSheet label={cam.kind === "feed" ? "Share with friends" : "Send to a friend"} onClose={() => setCam(null)} onSend={onCameraSend} />}
        {call && <CallSheet friend={call.friend} kind={call.kind} onEnd={() => setCall(null)} />}

        {pickStatus && (
          <div className="modal" onClick={() => setPickStatus(false)}>
            <div className="panel" onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>What are you up to?</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                {Object.keys(STATUS_OPTS).map((k) => <button key={k} className="chip" onClick={() => setStatusFrom(k)}>{k}</button>)}
              </div>
              <button className="btn soft full" style={{ marginTop: 16 }} onClick={() => { setPickStatus(false); setCam({ kind: "feed" }); }}>Share a photo instead</button>
            </div>
          </div>
        )}
        {adding && !demo && (
          <div className="modal" onClick={() => { setAdding(false); setInviteLink(""); }}>
            <div className="panel" onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Invite a friend</div>
              <p className="sub" style={{ marginTop: 6 }}>Send them a link. When they sign up, you are paired.</p>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {["Best friend", "Colleague", "Partner"].map((r) => <button key={r} className={"chip" + (roleDraft === r ? " on" : "")} onClick={() => { setRoleDraft(r); setInviteLink(""); }}>{r}</button>)}
              </div>
              {!inviteLink ? (
                <button className="btn full" style={{ marginTop: 16 }} disabled={inviteBusy} onClick={makeInvite}>{inviteBusy ? "Creating" : "Create invite link"}</button>
              ) : (
                <div className="card" style={{ marginTop: 16 }}>
                  <div className="sub" style={{ wordBreak: "break-all" }}>{inviteLink}</div>
                  <button className="btn full" onClick={shareInvite}>Share or copy link</button>
                </div>
              )}
            </div>
          </div>
        )}
        {adding && demo && (
          <div className="modal" onClick={() => setAdding(false)}>
            <div className="panel" onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Add a friend</div>
              <input className="input" style={{ marginTop: 14 }} aria-label="Their name" placeholder="Their name" value={draftFriend} onChange={(e) => setDraftFriend(e.target.value)} />
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {["Best friend", "Colleague", "Partner"].map((r) => <button key={r} className={"chip" + (roleDraft === r ? " on" : "")} onClick={() => setRoleDraft(r)}>{r}</button>)}
              </div>
              <button className="btn full" style={{ marginTop: 16 }} onClick={() => {
                const nm = draftFriend.trim();
                if (!nm) return;
                const f = { id: uid(), name: nm, role: roleDraft, hue: friends.length, done: 0, total: 0, snap: 0, status: null };
                setFriends((x) => [...x, f]);
                setThreads((ts) => [...ts, { id: uid(), type: "dm", name: nm, members: [f.id], unread: 0, sent: 0, msgs: [] }]);
                setDraftFriend(""); setAdding(false); say(`Invite sent to ${nm}.`);
              }}>Send invite</button>
            </div>
          </div>
        )}
        {nudge && (
          <div className="nudge" role="alert">
            <div style={{ fontWeight: 700 }}>{nudge.empty ? "Your list for today is empty." : "Your list is waiting."}</div>
            <div style={{ fontSize: 14, marginTop: 2, opacity: 0.85 }}>{nudge.empty ? `You have sent ${nudge.n} messages to ${nudge.name}. Plan the day before you chat more.` : `You have sent ${nudge.n} messages to ${nudge.name} and ${nudge.pending} ${nudge.pending > 1 ? "tasks are" : "task is"} still open.`}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn" style={{ flex: 1, padding: "10px" }} onClick={() => { setNudge(null); setOpenThread(null); setTab("plan"); }}>Back to my list</button>
              <button className="btn soft" style={{ flex: 1, padding: "10px" }} onClick={() => setNudge(null)}>Five more minutes</button>
            </div>
          </div>
        )}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box}
.stage{min-height:100vh;display:grid;place-items:center;background:#C9CED8;padding:16px}
.phone{position:relative;width:390px;height:min(844px,calc(100vh - 32px));background:var(--bg);color:var(--ink);border-radius:46px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(20,30,60,.28),0 0 0 10px #101216;transition:background .3s,color .3s;font-family:Inter,-apple-system,"SF Pro Text",system-ui,sans-serif;-webkit-font-smoothing:antialiased;font-size:15px}
@media(max-width:480px){.stage{padding:0;background:var(--bg)}.phone{width:100vw;height:100dvh;border-radius:0;box-shadow:none}}
.scroll{flex:1;overflow-y:auto;padding:44px 0 96px;scrollbar-width:none}
.scroll::-webkit-scrollbar{display:none}
.pad{padding:0 16px}
.h1{font-size:32px;line-height:1.1;letter-spacing:-.03em;font-weight:760;margin:0}
p{margin:0}
button,input,select{font-family:inherit}
.sub{color:var(--sub);font-size:14px;line-height:1.4}
.topbar{display:flex;justify-content:space-between;align-items:center;padding:6px 16px}
.brand{font-size:24px;font-weight:760;letter-spacing:-.03em}
.iconplain{border:0;background:none;color:var(--ink);cursor:pointer;display:grid;place-items:center;padding:6px;border-radius:50%}
.iconplain.acc{color:var(--a)}
.card{background:var(--card);border-radius:18px;padding:16px;color:var(--ink)}
.list{background:var(--card);border-radius:16px;overflow:hidden}
.btn{border:0;border-radius:12px;padding:13px 18px;font:inherit;font-weight:620;cursor:pointer;background:var(--a);color:var(--onA);transition:transform .15s,opacity .2s;text-align:center}
.btn:active{transform:scale(.97)}
.btn.soft{background:var(--tint);color:var(--a)}
.btn.ghost{background:transparent;color:var(--sub)}
.btn.full{display:block;width:100%;margin-top:10px}
.link{border:0;background:none;color:var(--a);font:inherit;font-size:14px;font-weight:600;cursor:pointer;padding:4px}
.link.sub{color:var(--sub);font-weight:500}
.chip{border:1px solid var(--line);background:transparent;border-radius:999px;padding:8px 14px;font:inherit;font-size:14px;color:var(--ink);cursor:pointer;transition:all .2s}
.chip.on{background:var(--a);border-color:var(--a);color:var(--onA)}
.chip.small{padding:5px 11px;font-size:13px}
.chip.big{flex:1;padding:13px;font-size:16px;font-weight:600;border-radius:12px}
.input{width:100%;border:1px solid var(--line);background:var(--fill);border-radius:12px;padding:12px 14px;font:inherit;color:var(--ink);outline:none;transition:border-color .2s}
.input.pill{border-radius:999px}
.input:focus{border-color:var(--a)}
.row{display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--line)}
.row:last-child{border-bottom:0}
.listrow{display:flex;align-items:center;gap:12px;width:100%;padding:13px 16px;background:none;border:0;border-bottom:1px solid var(--line);color:var(--ink);font:inherit;cursor:pointer}
.listrow:last-child{border-bottom:0}
.listrow.msg{border-bottom:0;padding:11px 16px}
.check{width:26px;height:26px;border-radius:50%;border:2px solid var(--line);display:grid;place-items:center;background:transparent;color:#fff;cursor:pointer;flex:none;transition:all .25s}
.check.on{background:var(--ok);border-color:var(--ok)}
.iconbtn{border:0;background:var(--tint);color:var(--a);width:30px;height:30px;border-radius:50%;display:grid;place-items:center;cursor:pointer;flex:none}
.roundbtn{width:64px;height:64px;border-radius:50%;border:0;display:grid;place-items:center;cursor:pointer}
.roundbtn.sm{width:40px;height:40px}
.seg{display:flex;background:var(--fill);border-radius:12px;padding:3px;gap:2px}
.seg button{flex:1;border:0;background:none;padding:9px 6px;border-radius:9px;font:inherit;font-weight:600;font-size:14px;color:var(--sub);cursor:pointer}
.seg button.on{background:var(--bg);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.18)}
.seg.dk{background:rgba(255,255,255,.12)}
.seg.dk button{color:#bbb}
.seg.dk button.on{background:#fff;color:#111}
.bar{height:6px;border-radius:9px;background:var(--line);margin-top:12px;overflow:hidden}
.bar div{height:100%;border-radius:9px;background:var(--a);transition:width .5s}
.bignum{display:flex;align-items:center;gap:6px;font-size:30px;font-weight:760;letter-spacing:-.03em;margin-top:4px}
.sh{font-size:13px;font-weight:650;color:var(--sub);margin:26px 0 10px}
.tabbar{position:absolute;left:0;right:0;bottom:0;display:flex;padding:8px 6px 22px;background:var(--bar);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border-top:1px solid var(--line);z-index:10}
.tab{flex:1;border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0;color:var(--sub);font-size:10.5px;font-weight:600;cursor:pointer}
.tab.on{color:var(--ink)}
.tabdot{position:absolute;top:-2px;right:-4px;width:9px;height:9px;border-radius:50%;background:#E5503F;border:2px solid var(--bg)}
.avatar{border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:650;flex:none}
.ringwrap{border-radius:50%;padding:2.5px}
.ringwrap.new{background:var(--a)}
.ringwrap.seen{background:var(--line)}
.ringwrap.none{background:transparent}
.ringgap{border-radius:50%;padding:2px;background:var(--bg)}
.livedot{position:absolute;right:2px;bottom:2px;width:14px;height:14px;border-radius:50%;background:var(--ok);border:3px solid var(--bg)}
.livedot.inline{position:static;display:inline-block;width:9px;height:9px;border:0}
.stories{display:flex;gap:14px;overflow-x:auto;padding:10px 16px 14px;scrollbar-width:none}
.stories::-webkit-scrollbar{display:none}
.story{width:78px;flex:none;text-align:center;background:none;border:0;color:var(--ink);cursor:pointer;padding:0}
.sname{font-size:12.5px;font-weight:600;margin-top:6px}
.scap{font-size:11.5px;color:var(--sub);line-height:1.25;margin-top:1px;min-height:28px}
.plusbadge{position:absolute;right:-1px;bottom:-1px;width:24px;height:24px;border-radius:50%;background:var(--a);color:var(--onA);display:grid;place-items:center;border:3px solid var(--bg)}
.addbubble{width:68px;height:68px;border-radius:50%;border:2px dashed var(--line);display:grid;place-items:center;color:var(--sub);margin:0 auto}
.dayrow{display:flex;align-items:center;gap:10px;width:calc(100% - 32px);margin:0 16px 4px;padding:12px 14px;border-radius:14px;background:var(--card);border:0;color:var(--ink);font:inherit;font-weight:600;cursor:pointer}
.streakchip{display:inline-flex;align-items:center;gap:4px;color:#D9921C;font-weight:700;font-size:14px}
.streakchip.tiny{font-size:12px}
.post{display:flex;gap:12px;padding:16px;border-bottom:1px solid var(--line)}
.post:first-of-type{margin-top:8px}
.tag{display:inline-block;margin-top:10px;border:1px solid var(--line);background:var(--fill);border-radius:9px;padding:5px 11px;font-size:13px;font-weight:600}
.actionsrow{display:flex;gap:26px;margin-top:12px}
.act{display:flex;align-items:center;gap:6px;border:0;background:none;color:var(--sub);font:inherit;font-size:15px;cursor:pointer;padding:0}
.act.on{color:var(--a)}
.ph{border-radius:14px;background:linear-gradient(160deg,var(--fill),var(--line));color:var(--sub);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:13px}
.pill{display:inline-block;color:#fff;border-radius:999px;padding:8px 14px;font-weight:620;font-size:14px}
.grouphead{display:flex;align-items:center;gap:8px;font-weight:650;margin-bottom:8px}
.grouphead span{width:9px;height:9px;border-radius:50%}
.grouphead em{font-style:normal;font-weight:400;font-size:13px;color:var(--sub)}
.badge{min-width:22px;height:22px;border-radius:11px;background:var(--a);color:var(--onA);font-size:12px;font-weight:700;display:grid;place-items:center;padding:0 6px}
.switch{width:50px;height:30px;border-radius:999px;border:0;background:var(--line);position:relative;cursor:pointer;flex:none;transition:background .2s}
.switch span{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .2s}
.switch.on{background:var(--ok)}
.switch.on span{transform:translateX(20px)}
.sheet{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;background:var(--bg);color:var(--ink)}
.sheet.dark{background:#0B0D12;color:#fff}
.thead{display:flex;align-items:center;gap:10px;padding:46px 12px 10px;border-bottom:1px solid var(--line)}
.tbody{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scrollbar-width:none}
.tfoot{display:flex;align-items:center;gap:8px;padding:10px 12px 28px;border-top:1px solid var(--line)}
.bubble{padding:10px 14px;border-radius:18px;background:var(--fill);font-size:15px;line-height:1.35}
.bubble.me{background:var(--a);color:var(--onA)}
.vid{position:relative;border:0;background:none;padding:0;cursor:pointer}
.vplay{position:absolute;inset:0;display:grid;place-items:center}
.vplay::before{content:"";position:absolute;width:52px;height:52px;border-radius:50%;background:rgba(0,0,0,.55)}
.vplay svg{position:relative}
.modal{position:absolute;inset:0;background:rgba(0,0,0,.45);z-index:40;display:flex;align-items:flex-end}
.panel{background:var(--bg);width:100%;border-radius:24px 24px 0 0;padding:22px 18px 30px}
.deeppill{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:25;background:var(--a);color:var(--onA);border-radius:999px;padding:5px 12px;font-size:12px;font-weight:650;display:flex;align-items:center;gap:6px}
.nudge{position:absolute;left:14px;right:14px;top:50px;z-index:70;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:0 16px 40px rgba(0,0,0,.35);animation:drop .3s ease}
.toast{position:absolute;top:12px;left:16px;right:16px;z-index:80;background:var(--ink);color:var(--bg);padding:12px 16px;border-radius:14px;font-size:14px;font-weight:600;animation:drop .3s ease}
@keyframes drop{from{transform:translateY(-14px);opacity:0}to{transform:none;opacity:1}}
:focus-visible{outline:2px solid var(--a);outline-offset:2px}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;
