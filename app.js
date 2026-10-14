/* ------------------------------------------------------------
   Settings: paste your own values from Supabase (Project Settings > API)
   ------------------------------------------------------------ */
const SUPABASE_URL = 'https://prectbbyjckiqinrudeu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByZWN0YmJ5amNraXFpbnJ1ZGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2OTkxMTEsImV4cCI6MjEwNzI3NTExMX0.mQEmyucO10gYoOmtt4aJCHLFFgFgX2SMhxVi5HOCvnA';

/* ------------------------------------------------------------ */
const $ = (s, r = document) => r.querySelector(s);
const configured = !SUPABASE_URL.startsWith('YOUR_') && !SUPABASE_ANON_KEY.startsWith('YOUR_');
let sb = null, session = null, profile = null, currentUserId = null, recovering = false;
let authMode = 'signin', profileMode = 'setup', pendingPhoto = null;

/* ---------- Small helpers ---------- */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else el.setAttribute(k, v);
  }
  kids.flat().forEach(k => k != null && el.append(k));
  return el;
}
function show(view) {
  ['auth', 'recovery', 'profile', 'home'].forEach(v => { $('#view-' + v).hidden = v !== view; });
  window.scrollTo(0, 0);
}
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}
function setBusy(btn, busy, label) {
  if (busy) { btn.dataset.label = btn.textContent; btn.textContent = label; }
  else if (btn.dataset.label) { btn.textContent = btn.dataset.label; }
  btn.disabled = busy;
}
const pageUrl = () => location.origin + location.pathname;
function friendlyError(err) {
  const m = (err && err.message) || 'Something went wrong. Try again.';
  if (/invalid login/i.test(m)) return 'The email or password is not right.';
  if (/already registered|already been registered/i.test(m)) return 'An account with this email already exists. Sign in instead.';
  if (/fetch|network/i.test(m)) return 'No connection. Check your internet and try again.';
  return m;
}

/* ---------- Theme ---------- */
const THEMES = ['auto', 'light', 'dark'];
function getTheme() { try { return localStorage.getItem('theme') || 'auto'; } catch { return 'auto'; } }
function applyTheme(t) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('theme', t); } catch {}
  const label = { auto: 'Theme: Auto', light: 'Theme: Light', dark: 'Theme: Dark' }[t];
  $('#theme-btn').textContent = label;
}
$('#theme-btn').addEventListener('click', () => {
  applyTheme(THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length]);
});
applyTheme(getTheme());

/* ---------- Shelf illustration ---------- */
function drawShelf(svg) {
  const NS = 'http://www.w3.org/2000/svg', base = 190;
  const add = (parent, tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e); return e;
  };
  // x, width, height, color number, lean angle
  const spines = [[34, 26, 118, 1], [62, 22, 150, 2], [86, 30, 104, 3], [118, 20, 138, 4],
                  [140, 28, 124, 5], [172, 24, 134, 6, 11], [236, 26, 98, 2], [264, 22, 128, 1]];
  spines.forEach(([x, w, hgt, c, lean], i) => {
    const g = add(svg, 'g', { class: 'spine', style: `animation-delay:${i * 70}ms` });
    const inner = add(g, 'g', lean ? { transform: `rotate(${lean} ${x} ${base})` } : {});
    add(inner, 'rect', { x, y: base - hgt, width: w, height: hgt, rx: 2, fill: `var(--c${c})` });
    add(inner, 'rect', { x: x + 3, y: base - hgt + 14, width: w - 6, height: 3, fill: '#fff', opacity: '.35' });
    add(inner, 'rect', { x: x + 3, y: base - hgt + 21, width: w - 6, height: 3, fill: '#fff', opacity: '.2' });
  });
  const stack = add(svg, 'g', { class: 'spine', style: 'animation-delay:620ms' });
  [[310, 124, 20, 3], [318, 104, 24, 5], [312, 114, 18, 4]].reduce((top, [x, w, hgt, c]) => {
    const y = top - hgt;
    add(stack, 'rect', { x, y, width: w, height: hgt, rx: 2, fill: `var(--c${c})` });
    add(stack, 'rect', { x: x + 8, y: y + hgt / 2 - 1, width: w - 16, height: 2, fill: '#fff', opacity: '.3' });
    return y;
  }, base);
  const pencil = add(svg, 'g', { class: 'spine', style: 'animation-delay:760ms' });
  add(pencil, 'rect', { x: 326, y: 121, width: 78, height: 8, rx: 1, fill: 'var(--c3)' });
  add(pencil, 'polygon', { points: '326,121 326,129 314,125', fill: 'var(--shelf)' });
  add(pencil, 'polygon', { points: '317,123.6 317,126.4 314,125', fill: 'var(--text)' });
  add(pencil, 'rect', { x: 404, y: 121, width: 8, height: 8, rx: 2, fill: 'var(--c4)' });
  add(svg, 'rect', { x: 10, y: base, width: 460, height: 12, rx: 2, fill: 'var(--shelf)' });
  add(svg, 'rect', { x: 18, y: base + 12, width: 444, height: 4, rx: 2, fill: 'var(--shelf)', opacity: '.45' });
}
drawShelf($('#shelf-art'));

