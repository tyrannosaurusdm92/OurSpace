/*
  OurSpace Journal Accessibility Scanner + Reader Add-on
  Dependency-light OCR/camera/TTS helper for the OurSpace journaling module.
  Generated for OurSpace; no source code from the reviewed repositories is copied here.
*/
(function () {
  'use strict';

  const DEFAULT_BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec';
  const MODULE_NAME = 'ourspace_journal_accessibility';
  const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

  function nowIso() { return new Date().toISOString(); }
  function uid(prefix) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`; }
  function safeText(value) { return String(value == null ? '' : value); }
  function cleanName(value, fallback) {
    return safeText(value).trim().replace(/[\u0000-\u001f<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').slice(0, 120) || fallback;
  }
  function cleanOcrText(text) {
    return safeText(text)
      .replace(/\r\n/g, '\n')
      .replace(/[\t ]+\n/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
  function escapeHtml(value) {
    return safeText(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }
  function slug(value) {
    return cleanName(value, 'scan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'scan';
  }
  function downloadBlob(filename, mimeType, content) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }
  function isLikelyMobileOrTablet() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const narrowish = Math.min(window.innerWidth || 0, window.screen && window.screen.width || 0) <= 1180;
    const touch = navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
    return Boolean((coarse || touch) && narrowish);
  }
  function getFocusedTextareaSelection() {
    const el = document.activeElement;
    if (!el || !(/textarea|input/i.test(el.tagName))) return '';
    if (typeof el.selectionStart !== 'number' || typeof el.selectionEnd !== 'number') return '';
    if (el.selectionEnd <= el.selectionStart) return '';
    return el.value.slice(el.selectionStart, el.selectionEnd);
  }
  function getWindowSelectionText() {
    const textareaSelection = getFocusedTextareaSelection();
    if (textareaSelection.trim()) return textareaSelection;
    const selection = window.getSelection ? window.getSelection().toString() : '';
    return safeText(selection).trim();
  }

  class AccessibilityBackendAdapter {
    constructor(url, profile) {
      this.url = url || DEFAULT_BACKEND_URL;
      this.profile = profile || 'shared';
      this.key = `journal-a11y:${this.profile}`;
    }
    async request(action, data) {
      if (!this.url) throw new Error('No backend URL configured.');
      const url = new URL(this.url);
      url.searchParams.set('module', MODULE_NAME);
      url.searchParams.set('action', `journal_a11y_${action}`);
      url.searchParams.set('profile', this.profile);
      url.searchParams.set('key', this.key);
      const payload = {
        module: MODULE_NAME,
        action: `journal_a11y_${action}`,
        profile: this.profile,
        key: this.key,
        data,
        updatedAt: nowIso(),
        source: 'OurSpace Journal Accessibility Scanner Add-on'
      };
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`Backend responded ${response.status}.`);
      if (!text) return { ok: true };
      try { return JSON.parse(text); }
      catch (_error) { return { ok: true, text }; }
    }
    saveScan(record) { return this.request('save_scan', record); }
    async ocrImage(imageDataUrl) {
      const response = await this.request('ocr_image', { imageDataUrl });
      return response && (response.text || (response.data && response.data.text) || (response.result && response.result.text) || '');
    }
  }

  class OurSpaceJournalAccessibilityAddon {
    constructor(root, options) {
      this.root = typeof root === 'string' ? document.querySelector(root) : root;
      if (!this.root) throw new Error('Accessibility add-on root was not found.');
      this.options = options || {};
      this.profile = this.resolveProfile();
      this.backend = new AccessibilityBackendAdapter(this.options.backendUrl || this.root.dataset.backendUrl || DEFAULT_BACKEND_URL, this.profile);
      this.journalRoot = this.resolveJournalRoot();
      this.journalInstance = this.resolveJournalInstance();
      this.mediaStream = null;
      this.currentImageName = '';
      this.currentImageDataUrl = '';
      this.hasImage = false;
      this.ocrBusy = false;
      this.speechQueue = [];
      this.speechIndex = 0;
      this.currentUtterance = null;
      this.lastSpokenText = '';
      this.render();
      this.bind();
      this.refreshVoices();
      this.refreshEntryChoices();
      this.observeJournalChanges();
      this.bindJournalMountEvents();
      this.setStatus('Accessibility scanner is ready. Upload a picture, scan from camera on mobile/tablet, or choose text to speak.', 'good');
    }

    resolveProfile() {
      const explicit = this.options.profile || this.root.dataset.profile;
      const fromBody = document.body && (document.body.dataset.profile || document.body.dataset.user || document.body.dataset.accountName);
      const fromWindow = window.OurSpaceAuth && (window.OurSpaceAuth.profile || window.OurSpaceAuth.userName || window.OurSpaceAuth.accountName);
      const fromLocal = localStorage.getItem('ourspaceCurrentProfile') || localStorage.getItem('OurSpace.currentProfile') || localStorage.getItem('currentUser');
      return cleanName(explicit || fromBody || fromWindow || fromLocal || 'shared', 'shared').slice(0, 80);
    }

    resolveJournalRoot() {
      if (this.options.journalRoot) return typeof this.options.journalRoot === 'string' ? document.querySelector(this.options.journalRoot) : this.options.journalRoot;
      const selector = this.root.dataset.journalRoot;
      if (selector) return document.querySelector(selector);
      return document.querySelector('[data-ourspace-journal-auto], #ourspace-journal-root, .os-journal');
    }

    resolveJournalInstance() {
      let instance = null;
      if (this.options.journalInstance) instance = this.options.journalInstance;
      else if (this.journalRoot && this.journalRoot.__ourspaceJournalInstance) instance = this.journalRoot.__ourspaceJournalInstance;
      else if (window.OurSpaceJournalInstances && window.OurSpaceJournalInstances.length) instance = window.OurSpaceJournalInstances[0];
      this.journalInstance = instance || null;
      return this.journalInstance;
    }

    render() {
      const mobileCamera = isLikelyMobileOrTablet();
      this.root.innerHTML = `
        <section class="os-a11y" aria-label="Journal accessibility scanner and reader" data-mobile-camera="${mobileCamera ? 'true' : 'false'}">
          <header class="os-a11y__header">
            <div>
              <h2>Scan, Read & Speak</h2>
              <p>Upload an image, scan a page with a mobile/tablet camera, turn pictures into text, then send the text into your journal or have it read out loud.</p>
            </div>
            <div class="os-a11y__badges" aria-label="Feature summary">
              <span class="os-a11y__badge">OCR</span>
              <span class="os-a11y__badge">Camera scan</span>
              <span class="os-a11y__badge">Text to speech</span>
              <span class="os-a11y__badge">Selection reading</span>
            </div>
          </header>

          <div class="os-a11y__status" data-a11y="status" role="status" aria-live="polite"></div>

          <div class="os-a11y__grid">
            <section class="os-a11y__panel" aria-label="Scanner">
              <h3>1. Scan or upload</h3>
              <p class="os-a11y__help">Picture-to-text works on desktop, tablet, and mobile. Camera scanning is shown for mobile/tablet-style devices.</p>
              <div class="os-a11y__scan-actions">
                <label class="os-a11y__file-label">Upload picture for text
                  <input type="file" data-a11y="imageUpload" accept="image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif">
                </label>
                <button type="button" data-a11y="clearImage" data-kind="ghost">Clear picture</button>
              </div>
              <p class="os-a11y__desktop-note">Camera scanning is intentionally kept as a mobile/tablet feature. Desktop can still upload a picture or screenshot.</p>
              <div class="os-a11y__camera" data-a11y="cameraPanel" data-hidden="${mobileCamera ? 'false' : 'true'}">
                <h3>Mobile/tablet camera scan</h3>
                <video data-a11y="video" playsinline muted></video>
                <div class="os-a11y__camera-actions">
                  <button type="button" data-a11y="startCamera">Start camera</button>
                  <button type="button" data-a11y="captureCamera">Capture page</button>
                  <button type="button" data-a11y="stopCamera" data-kind="ghost">Stop camera</button>
                </div>
                <small>Camera access requires HTTPS or localhost. Use the rear camera when your browser allows it.</small>
              </div>

              <div class="os-a11y__preview-wrap" aria-label="Image preview">
                <canvas data-a11y="canvas" width="1200" height="850"></canvas>
              </div>
              <div class="os-a11y__extract-actions">
                <button type="button" data-a11y="enhanceScan">Enhance scan</button>
                <button type="button" data-a11y="cropScan" data-kind="ghost">Auto-crop page edges</button>
                <button type="button" data-a11y="runOcr">Extract text</button>
                <button type="button" data-a11y="backendOcr" data-kind="ghost">Try backend OCR</button>
              </div>
              <div class="os-a11y__progress" aria-hidden="true"><span data-a11y="progressBar"></span></div>
              <label>Extracted text
                <textarea data-a11y="ocrText" placeholder="Extracted OCR text will appear here. You can edit it before saving or speaking."></textarea>
              </label>
            </section>

            <section class="os-a11y__panel" aria-label="Journal insertion and speech reader">
              <h3>2. Save into journal</h3>
              <div class="os-a11y__inline-grid">
                <label>Entry title <input data-a11y="entryTitle" type="text" placeholder="Scanned page"></label>
                <label>Insert mode
                  <select data-a11y="insertMode">
                    <option value="new">Create new journal entry</option>
                    <option value="append">Append to current entry</option>
                    <option value="replace">Replace current entry text</option>
                  </select>
                </label>
              </div>
              <div class="os-a11y__entry-actions">
                <button type="button" data-a11y="insertIntoJournal">Send text to journal</button>
                <button type="button" data-a11y="downloadExtracted" data-kind="ghost">Download extracted text</button>
                <button type="button" data-a11y="copyExtracted" data-kind="ghost">Copy extracted text</button>
              </div>

              <h3>3. Speak out loud</h3>
              <label>Choose journal entry to speak
                <select data-a11y="entrySelect"><option value="current">Current selected entry</option></select>
              </label>
              <div class="os-a11y__speech-actions">
                <button type="button" data-a11y="speakCurrentEntry">Speak selected entry</button>
                <button type="button" data-a11y="speakSelection">Speak highlighted/drag-selected text</button>
                <button type="button" data-a11y="speakExtracted">Speak extracted text</button>
                <button type="button" data-a11y="pauseSpeech" data-kind="ghost">Pause / resume</button>
                <button type="button" data-a11y="stopSpeech" data-kind="danger">Stop speaking</button>
              </div>

              <div class="os-a11y__inline-grid">
                <label>Voice <select data-a11y="voiceSelect"></select></label>
                <label>Rate
                  <span class="os-a11y__range-row"><input data-a11y="rate" type="range" min="0.5" max="2" step="0.05" value="1"><output data-a11y="rateOut">1.00</output></span>
                </label>
                <label>Pitch
                  <span class="os-a11y__range-row"><input data-a11y="pitch" type="range" min="0.5" max="2" step="0.05" value="1"><output data-a11y="pitchOut">1.00</output></span>
                </label>
                <label>Volume
                  <span class="os-a11y__range-row"><input data-a11y="volume" type="range" min="0" max="1" step="0.05" value="1"><output data-a11y="volumeOut">1.00</output></span>
                </label>
              </div>
              <p class="os-a11y__help">For drag-select reading: highlight text inside the journal reader, editor, or extracted text box, then press “Speak highlighted/drag-selected text.”</p>
              <div data-a11y="readerPreview" class="os-a11y__reader-preview" tabindex="0" aria-label="Speech preview text">Choose an entry or extract text to preview it here.</div>
            </section>
          </div>
          <div class="os-a11y__sr-only" data-a11y="live" aria-live="assertive"></div>
        </section>`;
      this.refs = {};
      this.root.querySelectorAll('[data-a11y]').forEach((el) => { this.refs[el.dataset.a11y] = el; });
      this.ctx = this.refs.canvas.getContext('2d', { willReadFrequently: true });
      this.resetCanvas();
    }

    bind() {
      const on = (name, type, handler) => this.refs[name] && this.refs[name].addEventListener(type, handler.bind(this));
      on('imageUpload', 'change', this.onImageUpload);
      on('clearImage', 'click', this.clearImage);
      on('startCamera', 'click', this.startCamera);
      on('captureCamera', 'click', this.captureCamera);
      on('stopCamera', 'click', this.stopCamera);
      on('enhanceScan', 'click', this.enhanceScan);
      on('cropScan', 'click', this.cropScan);
      on('runOcr', 'click', this.runOcr);
      on('backendOcr', 'click', this.runBackendOcr);
      on('insertIntoJournal', 'click', this.insertIntoJournal);
      on('downloadExtracted', 'click', this.downloadExtracted);
      on('copyExtracted', 'click', this.copyExtracted);
      on('speakCurrentEntry', 'click', this.speakChosenEntry);
      on('speakSelection', 'click', this.speakSelection);
      on('speakExtracted', 'click', this.speakExtracted);
      on('pauseSpeech', 'click', this.pauseOrResumeSpeech);
      on('stopSpeech', 'click', this.stopSpeech);
      on('entrySelect', 'change', this.previewChosenEntry);
      ['rate', 'pitch', 'volume'].forEach((name) => on(name, 'input', this.updateRangeOutputs));
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => this.refreshVoices();
      }
      document.addEventListener('ourspace-journal-mounted', (event) => {
        this.journalInstance = event.detail && event.detail.instance;
        this.journalRoot = this.journalInstance && this.journalInstance.root || this.journalRoot;
        this.refreshEntryChoices();
      });
    }

    setStatus(message, tone) {
      if (this.refs.status) {
        this.refs.status.textContent = message;
        this.refs.status.dataset.tone = tone || 'neutral';
      }
      if (this.refs.live) this.refs.live.textContent = message;
    }

    setProgress(value) {
      if (this.refs.progressBar) this.refs.progressBar.style.width = `${Math.max(0, Math.min(100, value))}%`;
    }

    resetCanvas() {
      const canvas = this.refs.canvas;
      if (!canvas || !this.ctx) return;
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.ctx.fillStyle = 'rgba(255,255,255,0.04)';
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.ctx.fillStyle = 'rgba(230,255,255,0.75)';
      this.ctx.font = '32px system-ui, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Upload or capture an image to scan text', canvas.width / 2, canvas.height / 2);
    }

    async onImageUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        this.setStatus('Please choose an image file. For DOCX/TXT, use the journal module importer.', 'warn');
        return;
      }
      this.currentImageName = file.name;
      const dataUrl = await this.fileToDataUrl(file);
      await this.drawImageToCanvas(dataUrl);
      this.refs.entryTitle.value = cleanName(file.name.replace(/\.[^.]+$/, ''), 'Scanned page');
      this.setStatus(`Loaded picture: ${file.name}. You can enhance/crop, then extract text.`, 'good');
      event.target.value = '';
    }

    fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
        reader.readAsDataURL(file);
      });
    }

    drawImageToCanvas(dataUrl) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = this.refs.canvas;
          const maxW = 1400;
          const maxH = 1400;
          const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          this.ctx = canvas.getContext('2d', { willReadFrequently: true });
          this.ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          this.currentImageDataUrl = canvas.toDataURL('image/png');
          this.hasImage = true;
          resolve();
        };
        img.onerror = () => reject(new Error('Could not load image.'));
        img.src = dataUrl;
      });
    }

    clearImage() {
      this.currentImageName = '';
      this.currentImageDataUrl = '';
      this.hasImage = false;
      this.refs.ocrText.value = '';
      this.refs.entryTitle.value = '';
      this.setProgress(0);
      this.resetCanvas();
      this.setStatus('Picture and extracted text cleared.');
    }

    async startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.setStatus('This browser does not expose camera scanning through getUserMedia.', 'error');
        return;
      }
      if (!isLikelyMobileOrTablet()) {
        this.setStatus('Camera scanning is reserved for mobile/tablet use in this add-on. Use upload on desktop.', 'warn');
        return;
      }
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 }, height: { ideal: 1200 } }
        });
        this.refs.video.srcObject = this.mediaStream;
        await this.refs.video.play();
        this.setStatus('Camera started. Line up the page and press Capture page.', 'good');
      } catch (error) {
        this.setStatus(`Camera could not start: ${error.message}`, 'error');
      }
    }

    captureCamera() {
      const video = this.refs.video;
      if (!video || !video.videoWidth) {
        this.setStatus('Start the camera before capturing a page.', 'warn');
        return;
      }
      const canvas = this.refs.canvas;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      this.ctx = canvas.getContext('2d', { willReadFrequently: true });
      this.ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      this.currentImageDataUrl = canvas.toDataURL('image/png');
      this.hasImage = true;
      this.currentImageName = `camera-scan-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
      this.refs.entryTitle.value = 'Camera scan';
      this.setStatus('Captured camera scan. You can enhance/crop, then extract text.', 'good');
    }

    stopCamera() {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }
      if (this.refs.video) this.refs.video.srcObject = null;
      this.setStatus('Camera stopped.');
    }

    enhanceScan() {
      const canvas = this.refs.canvas;
      if (!this.hasImage || !canvas || !canvas.width) { this.setStatus('Upload or capture a picture before enhancing.', 'warn'); return; }
      const image = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.55 + 128));
        const boosted = contrasted > 205 ? 255 : contrasted < 55 ? 0 : contrasted;
        data[i] = data[i + 1] = data[i + 2] = boosted;
      }
      this.ctx.putImageData(image, 0, 0);
      this.currentImageDataUrl = canvas.toDataURL('image/png');
      this.hasImage = true;
      this.setStatus('Scan enhanced for higher contrast.', 'good');
    }

    cropScan() {
      const canvas = this.refs.canvas;
      if (!this.hasImage || !canvas || !canvas.width) { this.setStatus('Upload or capture a picture before cropping.', 'warn'); return; }
      const image = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = image.data;
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      const step = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 700));
      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const i = (y * canvas.width + x) * 4;
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum < 242 && data[i + 3] > 8) {
            minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
          }
        }
      }
      const pad = 18;
      minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
      maxX = Math.min(canvas.width - 1, maxX + pad); maxY = Math.min(canvas.height - 1, maxY + pad);
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      if (w < canvas.width * 0.18 || h < canvas.height * 0.18) {
        this.setStatus('Auto-crop did not find a clear page boundary. Try enhancing or retaking the picture.', 'warn');
        return;
      }
      const cropped = this.ctx.getImageData(minX, minY, w, h);
      canvas.width = w;
      canvas.height = h;
      this.ctx = canvas.getContext('2d', { willReadFrequently: true });
      this.ctx.putImageData(cropped, 0, 0);
      this.currentImageDataUrl = canvas.toDataURL('image/png');
      this.hasImage = true;
      this.setStatus('Auto-crop complete.', 'good');
    }

    async loadTesseract() {
      if (window.Tesseract && window.Tesseract.recognize) return window.Tesseract;
      await new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${TESSERACT_CDN}"]`);
        if (existing) {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
          return;
        }
        const script = document.createElement('script');
        script.src = TESSERACT_CDN;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Could not load the browser OCR library. Check internet access or use backend OCR if your Apps Script supports it.'));
        document.head.appendChild(script);
      });
      if (!window.Tesseract || !window.Tesseract.recognize) throw new Error('OCR library loaded, but Tesseract.recognize was unavailable.');
      return window.Tesseract;
    }

    async runOcr() {
      if (this.ocrBusy) return;
      const canvas = this.refs.canvas;
      if (!this.hasImage || !canvas || !canvas.width || !this.currentImageDataUrl) {
        this.setStatus('Upload or capture a picture before extracting text.', 'warn');
        return;
      }
      this.ocrBusy = true;
      this.setProgress(2);
      this.setStatus('Loading OCR and extracting text. This can take a little time on older devices.');
      try {
        const Tesseract = await this.loadTesseract();
        const result = await Tesseract.recognize(this.currentImageDataUrl, 'eng', {
          logger: (message) => {
            if (message && typeof message.progress === 'number') this.setProgress(Math.round(message.progress * 100));
            if (message && message.status) this.setStatus(`OCR: ${message.status.replace(/_/g, ' ')}`);
          }
        });
        const text = cleanOcrText(result && result.data && result.data.text || '');
        this.refs.ocrText.value = text;
        this.refs.readerPreview.textContent = text || 'No text was detected.';
        this.setProgress(100);
        this.setStatus(text ? 'Text extracted. Review it, then save into the journal or speak it aloud.' : 'OCR finished, but no text was detected.', text ? 'good' : 'warn');
        await this.saveScanRecord('browser_ocr', text);
      } catch (error) {
        this.setStatus(error.message, 'error');
      } finally {
        this.ocrBusy = false;
      }
    }

    async runBackendOcr() {
      const canvas = this.refs.canvas;
      if (!this.hasImage || !canvas || !canvas.width) {
        this.setStatus('Upload or capture a picture before trying backend OCR.', 'warn');
        return;
      }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
      this.setStatus('Trying backend OCR action journal_a11y_ocr_image. Your Apps Script needs to implement that action for this to work.');
      try {
        const text = cleanOcrText(await this.backend.ocrImage(dataUrl));
        if (!text) throw new Error('Backend replied, but did not return text.');
        this.refs.ocrText.value = text;
        this.refs.readerPreview.textContent = text;
        this.setStatus('Backend OCR returned text.', 'good');
        await this.saveScanRecord('backend_ocr', text);
      } catch (error) {
        this.setStatus(`Backend OCR unavailable: ${error.message}`, 'warn');
      }
    }

    getExtractedText() {
      return cleanOcrText(this.refs.ocrText.value);
    }

    async saveScanRecord(sourceType, text) {
      const record = {
        id: uid('scan'),
        title: cleanName(this.refs.entryTitle.value || this.currentImageName || 'Scanned page', 'Scanned page'),
        sourceType,
        sourceName: this.currentImageName,
        text,
        createdAt: nowIso()
      };
      try { await this.backend.saveScan(record); }
      catch (_error) { /* The add-on remains fully usable offline/local even if Apps Script has no matching action. */ }
    }

    insertIntoJournal() {
      const text = this.getExtractedText();
      if (!text) {
        this.setStatus('There is no extracted text to send into the journal yet.', 'warn');
        return;
      }
      const title = cleanName(this.refs.entryTitle.value, 'Scanned page');
      const mode = this.refs.insertMode.value;
      if (this.resolveJournalInstance()) {
        this.insertViaInstance(title, text, mode);
      } else {
        this.insertViaDom(title, text, mode);
      }
      this.setStatus(`Sent extracted text to journal as ${mode === 'new' ? 'a new entry' : mode + ' text'}.`, 'good');
      this.refreshEntryChoices();
    }

    insertViaInstance(title, text, mode) {
      const journal = this.resolveJournalInstance();
      if (!journal) {
        this.insertViaDom(title, text, mode);
        return;
      }
      if (typeof journal.insertAccessibilityText === 'function') {
        journal.insertAccessibilityText({ title, text, mode, sourceName: this.currentImageName || 'accessibility scan' });
        return;
      }
      const ts = nowIso();
      if (mode === 'new' || !journal.currentEntry || !journal.currentEntry()) {
        const entry = {
          id: uid('entry'),
          title,
          folderId: 'folder_unfiled',
          categoryIds: [],
          content: text,
          sourceType: 'ocr',
          sourceName: this.currentImageName || 'accessibility scan',
          createdAt: ts,
          updatedAt: ts,
          pinned: false
        };
        journal.state.entries.unshift(entry);
        journal.selectedEntryId = entry.id;
      } else {
        const entry = journal.currentEntry();
        entry.title = cleanName(journal.refs.title.value || entry.title || title, title);
        entry.content = mode === 'replace' ? text : `${entry.content || ''}${entry.content ? '\n\n' : ''}${text}`;
        entry.sourceType = entry.sourceType || 'manual';
        entry.updatedAt = ts;
      }
      if (typeof journal.touch === 'function') journal.touch();
      else if (typeof journal.refresh === 'function') journal.refresh();
    }

    insertViaDom(title, text, mode) {
      const content = document.querySelector('[data-journal="content"]');
      const titleInput = document.querySelector('[data-journal="title"]');
      const saveButton = document.querySelector('[data-journal="saveEntry"]');
      const newButton = document.querySelector('[data-journal="newEntry"]');
      if (!content) {
        this.setStatus('Could not find the journal editor on this page. Paste the extracted text manually.', 'error');
        return;
      }
      if (mode === 'new' && newButton) newButton.click();
      window.setTimeout(() => {
        if (titleInput && (mode === 'new' || !titleInput.value.trim())) titleInput.value = title;
        content.value = mode === 'append' ? `${content.value || ''}${content.value ? '\n\n' : ''}${text}` : text;
        content.dispatchEvent(new Event('input', { bubbles: true }));
        if (saveButton) saveButton.click();
      }, 60);
    }

    downloadExtracted() {
      const text = this.getExtractedText();
      if (!text) { this.setStatus('There is no extracted text to download yet.', 'warn'); return; }
      const name = slug(this.refs.entryTitle.value || this.currentImageName || 'extracted-text');
      downloadBlob(`${name}.txt`, 'text/plain;charset=utf-8', text);
      this.setStatus('Extracted text downloaded.', 'good');
    }

    async copyExtracted() {
      const text = this.getExtractedText();
      if (!text) { this.setStatus('There is no extracted text to copy yet.', 'warn'); return; }
      try {
        await navigator.clipboard.writeText(text);
        this.setStatus('Extracted text copied.', 'good');
      } catch (_error) {
        this.refs.ocrText.focus();
        this.refs.ocrText.select();
        this.setStatus('Clipboard access was blocked. The text is selected so you can copy it manually.', 'warn');
      }
    }

    refreshVoices() {
      if (!('speechSynthesis' in window)) {
        this.refs.voiceSelect.innerHTML = '<option value="">Speech not supported in this browser</option>';
        return;
      }
      const voices = window.speechSynthesis.getVoices() || [];
      this.voices = voices;
      const preferred = voices.findIndex((voice) => /english|en-/i.test(`${voice.lang} ${voice.name}`));
      this.refs.voiceSelect.innerHTML = voices.length
        ? voices.map((voice, index) => `<option value="${index}">${escapeHtml(voice.name)} (${escapeHtml(voice.lang || 'unknown')})${voice.default ? ' — default' : ''}</option>`).join('')
        : '<option value="">Default system voice</option>';
      if (preferred >= 0) this.refs.voiceSelect.value = String(preferred);
      this.updateRangeOutputs();
    }

    updateRangeOutputs() {
      ['rate', 'pitch', 'volume'].forEach((name) => {
        if (this.refs[`${name}Out`] && this.refs[name]) this.refs[`${name}Out`].value = Number(this.refs[name].value).toFixed(2);
      });
    }

    splitSpeechText(text) {
      const chunks = [];
      safeText(text).split(/\n{2,}|(?<=[.!?])\s+/g).forEach((part) => {
        const trimmed = part.trim();
        if (!trimmed) return;
        if (trimmed.length <= 220) chunks.push(trimmed);
        else {
          for (let i = 0; i < trimmed.length; i += 200) chunks.push(trimmed.slice(i, i + 200));
        }
      });
      return chunks;
    }

    speakText(text, label) {
      text = cleanOcrText(text);
      if (!text) {
        this.setStatus('There is no text to speak.', 'warn');
        return;
      }
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
        this.setStatus('This browser does not support built-in text-to-speech.', 'error');
        return;
      }
      this.stopSpeech(true);
      this.lastSpokenText = text;
      this.refs.readerPreview.textContent = text;
      this.speechQueue = this.splitSpeechText(text);
      this.speechIndex = 0;
      this.setStatus(`Speaking ${label || 'text'} aloud.`, 'good');
      this.speakNextChunk();
    }

    speakNextChunk() {
      if (this.speechIndex >= this.speechQueue.length) {
        this.currentUtterance = null;
        this.setStatus('Finished speaking.', 'good');
        return;
      }
      const utterance = new SpeechSynthesisUtterance(this.speechQueue[this.speechIndex]);
      const voiceIndex = Number(this.refs.voiceSelect.value);
      if (this.voices && this.voices[voiceIndex]) utterance.voice = this.voices[voiceIndex];
      utterance.rate = Number(this.refs.rate.value) || 1;
      utterance.pitch = Number(this.refs.pitch.value) || 1;
      utterance.volume = Number(this.refs.volume.value);
      utterance.onend = () => {
        this.speechIndex += 1;
        this.speakNextChunk();
      };
      utterance.onerror = (event) => this.setStatus(`Speech stopped: ${event.error || 'unknown speech error'}`, 'warn');
      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    }

    pauseOrResumeSpeech() {
      if (!('speechSynthesis' in window)) return;
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        this.setStatus('Speech resumed.', 'good');
      } else if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        this.setStatus('Speech paused.');
      } else if (this.lastSpokenText) {
        this.speakText(this.lastSpokenText, 'last text');
      }
    }

    stopSpeech(silent) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      this.speechQueue = [];
      this.currentUtterance = null;
      if (!silent) this.setStatus('Speech stopped.');
    }

    speakExtracted() { this.speakText(this.getExtractedText(), 'extracted text'); }

    speakSelection() {
      const selected = getWindowSelectionText();
      if (!selected) {
        this.setStatus('Highlight or drag-select some text first, then press the selection reading button.', 'warn');
        return;
      }
      this.speakText(selected, 'selected text');
    }

    speakChosenEntry() {
      const text = this.getChosenEntryText();
      this.speakText(text, 'selected journal entry');
    }

    previewChosenEntry() {
      const text = this.getChosenEntryText();
      this.refs.readerPreview.textContent = text || 'No entry text found.';
    }

    getChosenEntryText() {
      const id = this.refs.entrySelect.value;
      const journal = this.resolveJournalInstance();
      if (journal && journal.state && Array.isArray(journal.state.entries)) {
        if (id && id !== 'current') {
          journal.selectedEntryId = id;
          if (typeof journal.refresh === 'function') journal.refresh();
        }
        const entry = id && id !== 'current'
          ? journal.state.entries.find((item) => item.id === id)
          : (typeof journal.currentEntry === 'function' ? journal.currentEntry() : null);
        return entry ? entry.content || '' : '';
      }
      const textarea = document.querySelector('[data-journal="content"]');
      if (textarea && textarea.value.trim()) return textarea.value;
      const reader = document.querySelector('[data-journal="readerBody"]');
      return reader ? reader.innerText : '';
    }

    refreshEntryChoices() {
      const select = this.refs.entrySelect;
      if (!select) return;
      const journal = this.resolveJournalInstance();
      const current = select.value;
      let options = '<option value="current">Current selected entry</option>';
      if (journal && journal.state && Array.isArray(journal.state.entries)) {
        options += journal.state.entries.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.title || 'Untitled entry')}</option>`).join('');
      } else {
        document.querySelectorAll('[data-journal="entryList"] [data-entry-id]').forEach((button) => {
          const title = button.querySelector('strong') ? button.querySelector('strong').textContent : button.textContent.trim();
          options += `<option value="${escapeHtml(button.dataset.entryId)}">${escapeHtml(title || 'Journal entry')}</option>`;
        });
      }
      select.innerHTML = options;
      if ([...select.options].some((option) => option.value === current)) select.value = current;
    }

    bindJournalMountEvents() {
      const refreshFromEvent = (event) => {
        if (event && event.detail && event.detail.instance) this.journalInstance = event.detail.instance;
        else this.resolveJournalInstance();
        this.refreshEntryChoices();
      };
      if (this.journalRoot) this.journalRoot.addEventListener('ourspace-journal-mounted', refreshFromEvent);
      document.addEventListener('ourspace-journal-mounted-global', refreshFromEvent);
      document.addEventListener('ourspace-journal-state-changed', refreshFromEvent);
    }

    observeJournalChanges() {
      const target = this.journalRoot || document.body;
      if (!window.MutationObserver || !target) return;
      const observer = new MutationObserver(() => {
        window.clearTimeout(this.refreshTimer);
        this.refreshTimer = window.setTimeout(() => this.refreshEntryChoices(), 150);
      });
      observer.observe(target, { childList: true, subtree: true, characterData: true });
      this.observer = observer;
    }
  }

  function mount(root, options) {
    return new OurSpaceJournalAccessibilityAddon(root, options || {});
  }

  window.OurSpaceJournalAccessibility = {
    mount,
    OurSpaceJournalAccessibilityAddon,
    AccessibilityBackendAdapter,
    DEFAULT_BACKEND_URL
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-ourspace-journal-a11y-auto]').forEach((el) => {
      if (!el.__ourspaceJournalA11yMounted) {
        el.__ourspaceJournalA11yMounted = true;
        mount(el, {
          profile: el.dataset.profile,
          backendUrl: el.dataset.backendUrl || DEFAULT_BACKEND_URL,
          journalRoot: el.dataset.journalRoot
        });
      }
    });
  });
}());
