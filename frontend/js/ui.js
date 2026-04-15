const UI = {

  loadSettings() {
    const style = localStorage.getItem('dhme_style') || 'cosmic';
    const theme = localStorage.getItem('dhme_theme') || 'dark';
    const lang  = localStorage.getItem('dhme_lang')  || 'ar';
    const logo  = localStorage.getItem('dhme_logo');

    this.applyStyle(style);
    this.applyTheme(theme);
    this.applyLang(lang);
    if (logo) {
      document.querySelectorAll('.logo-img').forEach(img => img.src = logo);
    }
    this.updateStyleActive(style);
    this.updateThemeActive(theme);
  },

  // ─── Style ───────────────────────────────────────────
  setStyle(style, el = null) {
    localStorage.setItem('dhme_style', style);
    this.applyStyle(style);
    this.updateStyleActive(style);
    if (el) this.toast('تم تطبيق الأسلوب ✅', 'success');
  },

  applyStyle(style) {
    document.documentElement.setAttribute('data-style', style);
  },

  updateStyleActive(style) {
    document.querySelectorAll('.style-option').forEach((opt, i) => {
      opt.classList.remove('active');
    });
    const styles = ['cosmic','desert','neon','ocean','rose'];
    const idx = styles.indexOf(style);
    const opts = document.querySelectorAll('.style-option');
    if (opts[idx]) opts[idx].classList.add('active');
  },

  // ─── Theme ───────────────────────────────────────────
  setTheme(theme) {
    localStorage.setItem('dhme_theme', theme);
    this.applyTheme(theme);
    this.updateThemeActive(theme);
    this.toast(theme === 'dark' ? '🌙 الثيم الداكن' : '☀️ الثيم الفاتح', 'info');
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.updateBrandAssets(theme);
  },

  updateBrandAssets(theme) {
    const isLight = theme === 'light';
    const iconPath = isLight ? '/logo-wordmark-light.png' : '/logo-wordmark-dark.png';
    const favicon = document.getElementById('theme-favicon');
    const appleTouch = document.getElementById('theme-apple-touch-icon');
    if (favicon) favicon.setAttribute('href', iconPath);
    if (appleTouch) appleTouch.setAttribute('href', iconPath);
  },

  updateThemeActive(theme) {
    document.getElementById('theme-dark')?.classList.toggle('btn-primary', theme === 'dark');
    document.getElementById('theme-dark')?.classList.toggle('btn-secondary', theme !== 'dark');
    document.getElementById('theme-light')?.classList.toggle('btn-primary', theme === 'light');
    document.getElementById('theme-light')?.classList.toggle('btn-secondary', theme !== 'light');
  },

  // ─── Language ─────────────────────────────────────────
  setLang(lang) {
    localStorage.setItem('dhme_lang', lang);
    this.applyLang(lang);
    this.translateUI(lang);
    this.toast(lang === 'ar' ? '🇸🇦 العربية' : '🇺🇸 English', 'info');
  },

  applyLang(lang) {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  },

  translateUI(lang) {
    const translations = {
      ar: {
        'nav-home':    'الرئيسية',
        'nav-chat':    'المحادثة',
        'nav-image':   'توليد الصور',
        'nav-voice':   'الصوت',
        'nav-video':   'الفيديو',
        'nav-analyze': 'تحليل الملفات',
        'nav-prompts': 'البرومبتات',
        'nav-history': 'السجل',
        'nav-settings':'الإعدادات',
        'nav-admin':   'لوحة الإدارة',
        'nav-logout':  'خروج',
      },
      en: {
        'nav-home':    'Home',
        'nav-chat':    'Chat',
        'nav-image':   'Image Gen',
        'nav-voice':   'Voice',
        'nav-video':   'Video',
        'nav-analyze': 'Analyze',
        'nav-prompts': 'Prompts',
        'nav-history': 'History',
        'nav-settings':'Settings',
        'nav-admin':   'Admin',
        'nav-logout':  'Logout',
      }
    };

    const t = translations[lang];

    // ترجمة الـ nav labels
    document.querySelectorAll('[data-translate]').forEach(el => {
      const key = el.dataset.translate;
      if (t[key]) el.textContent = t[key];
    });

    // ترجمة العناصر الثابتة
    const staticTranslations = {
      ar: {
        'chat-input':          'اكتب رسالتك هنا...',
        'image-prompt':        'صف الصورة اللي تبيها...',
        'tts-text':            'اكتب النص...',
        'analyze-prompt':      'ماذا تريد أن تعرف عن الملف؟ (اختياري)',
        'lyrics-theme':        'مثال: الوطن والانتماء، الأم، الصداقة...',
        'commercial-product':  'مثال: مطعم برغر الرياض، عطر ليلى...',
      },
      en: {
        'chat-input':          'Type your message here...',
        'image-prompt':        'Describe the image you want...',
        'tts-text':            'Type the text...',
        'analyze-prompt':      'What do you want to know about this file? (optional)',
        'lyrics-theme':        'Example: patriotism, mother, friendship...',
        'commercial-product':  'Example: burger restaurant, perfume, app...',
      }
    };

    const st = staticTranslations[lang];
    Object.entries(st).forEach(([id, placeholder]) => {
      const el = document.getElementById(id);
      if (el) el.placeholder = placeholder;
    });

    const setText = (selector, value) => {
      const el = document.querySelector(selector);
      if (el && value) el.textContent = value;
    };

    // ترجمة عناوين وأوصاف الصفحة الرئيسية
    const homeCards = {
      ar: [
        { name: 'المحادثة الذكية', desc: 'تحدث مع أذكى نماذج AI — مع بحث في الإنترنت' },
        { name: 'توليد الصور', desc: 'حوّل أفكارك لصور احترافية بـ FLUX و Imagen' },
        { name: 'الصوت والتحويل', desc: 'نص لصوت + تفريغ صوتي بأفضل الأصوات' },
        { name: 'توليد الفيديو', desc: 'حوّل نصك لفيديو — قريباً' },
        { name: 'تحليل الملفات', desc: 'حلّل صور وفيديو وصوت بدقة عالية' },
        { name: 'مكتبة البرومبتات', desc: 'برومبتات جاهزة + أضف برومبتاتك الخاصة' },
      ],
      en: [
        { name: 'Smart Chat', desc: 'Chat with top AI models with web search support' },
        { name: 'Image Generation', desc: 'Turn your ideas into pro images with FLUX and Imagen' },
        { name: 'Voice Tools', desc: 'Text-to-speech and speech-to-text with quality voices' },
        { name: 'Video Generation', desc: 'Turn text into video — coming soon' },
        { name: 'File Analysis', desc: 'Analyze images, video, and audio with AI' },
        { name: 'Prompt Library', desc: 'Ready prompts plus your custom prompts' },
      ]
    };

    const names = document.querySelectorAll('#page-home .tool-name');
    const descs = document.querySelectorAll('#page-home .tool-desc');
    homeCards[lang].forEach((card, i) => {
      if (names[i]) names[i].textContent = card.name;
      if (descs[i]) descs[i].textContent = card.desc;
    });

    // ترجمة العناوين الأساسية
    setText('.home-subtitle', lang === 'ar' ? 'وش تبي تسوي اليوم؟' : 'What would you like to do today?');
    setText('#page-chat .chat-title', lang === 'ar' ? '💬 المحادثة الذكية' : '💬 Smart Chat');

    const pageTitles = document.querySelectorAll('.page-title');
    const pageTitleText = lang === 'ar'
      ? ['🖼️ توليد الصور', '🎤 الصوت والتحويل', '🎬 توليد الفيديو', '🔍 تحليل الملفات', '✨ مكتبة البرومبتات', '📋 السجل والمفضلة', '⚙️ الإعدادات', '👑 لوحة الإدارة']
      : ['🖼️ Image Generation', '🎤 Voice Tools', '🎬 Video Generation', '🔍 File Analysis', '✨ Prompt Library', '📋 History & Favorites', '⚙️ Settings', '👑 Admin Panel'];
    pageTitles.forEach((el, i) => {
      if (pageTitleText[i]) el.textContent = pageTitleText[i];
    });

    // ترجمة بعض الأزرار الثابتة
    const labels = {
      ar: {
        '#image-gen-btn span:first-child': 'توليد',
        '#tts-btn span:first-child': 'توليد الصوت',
        '#lyrics-btn span:first-child': 'توليد',
        '#commercial-btn span:first-child': 'توليد الإعلان',
        '#analyze-btn span:first-child': 'تحليل الآن',
      },
      en: {
        '#image-gen-btn span:first-child': 'Generate',
        '#tts-btn span:first-child': 'Generate Audio',
        '#lyrics-btn span:first-child': 'Generate',
        '#commercial-btn span:first-child': 'Generate Ad',
        '#analyze-btn span:first-child': 'Analyze Now',
      }
    };
    Object.entries(labels[lang]).forEach(([selector, value]) => setText(selector, value));
  },

  // ─── Toast ────────────────────────────────────────────
  toast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success:'✅', error:'❌', info:'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  showModal(title, content, onConfirm = null) {
    const existing = document.getElementById('global-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'global-modal';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${title}</span>
          <button class="btn btn-ghost btn-icon" onclick="UI.closeModal()">✕</button>
        </div>
        <div style="margin-bottom:20px;">${content}</div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn btn-secondary" onclick="UI.closeModal()">إلغاء</button>
          ${onConfirm ? `<button class="btn btn-primary" onclick="(${onConfirm})();UI.closeModal()">تأكيد</button>` : ''}
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) this.closeModal(); });
  },

  closeModal() {
    document.getElementById('global-modal')?.remove();
  },

  setLoading(btnId, loading, originalHTML = null) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (loading) {
      btn._originalHTML = btn.innerHTML;
      btn.innerHTML = '<div class="spinner"></div>';
      btn.disabled = true;
    } else {
      btn.innerHTML = originalHTML || btn._originalHTML || btn.innerHTML;
      btn.disabled = false;
    }
  },

  formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,     '<em>$1</em>')
      .replace(/`(.*?)`/g,       '<code style="background:var(--bg-hover);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);">$1</code>')
      .replace(/\n/g,            '<br>');
  },

  async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.toast('تم النسخ ✅', 'success');
    } catch { this.toast('فشل النسخ', 'error'); }
  },

  download(url, filename) {
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    this.download(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};