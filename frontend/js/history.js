const History = {

  init() { this.render(); },

  save(type, content, label = '') {
    const history = this.get();
    history.unshift({
      id:      Date.now(),
      type,
      content: typeof content === 'string' ? content.substring(0, 500) : label,
      label:   label || content?.substring?.(0, 60) || '',
      date:    new Date().toLocaleDateString('ar-SA'),
      time:    new Date().toLocaleTimeString('ar-SA', {hour:'2-digit',minute:'2-digit'}),
      starred: false
    });
    localStorage.setItem('dhme_history', JSON.stringify(history.slice(0, 100)));
  },

  get() {
    try { return JSON.parse(localStorage.getItem('dhme_history') || '[]'); }
    catch { return []; }
  },

  star(id) {
    const h = this.get().map(item => {
      if (item.id === id) item.starred = !item.starred;
      return item;
    });
    localStorage.setItem('dhme_history', JSON.stringify(h));
    this.render();
  },

  delete(id) {
    const h = this.get().filter(item => item.id !== id);
    localStorage.setItem('dhme_history', JSON.stringify(h));
    this.render();
  },

  clearAll() {
    UI.showModal('تأكيد الحذف', 'هل تريد حذف كل السجل؟', () => {
      localStorage.removeItem('dhme_history');
      this.render();
      UI.toast('تم حذف السجل', 'info');
    });
  },

  filterType: 'all',

  setFilter(type) {
    this.filterType = type;
    this.render();
  },

  render() {
    const container = document.getElementById('history-container');
    if (!container) return;

    const all      = this.get();
    const filtered = this.filterType === 'all' ? all
      : this.filterType === 'starred' ? all.filter(h => h.starred)
      : all.filter(h => h.type === this.filterType);

    const icons = { chat:'💬', image:'🖼️', voice:'🎤', analyze:'🔍', video:'🎬' };
    const types = ['all','starred','chat','image','voice','analyze'];

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${types.map(t => `
            <button class="model-chip ${this.filterType === t ? 'active' : ''}"
              onclick="History.setFilter('${t}')">
              ${t==='all'?'الكل':t==='starred'?'⭐ المفضلة':t==='chat'?'💬':t==='image'?'🖼️':t==='voice'?'🎤':'🔍'}
            </button>`).join('')}
        </div>
        ${all.length > 0 ? `
          <button class="btn btn-ghost" style="font-size:0.8rem;color:var(--text-muted);"
            onclick="History.clearAll()">🗑️ حذف الكل</button>` : ''}
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">لا يوجد سجل بعد</div>
        </div>` :
        `<div style="display:flex;flex-direction:column;gap:10px;">
          ${filtered.map(h => `
            <div class="card" style="display:flex;gap:12px;align-items:flex-start;">
              <div style="font-size:1.4rem;padding-top:2px;">${icons[h.type]||'📄'}</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;gap:8px;">
                  <span class="badge">${h.type}</span>
                  <span style="font-size:0.75rem;color:var(--text-muted);">${h.date} ${h.time||''}</span>
                </div>
                <div style="font-size:0.88rem;color:var(--text-secondary);
                  overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
                  ${h.label || h.content}
                </div>
                <div style="margin-top:8px;display:flex;gap:6px;">
                  <button class="btn btn-ghost" style="font-size:0.75rem;padding:3px 8px;"
                    onclick="UI.copy(\`${(h.content||'').replace(/`/g,'\\`')}\`)">نسخ</button>
                  ${h.type==='chat' ? `
                    <button class="btn btn-ghost" style="font-size:0.75rem;padding:3px 8px;"
                      onclick="App.navigate('chat');setTimeout(()=>{
                        document.getElementById('chat-input').value=\`${(h.label||'').replace(/`/g,'\\`')}\`;
                        Chat.autoResize(document.getElementById('chat-input'));
                      },100)">إعادة استخدام</button>` : ''}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;">
                <button class="btn btn-ghost btn-icon"
                  onclick="History.star(${h.id})"
                  style="color:${h.starred?'#f59e0b':''};">
                  ${h.starred?'⭐':'☆'}
                </button>
                <button class="btn btn-ghost btn-icon"
                  onclick="History.delete(${h.id})">🗑️</button>
              </div>
            </div>`).join('')}
        </div>`}
    `;
  },
};