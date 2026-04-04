const Voice = {
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,

  // ─── TTS ─────────────────────────────────────────────
  async tts() {
    const text  = document.getElementById('tts-text').value.trim();
    const voice = document.getElementById('tts-voice').value;
    const style = document.getElementById('tts-style')?.value || 'normal';
    if (!text) return UI.toast('اكتب النص أولاً', 'error');
    UI.setLoading('tts-btn', true);
    try {
      const blob = await App.apiBlob('/api/voice/tts', { text, voice_name: voice, style });
      const url  = URL.createObjectURL(blob);
      const audio = document.getElementById('tts-audio');
      audio.src = url; audio.style.display = 'block'; audio.play();
      History.save('voice', text, 'تحويل نص لصوت');
      UI.toast('تم توليد الصوت ✅', 'success');
    } catch(e) { UI.toast(e.message, 'error'); }
    finally { UI.setLoading('tts-btn', false, '<span>توليد الصوت</span><span>🔊</span>'); }
  },


switchTab(tab, el) {
  ['tts','lyrics','commercial','stt'].forEach(t => {
    document.getElementById(`voice-tab-${t}`).style.display = t === tab ? '' : 'none';
  });
  el.closest('.collab-toggle').querySelectorAll('.collab-option').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
},

  // ─── Lyrics / Sheilah ────────────────────────────────
  async generateLyrics() {
    const theme = document.getElementById('lyrics-theme').value.trim();
    const style = document.getElementById('lyrics-style').value;
    const voice = document.getElementById('lyrics-voice').value;
    if (!theme) return UI.toast('اكتب الموضوع أولاً', 'error');
    UI.setLoading('lyrics-btn', true);
    document.getElementById('lyrics-result').style.display = 'none';
    try {
      const data = await App.apiJSON('/api/voice/lyrics', {
        theme, style, language: 'ar', voice, audio: true
      });
      const result = document.getElementById('lyrics-result');
      result.style.display = 'block';
      document.getElementById('lyrics-text').innerHTML = UI.formatMarkdown(data.lyrics);
      if (data.audio_b64) {
        const audio = document.getElementById('lyrics-audio');
        audio.src = `data:audio/mpeg;base64,${data.audio_b64}`;
        audio.style.display = 'block';
      }
      History.save('voice', data.lyrics, style);
      UI.toast('تم التوليد ✅', 'success');
    } catch(e) { UI.toast(e.message, 'error'); }
    finally { UI.setLoading('lyrics-btn', false, '<span>توليد</span><span>🎵</span>'); }
  },

  // ─── Commercial ──────────────────────────────────────
  async generateCommercial() {
    const product  = document.getElementById('commercial-product').value.trim();
    const duration = document.getElementById('commercial-duration').value;
    if (!product) return UI.toast('اكتب اسم المنتج أولاً', 'error');
    UI.setLoading('commercial-btn', true);
    try {
      const data = await App.apiJSON('/api/voice/commercial', {
        product, duration, voice: 'commercial'
      });
      document.getElementById('commercial-script').innerHTML = UI.formatMarkdown(data.script);
      document.getElementById('commercial-script').style.display = 'block';
      if (data.audio_b64) {
        const audio = document.getElementById('commercial-audio');
        audio.src = `data:audio/mpeg;base64,${data.audio_b64}`;
        audio.style.display = 'block';
      }
      UI.toast('تم توليد الإعلان ✅', 'success');
    } catch(e) { UI.toast(e.message, 'error'); }
    finally { UI.setLoading('commercial-btn', false, '<span>توليد الإعلان</span><span>📢</span>'); }
  },

  // ─── Record ──────────────────────────────────────────
  async toggleRecord() {
    this.isRecording ? this.stopRecord() : this.startRecord();
  },

  async startRecord() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.isRecording = true;
      this.mediaRecorder.ondataavailable = e => this.audioChunks.push(e.data);
      this.mediaRecorder.onstop = () => this.processAudio();
      this.mediaRecorder.start();
      const btn = document.getElementById('record-btn');
      const status = document.getElementById('record-status');
      if (btn) { btn.classList.add('recording'); btn.textContent = '⏹️'; }
      if (status) status.textContent = 'جاري التسجيل... اضغط للإيقاف';
    } catch(e) { UI.toast('لا يمكن الوصول للميكروفون', 'error'); }
  },

  stopRecord() {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
      this.isRecording = false;
      const btn = document.getElementById('record-btn');
      if (btn) { btn.classList.remove('recording'); btn.textContent = '⏳'; }
      document.getElementById('record-status').textContent = 'جاري التفريغ...';
    }
  },

  async processAudio() {
    try {
      const blob = new Blob(this.audioChunks, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('file', blob, 'recording.wav');
      const data = await App.apiForm('/api/voice/transcribe', formData);
      const result = document.getElementById('transcription-result');
      if (result) { result.style.display = 'block'; result.textContent = data.text; }
      const btn = document.getElementById('record-btn');
      if (btn) btn.textContent = '🎤';
      document.getElementById('record-status').textContent = 'اضغط للتسجيل';
      UI.toast('تم التفريغ ✅', 'success');
    } catch(e) {
      UI.toast(e.message, 'error');
      document.getElementById('record-btn').textContent = '🎤';
    }
  }
};

