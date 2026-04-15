const ImageGen = {
  mode: null,
  lastRequest: null,
  ratioMap: { "1:1": [1024, 1024], "4:5": [1024, 1280], "16:9": [1344, 768] },
  presets: {
    logo: "minimal logo, vector, clean background, high contrast",
    portrait: "ultra realistic portrait, studio lighting, detailed skin texture",
    product: "premium product photo, softbox lighting, clean composition",
    anime: "anime illustration, vivid colors, dynamic composition",
    cinematic: "cinematic scene, dramatic lighting, volumetric atmosphere"
  },

  notify(message, type = "info") {
    if (window.App?.toast) return App.toast(message, type);
    if (window.UI?.toast) return UI.toast(message, type);
    console[type === "error" ? "error" : "log"](message);
  },

  setLoading(loading) {
    if (window.UI?.setLoading) return UI.setLoading("image-gen-btn", loading, "<span>توليد</span><span>✨</span>");
    const btn = document.getElementById("image-gen-btn");
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = '<div class="spinner"></div>';
      return;
    }
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalHtml || "<span>توليد</span><span>✨</span>";
  },

  init() {
    this.ensureExtras();
    this.restoreSettings();
  },

  ensureExtras() {
    const controls = document.querySelector("#page-image .image-controls");
    if (!controls || document.getElementById("image-extra-controls")) return;
    const div = document.createElement("div");
    div.id = "image-extra-controls";
    div.style.cssText = "display:flex;flex-direction:column;gap:10px;margin-top:10px;";
    div.innerHTML = `
      <input id="image-negative-prompt" class="input" placeholder="Negative prompt (اختياري)" />
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost" onclick="ImageGen.applyPreset('logo')">شعار</button>
        <button class="btn btn-ghost" onclick="ImageGen.applyPreset('portrait')">بورتريه</button>
        <button class="btn btn-ghost" onclick="ImageGen.applyPreset('product')">منتج</button>
        <button class="btn btn-ghost" onclick="ImageGen.applyPreset('anime')">أنمي</button>
        <button class="btn btn-ghost" onclick="ImageGen.applyPreset('cinematic')">سينمائي</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button class="btn btn-primary image-ratio-btn" data-ratio="1:1" onclick="ImageGen.setRatio('1:1', this)">1:1</button>
        <button class="btn btn-secondary image-ratio-btn" data-ratio="4:5" onclick="ImageGen.setRatio('4:5', this)">4:5</button>
        <button class="btn btn-secondary image-ratio-btn" data-ratio="16:9" onclick="ImageGen.setRatio('16:9', this)">16:9</button>
        <input type="hidden" id="image-ratio" value="1:1" />
      </div>
      <div id="image-status" style="display:none;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--bg-card);"></div>
    `;
    controls.appendChild(div);
  },

  setStatus(text = "") {
    const el = document.getElementById("image-status");
    if (!el) return;
    if (!text) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.textContent = text;
  },

  applyPreset(key) {
    const input = document.getElementById("image-prompt");
    if (input && this.presets[key]) input.value = this.presets[key];
  },

  setRatio(ratio, el) {
    document.getElementById("image-ratio").value = ratio;
    document.querySelectorAll(".image-ratio-btn").forEach((btn) => {
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-secondary");
    });
    el.classList.remove("btn-secondary");
    el.classList.add("btn-primary");
  },

  setMode(mode, el) {
    this.mode = mode;
    el.closest(".collab-toggle")?.querySelectorAll(".collab-option").forEach((o) => o.classList.remove("active"));
    el.classList.add("active");
    localStorage.setItem("image_last_mode", mode || "");
  },

  saveSettings() {
    localStorage.setItem("image_last_model", document.getElementById("image-model")?.value || "flux_schnell");
    localStorage.setItem("image_last_ratio", document.getElementById("image-ratio")?.value || "1:1");
    localStorage.setItem("image_last_negative", document.getElementById("image-negative-prompt")?.value || "");
  },

  restoreSettings() {
    const model = localStorage.getItem("image_last_model");
    const ratio = localStorage.getItem("image_last_ratio");
    const neg = localStorage.getItem("image_last_negative");
    if (model && document.getElementById("image-model")) document.getElementById("image-model").value = model;
    if (neg && document.getElementById("image-negative-prompt")) document.getElementById("image-negative-prompt").value = neg;
    if (ratio) {
      const btn = document.querySelector(`.image-ratio-btn[data-ratio="${ratio}"]`);
      if (btn) this.setRatio(ratio, btn);
    }
  },

  parseError(e) {
    const msg = e?.message || "فشل توليد الصورة";
    if (msg.includes("quota")) return "تم تجاوز الحد المجاني مؤقتًا.";
    if (msg.includes("auth")) return "إعدادات مزود الصور ناقصة في الخادم.";
    if (msg.includes("timeout")) return "انتهت المهلة، حاول مرة أخرى.";
    return msg;
  },

  async generate() {
    const prompt = document.getElementById("image-prompt")?.value?.trim();
    if (!prompt) return this.notify("اكتب وصف الصورة أولاً", "error");
    const model = document.getElementById("image-model")?.value || "flux_schnell";
    const [width, height] = this.ratioMap[document.getElementById("image-ratio")?.value || "1:1"];
    const payload = {
      prompt,
      model,
      width,
      height,
      negative_prompt: document.getElementById("image-negative-prompt")?.value || "",
      collaboration_mode: this.mode,
      enhance_prompt: true
    };
    const results = document.getElementById("image-results");
    this.saveSettings();
    this.setLoading(true);
    this.setStatus("Queued -> Generating -> Finalizing");
    try {
      this.lastRequest = payload;
      if (this.mode) {
        const data = await App.apiJSON("/api/image/generate", payload);
        if (this.mode === "compete") return this.renderCompete(data);
        return this.renderCollab(data);
      }
      const blob = await App.apiBlob("/api/image/generate", payload);
      const url = URL.createObjectURL(blob);
      results.innerHTML = this.card("النتيجة", url, prompt);
      History?.save?.("image", prompt, prompt.substring(0, 60));
    } catch (e) {
      results.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">❌</div><div class="empty-state-text">${this.parseError(e)}</div></div>`;
      this.notify(this.parseError(e), "error");
    } finally {
      this.setLoading(false);
      this.setStatus("");
    }
  },

  card(title, url, prompt) {
    return `<div class="image-result-card"><div class="image-result-header">${title}</div><img src="${url}" alt="${prompt}" loading="lazy"/><div class="image-result-footer"><button class="btn btn-secondary" onclick="ImageGen.download('${url}', 'dhme-image.jpg')">⬇️ تحميل</button><button class="btn btn-ghost" onclick="window.open('${url}', '_blank')">🔎 تكبير</button><button class="btn btn-ghost" onclick="ImageGen.copyPrompt('${(prompt || "").replace(/'/g, "\\'")}')">📋 نسخ البرومبت</button><button class="btn btn-ghost" onclick="ImageGen.regenerate()">♻️ إعادة</button></div></div>`;
  },

  renderCompete(data) {
    const results = document.getElementById("image-results");
    const cards = Object.entries(data.images || {}).map(([name, b64]) => this.card(name, `data:image/jpeg;base64,${b64}`, data.original_prompt || ""));
    results.innerHTML = cards.join("") || `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-text">${data.error?.message || data.message || "لا توجد صور"}</div></div>`;
  },

  renderCollab(data) {
    const url = `data:image/jpeg;base64,${data.image}`;
    document.getElementById("image-results").innerHTML = this.card("النتيجة النهائية", url, data.original_prompt || "");
  },

  regenerate() {
    if (!this.lastRequest) return this.notify("لا يوجد طلب سابق", "info");
    document.getElementById("image-prompt").value = this.lastRequest.prompt || "";
    this.generate();
  },

  copyPrompt(text) {
    if (window.UI?.copy) return UI.copy(text);
    navigator.clipboard.writeText(text).then(() => this.notify("تم النسخ ✅", "success")).catch(() => this.notify("فشل النسخ", "error"));
  },

  download(url, filename) {
    if (window.UI?.download) return UI.download(url, filename);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  ImageGen.init();
  const savedMode = localStorage.getItem("image_last_mode");
  if (savedMode) {
    const target = document.querySelector(`#page-image .collab-option[onclick*="${savedMode}"]`);
    if (target) ImageGen.setMode(savedMode, target);
  }
});
/* Dhme Studio image.js */
const ImageGen = {
  mode: null,
  lastRequest: null,
  phaseTimer: null,

  presets: [
    { id: "logo", label: "شعار", text: "minimal logo, vector style, clean white background, high contrast branding" },
    { id: "portrait", label: "بورتريه", text: "ultra realistic portrait photo, studio lighting, shallow depth of field, detailed skin texture" },
    { id: "product", label: "منتج", text: "premium product photography on clean gradient background, softbox lighting, sharp details" },
    { id: "anime", label: "أنمي", text: "anime illustration, vibrant cinematic lighting, detailed character design, dynamic composition" },
    { id: "cinematic", label: "سينمائي", text: "cinematic scene, dramatic lighting, volumetric fog, wide shot, high detail, film grain" },
  ],

  ratioMap: {
    "1:1": [1024, 1024],
    "4:5": [1024, 1280],
    "16:9": [1344, 768],
  },

  notify(message, type = "info") {
    if (window.App && typeof App.toast === "function") return App.toast(message, type);
    if (window.UI && typeof UI.toast === "function") return UI.toast(message, type);
    console[type === "error" ? "error" : "log"](message);
  },

  init() {
    this.ensureEnhancementControls();
    this.restoreLastSettings();
  },

  ensureEnhancementControls() {
    const controls = document.querySelector("#page-image .image-controls");
    if (!controls || document.getElementById("image-extra-controls")) return;
    const extra = document.createElement("div");
    extra.id = "image-extra-controls";
    extra.style.cssText = "margin-top:12px;display:flex;flex-direction:column;gap:10px;";
    extra.innerHTML = `
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Negative prompt</label>
        <input id="image-negative-prompt" class="input" placeholder="مثال: blurry, low quality, artifacts..." />
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <strong style="font-size:0.82rem;color:var(--text-muted);">Presets:</strong>
        ${this.presets.map((preset) => `<button class="btn btn-ghost image-preset-btn" data-preset="${preset.id}" style="padding:6px 10px;font-size:0.78rem;">${preset.label}</button>`).join("")}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <strong style="font-size:0.82rem;color:var(--text-muted);">Ratio:</strong>
        ${Object.keys(this.ratioMap).map((ratio, idx) => `<button class="btn ${idx === 0 ? "btn-primary" : "btn-secondary"} image-ratio-btn" data-ratio="${ratio}" style="padding:6px 10px;font-size:0.78rem;">${ratio}</button>`).join("")}
        <input id="image-ratio" type="hidden" value="1:1" />
      </div>
      <div id="image-status-box" style="display:none;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-card);font-size:0.88rem;color:var(--text-secondary);">
        <strong id="image-status-title" style="color:var(--accent-1);">Queued</strong>
        <div id="image-status-detail" style="margin-top:4px;">بانتظار البدء...</div>
      </div>
    `;
    controls.appendChild(extra);

    extra.querySelectorAll(".image-preset-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.applyPreset(e.currentTarget.dataset.preset));
    });
    extra.querySelectorAll(".image-ratio-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.setRatio(e.currentTarget.dataset.ratio, e.currentTarget));
    });
  },

  applyPreset(presetId) {
    const preset = this.presets.find((p) => p.id === presetId);
    const promptEl = document.getElementById("image-prompt");
    if (!preset || !promptEl) return;
    promptEl.value = preset.text;
    this.notify(`تم تطبيق preset: ${preset.label}`, "success");
  },

  setRatio(ratio, el) {
    const ratioInput = document.getElementById("image-ratio");
    if (ratioInput) ratioInput.value = ratio;
    document.querySelectorAll(".image-ratio-btn").forEach((btn) => {
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-secondary");
    });
    if (el) {
      el.classList.remove("btn-secondary");
      el.classList.add("btn-primary");
    }
  },

  setMode(mode, el) {
    this.mode = mode;
    localStorage.setItem("image_last_mode", mode || "");
    const parent = el?.closest(".collab-toggle");
    if (parent) {
      parent.querySelectorAll(".collab-option").forEach((o) => o.classList.remove("active"));
      el.classList.add("active");
    }
    const modelSel = document.getElementById("image-model");
    if (modelSel) modelSel.style.opacity = mode ? "0.4" : "1";
  },

  setStatus(state, detail) {
    const box = document.getElementById("image-status-box");
    const title = document.getElementById("image-status-title");
    const info = document.getElementById("image-status-detail");
    if (!box || !title || !info) return;
    box.style.display = "block";
    title.textContent = state;
    info.textContent = detail;
  },

  clearStatus() {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.phaseTimer = null;
    const box = document.getElementById("image-status-box");
    if (box) box.style.display = "none";
  },

  setLoading(loading) {
    if (window.UI && typeof UI.setLoading === "function") {
      UI.setLoading("image-gen-btn", loading, "<span>توليد</span><span>✨</span>");
      return;
    }
    const btn = document.getElementById("image-gen-btn");
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = '<div class="spinner"></div>';
      return;
    }
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalHtml || "<span>توليد</span><span>✨</span>";
  },

  saveLastSettings() {
    localStorage.setItem("image_last_model", document.getElementById("image-model")?.value || "flux_schnell");
    localStorage.setItem("image_last_ratio", document.getElementById("image-ratio")?.value || "1:1");
    localStorage.setItem("image_last_negative", document.getElementById("image-negative-prompt")?.value || "");
  },

  restoreLastSettings() {
    const model = localStorage.getItem("image_last_model");
    const ratio = localStorage.getItem("image_last_ratio");
    const negative = localStorage.getItem("image_last_negative");
    if (model && document.getElementById("image-model")) document.getElementById("image-model").value = model;
    if (negative && document.getElementById("image-negative-prompt")) document.getElementById("image-negative-prompt").value = negative;
    if (ratio) {
      const ratioBtn = document.querySelector(`.image-ratio-btn[data-ratio="${ratio}"]`);
      if (ratioBtn) this.setRatio(ratio, ratioBtn);
    }
  },

  async api(endpoint, payload, expectBlob = false) {
    if (window.App && typeof App.api === "function") {
      if (expectBlob && typeof App.apiBlob === "function") return App.apiBlob(endpoint, payload);
      if (!expectBlob && typeof App.apiJSON === "function") return App.apiJSON(endpoint, payload);
    }
    throw new Error("App API unavailable");
  },

  parseError(error) {
    const message = error?.message || "حدث خطأ غير متوقع";
    const lower = message.toLowerCase();
    if (lower.includes("quota")) return "تم تجاوز الحد المجاني مؤقتًا. جرّب لاحقًا أو بدّل الوضع.";
    if (lower.includes("auth")) return "إعدادات مزود الصور ناقصة في السيرفر. راجع مفاتيح Cloudflare/HuggingFace.";
    if (lower.includes("timeout")) return "انتهت مهلة التوليد. أعد المحاولة أو جرّب نموذجًا أسرع.";
    if (lower.includes("model_unavailable")) return "النموذج غير متاح مؤقتًا. جرّب نموذجًا آخر.";
    return message;
  },

  async generate() {
    const prompt = document.getElementById("image-prompt")?.value?.trim() || "";
    if (!prompt) return this.notify("اكتب وصف الصورة أولاً", "error");
    const model = document.getElementById("image-model")?.value || "flux_schnell";
    const negativePrompt = document.getElementById("image-negative-prompt")?.value?.trim() || "";
    const ratio = document.getElementById("image-ratio")?.value || "1:1";
    const [width, height] = this.ratioMap[ratio] || this.ratioMap["1:1"];
    const results = document.getElementById("image-results");
    if (!results) return;

    this.setLoading(true);
    this.setStatus("Queued", "تم استلام الطلب...");
    this.phaseTimer = setTimeout(() => this.setStatus("Generating", this.mode === "compete" ? "تشغيل عدة نماذج بالتوازي..." : "جاري توليد الصورة..."), 500);
    setTimeout(() => this.setStatus("Finalizing", "تجهيز النتيجة النهائية..."), 2200);
    results.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px;"><div class="spinner" style="margin:0 auto 12px;"></div><div style="color:var(--text-muted);">جاري التوليد...</div></div>`;

    try {
      this.lastRequest = { prompt, model, mode: this.mode, negative_prompt: negativePrompt, width, height };
      this.saveLastSettings();
      const payload = { prompt, model, negative_prompt: negativePrompt, width, height, enhance_prompt: true, collaboration_mode: this.mode };
      if (this.mode === "compete") this.renderCompeteImages(await this.api("/api/image/generate", payload, false));
      else if (this.mode === "collaborate") this.renderCollabImage(await this.api("/api/image/generate", payload, false));
      else this.renderSingleImage(URL.createObjectURL(await this.api("/api/image/generate", payload, true)), model, prompt);
      if (window.History && typeof History.save === "function") History.save("image", prompt, prompt.substring(0, 60));
      this.notify("تم توليد الصورة بنجاح ✅", "success");
    } catch (e) {
      const friendly = this.parseError(e);
      this.notify(friendly, "error");
      results.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">❌</div><div class="empty-state-text">${friendly}</div><div style="margin-top:10px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button class="btn btn-secondary" onclick="ImageGen.generate()">🔁 إعادة المحاولة</button><button class="btn btn-ghost" onclick="ImageGen.setMode(null, document.querySelector('#page-image .collab-option'))">🧪 وضع عادي</button></div></div>`;
    } finally {
      this.setLoading(false);
      this.clearStatus();
    }
  },

  renderResultActions(url, fileName, prompt) {
    const encodedPrompt = (prompt || "").replace(/'/g, "\\'");
    return `<button class="btn btn-secondary" onclick="ImageGen.download('${url}', '${fileName}')">⬇️ تحميل</button><button class="btn btn-ghost" onclick="window.open('${url}','_blank')">🔎 تكبير</button><button class="btn btn-ghost" onclick="ImageGen.copyPrompt('${encodedPrompt}')">📋 نسخ البرومبت</button><button class="btn btn-ghost" onclick="ImageGen.regenerateLast()">♻️ إعادة بنفس الإعدادات</button>`;
  },

  renderSingleImage(url, model, prompt) {
    const results = document.getElementById("image-results");
    results.innerHTML = `<div class="image-result-card"><div class="image-result-header">${model}</div><img src="${url}" alt="${prompt}" loading="lazy" /><div class="image-result-footer">${this.renderResultActions(url, "dhme-image.jpg", prompt)}</div></div>`;
  },

  renderCompeteImages(data) {
    const results = document.getElementById("image-results");
    let html = "";
    if (data.enhanced_prompt) html += `<div style="grid-column:1/-1; padding:12px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); margin-bottom:4px;"><div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">البرومبت المحسّن:</div><div style="font-size:0.85rem; color:var(--text-secondary);">${data.enhanced_prompt}</div></div>`;
    Object.entries(data.images || {}).forEach(([modelName, b64]) => {
      const url = `data:image/jpeg;base64,${b64}`;
      html += `<div class="image-result-card"><div class="image-result-header">${modelName}</div><img src="${url}" alt="generated-${modelName}" loading="lazy" /><div class="image-result-footer">${this.renderResultActions(url, `${modelName.replace(/\s/g, "-")}.jpg`, data.original_prompt || this.lastRequest?.prompt || "")}</div></div>`;
    });
    results.innerHTML = html || `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">${data.message || "فشل كل النماذج. جرّب نموذجًا آخر أو أعد المحاولة."}</div></div>`;
  },

  renderCollabImage(data) {
    const results = document.getElementById("image-results");
    const url = `data:image/jpeg;base64,${data.image}`;
    results.innerHTML = `<div style="grid-column:1/-1;"><div style="padding:12px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); margin-bottom:12px;"><div style="font-size:0.8rem; color:var(--accent-1); margin-bottom:4px;">🤝 تعاون: تحسين + توليد</div><div style="font-size:0.85rem; color:var(--text-secondary);">${data.enhanced_prompt || ""}</div></div><div class="image-result-card"><div class="image-result-header">النتيجة النهائية</div><img src="${url}" alt="collab-result" loading="lazy" style="width:100%;" /><div class="image-result-footer">${this.renderResultActions(url, "dhme-collab.jpg", data.original_prompt || this.lastRequest?.prompt || "")}</div></div></div>`;
  },

  regenerateLast() {
    if (!this.lastRequest) return this.notify("لا يوجد طلب سابق لإعادة التوليد", "info");
    document.getElementById("image-prompt").value = this.lastRequest.prompt || "";
    document.getElementById("image-model").value = this.lastRequest.model || "flux_schnell";
    const negEl = document.getElementById("image-negative-prompt");
    if (negEl) negEl.value = this.lastRequest.negative_prompt || "";
    this.generate();
  },

  copyPrompt(text) {
    if (window.UI && typeof UI.copy === "function") return UI.copy(text);
    navigator.clipboard.writeText(text).then(() => this.notify("تم نسخ البرومبت ✅", "success")).catch(() => this.notify("فشل نسخ البرومبت", "error"));
  },

  download(url, filename) {
    if (window.UI && typeof UI.download === "function") return UI.download(url, filename);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  },
};

