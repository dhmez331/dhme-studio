/* ═══════════════════════════════════════════════════════════
   Dhme Studio — app.js
   State Management + Init + Navigation + API
═══════════════════════════════════════════════════════════ */

const App = {

  // ─── State ─────────────────────────────────────────────
  state: {
    token:    null,
    username: null,
    isAdmin:  false,
    currentPage: 'home',
    apiBase: 'https://dhme-studio-api1.onrender.com',
  },

  // ─── Init ───────────────────────────────────────────────
  init() {
    // تحميل الإعدادات المحفوظة
    UI.loadSettings();

    // التحقق من الجلسة المحفوظة
    const savedToken    = localStorage.getItem('dhme_token');
    const savedUsername = localStorage.getItem('dhme_username');
    const savedAdmin    = localStorage.getItem('dhme_is_admin');

    if (savedToken && savedUsername) {
      this.state.token    = savedToken;
      this.state.username = savedUsername;
      this.state.isAdmin  = savedAdmin === 'true';
      this.showApp();
    } else {
      this.showLogin();
    }

    // إخفاء شاشة التحميل
    setTimeout(() => {
      document.getElementById('loading-screen').classList.add('hidden');
    }, 1200);
  },

  // ─── Login ──────────────────────────────────────────────
  async login() {
    const username = document.getElementById('login-username').value.trim();
    const code     = document.getElementById('login-code').value.trim();

    if (!username) return UI.toast('أدخل اسمك', 'error');
    if (!code)     return UI.toast('أدخل كود الدعوة', 'error');

    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    try {
      const res = await fetch(
        `${this.state.apiBase}/api/chat/login?invite_code=${encodeURIComponent(code)}&username=${encodeURIComponent(username)}`,
        { method: 'POST' }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'فشل تسجيل الدخول');
      }

      const data = await res.json();

      // حفظ الجلسة
      this.state.token    = data.token;
      this.state.username = data.username;
      this.state.isAdmin  = data.is_admin;

      localStorage.setItem('dhme_token',    data.token);
      localStorage.setItem('dhme_username', data.username);
      localStorage.setItem('dhme_is_admin', data.is_admin);

      UI.toast(`أهلاً ${data.username}! 🎉`, 'success');
      this.showApp();

    } catch (e) {
      UI.toast(e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>دخول</span><span>🚀</span>';
    }
  },

  // ─── Logout ─────────────────────────────────────────────
  logout() {
    localStorage.removeItem('dhme_token');
    localStorage.removeItem('dhme_username');
    localStorage.removeItem('dhme_is_admin');
    this.state.token    = null;
    this.state.username = null;
    this.state.isAdmin  = false;
    this.showLogin();
    UI.toast('تم تسجيل الخروج', 'info');
  },

  // ─── Show/Hide ──────────────────────────────────────────
  showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  },

  showApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    // اسم المستخدم في الـ Sidebar
    const el = document.getElementById('sidebar-username');
    if (el) el.textContent = this.state.username;

    // إظهار زر الإدارة إذا Admin
    const adminNav = document.getElementById('admin-nav-item');
    if (adminNav) adminNav.style.display = this.state.isAdmin ? 'flex' : 'none';

    // تحميل الصفحة الرئيسية
    this.navigate('home');

    // تحديث الترحيب
    const greeting = document.getElementById('home-greeting');
    if (greeting) {
      const hour = new Date().getHours();
      const timeGreet = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء الخير';
      greeting.textContent = `${timeGreet}، ${this.state.username} 👋`;
    }
  },

  // ─── Navigation ─────────────────────────────────────────
  navigate(page) {
    // إخفاء كل الصفحات
    document.querySelectorAll('[id^="page-"]').forEach(p => {
      p.style.display = 'none';
    });

    // إظهار الصفحة المطلوبة
    const target = document.getElementById(`page-${page}`);
    if (target) target.style.display = '';

    // تحديث الـ Active في Sidebar
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === page) item.classList.add('active');
    });

    this.state.currentPage = page;

    // تهيئة الصفحة عند الدخول
    if (page === 'prompts') Prompts.init();
    if (page === 'admin')   Admin.init();
    if (page === 'history') History.init();
  },

  // ─── API Call (مركزي) ────────────────────────────────────
  async api(endpoint, options = {}) {
    const url = `${this.state.apiBase}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.state.token}`,
      ...options.headers
    };

    // إذا FormData لا نضيف Content-Type
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      this.logout();
      throw new Error('انتهت الجلسة');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'حدث خطأ' }));
      throw new Error(err.detail || 'حدث خطأ');
    }

    return res;
  },

  // ─── API JSON ────────────────────────────────────────────
  async apiJSON(endpoint, data = {}, method = 'POST') {
    const res = await this.api(endpoint, {
      method,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ─── API Blob (للصور والصوت) ──────────────────────────────
  async apiBlob(endpoint, data = {}, method = 'POST') {
    const res = await this.api(endpoint, {
      method,
      body: JSON.stringify(data)
    });
    return res.blob();
  },

  // ─── API FormData ─────────────────────────────────────────
  async apiForm(endpoint, formData) {
    const res = await this.api(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}
    });
    return res.json();
  },
};

