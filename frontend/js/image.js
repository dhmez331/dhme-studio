/* ═══════════════════════════════════════════════════════════
   Dhme Studio — image.js
   توليد الصور + وضع المنافسة والتعاون
═══════════════════════════════════════════════════════════ */

const ImageGen = {

  mode: null, // null / 'compete' / 'collaborate'

  setMode(mode, el) {
    this.mode = mode;
    el.closest('.collab-toggle').querySelectorAll('.collab-option').forEach(o => {
      o.classList.remove('active');
    });
    el.classList.add('active');

    // إخفاء model selector في وضع التعاون/المنافسة
    const modelSel = document.getElementById('image-model');
    if (modelSel) modelSel.style.opacity = mode ? '0.4' : '1';
  },

  async generate() {
    const prompt = document.getElementById('image-prompt').value.trim();
    if (!prompt) return UI.toast('اكتب وصف الصورة أولاً', 'error');

    const model   = document.getElementById('image-model').value;
    const results = document.getElementById('image-results');

    UI.setLoading('image-gen-btn', true);
    results.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:40px;">
        <div class="spinner" style="margin:0 auto 12px;"></div>
        <div style="color:var(--text-muted);">
          ${this.mode === 'compete' ? 'جاري التوليد من 3 نماذج...' :
            this.mode === 'collaborate' ? 'جاري تحسين البرومبت والتوليد...' :
            'جاري التوليد...'}
        </div>
      </div>
    `;

    try {
      const payload = {
        prompt,
        model,
        enhance_prompt: true,
        collaboration_mode: this.mode,
      };

      // ─── وضع المنافسة ────────────────────────────────
      if (this.mode === 'compete') {
        const data = await App.apiJSON('/api/image/generate', payload);
        this.renderCompeteImages(data);

        // بعد توليد الصورة بنجاح
        History.save('image', prompt, prompt.substring(0,60));
      }
      // ─── وضع التعاون ────────────────────────────────
      else if (this.mode === 'collaborate') {
        const data = await App.apiJSON('/api/image/generate', payload);
        this.renderCollabImage(data);
        // بعد توليد الصورة بنجاح
        History.save('image', prompt, prompt.substring(0,60));
      }
      // ─── نموذج واحد ─────────────────────────────────
      else {
        const blob = await App.apiBlob('/api/image/generate', payload);
        const url  = URL.createObjectURL(blob);
        this.renderSingleImage(url, model, prompt);
        // بعد توليد الصورة بنجاح
        History.save('image', prompt, prompt.substring(0,60));
      }


    } catch (e) {
      UI.toast(e.message, 'error');
      results.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">❌</div>
          <div class="empty-state-text">${e.message}</div>
        </div>
      `;
    } finally {
      UI.setLoading('image-gen-btn', false, '<span>توليد</span><span>✨</span>');
    }
  },

  renderSingleImage(url, model, prompt) {
    const results = document.getElementById('image-results');
    results.innerHTML = `
      <div class="image-result-card">
        <div class="image-result-header">${model}</div>
        <img src="${url}" alt="${prompt}" loading="lazy" />
        <div class="image-result-footer">
          <button class="btn btn-secondary" onclick="UI.download('${url}', 'dhme-image.jpg')">
            ⬇️ تحميل
          </button>
        </div>
      </div>
    `;
  },

  renderCompeteImages(data) {
    const results = document.getElementById('image-results');

    let html = '';
    if (data.enhanced_prompt) {
      html += `
        <div style="grid-column:1/-1; padding:12px; background:var(--bg-card);
          border:1px solid var(--border); border-radius:var(--radius); margin-bottom:4px;">
          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">
            البرومبت المحسّن:
          </div>
          <div style="font-size:0.85rem; color:var(--text-secondary);">${data.enhanced_prompt}</div>
        </div>
      `;
    }

    Object.entries(data.images || {}).forEach(([modelName, b64]) => {
      const url = `data:image/jpeg;base64,${b64}`;
      html += `
        <div class="image-result-card">
          <div class="image-result-header">${modelName}</div>
          <img src="${url}" alt="generated" loading="lazy" />
          <div class="image-result-footer">
            <button class="btn btn-secondary"
              onclick="UI.download('${url}', '${modelName.replace(/\s/g,'-')}.jpg')">
              ⬇️ تحميل
            </button>
          </div>
        </div>
      `;
    });

    results.innerHTML = html || '<div class="empty-state">لم تُولَّد صور</div>';
  },

  renderCollabImage(data) {
    const results = document.getElementById('image-results');
    const url = `data:image/jpeg;base64,${data.image}`;

    results.innerHTML = `
      <div style="grid-column:1/-1;">
        <div style="padding:12px; background:var(--bg-card); border:1px solid var(--border);
          border-radius:var(--radius); margin-bottom:12px;">
          <div style="font-size:0.8rem; color:var(--accent-1); margin-bottom:4px;">
            🤝 تعاون: Gemini حسّن البرومبت + FLUX ولّد الصورة
          </div>
          <div style="font-size:0.85rem; color:var(--text-secondary);">${data.enhanced_prompt}</div>
        </div>
        <div class="image-result-card">
          <div class="image-result-header">النتيجة النهائية</div>
          <img src="${url}" alt="collab result" loading="lazy" style="width:100%;" />
          <div class="image-result-footer">
            <button class="btn btn-primary" onclick="UI.download('${url}', 'dhme-collab.jpg')">
              ⬇️ تحميل
            </button>
          </div>
        </div>
      </div>
    `;
  },
};