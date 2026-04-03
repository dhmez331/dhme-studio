/* ═══════════════════════════════════════════════════════════
   Dhme Studio — voice.js
   TTS + Speech to Text
═══════════════════════════════════════════════════════════ */

const Voice = {

  mediaRecorder: null,
  audioChunks:   [],
  isRecording:   false,

  // ─── Text to Speech ──────────────────────────────────────
  async tts() {
    const text  = document.getElementById('tts-text').value.trim();
    const voice = document.getElementById('tts-voice').value;

    if (!text) return UI.toast('اكتب النص أولاً', 'error');
    if (text.length > 2500) return UI.toast('النص طويل جداً (الحد 2500 حرف)', 'error');

    UI.setLoading('tts-btn', true);

    try {
      const blob = await App.apiBlob('/api/voice/tts', {
        text,
        voice_name: voice
      });

      const url   = URL.createObjectURL(blob);
      const audio = document.getElementById('tts-audio');
      audio.src   = url;
      audio.style.display = 'block';
      audio.play();

      UI.toast('تم توليد الصوت ✅', 'success');

    } catch (e) {
      UI.toast(e.message, 'error');
    } finally {
      UI.setLoading('tts-btn', false, '<span>توليد الصوت</span><span>🔊</span>');
    }
  },

  // ─── Speech to Text ──────────────────────────────────────
  async toggleRecord() {
    if (this.isRecording) {
      this.stopRecord();
    } else {
      this.startRecord();
    }
  },

  async startRecord() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks   = [];
      this.isRecording   = true;

      this.mediaRecorder.ondataavailable = (e) => {
        this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => this.processAudio();
      this.mediaRecorder.start();

      // UI
      const btn = document.getElementById('record-btn');
      const status = document.getElementById('record-status');
      if (btn) { btn.classList.add('recording'); btn.textContent = '⏹️'; }
      if (status) status.textContent = 'جاري التسجيل... اضغط للإيقاف';

    } catch (e) {
      UI.toast('لا يمكن الوصول للميكروفون', 'error');
    }
  },

  stopRecord() {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
      this.isRecording = false;

      const btn = document.getElementById('record-btn');
      const status = document.getElementById('record-status');
      if (btn) { btn.classList.remove('recording'); btn.textContent = '⏳'; }
      if (status) status.textContent = 'جاري التفريغ...';
    }
  },

  async processAudio() {
    try {
      const blob     = new Blob(this.audioChunks, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('file', blob, 'recording.wav');

      const data = await App.apiForm('/api/voice/transcribe', formData);

      const result = document.getElementById('transcription-result');
      if (result) {
        result.style.display = 'block';
        result.textContent   = data.text;
      }

      const btn    = document.getElementById('record-btn');
      const status = document.getElementById('record-status');
      if (btn)    { btn.textContent = '🎤'; }
      if (status) status.textContent = 'اضغط للتسجيل';

      UI.toast('تم التفريغ ✅', 'success');

    } catch (e) {
      UI.toast(e.message, 'error');
      const btn = document.getElementById('record-btn');
      if (btn) btn.textContent = '🎤';
    }
  },
};