// ─── Admin Module ────────────────────────────────────────
const Admin = {
  init() {
    if (!App.state.isAdmin) {
      App.navigate('home');
      UI.toast('هذه الصفحة للمدير فقط', 'error');
      return;
    }
    this.loadInviteCodes();
  },

  uploadLogo(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      localStorage.setItem('dhme_logo', e.target.result);
      document.querySelectorAll('.logo-img').forEach(img => {
        img.src = e.target.result;
      });
      document.getElementById('current-logo').src = e.target.result;
      UI.toast('تم تحديث اللوقو ✅', 'success');
    };
    reader.readAsDataURL(file);
  },

  loadInviteCodes() {
    const container = document.getElementById('invite-codes-list');
    if (!container) return;

    const codes = [
      { code: 'dhme_family_001', user: 'family1', type: 'عائلة' },
      { code: 'dhme_family_002', user: 'family2', type: 'عائلة' },
      { code: 'dhme_friend_001', user: 'friend1', type: 'صديق' },
      { code: 'dhme_friend_002', user: 'friend2', type: 'صديق' },
    ];

    container.innerHTML = codes.map(c => `
      <div class="card" style="display:flex; justify-content:space-between;
        align-items:center; margin-bottom:8px; padding:12px 16px;">
        <div>
          <span class="badge">${c.type}</span>
          <code style="margin-inline-start:10px; font-family:var(--font-mono);
            color:var(--accent-1);">${c.code}</code>
        </div>
        <span style="color:var(--text-muted); font-size:0.85rem;">${c.user}</span>
      </div>
    `).join('');
  },

  generateCode() {
    const code = 'dhme_' + Math.random().toString(36).substr(2, 8);
    UI.toast(`كود جديد: ${code}`, 'info');
  }
};

// ─── Start App ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());

// Enter key للـ Login
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.getElementById('login-page')?.style.display !== 'none') {
    App.login();
  }
});/* ═══════════════════════════════════════════════════════════
   Dhme Studio — app.js
   State Management + Init + Navigation + API
═══════════════════════════════════════════════════════════ */

