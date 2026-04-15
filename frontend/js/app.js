/* ═══════════════════════════════════════════════════════════
   Dhme Studio — app.js
   State Management + Init + Navigation + API
═══════════════════════════════════════════════════════════ */

const App = {

  // ─── State ─────────────────────────────────────────────
  state: {
    token:       null,
    username:    null,
    isAdmin:     false,
    currentPage: 'home',
    apiBase:     'https://dhme-studio-api1.onrender.com',
    mobileSidebarOpen: false,
  },

  toast(message, type = 'info') {
    if (window.UI && typeof UI.toast === 'function') {
      UI.toast(message, type);
      return;
    }
    // fallback آمن إذا ui.js ما انحمّل
    console[type === 'error' ? 'error' : 'log'](message);
  },

  // ─── Init ───────────────────────────────────────────────
  init() {
    // تحميل الإعدادات
    try {
      if (window.UI && typeof UI.loadSettings === 'function') UI.loadSettings();
    } catch(e) { console.warn('UI load error:', e); }

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
      this.loadRememberedLogin();
    }

    // إخفاء شاشة التحميل
    setTimeout(() => {
      const screen = document.getElementById('loading-screen');
      if (screen) screen.classList.add('hidden');
    }, 800);

    window.addEventListener('resize', () => {
      if (!this.isMobile()) this.closeMobileSidebar();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeMobileSidebar();
    });
  },

  isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
  },

  toggleMobileSidebar() {
    if (!this.isMobile()) return;
    this.state.mobileSidebarOpen = !this.state.mobileSidebarOpen;
    document.body.classList.toggle('mobile-sidebar-open', this.state.mobileSidebarOpen);
  },

  closeMobileSidebar() {
    this.state.mobileSidebarOpen = false;
    document.body.classList.remove('mobile-sidebar-open');
  },

  updateMobileTopbar(page) {
    const map = {
      home: 'الرئيسية',
      chat: 'المحادثة الذكية',
      image: 'توليد الصور',
      voice: 'الصوت والتحويل',
      video: 'توليد الفيديو',
      analyze: 'تحليل الملفات',
      prompts: 'مكتبة البرومبتات',
      history: 'السجل',
      settings: 'الإعدادات',
      admin: 'لوحة الإدارة',
    };
    const el = document.getElementById('mobile-topbar-title');
    if (el) el.textContent = map[page] || 'Dhme Studio';
  },

  // ─── Login ──────────────────────────────────────────────
  async login(event = null) {
    if (event?.preventDefault) event.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const code     = document.getElementById('login-code').value.trim();
    const remember = document.getElementById('login-remember')?.checked ?? true;

    if (!username) {
      this.setLoginStatus('أدخل اسم المستخدم أولاً', 'error');
      return this.toast('أدخل اسمك', 'error');
    }
    if (!code) {
      this.setLoginStatus('أدخل كود الدعوة أولاً', 'error');
      return this.toast('أدخل كود الدعوة', 'error');
    }

    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';
    this.setLoginStatus('جاري تسجيل الدخول...', 'info');

    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(
        `${this.state.apiBase}/api/chat/login?invite_code=${encodeURIComponent(code)}&username=${encodeURIComponent(username)}`,
        { method: 'POST', signal: ctrl.signal }
      );
      clearTimeout(timeout);

      if (!res.ok) {
        let msg = 'فشل تسجيل الدخول';
        try {
          const err = await res.json();
          msg = err.detail || err.message || msg;
        } catch (_) {}
        throw new Error(msg);
      }

      const data = await res.json();

      this.state.token    = data.token;
      this.state.username = data.username;
      this.state.isAdmin  = data.is_admin;

      localStorage.setItem('dhme_token',    data.token);
      localStorage.setItem('dhme_username', data.username);
      localStorage.setItem('dhme_is_admin', data.is_admin);
      this.saveRememberedLogin(username, code, remember);

      this.setLoginStatus(`تم تسجيل الدخول بنجاح كـ ${data.username}`, 'success');
      this.toast(`أهلاً ${data.username}! 🎉`, 'success');
      this.showApp();

    } catch (e) {
      const msg = e?.name === 'AbortError'
        ? 'انتهت مهلة الاتصال بالسيرفر، حاول مرة أخرى'
        : (e?.message || 'تعذر تسجيل الدخول');
      this.setLoginStatus(msg, 'error');
      this.toast(msg, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>دخول</span><span>🚀</span>';
    }
  },

  setLoginStatus(message = '', type = 'info') {
    const el = document.getElementById('login-status');
    if (!el) return;
    if (!message) {
      el.style.display = 'none';
      el.textContent = '';
      return;
    }
    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      info: 'var(--text-secondary)'
    };
    el.style.display = 'block';
    el.style.color = colors[type] || colors.info;
    el.textContent = message;
  },

  toggleLoginCodeVisibility() {
    const codeInput = document.getElementById('login-code');
    const toggleBtn = document.getElementById('login-toggle-code');
    if (!codeInput || !toggleBtn) return;
    const isHidden = codeInput.type === 'password';
    codeInput.type = isHidden ? 'text' : 'password';
    toggleBtn.textContent = isHidden ? '🙈' : '👁️';
    toggleBtn.title = isHidden ? 'إخفاء الكود' : 'إظهار الكود';
  },

  saveRememberedLogin(username, inviteCode, remember) {
    if (remember) {
      localStorage.setItem('dhme_login_username', username);
      localStorage.setItem('dhme_login_code', inviteCode);
      localStorage.setItem('dhme_login_remember', 'true');
      return;
    }
    localStorage.removeItem('dhme_login_username');
    localStorage.removeItem('dhme_login_code');
    localStorage.setItem('dhme_login_remember', 'false');
  },

  loadRememberedLogin() {
    const remember = localStorage.getItem('dhme_login_remember');
    const remembered = remember !== 'false';
    const usernameEl = document.getElementById('login-username');
    const codeEl = document.getElementById('login-code');
    const rememberEl = document.getElementById('login-remember');
    if (rememberEl) rememberEl.checked = remembered;
    if (!remembered) return;
    if (usernameEl) usernameEl.value = localStorage.getItem('dhme_login_username') || '';
    if (codeEl) codeEl.value = localStorage.getItem('dhme_login_code') || '';
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
    this.toast('تم تسجيل الخروج', 'info');
  },

  // ─── Show/Hide ──────────────────────────────────────────
  showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    this.closeMobileSidebar();
    this.loadRememberedLogin();
    this.setLoginStatus('');
  },

  applyLogo(logoData) {
    if (!logoData) return;

    document.querySelectorAll('.sidebar-logo img:not(.brand-wordmark), .logo-img, #current-logo').forEach(img => {
      img.src = logoData;
      img.style.display = 'block';
    });

    const sidebarLogoDiv = document.querySelector('.sidebar-logo');
    if (sidebarLogoDiv) {
      const iconContainer = sidebarLogoDiv.querySelector('div');
      if (iconContainer) {
        iconContainer.innerHTML = `<img src="${logoData}" style="width:36px;height:36px;border-radius:8px;" />`;
      }
    }
  },

  showApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    this.closeMobileSidebar();

    const el = document.getElementById('sidebar-username');
    if (el) el.textContent = this.state.username;

    const adminNav = document.getElementById('admin-nav-item');
    if (adminNav) adminNav.style.display = this.state.isAdmin ? 'flex' : 'none';

    // ── تحديث اللوقو من localStorage ──
    const savedLogo = localStorage.getItem('dhme_logo');
    if (savedLogo) {
      this.applyLogo(savedLogo);
    }

    this.navigate('home');

    const greeting = document.getElementById('home-greeting');
    if (greeting) {
      const hour = new Date().getHours();
      const timeGreet = hour < 12 ? 'صباح الخير' : 'مساء الخير';
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

    // Active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === page) item.classList.add('active');
    });

    this.state.currentPage = page;
    this.closeMobileSidebar();
    this.updateMobileTopbar(page);

    // تهيئة الصفحات
    if (page === 'chat')    try { Chat.init(); }    catch(e) {}
    if (page === 'prompts') try { Prompts.init(); } catch(e) {}
    if (page === 'admin')   try { Admin.init(); }   catch(e) {}
    if (page === 'history') try { History.init(); } catch(e) {}
  },

  // ─── API (مركزي) ────────────────────────────────────────
  async api(endpoint, options = {}) {
    const url = `${this.state.apiBase}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.state.token}`,
      ...options.headers
    };

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
      const detail = err?.detail;
      if (detail && typeof detail === 'object') {
        const type = detail.type ? `[${detail.type}] ` : '';
        throw new Error(`${type}${detail.message || 'حدث خطأ'}`);
      }
      throw new Error(detail || err?.message || 'حدث خطأ');
    }

    return res;
  },

  async apiJSON(endpoint, data = {}, method = 'POST', extraOptions = {}) {
    const res = await this.api(endpoint, {
      method,
      body: JSON.stringify(data),
      ...extraOptions
    });
    return res.json();
  },

  async apiBlob(endpoint, data = {}, method = 'POST', extraOptions = {}) {
    const res = await this.api(endpoint, {
      method,
      body: JSON.stringify(data),
      ...extraOptions
    });
    return res.blob();
  },

  async apiForm(endpoint, formData) {
    const res = await this.api(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}
    });
    return res.json();
  },
};

