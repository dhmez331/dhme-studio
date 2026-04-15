/* ═══════════════════════════════════════════════════════════
   Dhme Studio — chat.js
   المحادثة الذكية + التعاون بين النماذج
═══════════════════════════════════════════════════════════ */

const Chat = {

  // ─── State ──────────────────────────────────────────────
  messages:         [],
  isLoading:        false,
  useSearch:        false,
  collaborationMode: null,  // null / 'compete' / 'collaborate'
  activeRequestController: null,
  lastFailedText: null,
  sessionId: null,
  commandSelectionIndex: 0,
  slashCommands: [
    { cmd: '/help', desc: 'عرض الأوامر السريعة' },
    { cmd: '/clear', desc: 'مسح المحادثة الحالية' },
    { cmd: '/search on', desc: 'تفعيل البحث في الانترنت' },
    { cmd: '/search off', desc: 'تعطيل البحث في الانترنت' },
    { cmd: '/profile precise', desc: 'نمط دقيق ومباشر' },
    { cmd: '/model groq_qwen', desc: 'تغيير النموذج بسرعة' },
  ],

  notify(message, type = 'info') {
    if (window.App && typeof App.toast === 'function') {
      App.toast(message, type);
      return;
    }
    if (window.UI && typeof UI.toast === 'function') {
      UI.toast(message, type);
      return;
    }
    console[type === 'error' ? 'error' : 'log'](message);
  },

  setSendLoading(loading) {
    if (window.UI && typeof UI.setLoading === 'function') {
      UI.setLoading('chat-send-btn', loading, '➤');
      return;
    }
    const btn = document.getElementById('chat-send-btn');
    if (!btn) return;
    btn.disabled = !!loading;
    btn.innerHTML = loading ? '<div class="spinner"></div>' : '➤';
  },

  format(text) {
    if (window.UI && typeof UI.formatMarkdown === 'function') {
      return UI.formatMarkdown(text);
    }
    return String(text || '').replace(/\n/g, '<br>');
  },

  init() {
    this.initSessions();
    this.renderSessionsList();
    this.restoreCurrentSession();
  },

  getSessions() {
    try { return JSON.parse(localStorage.getItem('dhme_chat_sessions') || '[]'); }
    catch { return []; }
  },

  saveSessions(sessions) {
    localStorage.setItem('dhme_chat_sessions', JSON.stringify(sessions.slice(0, 40)));
  },

  genSessionTitle(messages) {
    const firstUser = (messages || []).find(m => m.role === 'user')?.content || 'محادثة جديدة';
    return firstUser.substring(0, 60);
  },

  initSessions() {
    const sessions = this.getSessions();
    if (sessions.length === 0) {
      const id = Date.now().toString();
      this.sessionId = id;
      this.saveSessions([{
        id,
        title: 'محادثة جديدة',
        updatedAt: Date.now(),
        messages: [],
        useSearch: false,
        model: 'gemini_flash',
        promptProfile: 'balanced',
        collaborationMode: null
      }]);
      localStorage.setItem('dhme_current_chat_session', id);
      return;
    }
    this.sessionId = localStorage.getItem('dhme_current_chat_session') || sessions[0].id;
  },

  restoreCurrentSession() {
    const sessions = this.getSessions();
    let current = sessions.find(s => s.id === this.sessionId);
    if (!current && sessions[0]) {
      current = sessions[0];
      this.sessionId = current.id;
    }
    this.messages = current?.messages || [];
    this.useSearch = !!current?.useSearch;
    this.collaborationMode = current?.collaborationMode ?? null;
    const modelSel = document.getElementById('chat-model');
    const profileSel = document.getElementById('chat-profile');
    if (modelSel && current?.model) modelSel.value = current.model;
    if (profileSel) profileSel.value = current?.promptProfile || 'balanced';
    this.setSearch(this.useSearch, true);
    this.renderFromMessages();
    this.renderSessionsList();
  },

  saveCurrentSession() {
    const sessions = this.getSessions();
    const idx = sessions.findIndex(s => s.id === this.sessionId);
    const modelSel = document.getElementById('chat-model');
    const profileSel = document.getElementById('chat-profile');
    const payload = {
      id: this.sessionId,
      title: this.genSessionTitle(this.messages),
      updatedAt: Date.now(),
      messages: this.messages,
      useSearch: this.useSearch,
      model: modelSel?.value || 'gemini_flash',
      promptProfile: profileSel?.value || 'balanced',
      collaborationMode: this.collaborationMode
    };
    if (idx >= 0) sessions[idx] = payload;
    else sessions.unshift(payload);
    sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    this.saveSessions(sessions);
    localStorage.setItem('dhme_current_chat_session', this.sessionId);
    this.renderSessionsList();
  },

  newSession() {
    const id = Date.now().toString();
    const sessions = this.getSessions();
    sessions.unshift({
      id,
      title: 'محادثة جديدة',
      updatedAt: Date.now(),
      messages: [],
      useSearch: this.useSearch,
      model: document.getElementById('chat-model')?.value || 'gemini_flash',
      promptProfile: document.getElementById('chat-profile')?.value || 'balanced',
      collaborationMode: null
    });
    this.saveSessions(sessions);
    this.sessionId = id;
    this.messages = [];
    this.collaborationMode = null;
    this.renderFromMessages();
    this.renderSessionsList();
    localStorage.setItem('dhme_current_chat_session', id);
  },

  switchSession(id) {
    this.sessionId = id;
    localStorage.setItem('dhme_current_chat_session', id);
    this.restoreCurrentSession();
  },

  deleteSession(id) {
    let sessions = this.getSessions().filter(s => s.id !== id);
    if (sessions.length === 0) {
      this.saveSessions([]);
      this.initSessions();
      this.restoreCurrentSession();
      return;
    }
    this.saveSessions(sessions);
    if (this.sessionId === id) {
      this.sessionId = sessions[0].id;
      localStorage.setItem('dhme_current_chat_session', this.sessionId);
      this.restoreCurrentSession();
      return;
    }
    this.renderSessionsList();
  },

  renderSessionsList() {
    const list = document.getElementById('chat-sessions-list');
    if (!list) return;
    const sessions = this.getSessions();
    list.innerHTML = sessions.map(s => `
      <div style="display:flex; gap:6px; align-items:center;">
        <button class="btn ${s.id === this.sessionId ? 'btn-primary' : 'btn-secondary'}"
          style="flex:1; justify-content:flex-start; padding:8px 10px; font-size:0.82rem; overflow:hidden;"
          onclick="Chat.switchSession('${s.id}')">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${(s.title || 'محادثة جديدة').replace(/</g, '&lt;')}</span>
        </button>
        <button class="btn btn-ghost btn-icon" style="width:30px;height:30px;" onclick="Chat.deleteSession('${s.id}')">🗑️</button>
      </div>
    `).join('');
  },

  toggleSessionsPanel() {
    const panel = document.getElementById('chat-sessions-panel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') this.renderSessionsList();
  },

  renderFromMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    if (!this.messages.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <div class="empty-state-text">ابدأ محادثتك الآن</div>
        </div>
      `;
      return;
    }
    container.innerHTML = '';
    this.messages.forEach(m => this.renderMessage(m.role === 'assistant' ? 'ai' : 'user', m.content));
  },

  getModelName(modelId) {
    const sel = document.getElementById('chat-model');
    if (!sel) return modelId;
    const option = Array.from(sel.options).find(o => o.value === modelId);
    return option ? option.textContent : modelId;
  },

  setStopVisible(visible) {
    const btn = document.getElementById('chat-stop-btn');
    if (!btn) return;
    btn.style.display = visible ? 'inline-flex' : 'none';
  },

  stop() {
    if (!this.isLoading || !this.activeRequestController) return;
    this.activeRequestController.abort();
  },

  async send(rawText = null, opts = {}) {
    const input = document.getElementById('chat-input');
    const text = (rawText ?? input?.value ?? '').trim();
    const renderUser = opts.renderUser !== false;
    if (!text || this.isLoading) return;

    if (renderUser && text.startsWith('/')) {
      this.runCommand(text, input);
      return;
    }

      // إضافة رسالة المستخدم
    if (renderUser) {
      this.messages.push({ role: 'user', content: text });
      this.renderMessage('user', text);
      if (input) {
        input.value = '';
        this.autoResize(input);
      }
    }

    // إظهار مؤشر الكتابة
    this.showTyping();
    this.isLoading = true;
    this.setSendLoading(true);
    this.setStopVisible(true);
    this.activeRequestController = new AbortController();

    try {
      const model = document.getElementById('chat-model').value;
      const profile = document.getElementById('chat-profile')?.value || 'balanced';

      const payload = {
        messages: this.messages,
        model,
        prompt_profile: profile,
        use_search:           this.useSearch,
        collaboration_mode:   this.collaborationMode,
        collaboration_providers: this.collaborationMode ? [
          'gemini_flash',
          'gemini_pro',
          'gemini_thinking',
          'gemini_flash_lite',
          'groq_llama',
          'groq_llama4',
          'groq_qwen',
          'groq_llama_fast',
          'groq_compound'
        ] : null,
      };

      const data = await App.apiJSON('/api/chat/', payload, 'POST', {
        signal: this.activeRequestController.signal
      });
      this.hideTyping();
      this.lastFailedText = null;

      // ─── وضع المنافسة ──────────────────────────────────
      if (data.mode === 'compete') {
        this.renderCompeteResponse(data.results);
        this.messages.push({
          role: 'assistant',
          content: Object.values(data.results).join('\n\n---\n\n')
        });

        // حفظ في السجل
        History.save('chat', Object.values(data.results).join('\n---\n'), text);
      }
      // ─── وضع التعاون ───────────────────────────────────
      else if (data.mode === 'collaborate') {
        this.renderMessage('ai', data.merged_response, {
          label: '🤝 إجابة مدمجة من عدة نماذج',
          showIndividual: data.individual_responses
        });

        this.messages.push({ role: 'assistant', content: data.merged_response });

        // حفظ في السجل
        History.save('chat', data.merged_response, text);
      }
      // ─── نموذج واحد ────────────────────────────────────
      else {
        const searchBadge = data.search_used
          ? ` 🌐 بحث(${data.search_results_count || 0})`
          : ' 🚫 بدون بحث';
        const profileBadge = data.prompt_profile_used ? ` • ${data.prompt_profile_used}` : '';
        this.renderMessage('ai', data.response, {
          label: `🤖 ${this.getModelName(data.model || model)}${searchBadge}${profileBadge}`
        });
        this.messages.push({ role: 'assistant', content: data.response });

        // حفظ في السجل
        History.save('chat', data.response, text);
      }
      this.saveCurrentSession();

    } catch (e) {
      this.hideTyping();
      if (e?.name === 'AbortError') {
        this.notify('تم إيقاف التوليد', 'info');
      } else {
        this.lastFailedText = text;
        this.notify(e.message, 'error');
        this.renderMessage('ai', `تعذر الحصول على الرد: ${e.message}`, {
          label: '⚠️ خطأ في الإرسال',
          retry: true
        });
      }
    } finally {
      this.isLoading = false;
      this.activeRequestController = null;
      this.setSendLoading(false);
      this.setStopVisible(false);
    }
  },

  retryLast() {
    if (!this.lastFailedText) return;
    this.send(this.lastFailedText, { renderUser: false });
  },

  runCommand(commandText, inputEl) {
    const [cmd, ...args] = commandText.slice(1).trim().split(/\s+/);
    const arg = (args[0] || '').toLowerCase();

    if (cmd === 'clear') {
      this.clear();
      this.notify('تم مسح المحادثة', 'info');
    } else if (cmd === 'search') {
      if (arg === 'on') {
        this.setSearch(true);
      } else if (arg === 'off') {
        this.setSearch(false);
      } else {
        this.toggleSearch();
      }
    } else if (cmd === 'model') {
      const modelId = args.join('_');
      const sel = document.getElementById('chat-model');
      if (!sel) return;
      const option = Array.from(sel.options).find(o => o.value === modelId);
      if (!option) {
        this.notify(`النموذج غير موجود: ${modelId}`, 'error');
      } else {
        sel.value = modelId;
        this.saveCurrentSession();
        this.notify(`تم اختيار: ${option.textContent}`, 'success');
      }
    } else if (cmd === 'profile') {
      const profile = (args[0] || '').toLowerCase();
      const allowed = ['balanced', 'precise', 'creative', 'tutor', 'coder'];
      const sel = document.getElementById('chat-profile');
      if (!sel) return;
      if (!allowed.includes(profile)) {
        this.notify(`نمط غير معروف: ${profile}`, 'error');
      } else {
        sel.value = profile;
        this.saveCurrentSession();
        this.notify(`تم اختيار نمط: ${profile}`, 'success');
      }
    } else if (cmd === 'help') {
      this.renderMessage('ai', [
        'الأوامر السريعة المتاحة:',
        '- `/help` عرض المساعدة',
        '- `/clear` مسح المحادثة',
        '- `/search on` تفعيل البحث',
        '- `/search off` تعطيل البحث',
        '- `/profile <balanced|precise|creative|tutor|coder>`',
        '- `/model <id>` اختيار نموذج (مثال: `/model groq_qwen`)',
      ].join('\n'), {
        label: '⌨️ أوامر سريعة'
      });
    } else {
      this.renderMessage('ai', 'أمر غير معروف. اكتب `/help` لعرض الأوامر.', {
        label: '⚠️ أمر غير معروف'
      });
    }

    this.hideCommandsMenu();
    if (inputEl) {
      inputEl.value = '';
      this.autoResize(inputEl);
    }
  },

  onInput(el) {
    this.autoResize(el);
    this.updateCommandsMenu(el?.value || '');
  },

  updateCommandsMenu(text) {
    const menu = document.getElementById('chat-commands-menu');
    if (!menu) return;
    const trimmed = (text || '').trimStart();
    if (!trimmed.startsWith('/')) {
      this.hideCommandsMenu();
      return;
    }
    const query = trimmed.toLowerCase();
    const items = this.slashCommands.filter(c => c.cmd.includes(query) || query === '/');
    if (!items.length) {
      this.hideCommandsMenu();
      return;
    }
    this.commandSelectionIndex = Math.min(this.commandSelectionIndex, items.length - 1);
    menu.innerHTML = items.map((item, i) => `
      <button class="btn ${i === this.commandSelectionIndex ? 'btn-primary' : 'btn-secondary'}"
        style="width:100%; justify-content:space-between; margin-bottom:6px; font-size:0.82rem;"
        onclick="Chat.pickCommand('${item.cmd.replace(/'/g, "\\'")}')">
        <span>${item.cmd}</span>
        <span style="opacity:0.8;">${item.desc}</span>
      </button>
    `).join('');
    menu.style.display = 'block';
  },

  hideCommandsMenu() {
    const menu = document.getElementById('chat-commands-menu');
    if (menu) menu.style.display = 'none';
    this.commandSelectionIndex = 0;
  },

  pickCommand(command) {
    const input = document.getElementById('chat-input');
    if (!input) return;
    input.value = `${command} `;
    input.focus();
    this.autoResize(input);
    this.hideCommandsMenu();
  },

  // ─── Render Message ──────────────────────────────────────
  renderMessage(role, content, options = {}) {
    const container = document.getElementById('chat-messages');

    // إزالة الـ empty state
    const empty = container.querySelector('.empty-state');
    if (empty) empty.remove();

    const isUser = role === 'user';
    const avatar = isUser ? '👤' : '🧠';

    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user-msg' : 'ai-msg'}`;

    let extraContent = '';

    // عرض إجابات النماذج الفردية في وضع التعاون
    if (options.showIndividual) {
      extraContent = `
        <details style="margin-top:10px;">
          <summary style="cursor:pointer; font-size:0.8rem; color:var(--text-muted);">
            عرض إجابات النماذج الفردية
          </summary>
          <div style="margin-top:8px; display:flex; flex-direction:column; gap:8px;">
            ${Object.entries(options.showIndividual).map(([name, resp]) => `
              <div style="background:var(--bg-hover); padding:10px; border-radius:8px; font-size:0.85rem;">
                <strong style="color:var(--accent-1);">${name}:</strong>
                <div style="margin-top:4px; color:var(--text-secondary);">${this.format(resp)}</div>
              </div>
            `).join('')}
          </div>
        </details>
      `;
    }

    div.innerHTML = `
      <div class="msg-avatar">${avatar}</div>
      <div style="flex:1; min-width:0;">
        ${options.label ? `<div style="font-size:0.75rem; color:var(--accent-1); margin-bottom:4px;">${options.label}</div>` : ''}
        <div class="msg-bubble">${this.format(content)}${extraContent}</div>
        <div style="display:flex; gap:8px; margin-top:6px; justify-content:${isUser ? 'flex-end' : 'flex-start'};">
          ${!isUser ? `
            <button class="btn btn-ghost" style="font-size:0.75rem; padding:4px 8px;"
              onclick="UI.copy(\`${content.replace(/`/g, '\\`')}\`)">نسخ</button>
            ${options.retry ? `
              <button class="btn btn-secondary" style="font-size:0.75rem; padding:4px 8px;"
                onclick="Chat.retryLast()">إعادة المحاولة</button>
            ` : ''}
          ` : ''}
        </div>
      </div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  // ─── Render Compete Response ─────────────────────────────
  renderCompeteResponse(results) {
    const container = document.getElementById('chat-messages');
    const empty = container.querySelector('.empty-state');
    if (empty) empty.remove();

    const div = document.createElement('div');
    div.className = 'message ai-msg';
    div.style.maxWidth = '100%';
    div.style.width = '100%';

    div.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div style="flex:1; min-width:0;">
        <div style="font-size:0.8rem; color:var(--accent-1); margin-bottom:8px;">
          ⚔️ وضع المنافسة — اختر الإجابة الأفضل
        </div>
        <div class="compete-responses">
          ${Object.entries(results).map(([name, resp]) => `
            <div class="compete-response-card">
              <div class="compete-response-header">
                <span>🤖 ${name}</span>
                <button class="btn btn-ghost" style="font-size:0.75rem; padding:4px 8px;"
                  onclick="UI.copy(\`${resp.replace(/`/g, '\\`')}\`)">نسخ</button>
              </div>
              <div class="compete-response-body">
                ${String(resp || '').startsWith('خطأ:') ? `<div style="color:#ef4444;font-size:0.8rem;margin-bottom:6px;">❌ فشل الرد</div>` : `<div style="color:#22c55e;font-size:0.8rem;margin-bottom:6px;">✅ استجاب</div>`}
                ${this.format(resp)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  // ─── Typing Indicator ────────────────────────────────────
  showTyping() {
    const container = document.getElementById('chat-messages');
    const typing = document.createElement('div');
    typing.id = 'typing-indicator';
    typing.className = 'message ai-msg';
    typing.innerHTML = `
      <div class="msg-avatar">🧠</div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
  },

  hideTyping() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
  },

  // ─── Controls ────────────────────────────────────────────
  setCollab(mode, el) {
    this.collaborationMode = mode;

    el.closest('.collab-toggle').querySelectorAll('.collab-option').forEach(o => {
      o.classList.remove('active');
    });
    el.classList.add('active');

    const modelSel = document.getElementById('chat-model');
    if (modelSel) modelSel.style.opacity = mode ? '0.4' : '1';
  },

  toggleSearch() {
    this.setSearch(!this.useSearch);
  },

  setSearch(enabled, silent = false) {
    this.useSearch = !!enabled;
    const btn = document.getElementById('search-toggle');
    if (btn) {
      btn.style.background = this.useSearch ? 'var(--accent-1)' : '';
      btn.style.color      = this.useSearch ? '#fff' : '';
    }
    if (!silent) this.notify(this.useSearch ? '🔍 البحث مفعّل' : '🔍 البحث معطّل', 'info');
    this.saveCurrentSession();
  },

  onProfileChange() {
    this.saveCurrentSession();
    const profile = document.getElementById('chat-profile')?.value || 'balanced';
    this.notify(`Prompt profile: ${profile}`, 'info');
  },

  clear() {
    this.messages = [];
    this.renderFromMessages();
    this.saveCurrentSession();
  },

  // ─── Input Helpers ───────────────────────────────────────
  handleKey(e) {
    const menu = document.getElementById('chat-commands-menu');
    const menuOpen = menu && menu.style.display !== 'none';
    if (menuOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const input = e.target;
      const query = (input?.value || '').trimStart().toLowerCase();
      const items = this.slashCommands.filter(c => c.cmd.includes(query) || query === '/');
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        this.commandSelectionIndex = (this.commandSelectionIndex + 1) % items.length;
      } else {
        this.commandSelectionIndex = (this.commandSelectionIndex - 1 + items.length) % items.length;
      }
      this.updateCommandsMenu(input.value);
      return;
    }
    if (menuOpen && e.key === 'Tab') {
      e.preventDefault();
      const input = e.target;
      const query = (input?.value || '').trimStart().toLowerCase();
      const items = this.slashCommands.filter(c => c.cmd.includes(query) || query === '/');
      if (!items.length) return;
      this.pickCommand(items[this.commandSelectionIndex].cmd);
      return;
    }
    if (menuOpen && e.key === 'Escape') {
      this.hideCommandsMenu();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  },

  autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  },
};