/* ---------- Avatars ---------- */
function avatarEl(person, size) {
  const el = h('div', { class: 'avatar', style: `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px` });
  paintAvatar(el, person);
  return el;
}
function paintAvatar(el, person) {
  const name = (person && (person.full_name || person.username)) || '?';
  if (person && person.avatar_url) {
    el.style.backgroundImage = `url("${person.avatar_url}")`; el.textContent = '';
    el.setAttribute('role', 'img'); el.setAttribute('aria-label', name);
  } else {
    let n = 0; for (const ch of (person && person.username) || name) n += ch.charCodeAt(0);
    el.style.backgroundImage = 'none'; el.style.background = `var(--c${(n % 6) + 1})`;
    el.textContent = name.trim().charAt(0).toUpperCase();
  }
}

/* ---------- Sign in and create account ---------- */
function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === 'signup';
  $('#tab-signin').setAttribute('aria-selected', String(!signup));
  $('#tab-signup').setAttribute('aria-selected', String(signup));
  $('#auth-title').textContent = signup ? 'Create your account' : 'Welcome back';
  $('#auth-sub').textContent = signup ? 'It takes less than a minute.' : 'Sign in to pick up where you left off.';
  $('#auth-submit').textContent = signup ? 'Create account' : 'Sign in';
  $('#forgot-btn').hidden = signup;
  $('#password-hint').hidden = !signup;
  $('#password').autocomplete = signup ? 'new-password' : 'current-password';
  $('#auth-error').textContent = ''; $('#auth-notice').textContent = '';
}
$('#tab-signin').addEventListener('click', () => setAuthMode('signin'));
$('#tab-signup').addEventListener('click', () => setAuthMode('signup'));

function needSetup() {
  if (!configured) { $('#auth-error').textContent = 'Add your Supabase URL and public key in this file first.'; return true; }
  return false;
}

$('#google-btn').addEventListener('click', async () => {
  if (needSetup()) return;
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: pageUrl() } });
  if (error) $('#auth-error').textContent = friendlyError(error);
});

$('#auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#auth-error'), note = $('#auth-notice');
  err.textContent = ''; note.textContent = '';
  if (needSetup()) return;
  const email = $('#email').value.trim(), password = $('#password').value;
  if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'Enter a valid email address.'; return; }
  if (!password) { err.textContent = 'Enter your password.'; return; }
  if (authMode === 'signup' && password.length < 8) { err.textContent = 'Use at least 8 characters for your password.'; return; }
  const btn = $('#auth-submit');
  setBusy(btn, true, authMode === 'signup' ? 'Creating account' : 'Signing in');
  try {
    if (authMode === 'signup') {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: pageUrl() } });
      if (error) err.textContent = friendlyError(error);
      else if (!data.session) note.textContent = 'Check your email. We sent a link to confirm your account.';
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) err.textContent = friendlyError(error);
    }
  } catch (ex) { err.textContent = friendlyError(ex); }
  setBusy(btn, false);
});

$('#forgot-btn').addEventListener('click', async () => {
  const err = $('#auth-error'), note = $('#auth-notice');
  err.textContent = ''; note.textContent = '';
  if (needSetup()) return;
  const email = $('#email').value.trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'Enter your email above, then select Forgot password.'; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: pageUrl() });
  if (error) err.textContent = friendlyError(error);
  else note.textContent = 'If an account exists for ' + email + ', a reset link is on its way.';
});