// ─── Admin ───────────────────────────────────────────────
const Admin = {

  init() {
    if (!App.state.isAdmin) {
      App.navigate('home');
      App.toast('هذه الصفحة للمدير فقط', 'error');
      return;
    }
    this.loadStats();
    this.loadInviteCodes();
    this.loadLogo();
  },

  loadLogo() {
    const logo = localStorage.getItem('dhme_logo');
    const el = document.getElementById('current-logo');
    if (logo && el) { el.src = logo; el.style.display = 'block'; }
  },

  uploadLogo(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return App.toast('يجب أن يكون الملف صورة', 'error');
    if (file.size > 2 * 1024 * 1024) return App.toast('الصورة أكبر من 2MB', 'error');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 200;
        let w = img.width, h = img.height;
        if (w > h && w > MAX) { h = h * MAX / w; w = MAX; }
        else if (h > MAX) { w = w * MAX / h; h = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/png', 0.8);

        // حفظ في localStorage
        localStorage.setItem('dhme_logo', compressed);

        // تحديث كل عناصر اللوقو في الصفحة فوراً
        App.applyLogo(compressed);

        App.toast('تم تحديث اللوقو ✅', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  

  loadStats() {
    const history = History.get();
    const today   = new Date().toLocaleDateString('ar-SA');

    const todayItems = history.filter(h => h.date === today);
    const chats  = todayItems.filter(h => h.type === 'chat').length;
    const images = todayItems.filter(h => h.type === 'image').length;

    const codes = this.getCodes();
    document.getElementById('stat-users').textContent  = codes.length;
    document.getElementById('stat-chats').textContent  = chats;
    document.getElementById('stat-images').textContent = images;
  },

  getCodes() {
    try {
      return JSON.parse(localStorage.getItem('dhme_invite_codes') || '[]');
    } catch { return []; }
  },

  saveCodes(codes) {
    localStorage.setItem('dhme_invite_codes', JSON.stringify(codes));
  },

  loadInviteCodes() {
    const container = document.getElementById('invite-codes-list');
    if (!container) return;

    // كودات افتراضية + المحفوظة
    const defaultCodes = [
      { code: 'dhme_family_001', user: 'family1', type: 'عائلة' },
      { code: 'dhme_family_002', user: 'family2', type: 'عائلة' },
      { code: 'dhme_friend_001', user: 'friend1', type: 'صديق' },
      { code: 'dhme_friend_002', user: 'friend2', type: 'صديق' },
    ];

    const saved = this.getCodes();
    const all   = [...defaultCodes, ...saved];

    container.innerHTML = all.map(c => `
      <div class="card" style="display:flex;justify-content:space-between;
        align-items:center;margin-bottom:8px;padding:12px 16px;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span class="badge">${c.type}</span>
          <code style="font-family:var(--font-mono);color:var(--accent-1);
            font-size:0.85rem;">${c.code}</code>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:var(--text-muted);font-size:0.85rem;">${c.user}</span>
          <button class="btn btn-ghost" style="padding:4px 8px;font-size:0.75rem;"
            onclick="UI.copy('${c.code}')">نسخ</button>
          ${c.custom ? `
            <button class="btn btn-ghost" style="padding:4px 8px;font-size:0.75rem;color:#ef4444;"
              onclick="Admin.deleteCode('${c.code}')">حذف</button>` : ''}
        </div>
      </div>`).join('');
  },

  generateCode() {
    UI.showModal(
      '➕ كود دعوة جديد',
      `<div style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label class="form-label">اسم المستخدم</label>
          <input id="new-code-user" class="input" placeholder="مثال: احمد، سارة..." />
        </div>
        <div class="form-group">
          <label class="form-label">النوع</label>
          <select id="new-code-type" class="input" style="padding:10px 12px;">
            <option value="عائلة">عائلة</option>
            <option value="صديق">صديق</option>
            <option value="ضيف">ضيف</option>
          </select>
        </div>
      </div>`,
      () => {
        const user = document.getElementById('new-code-user').value.trim();
        const type = document.getElementById('new-code-type').value;
        if (!user) return App.toast('أدخل اسم المستخدم', 'error');
        const code = 'dhme_' + Math.random().toString(36).substr(2, 8);
        const codes = this.getCodes();
        codes.push({ code, user, type, custom: true });
        this.saveCodes(codes);
        this.loadInviteCodes();
        App.toast(`تم إنشاء الكود: ${code}`, 'success');
      }
    );
  },

  deleteCode(code) {
    const codes = this.getCodes().filter(c => c.code !== code);
    this.saveCodes(codes);
    this.loadInviteCodes();
    App.toast('تم حذف الكود', 'info');
  },
};
// ─── Enter key للـ Login ─────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const loginPage = document.getElementById('login-page');
    if (loginPage && loginPage.style.display !== 'none') {
      const active = document.activeElement;
      if (active && active.id === 'login-code') {
        e.preventDefault();
      }
      App.login();
    }
  }
});