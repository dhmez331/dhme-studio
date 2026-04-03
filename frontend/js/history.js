/* ═══════════════════════════════════════════════════════════
   Dhme Studio — history.js
   السجل والمفضلة
═══════════════════════════════════════════════════════════ */

const History = {

  init() {
    this.render();
  },

  save(type, content, label = '') {
    const history = this.get();
    history.unshift({
      id:      Date.now(),
      type,
      content,
      label,
      date:    new Date().toLocaleDateString('ar-SA'),
      starred: false
    });

    // نحتفظ بآخر 50 عنصر
    localStorage.setItem('dhme_history', JSON.stringify(history.slice(0, 50)));
  },

  get() {
    try {
      return JSON.parse(localStorage.getItem('dhme_history') || '[]');
    } catch { return []; }
  },

  star(id) {
    const history = this.get().map(h => {
      if (h.id === id) h.starred = !h.starred;
      return h;
    });
    localStorage.setItem('dhme_history', JSON.stringify(history));
    this.render();
  },

  delete(id) {
    const history = this.get().filter(h => h.id !== id);
    localStorage.setItem('dhme_history', JSON.stringify(history));
    this.render();
  },

  render() {
    const container = document.getElementById('history-container');
    if (!container) return;

    const history = this.get();

    if (!history.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">لا يوجد سجل بعد</div>
        </div>
      `;
      return;
    }

    const icons = { chat: '💬', image: '🖼️', voice: '🎤', analyze: '🔍' };

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${history.map(h => `
          <div class="card" style="display:flex; gap:12px; align-items:flex-start;">
            <div style="font-size:1.5rem;">${icons[h.type] || '📄'}</div>
            <div style="flex:1; min-width:0;">
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span class="badge">${h.type}</span>
                <span style="font-size:0.8rem; color:var(--text-muted);">${h.date}</span>
              </div>
              <div style="font-size:0.9rem; color:var(--text-secondary);
                white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${typeof h.content === 'string' ? h.content.substring(0, 100) : h.label}
              </div>
            </div>
            <div style="display:flex; gap:4px;">
              <button class="btn btn-ghost btn-icon"
                onclick="History.star(${h.id})"
                style="color:${h.starred ? '#f59e0b' : ''};">
                ${h.starred ? '⭐' : '☆'}
              </button>
              <button class="btn btn-ghost btn-icon"
                onclick="History.delete(${h.id})">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },
};