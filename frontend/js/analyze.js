/* ═══════════════════════════════════════════════════════════
   Dhme Studio — analyze.js
   تحليل الملفات (صور، صوت، فيديو)
═══════════════════════════════════════════════════════════ */

const Analyze = {

  selectedFile: null,

  handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    this.setFile(file);
  },

  setFile(file) {
    this.selectedFile = file;

    const zone = document.getElementById('upload-zone');
    const btn  = document.getElementById('analyze-btn');

    if (zone) {
      zone.innerHTML = `
        <div class="upload-icon">
          ${file.type.startsWith('image/') ? '🖼️' :
            file.type.startsWith('audio/') ? '🎵' :
            file.type.startsWith('video/') ? '🎬' : '📄'}
        </div>
        <div class="upload-text" style="font-weight:600;">${file.name}</div>
        <div class="upload-hint">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
        <button class="btn btn-ghost" style="margin-top:8px;"
          onclick="event.stopPropagation(); Analyze.reset()">تغيير الملف</button>
      `;
    }

    if (btn) btn.style.display = 'flex';
  },

  reset() {
    this.selectedFile = null;
    const zone = document.getElementById('upload-zone');
    const btn  = document.getElementById('analyze-btn');
    const result = document.getElementById('analyze-result');

    if (zone) zone.innerHTML = `
      <div class="upload-icon">📁</div>
      <div class="upload-text">اسحب ملفك هنا أو اضغط للاختيار</div>
      <div class="upload-hint">يدعم: صور (JPG, PNG) — صوت (MP3, WAV) — فيديو (MP4)</div>
      <input type="file" id="file-input" style="display:none;"
        accept="image/*,audio/*,video/*"
        onchange="Analyze.handleFile(event)" />
    `;
    if (btn)    btn.style.display = 'none';
    if (result) result.style.display = 'none';
  },

  async analyze() {
    if (!this.selectedFile) return UI.toast('اختر ملفاً أولاً', 'error');

    const prompt = document.getElementById('analyze-prompt').value.trim()
      || 'حلّل هذا الملف وأعطني ملخصاً مفصلاً';

    UI.setLoading('analyze-btn', true);

    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile);
      formData.append('prompt', prompt);

      const data = await App.apiForm('/api/analyze/', formData);

      const result = document.getElementById('analyze-result');
      if (result) {
        result.style.display = 'block';
        result.innerHTML = UI.formatMarkdown(data.analysis);
      }

      UI.toast('تم التحليل ✅', 'success');

    } catch (e) {
      UI.toast(e.message, 'error');
    } finally {
      UI.setLoading('analyze-btn', false, '<span>تحليل الآن</span><span>🔍</span>');
    }
  },

  // Drag & Drop
  dragOver(e) {
    e.preventDefault();
    document.getElementById('upload-zone')?.classList.add('dragging');
  },

  dragLeave(e) {
    document.getElementById('upload-zone')?.classList.remove('dragging');
  },

  drop(e) {
    e.preventDefault();
    document.getElementById('upload-zone')?.classList.remove('dragging');
    const file = e.dataTransfer.files[0];
    if (file) this.setFile(file);
  },
};