document.addEventListener("DOMContentLoaded", () => {
  try {
    ImageGen.init();
    const savedMode = localStorage.getItem("image_last_mode");
    if (!savedMode) return;
    const target = document.querySelector(`#page-image .collab-option[onclick*="${savedMode}"]`);
    if (target) ImageGen.setMode(savedMode, target);
  } catch (err) {
    console.warn("ImageGen init failed:", err);
  }
});
/* ═══════════════════════════════════════════════════════════
   Dhme Studio — image.js
   توليد الصور + وضع المنافسة والتعاون
═══════════════════════════════════════════════════════════ */

const ImageGen = {

  mode: null, // null / 'compete' / 'collaborate'
  lastRequest: null,
  presets: {
    logo: 'Minimal modern logo, clean vector, centered icon, premium brand identity, transparent background look',
    portrait: 'Ultra-detailed portrait, soft cinematic light, 85mm lens, high realism, natural skin texture',
    product: 'Studio product photography, softbox lighting, clean reflective surface, commercial ad quality',
    anime: 'Anime style character illustration, vibrant colors, dynamic pose, high detail background',
    cinematic: 'Cinematic frame, dramatic lighting, volumetric fog, ultra-detailed composition, film still',
  },

  notify(message, type = 'info') {
    if (window.App && typeof App.toast === 'function') return App.toast(message, type);
    if (window.UI && typeof UI.toast === 'function') return UI.toast(message, type);
    console[type === 'error' ? 'error' : 'log'](message);
  },

  setStatus(message = '', type = 'info') {
    const el = document.getElementById('image-status');
    if (!el) return;
    const colors = {
      info: 'var(--text-muted)',
      success: '#22c55e',
      error: '#ef4444',
    };
    el.textContent = message;
    el.style.color = colors[type] || colors.info;
  },

  setLoading(loading) {
    if (window.UI && typeof UI.setLoading === 'function') {
      UI.setLoading('image-gen-btn', loading, '<span>توليد</span><span>✨</span>');
      return;
    }
    const btn = document.getElementById('image-gen-btn');
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = '<div class="spinner"></div>';
      return;
    }
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalHtml || '<span>توليد</span><span>✨</span>';
  },

  setMode(mode, el) {
    this.mode = mode;
    el.closest('.collab-toggle').querySelectorAll('.collab-option').forEach(o => {
      o.classList.remove('active');
    });
    el.classList.add('active');

    // إخفاء model selector في وضع التعاون/المنافسة
    const modelSel = document.getElementById('image-model');
    if (modelSel) modelSel.style.opacity = mode ? '0.4' : '1';
    this.saveSettings();
  },

  init() {
    this.loadSettings();
  },

  applyPreset(key) {
    const text = this.presets[key];
    const promptEl = document.getElementById('image-prompt');
    if (!text || !promptEl) return;
    promptEl.value = text;
    this.notify('تم تطبيق القالب', 'success');
  },

  getRatioSize() {
    const ratio = document.getElementById('image-ratio')?.value || '1:1';
    if (ratio === '4:5') return { width: 1024, height: 1280 };
    if (ratio === '16:9') return { width: 1280, height: 720 };
    return { width: 1024, height: 1024 };
  },

  saveSettings() {
    const payload = {
      model: document.getElementById('image-model')?.value || 'flux_schnell',
      ratio: document.getElementById('image-ratio')?.value || '1:1',
      enhance: document.getElementById('image-enhance')?.checked ?? true,
      mode: this.mode,
    };
    localStorage.setItem('dhme_image_settings', JSON.stringify(payload));
  },

  loadSettings() {
    try {
      const raw = localStorage.getItem('dhme_image_settings');
      if (!raw) return;
      const payload = JSON.parse(raw);
      const modelEl = document.getElementById('image-model');
      const ratioEl = document.getElementById('image-ratio');
      const enhanceEl = document.getElementById('image-enhance');
      if (modelEl && payload.model) modelEl.value = payload.model;
      if (ratioEl && payload.ratio) ratioEl.value = payload.ratio;
      if (enhanceEl) enhanceEl.checked = payload.enhance !== false;
      this.mode = payload.mode || null;
      if (this.mode) {
        const selector = `.collab-option[onclick*="${this.mode}"]`;
        const option = document.querySelector(selector);
        if (option) this.setMode(this.mode, option);
      }
    } catch (_) {}
  },

  async generate() {
    const prompt = document.getElementById('image-prompt').value.trim();
    if (!prompt) return this.notify('اكتب وصف الصورة أولاً', 'error');

    const model   = document.getElementById('image-model').value;
    const results = document.getElementById('image-results');
    const enhance = document.getElementById('image-enhance')?.checked ?? true;
    const { width, height } = this.getRatioSize();
    this.saveSettings();

    this.setLoading(true);
    this.setStatus('Queued: تجهيز الطلب...', 'info');
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
      this.setStatus('Generating: جاري توليد الصورة...', 'info');
      this.lastRequest = { prompt, model, mode: this.mode };
      const payload = {
        prompt,
        model,
        enhance_prompt: enhance,
        collaboration_mode: this.mode,
        width,
        height,
      };

      // ─── وضع المنافسة ────────────────────────────────
      if (this.mode === 'compete') {
        const data = await App.apiJSON('/api/image/generate', payload);
        this.renderCompeteImages(data);
        this.setStatus('Finalizing: اكتمل وضع المنافسة', 'success');

        // بعد توليد الصورة بنجاح
        History.save('image', prompt, prompt.substring(0,60));
      }
      // ─── وضع التعاون ────────────────────────────────
      else if (this.mode === 'collaborate') {
        const data = await App.apiJSON('/api/image/generate', payload);
        this.renderCollabImage(data);
        this.setStatus('Finalizing: اكتمل وضع التعاون', 'success');
        // بعد توليد الصورة بنجاح
        History.save('image', prompt, prompt.substring(0,60));
      }
      // ─── نموذج واحد ─────────────────────────────────
      else {
        const blob = await App.apiBlob('/api/image/generate', payload);
        const url  = URL.createObjectURL(blob);
        this.renderSingleImage(url, model, prompt);
        this.setStatus('Finalizing: الصورة جاهزة', 'success');
        // بعد توليد الصورة بنجاح
        History.save('image', prompt, prompt.substring(0,60));
      }


    } catch (e) {
      const msg = this.parseError(e);
      this.notify(msg, 'error');
      this.setStatus(msg, 'error');
      results.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">❌</div>
          <div class="empty-state-text">${msg}</div>
          <div style="margin-top:10px; display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-secondary" onclick="ImageGen.retryLast()">إعادة المحاولة</button>
            <button class="btn btn-secondary" onclick="ImageGen.switchToFastModel()">تبديل إلى نموذج سريع</button>
          </div>
        </div>
      `;
    } finally {
      this.setLoading(false);
    }
  },

  parseError(error) {
    const msg = error?.message || 'فشل توليد الصورة';
    if (msg.includes('quota') || msg.includes('429')) return 'تم الوصول لحد الاستخدام المؤقت، جرّب بعد قليل أو غيّر النموذج.';
    if (msg.includes('auth')) return 'مفتاح مزود الصور غير مهيأ أو غير صالح في الخادم.';
    if (msg.includes('timeout')) return 'انتهت مهلة الاتصال بمزود الصور، حاول مرة أخرى.';
    return msg;
  },

  retryLast() {
    if (!this.lastRequest) return this.notify('لا يوجد طلب سابق لإعادة المحاولة', 'info');
    const promptEl = document.getElementById('image-prompt');
    const modelEl = document.getElementById('image-model');
    if (promptEl) promptEl.value = this.lastRequest.prompt;
    if (modelEl) modelEl.value = this.lastRequest.model;
    this.mode = this.lastRequest.mode || null;
    this.generate();
  },

  switchToFastModel() {
    const modelEl = document.getElementById('image-model');
    if (modelEl) modelEl.value = 'flux_schnell';
    this.notify('تم التبديل إلى نموذج سريع', 'info');
  },

  renderSingleImage(url, model, prompt) {
    const results = document.getElementById('image-results');
    results.innerHTML = `
      <div class="image-result-card">
        <div class="image-result-header">${model}</div>
        <img src="${url}" alt="${prompt}" loading="lazy" />
        <div class="image-result-footer">
          <button class="btn btn-secondary" onclick="ImageGen.copyPrompt()">
            📋 نسخ البرومبت
          </button>
          <button class="btn btn-secondary" onclick="ImageGen.retryLast()">
            🔁 إعادة توليد
          </button>
          <button class="btn btn-secondary" onclick="ImageGen.download('${url}', 'dhme-image.jpg')">
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
            <button class="btn btn-secondary" onclick="ImageGen.copyPrompt()">
              📋 نسخ البرومبت
            </button>
            <button class="btn btn-secondary"
              onclick="ImageGen.download('${url}', '${modelName.replace(/\s/g,'-')}.jpg')">
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
            <button class="btn btn-secondary" onclick="ImageGen.copyPrompt()">
              📋 نسخ البرومبت
            </button>
            <button class="btn btn-primary" onclick="ImageGen.download('${url}', 'dhme-collab.jpg')">
              ⬇️ تحميل
            </button>
          </div>
        </div>
      </div>
    `;
  },

  download(url, filename) {
    if (window.UI && typeof UI.download === 'function') return UI.download(url, filename);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  },

  async copyPrompt() {
    const text = document.getElementById('image-prompt')?.value || '';
    if (!text.trim()) return this.notify('لا يوجد برومبت للنسخ', 'info');
    try {
      await navigator.clipboard.writeText(text);
      this.notify('تم نسخ البرومبت', 'success');
    } catch (_) {
      this.notify('تعذر نسخ البرومبت', 'error');
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  try { ImageGen.init(); } catch (_) {}
  ['image-model', 'image-ratio', 'image-enhance'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => ImageGen.saveSettings());
  });
});