$('#recovery-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#recovery-error'); err.textContent = '';
  const a = $('#new-password').value, b = $('#confirm-password').value;
  if (a.length < 8) { err.textContent = 'Use at least 8 characters.'; return; }
  if (a !== b) { err.textContent = 'The two passwords do not match.'; return; }
  const { error } = await sb.auth.updateUser({ password: a });
  if (error) { err.textContent = friendlyError(error); return; }
  recovering = false; toast('Password saved'); route();
});

document.querySelectorAll('[data-signout]').forEach(b => b.addEventListener('click', async () => {
  await sb.auth.signOut();
}));

/* ---------- Profile form ---------- */
function squareJpeg(file, size = 512) {
  return new Promise((resolve, reject) => {
    if (file.size > 15 * 1024 * 1024) return reject(new Error('Choose a photo under 15 MB.'));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(img.width, img.height), c = document.createElement('canvas');
      c.width = c.height = size;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? resolve(b) : reject(new Error('Could not read that photo.')), 'image/jpeg', 0.85);
    };
    img.onerror = () => reject(new Error('That file is not a photo.'));
    img.src = url;
  });
}

$('#photo-btn').addEventListener('click', () => $('#photo-input').click());
$('#photo-input').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  $('#profile-error').textContent = '';
  try {
    pendingPhoto = await squareJpeg(file);
    const prev = $('#photo-preview');
    prev.textContent = ''; prev.style.backgroundImage = `url("${URL.createObjectURL(pendingPhoto)}")`;
  } catch (ex) { $('#profile-error').textContent = ex.message; }
});
$('#bio').addEventListener('input', () => { $('#bio-count').textContent = $('#bio').value.length + ' of 200'; });

function openProfileForm(mode) {
  profileMode = mode; pendingPhoto = null;
  const setup = mode === 'setup';
  $('#profile-title').textContent = setup ? 'Set up your profile' : 'Edit profile';
  $('#profile-sub').textContent = setup ? 'Your friends will see this when you add each other.' : 'Change how you appear to your friends.';
  $('#profile-submit').textContent = setup ? 'Save and continue' : 'Save changes';
  $('#profile-cancel').hidden = setup;
  const isGenerated = /^user_[a-f0-9]{8}$/.test(profile.username);
  $('#full-name').value = profile.full_name || '';
  $('#username').value = setup && isGenerated ? '' : profile.username;
  $('#bio').value = profile.bio || '';
  $('#bio-count').textContent = $('#bio').value.length + ' of 200';
  $('#dob').value = profile.date_of_birth || '';
  $('#dob').max = new Date().toISOString().slice(0, 10);
  ['full-name', 'username', 'dob'].forEach(id => { $('#' + id + '-error').textContent = ''; });
  $('#profile-error').textContent = '';
  const prev = $('#photo-preview'); prev.style.background = ''; paintAvatar(prev, profile);
  show('profile');
}
$('#profile-cancel').addEventListener('click', () => show('home'));

$('#profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  ['full-name', 'username', 'dob'].forEach(id => { $('#' + id + '-error').textContent = ''; });
  $('#profile-error').textContent = '';
  const full_name = $('#full-name').value.trim();
  const username = $('#username').value.trim().toLowerCase();
  const bio = $('#bio').value.trim();
  const dob = $('#dob').value;
  let bad = false;
  if (!full_name) { $('#full-name-error').textContent = 'Enter your name.'; bad = true; }
  if (!/^[a-z0-9_]{3,20}$/.test(username)) { $('#username-error').textContent = 'Use 3 to 20 letters, numbers or underscores.'; bad = true; }
  if (dob && dob > new Date().toISOString().slice(0, 10)) { $('#dob-error').textContent = 'Choose a date in the past.'; bad = true; }
  if (bad) return;

  const btn = $('#profile-submit');
  setBusy(btn, true, 'Saving');
  try {
    const update = {
      full_name, username, bio: bio || null, date_of_birth: dob || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos'
    };
    if (pendingPhoto) {
      const path = `${session.user.id}/avatar-${Date.now()}.jpg`;
      const up = await sb.storage.from('avatars').upload(path, pendingPhoto, { contentType: 'image/jpeg', cacheControl: '3600' });
      if (up.error) throw up.error;
      update.avatar_url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    }
    const { error } = await sb.from('profiles').update(update).eq('id', session.user.id);
    if (error) {
      if (error.code === '23505') { $('#username-error').textContent = 'That username is taken. Try another.'; }
      else throw error;
    } else {
      if (profileMode === 'setup') await sb.auth.updateUser({ data: { profile_done: true } });
      await loadProfile(); toast('Profile saved'); await openHome();
    }
  } catch (ex) { $('#profile-error').textContent = friendlyError(ex); }
  setBusy(btn, false);
});

