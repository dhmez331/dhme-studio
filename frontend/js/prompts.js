/* ═══════════════════════════════════════════════════════════
   Dhme Studio — prompts.js
   مكتبة البرومبتات
═══════════════════════════════════════════════════════════ */

const Prompts = {

  // برومبتات مدمجة جاهزة
  builtIn: [
    { id: 1, name: 'شيلة عن الوفاء',      type: 'شيلة',    prompt: 'اكتب شيلة سعودية جميلة عن الوفاء والإخاء' },
    { id: 2, name: 'صورة منظر طبيعي',     type: 'صورة',    prompt: 'A breathtaking mountain landscape at golden hour, ultra realistic, 8K' },
    { id: 3, name: 'ملخص مقال',           type: 'محادثة',  prompt: 'لخّص لي هذا المقال بنقاط واضحة ومرتبة' },
    { id: 4, name: 'ترجمة احترافية',      type: 'محادثة',  prompt: 'ترجم هذا النص ترجمة احترافية مع الحفاظ على الأسلوب' },
    { id: 5, name: 'صورة بورتريه فني',    type: 'صورة',    prompt: 'Artistic portrait, dramatic lighting, oil painting style, masterpiece' },
    { id: 6, name: 'قصيدة نبطية',        type: 'شيلة',    prompt: 'اكتب قصيدة نبطية عن الغربة والاشتياق للوطن' },
    { id: 7, name: 'خطة عمل',            type: 'محادثة',  prompt: 'ساعدني في بناء خطة عمل متكاملة لمشروع' },
    { id: 8, name: 'تحليل بيانات',       type: 'محادثة',  prompt: 'حلّل هذه البيانات وأخبرني بأهم الاستنتاجات' },
  ],

  filter: 'all',

  init() {
    this.render();
  },

  render() {
    const container = document.getElementById('prompts-container');
    if (!container) return;

    const custom = this.getCustom();
    const all    = [...this.builtIn, ...custom];
    const types  = ['all', ...new Set(all.map(p => p.type))];

    const filtered = this.filter === 'all' ? all : all.filter(p => p.type === this.filter);

    container.innerHTML = `
      <!-- Filters -->
      <div style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap;">
        ${types.map(t => `
          <button class="model-chip ${this.filter === t ? 'active' : ''}"
            onclick="Prompts.setFilter('${t}')">
            ${t === 'all' ? 'الكل' : t}
          </button>
        `).join('')}
      </div>

      <!-- Add Custom -->
      <div class="card" style="margin-bottom:16px;">
        <h3 style="font-size:0.95rem; margin-bottom:12px;">➕ أضف برومبت خاص</h3>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <input id="new-prompt-name" class="input" placeholder="اسم البرومبت" />
          <input id="new-prompt-type" class="input" placeholder="النوع (صورة / محادثة / شيلة...)" />
          <textarea id="new-prompt-text" class="input" rows="3" placeholder="نص البرومبت"></textarea>
          <button class="btn btn-primary" onclick="Prompts.add()" style="align-self:flex-start;">
            حفظ البرومبت
          </button>
        </div>
      </div>

      <!-- List -->
      <div class="tools-grid">
        ${filtered.map(p => `
          <div class="tool-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <span class="badge">${p.type}</span>
              <div style="display:flex; gap:4px;">
                <button 
                  onclick="event.stopPropagation();UI.copy(\`${p.prompt.replace(/`/g,'\\`')}\`)" 
                  class="btn btn-ghost" 
                  style="font-size:0.75rem; padding:4px 8px;">
                  نسخ
                </button>
                <button 
                  onclick="event.stopPropagation();Prompts.use(\`${p.prompt.replace(/`/g,'\\`')}\`)"
                  class="btn btn-primary" 
                  style="font-size:0.75rem; padding:4px 8px;">
                  استخدام
                </button>
                ${p.custom ? `
                  <button 
                    onclick="event.stopPropagation();Prompts.delete(${p.id})" 
                    class="btn btn-ghost" 
                    style="font-size:0.75rem; padding:4px 6px;">
                    🗑️
                  </button>
                ` : ''}
              </div>
            </div>
            <div class="tool-name">${p.name}</div>
            <div class="tool-desc">${p.prompt.substring(0, 80)}...</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  setFilter(type) {
    this.filter = type;
    this.render();
  },

  use(prompt) {
    App.navigate('chat');
    setTimeout(() => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = prompt;
        Chat.autoResize(input);
        input.focus();
      }
    }, 100);
    UI.toast('تم نقل البرومبت للمحادثة', 'success');
  },

  add() {
    const name   = document.getElementById('new-prompt-name').value.trim();
    const type   = document.getElementById('new-prompt-type').value.trim();
    const prompt = document.getElementById('new-prompt-text').value.trim();

    if (!name || !prompt) return UI.toast('أدخل الاسم والنص', 'error');

    const custom = this.getCustom();
    custom.push({
      id:     Date.now(),
      name,
      type:   type || 'عام',
      prompt,
      custom: true
    });

    localStorage.setItem('dhme_prompts', JSON.stringify(custom));
    this.render();
    UI.toast('تم حفظ البرومبت ✅', 'success');
  },

  delete(id) {
    const custom = this.getCustom().filter(p => p.id !== id);
    localStorage.setItem('dhme_prompts', JSON.stringify(custom));
    this.render();
  },

  getCustom() {
    try {
      return JSON.parse(localStorage.getItem('dhme_prompts') || '[]');
    } catch { return []; }
  },
};