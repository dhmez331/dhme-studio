const ImageGen = {
  mode: null,
  lastRequest: null,
  ratioMap: { "1:1": [1024, 1024], "4:5": [1024, 1280], "16:9": [1344, 768] },
  presets: {
    logo: "minimal logo, vector, clean background, high contrast",
    portrait: "ultra realistic portrait, studio lighting, detailed skin texture",
    product: "premium product photo, softbox lighting, clean composition",
    anime: "anime illustration, vivid colors, dynamic composition",
    cinematic: "cinematic scene, dramatic lighting, volumetric atmosphere",
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
    el.style.display = text ? "block" : "none";
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
      prompt, model, width, height,
      negative_prompt: document.getElementById("image-negative-prompt")?.value || "",
      collaboration_mode: this.mode,
      enhance_prompt: true,
    };
    this.saveSettings();
    this.setLoading(true);
    this.setStatus("Queued -> Generating -> Finalizing");
    try {
      this.lastRequest = payload;
      if (this.mode) {
        const data = await App.apiJSON("/api/image/generate", payload);
        return this.mode === "compete" ? this.renderCompete(data) : this.renderCollab(data);
      }
      const blob = await App.apiBlob("/api/image/generate", payload);
      document.getElementById("image-results").innerHTML = this.card("النتيجة", URL.createObjectURL(blob), prompt);
    } catch (e) {
      const message = this.parseError(e);
      document.getElementById("image-results").innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">❌</div><div class="empty-state-text">${message}</div></div>`;
      this.notify(message, "error");
    } finally {
      this.setLoading(false);
      this.setStatus("");
    }
  },

  card(title, url, prompt) {
    const escaped = (prompt || "").replace(/'/g, "\\'");
    return `<div class="image-result-card"><div class="image-result-header">${title}</div><img src="${url}" alt="${prompt}" loading="lazy"/><div class="image-result-footer"><button class="btn btn-secondary" onclick="ImageGen.download('${url}', 'dhme-image.jpg')">⬇️ تحميل</button><button class="btn btn-ghost" onclick="window.open('${url}', '_blank')">🔎 تكبير</button><button class="btn btn-ghost" onclick="ImageGen.copyPrompt('${escaped}')">📋 نسخ البرومبت</button><button class="btn btn-ghost" onclick="ImageGen.regenerate()">♻️ إعادة</button></div></div>`;
  },

  renderCompete(data) {
    const cards = Object.entries(data.images || {}).map(([name, b64]) => this.card(name, `data:image/jpeg;base64,${b64}`, data.original_prompt || ""));
    document.getElementById("image-results").innerHTML = cards.join("") || `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-text">${data.error?.message || data.message || "لا توجد صور"}</div></div>`;
  },

  renderCollab(data) {
    document.getElementById("image-results").innerHTML = this.card("النتيجة النهائية", `data:image/jpeg;base64,${data.image}`, data.original_prompt || "");
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
  },
};

document.addEventListener("DOMContentLoaded", () => {
  ImageGen.init();
  const savedMode = localStorage.getItem("image_last_mode");
  if (savedMode) {
    const target = document.querySelector(`#page-image .collab-option[onclick*="${savedMode}"]`);
    if (target) ImageGen.setMode(savedMode, target);
  }
});