/* ---------- Home ---------- */
async function loadProfile() {
  const { data, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if (error) throw error;
  profile = data;
}

async function openHome() {
  paintAvatar($('#home-avatar'), profile);
  $('#home-name').textContent = profile.full_name || profile.username;
  $('#home-handle').textContent = '@' + profile.username;
  $('#home-bio').textContent = profile.bio || '';
  $('#home-bio').hidden = !profile.bio;
  $('#friend-code').textContent = profile.friend_code;
  show('home');
  await Promise.all([loadTasks(), loadFriends()]);
}
$('#edit-profile-btn').addEventListener('click', () => openProfileForm('edit'));

$('#copy-code-btn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(profile.friend_code); toast('ID copied'); }
  catch { toast('Select the ID and copy it'); }
});

$('#add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#add-error'); err.textContent = '';
  const code = $('#add-code').value.trim();
  if (!code) { err.textContent = 'Enter a friend ID.'; return; }
  const btn = e.submitter || $('#add-form button');
  btn.disabled = true;
  const { error } = await sb.rpc('send_friend_request', { code });
  btn.disabled = false;
  if (error) { err.textContent = friendlyError(error); return; }
  $('#add-code').value = ''; toast('Request sent'); loadFriends();
});

async function loadFriends() {
  const me = session.user.id;
  const { data: rows, error } = await sb.from('friendships').select('id,requester_id,addressee_id,status');
  if (error) { toast('Could not load your friends. Pull to refresh.'); return; }
  const otherOf = r => r.requester_id === me ? r.addressee_id : r.requester_id;
  const ids = [...new Set(rows.map(otherOf))];
  let people = [];
  if (ids.length) {
    const res = await sb.from('profiles').select('id,username,full_name,avatar_url').in('id', ids);
    people = res.data || [];
  }
  const byId = Object.fromEntries(people.map(p => [p.id, p]));
  const incoming = rows.filter(r => r.status === 'pending' && r.addressee_id === me);
  const outgoing = rows.filter(r => r.status === 'pending' && r.requester_id === me);
  const friends = rows.filter(r => r.status === 'accepted');

  // Requests
  const list = $('#requests-list'); list.replaceChildren();
  $('#requests-panel').hidden = incoming.length === 0;
  incoming.forEach(r => {
    const p = byId[r.requester_id] || { username: 'someone' };
    const accept = h('button', { class: 'btn primary small', type: 'button', text: 'Accept' });
    const decline = h('button', { class: 'btn small', type: 'button', text: 'Decline' });
    const respond = async (ok) => {
      accept.disabled = decline.disabled = true;
      const { error: e2 } = await sb.rpc('respond_friend_request', { request_id: r.id, accept: ok });
      if (e2) { toast(friendlyError(e2)); accept.disabled = decline.disabled = false; return; }
      toast(ok ? 'Added to your shelf' : 'Request declined'); loadFriends();
    };
    accept.addEventListener('click', () => respond(true));
    decline.addEventListener('click', () => respond(false));
    list.append(h('div', { class: 'person' }, avatarEl(p, 44),
      h('div', { class: 'name' }, h('strong', { text: p.full_name || p.username }), h('span', { text: '@' + p.username })),
      h('div', { class: 'btns' }, accept, decline)));
  });

  // Waiting
  const waiting = $('#waiting');
  waiting.hidden = outgoing.length === 0;
  waiting.textContent = outgoing.length
    ? 'Waiting for a reply from ' + outgoing.map(r => '@' + ((byId[r.addressee_id] || {}).username || 'someone')).join(', ') + '.'
    : '';

  // Shelf
  const shelf = $('#friends-shelf'); shelf.replaceChildren();
  $('#friends-empty').hidden = friends.length > 0;
  $('#friends-sub').hidden = friends.length === 0;
  shelf.hidden = friends.length === 0;
  friends.forEach(r => {
    const p = byId[otherOf(r)] || { username: 'friend' };
    shelf.append(h('div', { class: 'shelf-friend' }, avatarEl(p, 56), h('span', { class: 'label', text: p.full_name || p.username })));
  });
}

/* ---------- Tasks and streak (tables: tasks, streaks; action: complete_task) ---------- */
const todayLocal = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