const App = {

  // ─── State ─────────────────────────────────────────────
  state: {
    token:    null,
    username: null,
    isAdmin:  false,
    currentPage: 'home',
    apiBase: 'https://dhme-studio-api1.onrender.com',
  },

  // ─── Init ───────────────────────────────────────────────
  init() {
    // تحميل الإعدادات المحفوظة
    UI.loadSettings();

    // التحقق من الجلسة المحفوظة
    const savedToken    = localStorage.getItem('dhme_token');
    const savedUsername = localStorage.getItem('dhme_username');
    const savedAdmin    = localStorage.getItem('dhme_is_admin');

    if (savedToken && savedUsername) {
      this.state.token    = savedToken;
      this.state.username = savedUsername;
      this.state.isAdmin  = savedAdmin === 'true';
      this.showApp();
    } else {
      this.showLogin();
    }

    // إخفاء شاشة التحميل
    setTimeout(() => {
      document.getElementById('loading-screen').classList.add('hidden');
    }, 1200);
  },

  // ─── Login ──────────────────────────────────────────────
  async login() {
    const username = document.getElementById('login-username').value.trim();
    const code     = document.getElementById('login-code').value.trim();

    if (!username) return UI.toast('أدخل اسمك', 'error');
    if (!code)     return UI.toast('أدخل كود الدعوة', 'error');

    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    try {
      const res = await fetch(
        `${this.state.apiBase}/api/chat/login?invite_code=${encodeURIComponent(code)}&username=${encodeURIComponent(username)}`,
        { method: 'POST' }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'فشل تسجيل الدخول');
      }

      const data = await res.json();

      // حفظ الجلسة
      this.state.token    = data.token;
      this.state.username = data.username;
      this.state.isAdmin  = data.is_admin;

      localStorage.setItem('dhme_token',    data.token);
      localStorage.setItem('dhme_username', data.username);
      localStorage.setItem('dhme_is_admin', data.is_admin);

      UI.toast(`أهلاً ${data.username}! 🎉`, 'success');
      this.showApp();

    } catch (e) {
      UI.toast(e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>دخول</span><span>🚀</span>';
    }
  },

  // ─── Logout ─────────────────────────────────────────────
  logout() {
    localStorage.removeItem('dhme_token');
    localStorage.removeItem('dhme_username');
    localStorage.removeItem('dhme_is_admin');
    this.state.token    = null;
    this.state.username = null;
    this.state.isAdmin  = false;
    this.showLogin();
    UI.toast('تم تسجيل الخروج', 'info');
  },

  // ─── Show/Hide ──────────────────────────────────────────
  showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  },

  showApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    // اسم المستخدم في الـ Sidebar
    const el = document.getElementById('sidebar-username');
    if (el) el.textContent = this.state.username;

    // إظهار زر الإدارة إذا Admin
    const adminNav = document.getElementById('admin-nav-item');
    if (adminNav) adminNav.style.display = this.state.isAdmin ? 'flex' : 'none';

    // تحميل الصفحة الرئيسية
    this.navigate('home');

    // تحديث الترحيب
    const greeting = document.getElementById('home-greeting');
    if (greeting) {
      const hour = new Date().getHours();
      const timeGreet = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء الخير';
      greeting.textContent = `${timeGreet}، ${this.state.username} 👋`;
    }
  },

  // ─── Navigation ─────────────────────────────────────────
  navigate(page) {
    // إخفاء كل الصفحات
    document.querySelectorAll('[id^="page-"]').forEach(p => {
      p.style.display = 'none';
    });

    // إظهار الصفحة المطلوبة
    const target = document.getElementById(`page-${page}`);
    if (target) target.style.display = '';

    // تحديث الـ Active في Sidebar
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === page) item.classList.add('active');
    });

    this.state.currentPage = page;

    // تهيئة الصفحة عند الدخول
    if (page === 'prompts') Prompts.init();
    if (page === 'admin')   Admin.init();
    if (page === 'history') History.init();
  },

  // ─── API Call (مركزي) ────────────────────────────────────
  async api(endpoint, options = {}) {
    const url = `${this.state.apiBase}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.state.token}`,
      ...options.headers
    };

    // إذا FormData لا نضيف Content-Type
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      this.logout();
      throw new Error('انتهت الجلسة');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'حدث خطأ' }));
      throw new Error(err.detail || 'حدث خطأ');
    }

    return res;
  },

  // ─── API JSON ────────────────────────────────────────────
  async apiJSON(endpoint, data = {}, method = 'POST') {
    const res = await this.api(endpoint, {
      method,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ─── API Blob (للصور والصوت) ──────────────────────────────
  async apiBlob(endpoint, data = {}, method = 'POST') {
    const res = await this.api(endpoint, {
      method,
      body: JSON.stringify(data)
    });
    return res.blob();
  },

  // ─── API FormData ─────────────────────────────────────────
  async apiForm(endpoint, formData) {
    const res = await this.api(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}
    });
    return res.json();
  },
};

// ─── Admin Module ────────────────────────────────────────
const Admin = {
  init() {
    if (!App.state.isAdmin) {
      App.navigate('home');
      UI.toast('هذه الصفحة للمدير فقط', 'error');
      return;
    }
    this.loadInviteCodes();
  },

  uploadLogo(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      localStorage.setItem('dhme_logo', e.target.result);
      document.querySelectorAll('.logo-img').forEach(img => {
        img.src = e.target.result;
      });
      document.getElementById('current-logo').src = e.target.result;
      UI.toast('تم تحديث اللوقو ✅', 'success');
    };
    reader.readAsDataURL(file);
  },

  loadInviteCodes() {
    const container = document.getElementById('invite-codes-list');
    if (!container) return;

    const codes = [
      { code: 'dhme_family_001', user: 'family1', type: 'عائلة' },
      { code: 'dhme_family_002', user: 'family2', type: 'عائلة' },
      { code: 'dhme_friend_001', user: 'friend1', type: 'صديق' },
      { code: 'dhme_friend_002', user: 'friend2', type: 'صديق' },
    ];

    container.innerHTML = codes.map(c => `
      <div class="card" style="display:flex; justify-content:space-between;
        align-items:center; margin-bottom:8px; padding:12px 16px;">
        <div>
          <span class="badge">${c.type}</span>
          <code style="margin-inline-start:10px; font-family:var(--font-mono);
            color:var(--accent-1);">${c.code}</code>
        </div>
        <span style="color:var(--text-muted); font-size:0.85rem;">${c.user}</span>
      </div>
    `).join('');
  },

  generateCode() {
    const code = 'dhme_' + Math.random().toString(36).substr(2, 8);
    UI.toast(`كود جديد: ${code}`, 'info');
  }
};

// ─── Start App ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());

// Enter key للـ Login
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.getElementById('login-page')?.style.display !== 'none') {
    App.login();
  }
});