/* ═══════════════════════════════════════════════════════════
   Dhme Studio — ui.js
   Theme + Style + Language + Toast + Helpers
═══════════════════════════════════════════════════════════ */

const UI = {

  // ─── Load Saved Settings ────────────────────────────────
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

    // تحديث الـ Active في settings
    this.updateStyleActive(style);
  },

  // ─── Style (5 أساليب) ───────────────────────────────────
  setStyle(style, el = null) {
    localStorage.setItem('dhme_style', style);
    this.applyStyle(style);
    this.updateStyleActive(style);
    if (el) UI.toast(`تم تطبيق الأسلوب ✅`, 'success');
  },

  applyStyle(style) {
    document.documentElement.setAttribute('data-style', style);
  },

  updateStyleActive(style) {
    document.querySelectorAll('.style-option').forEach(opt => {
      opt.classList.remove('active');
    });
    const styles = ['cosmic','desert','neon','ocean','rose'];
    const idx    = styles.indexOf(style);
    const opts   = document.querySelectorAll('.style-option');
    if (opts[idx]) opts[idx].classList.add('active');
  },

  // ─── Theme (Dark / Light) ───────────────────────────────
  setTheme(theme) {
    localStorage.setItem('dhme_theme', theme);
    this.applyTheme(theme);
    UI.toast(theme === 'dark' ? '🌙 الثيم الداكن' : '☀️ الثيم الفاتح', 'info');
  },

  applyTheme(theme) {
    // الأساليب الداكنة والفاتحة
    const darkStyles  = ['cosmic', 'desert', 'neon'];
    const lightStyles = ['ocean', 'rose'];

    const currentStyle = document.documentElement.getAttribute('data-style');

    if (theme === 'light' && darkStyles.includes(currentStyle)) {
      this.applyStyle('ocean');
      localStorage.setItem('dhme_style', 'ocean');
    } else if (theme === 'dark' && lightStyles.includes(currentStyle)) {
      this.applyStyle('cosmic');
      localStorage.setItem('dhme_style', 'cosmic');
    }
  },

  // ─── Language ───────────────────────────────────────────
  setLang(lang) {
    localStorage.setItem('dhme_lang', lang);
    this.applyLang(lang);
    UI.toast(lang === 'ar' ? '🇸🇦 العربية' : '🇺🇸 English', 'info');
  },

  applyLang(lang) {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  },

  // ─── Toast ──────────────────────────────────────────────
  toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ─── Modal ──────────────────────────────────────────────
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
        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button class="btn btn-secondary" onclick="UI.closeModal()">إلغاء</button>
          ${onConfirm ? `<button class="btn btn-primary" onclick="(${onConfirm})(); UI.closeModal()">تأكيد</button>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });
  },

  closeModal() {
    const modal = document.getElementById('global-modal');
    if (modal) modal.remove();
  },

  // ─── Loading State ──────────────────────────────────────
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

  // ─── Format Markdown (بسيط) ─────────────────────────────
  formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,     '<em>$1</em>')
      .replace(/`(.*?)`/g,       '<code style="background:var(--bg-hover);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);">$1</code>')
      .replace(/\n/g,            '<br>');
  },

  // ─── Copy to Clipboard ──────────────────────────────────
  async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.toast('تم النسخ ✅', 'success');
    } catch {
      this.toast('فشل النسخ', 'error');
    }
  },

  // ─── Download ───────────────────────────────────────────
  download(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  },

  // ─── Download Blob ───────────────────────────────────────
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    this.download(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};