function buildTasksPanel() {
  if ($('#tasks-panel')) return;
  const panel = h('section', { class: 'panel', id: 'tasks-panel' },
    h('h2', { text: "Today's tasks" }),
    h('p', { class: 'sub', id: 'streak-line' }),
    h('form', { class: 'inline-form', id: 'task-form', novalidate: '' },
      h('input', { class: 'input', id: 'task-title', 'aria-label': 'New task', placeholder: 'What will you get done today?', maxlength: '200', autocomplete: 'off' }),
      h('button', { class: 'btn primary', type: 'submit', text: 'Add task' })),
    h('p', { class: 'error', id: 'task-error', role: 'alert', style: 'margin-top:10px' }),
    h('div', { class: 'list', id: 'tasks-list' }),
    h('p', { class: 'empty', id: 'tasks-empty', hidden: '', text: 'No tasks yet. Add one above.' }));
  $('#view-home .page').children[0].after(panel);
  $('#task-form').addEventListener('submit', addTask);
}

async function addTask(e) {
  e.preventDefault();
  const err = $('#task-error'); err.textContent = '';
  const title = $('#task-title').value.trim();
  if (!title) { err.textContent = 'Type a task first.'; return; }
  const { error } = await sb.from('tasks').insert({ user_id: session.user.id, title, due_date: todayLocal() });
  if (error) { err.textContent = friendlyError(error); return; }
  $('#task-title').value = ''; loadTasks();
}

async function completeTask(id, btn) {
  btn.disabled = true;
  const { error } = await sb.rpc('complete_task', { task_id: id });
  if (error) { toast(friendlyError(error)); btn.disabled = false; return; }
  toast('Task done'); loadTasks();
}

async function deleteTask(id) {
  const { error } = await sb.from('tasks').delete().eq('id', id);
  if (error) { toast(friendlyError(error)); return; }
  loadTasks();
}

async function loadTasks() {
  buildTasksPanel();
  const me = session.user.id;
  const [t, s] = await Promise.all([
    sb.from('tasks').select('id,title,is_done').eq('user_id', me).eq('due_date', todayLocal()).order('created_at'),
    sb.from('streaks').select('current_streak,longest_streak,freezes_left').eq('user_id', me).maybeSingle()
  ]);
  if (t.error) { toast('Could not load your tasks.'); return; }
  const st = s.data || { current_streak: 0, longest_streak: 0, freezes_left: 0 };
  const day = n => n + (n === 1 ? ' day' : ' days');
  $('#streak-line').textContent = `Streak: ${day(st.current_streak)}. Best: ${day(st.longest_streak)}. Freezes left this week: ${st.freezes_left}.`;
  const list = $('#tasks-list'); list.replaceChildren();
  $('#tasks-empty').hidden = t.data.length > 0;
  t.data.forEach(task => {
    const done = h('button', { class: 'btn small' + (task.is_done ? '' : ' primary'), type: 'button', text: task.is_done ? 'Done' : 'Mark done' });
    done.disabled = task.is_done;
    done.addEventListener('click', () => completeTask(task.id, done));
    const del = h('button', { class: 'btn quiet small', type: 'button', 'aria-label': 'Delete task', text: 'Delete' });
    del.addEventListener('click', () => deleteTask(task.id));
    list.append(h('div', { class: 'person' },
      h('div', { class: 'name' }, h('strong', { text: task.title, style: task.is_done ? 'text-decoration:line-through;opacity:.6' : '' })),
      h('div', { class: 'btns' }, done, del)));
  });
}

/* ---------- Start up ---------- */
async function route() {
  if (recovering) return show('recovery');
  if (!session) { profile = null; currentUserId = null; return show('auth'); }
  currentUserId = session.user.id;
  try {
    await loadProfile();
    const done = session.user.user_metadata && session.user.user_metadata.profile_done;
    if (!done) openProfileForm('setup'); else await openHome();
  } catch (ex) {
    show('auth'); $('#auth-error').textContent = friendlyError(ex);
  }
}

setAuthMode('signin');
if (!configured) {
  $('#config-banner').hidden = false; show('auth');
} else {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  sb.auth.onAuthStateChange((event, s) => {
    session = s;
    if (event === 'PASSWORD_RECOVERY') { recovering = true; setTimeout(route, 0); return; }
    if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
    if (event === 'SIGNED_IN' && s && s.user.id === currentUserId) return;
    setTimeout(route, 0);
  });
}
