// ===== STORAGE HELPERS =====
const DB = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  remove: (key) => localStorage.removeItem(key),
};

// ===== STATE =====
let currentUser = null;  // { username, name }

// ===== USER DB =====
function getUsers() { return DB.get('sl_users') || {}; }
function saveUsers(u) { DB.set('sl_users', u); }

// Per-user data key
function userKey(username, section) { return `sl_data_${username}_${section}`; }

function getUserData(section) {
  return DB.get(userKey(currentUser.username, section));
}
function setUserData(section, val) {
  DB.set(userKey(currentUser.username, section), val);
}

// ===== SESSION =====
function loadSession() {
  const s = DB.get('sl_session');
  if (s) {
    const users = getUsers();
    if (users[s.username]) {
      currentUser = { username: s.username, name: users[s.username].name };
      return true;
    }
  }
  return false;
}
function saveSession() {
  DB.set('sl_session', { username: currentUser.username });
}
function clearSession() {
  DB.remove('sl_session');
}

// ===== AUTH =====
function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('form-signup').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('login-error').textContent = '';
  document.getElementById('signup-error').textContent = '';
}

function handleLogin() {
  const username = document.getElementById('login-username').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  err.textContent = '';

  if (!username || !password) { err.textContent = 'Please fill in all fields.'; return; }

  const users = getUsers();
  if (!users[username]) { err.textContent = 'Username not found. Please sign up first.'; return; }
  if (users[username].password !== hashish(password)) { err.textContent = 'Incorrect password.'; return; }

  currentUser = { username, name: users[username].name };
  saveSession();
  bootApp();
}

function handleSignup() {
  const name     = document.getElementById('signup-name').value.trim();
  const username = document.getElementById('signup-username').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  const err      = document.getElementById('signup-error');
  err.textContent = '';

  if (!name || !username || !password) { err.textContent = 'All fields are required.'; return; }
  if (username.length < 3) { err.textContent = 'Username must be at least 3 characters.'; return; }
  if (password.length < 6) { err.textContent = 'Password must be at least 6 characters.'; return; }
  if (!/^[a-z0-9_]+$/.test(username)) { err.textContent = 'Username: letters, numbers, _ only.'; return; }

  const users = getUsers();
  if (users[username]) { err.textContent = 'Username already taken.'; return; }

  users[username] = { name, password: hashish(password) };
  saveUsers(users);

  currentUser = { username, name };
  saveSession();

  // Seed personal details with their name
  setUserData('personal', { name, dob: '', email: '', phone: '', occupation: '', location: '', about: '' });
  bootApp();
}

function handleLogout() {
  clearSession();
  currentUser = null;
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  switchTab('login');
}

// Minimal hash — not cryptographic, just obfuscation for local storage
function hashish(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h.toString(36) + str.length;
}

// ===== BOOT APP =====
function bootApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');

  // Sidebar info
  document.getElementById('sidebar-avatar').textContent = currentUser.name[0].toUpperCase();
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-handle').textContent = '@' + currentUser.username;

  updateTopbar();
  navigate('dashboard');
}

function updateTopbar() {
  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('topbar-greeting').textContent = `${greeting}, ${currentUser.name.split(' ')[0]}.`;
  document.getElementById('topbar-date').textContent = now.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ===== NAVIGATION =====
function navigate(section) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`section-${section}`).classList.remove('hidden');

  // Update nav
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.section === section);
  });

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.add('hidden');
  }

  // Render
  if (section === 'dashboard') renderDashboard();
  else if (section === 'daily-tasks') renderTasks();
  else if (section === 'activity') renderActivities();
  else if (section === 'notes') renderNotes();
  else if (section === 'personal') loadPersonal();
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  const open = sb.classList.toggle('open');
  ov.classList.toggle('hidden', !open);
}

