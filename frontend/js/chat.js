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

  // ─── Send Message ────────────────────────────────────────
  async send() {
    const input = document.getElementById('chat-input');
    const text  = input.value.trim();
    if (!text || this.isLoading) return;

    // إضافة رسالة المستخدم
    this.messages.push({ role: 'user', content: text });
    this.renderMessage('user', text);
    input.value = '';
    this.autoResize(input);

    // إظهار مؤشر الكتابة
    this.showTyping();
    this.isLoading = true;
    this.setSendLoading(true);

    try {
      const model = document.getElementById('chat-model').value;

      const payload = {
        messages: this.messages,
        model,
        use_search:           this.useSearch,
        collaboration_mode:   this.collaborationMode,
        collaboration_providers: this.collaborationMode ? [
          'gemini_flash', 'groq_llama', 'groq_qwen'
        ] : null,
      };

      const data = await App.apiJSON('/api/chat/', payload);
      this.hideTyping();

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
        this.renderMessage('ai', data.response);
        this.messages.push({ role: 'assistant', content: data.response });

        // حفظ في السجل
        History.save('chat', data.response, text);
      }

    } catch (e) {
      this.hideTyping();
      this.notify(e.message, 'error');
    } finally {
      this.isLoading = false;
      this.setSendLoading(false);
    }
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
              <div class="compete-response-body">${this.format(resp)}</div>
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
    this.useSearch = !this.useSearch;
    const btn = document.getElementById('search-toggle');
    if (btn) {
      btn.style.background = this.useSearch ? 'var(--accent-1)' : '';
      btn.style.color      = this.useSearch ? '#fff' : '';
    }
    this.notify(this.useSearch ? '🔍 البحث مفعّل' : '🔍 البحث معطّل', 'info');
  },

  clear() {
    this.messages = [];
    const container = document.getElementById('chat-messages');
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💬</div>
        <div class="empty-state-text">ابدأ محادثتك الآن</div>
      </div>
    `;
  },

  // ─── Input Helpers ───────────────────────────────────────
  handleKey(e) {
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