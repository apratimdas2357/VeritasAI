/* ============================================================
   Veritas — camera.js
   Handles live camera feed (getUserMedia), document capture,
   and the face-recognition scanning sequence.

   Note: getUserMedia requires HTTPS (or localhost). Hugging Face
   Spaces serves over HTTPS by default, so this works there as-is.
   ============================================================ */
window.Veritas = window.Veritas || {};

(function () {

  async function startStream(videoEl, facingMode) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false
      });
      videoEl.srcObject = stream;
      return stream;
    } catch (err) {
      console.warn('Veritas: camera unavailable, falling back to static preview.', err);
      videoEl.classList.add('camera-fallback');
      return null;
    }
  }

  function captureFrame(videoEl, canvasEl) {
    const w = videoEl.videoWidth || 1080;
    const h = videoEl.videoHeight || 1440;
    canvasEl.width = w;
    canvasEl.height = h;
    const ctx = canvasEl.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, w, h);
    return new Promise((resolve) => {
      canvasEl.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  }

  /* ----------------------------------------------------------
     Home / document capture screen
     ---------------------------------------------------------- */
  Veritas.initCameraScreen = function (opts) {
    const video = document.getElementById(opts.videoId);
    const canvas = document.getElementById(opts.canvasId);
    const shutterBtn = document.getElementById(opts.shutterId);
    const flashBtn = document.getElementById(opts.flashId);
    const uploadBtn = document.getElementById(opts.uploadBtnId);
    const uploadInput = document.getElementById(opts.uploadInputId);
    const countEl = document.getElementById(opts.countId);
    const totalEl = document.getElementById(opts.totalId);
    const nextBtn = document.getElementById(opts.nextBtnId);
    const historyBtn = document.getElementById(opts.historyBtnId);

    let shotsTaken = parseInt(countEl.textContent, 10) || 0;
    const shotsRequired = parseInt(totalEl.textContent, 10) || 5;
    let flashOn = false;

    startStream(video, 'environment');

    async function handleCapture() {
      if (shotsTaken >= shotsRequired) return;
      shutterBtn.disabled = true;
      try {
        const blob = await captureFrame(video, canvas);
        await Veritas.uploadCapture(blob, shotsTaken + 1);
        shotsTaken += 1;
        countEl.textContent = shotsTaken;
      } catch (err) {
        console.error('Veritas: capture failed', err);
      } finally {
        shutterBtn.disabled = false;
      }
    }

    shutterBtn.addEventListener('click', handleCapture);

    flashBtn.addEventListener('click', () => {
      flashOn = !flashOn;
      flashBtn.classList.toggle('accent', flashOn);
      const track = video.srcObject && video.srcObject.getVideoTracks()[0];
      if (track && track.getCapabilities && track.getCapabilities().torch) {
        track.applyConstraints({ advanced: [{ torch: flashOn }] }).catch(() => {});
      }
    });

    uploadBtn.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        if (shotsTaken >= shotsRequired) break;
        await Veritas.uploadCapture(file, shotsTaken + 1);
        shotsTaken += 1;
        countEl.textContent = shotsTaken;
      }
      uploadInput.value = '';
    });

    if (historyBtn && opts.historyUrl) {
      historyBtn.addEventListener('click', () => { window.location.href = opts.historyUrl; });
    }

    nextBtn.addEventListener('click', () => {
      window.location.href = opts.nextUrl;
    });
  };

  /* ----------------------------------------------------------
     Face recognition scanning screen
     ---------------------------------------------------------- */
  Veritas.initFaceScreen = function (opts) {
    const video = document.getElementById(opts.videoId);
    startStream(video, 'user');

    const label = document.getElementById('scanningLabel');
    const dots = ['Scanning', 'Scanning.', 'Scanning..', 'Scanning...'];
    let i = 0;
    const dotTimer = setInterval(() => {
      i = (i + 1) % dots.length;
      if (label) label.textContent = dots[i];
    }, 350);

    setTimeout(() => {
      clearInterval(dotTimer);
      window.location.href = opts.resultUrl;
    }, opts.scanDurationMs || 2500);
  };

  /* ----------------------------------------------------------
     Upload a captured frame to the Flask backend.
     Swap the endpoint/body to match your actual API contract.
     ---------------------------------------------------------- */
  Veritas.uploadCapture = async function (blob, sequence) {
    const formData = new FormData();
    formData.append('image', blob, `scan_${sequence}.jpg`);
    formData.append('sequence', sequence);

    try {
      const res = await fetch('/api/scan/capture', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Veritas: capture upload skipped (no backend reachable yet)', err);
      return null;
    }
  };

})();