// ===== DASHBOARD =====
function renderDashboard() {
  const tasks      = getUserData('tasks') || [];
  const activities = getUserData('activities') || [];
  const notes      = getUserData('notes') || [];
  const personal   = getUserData('personal') || {};

  document.getElementById('dash-tasks-count').textContent = tasks.filter(t => !t.done).length;
  document.getElementById('dash-activity-count').textContent = activities.length;
  document.getElementById('dash-notes-count').textContent = notes.length;

  const pFilled = Object.values(personal).filter(v => v && v.trim()).length;
  document.getElementById('dash-profile-status').textContent =
    pFilled >= 4 ? 'Complete' : pFilled > 0 ? 'Partial' : 'Incomplete';

  document.getElementById('dash-sub').textContent =
    `Welcome back, ${currentUser.name.split(' ')[0]}. Here's your life at a glance.`;

  const recentEl = document.getElementById('dash-recent-tasks');
  const recent = tasks.slice(-5).reverse();
  if (!recent.length) {
    recentEl.innerHTML = '<p class="empty-hint">No tasks yet. Start your day by adding one.</p>';
    return;
  }
  recentEl.innerHTML = recent.map(t => `
    <div class="item-card">
      <div class="item-check ${t.done ? 'checked' : ''}">${t.done ? '✓' : ''}</div>
      <div class="item-body">
        <div class="item-title ${t.done ? 'done' : ''}">${escHtml(t.title)}</div>
        <div class="item-meta">
          <span class="priority-badge priority-${t.priority}">${t.priority}</span>
          <span>${formatDate(t.createdAt)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== TASKS =====
let taskFilter = 'all';

function addTask() {
  const input = document.getElementById('task-input');
  const priority = document.getElementById('task-priority').value;
  const title = input.value.trim();
  if (!title) return;

  const tasks = getUserData('tasks') || [];
  tasks.push({ id: uid(), title, priority, done: false, createdAt: Date.now() });
  setUserData('tasks', tasks);
  input.value = '';
  renderTasks();
}

function toggleTask(id) {
  const tasks = getUserData('tasks') || [];
  const t = tasks.find(x => x.id === id);
  if (t) t.done = !t.done;
  setUserData('tasks', tasks);
  renderTasks();
}

function deleteTask(id) {
  const tasks = (getUserData('tasks') || []).filter(x => x.id !== id);
  setUserData('tasks', tasks);
  renderTasks();
}

function filterTasks(filter, btn) {
  taskFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

function renderTasks() {
  const tasks = getUserData('tasks') || [];
  const filtered = tasks.filter(t => {
    if (taskFilter === 'pending') return !t.done;
    if (taskFilter === 'done') return t.done;
    return true;
  }).reverse();

  const el = document.getElementById('tasks-list');
  if (!filtered.length) {
    el.innerHTML = '<p class="empty-hint">Nothing here. Add a task to get started.</p>';
    return;
  }
  el.innerHTML = filtered.map(t => `
    <div class="item-card">
      <div class="item-check ${t.done ? 'checked' : ''}" onclick="toggleTask('${t.id}')">${t.done ? '✓' : ''}</div>
      <div class="item-body">
        <div class="item-title ${t.done ? 'done' : ''}">${escHtml(t.title)}</div>
        <div class="item-meta">
          <span class="priority-badge priority-${t.priority}">${t.priority}</span>
          <span>${formatDate(t.createdAt)}</span>
        </div>
      </div>
      <button class="delete-btn" onclick="deleteTask('${t.id}')">✕</button>
    </div>
  `).join('');
}

// ===== ACTIVITIES =====
function addActivity() {
  const title    = document.getElementById('activity-title').value.trim();
  const category = document.getElementById('activity-category').value;
  const body     = document.getElementById('activity-body').value.trim();
  if (!title) return;

  const acts = getUserData('activities') || [];
  acts.push({ id: uid(), title, category, body, createdAt: Date.now() });
  setUserData('activities', acts);

  document.getElementById('activity-title').value = '';
  document.getElementById('activity-body').value = '';
  renderActivities();
}

function deleteActivity(id) {
  const acts = (getUserData('activities') || []).filter(x => x.id !== id);
  setUserData('activities', acts);
  renderActivities();
}

function renderActivities() {
  const acts = (getUserData('activities') || []).reverse();
  const el = document.getElementById('activity-list');
  if (!acts.length) {
    el.innerHTML = '<p class="empty-hint">No activities yet. Log something that happened today.</p>';
    return;
  }
  el.innerHTML = acts.map(a => `
    <div class="item-card">
      <div class="item-body">
        <div class="item-title">${escHtml(a.title)}</div>
        <div class="item-meta">
          <span class="cat-badge cat-${a.category}">${a.category}</span>
          <span>${formatDate(a.createdAt)}</span>
        </div>
        ${a.body ? `<div class="item-desc">${escHtml(a.body)}</div>` : ''}
      </div>
      <button class="delete-btn" onclick="deleteActivity('${a.id}')">✕</button>
    </div>
  `).join('');
}

// ===== NOTES =====
function addNote() {
  const title = document.getElementById('note-title').value.trim();
  const body  = document.getElementById('note-body').value.trim();
  if (!title && !body) return;

  const notes = getUserData('notes') || [];
  notes.push({ id: uid(), title: title || 'Untitled', body, createdAt: Date.now() });
  setUserData('notes', notes);

  document.getElementById('note-title').value = '';
  document.getElementById('note-body').value = '';
  renderNotes();
}

function deleteNote(id) {
  const notes = (getUserData('notes') || []).filter(x => x.id !== id);
  setUserData('notes', notes);
  renderNotes();
}

function renderNotes() {
  const notes = (getUserData('notes') || []).reverse();
  const el = document.getElementById('notes-list');
  if (!notes.length) {
    el.innerHTML = '<p class="empty-hint">No notes yet. Capture a thought.</p>';
    return;
  }
  el.innerHTML = notes.map(n => `
    <div class="note-card">
      <button class="note-delete" onclick="deleteNote('${n.id}')">✕</button>
      <div class="note-card-title">${escHtml(n.title)}</div>
      ${n.body ? `<div class="note-card-body">${escHtml(n.body)}</div>` : ''}
      <div class="note-card-date">${formatDate(n.createdAt)}</div>
    </div>
  `).join('');
}

// ===== PERSONAL DETAILS =====
function loadPersonal() {
  const p = getUserData('personal') || {};
  document.getElementById('p-name').value       = p.name || '';
  document.getElementById('p-dob').value        = p.dob || '';
  document.getElementById('p-email').value      = p.email || '';
  document.getElementById('p-phone').value      = p.phone || '';
  document.getElementById('p-occupation').value = p.occupation || '';
  document.getElementById('p-location').value   = p.location || '';
  document.getElementById('p-about').value      = p.about || '';
  document.getElementById('personal-save-msg').classList.add('hidden');
}

function savePersonal() {
  const p = {
    name:       document.getElementById('p-name').value.trim(),
    dob:        document.getElementById('p-dob').value,
    email:      document.getElementById('p-email').value.trim(),
    phone:      document.getElementById('p-phone').value.trim(),
    occupation: document.getElementById('p-occupation').value.trim(),
    location:   document.getElementById('p-location').value.trim(),
    about:      document.getElementById('p-about').value.trim(),
  };
  setUserData('personal', p);
  const msg = document.getElementById('personal-save-msg');
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 2500);
}

// ===== UTILITIES =====
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  if (loadSession()) {
    bootApp();
  }

  // Enter key on auth forms
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('signup-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSignup();
  });
});
