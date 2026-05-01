// ══════════════════════════════════════════════
//  Quality Video TikTok v2 (Telegram Mini App)
//  by D4nzxml
// ══════════════════════════════════════════════

// --- Inisialisasi Telegram Mini App ---
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();
tg.backgroundColor = "#000000"; 
tg.headerColor = "#000000";

// ═════════ SISTEM LOGIN & TRIAL TELEGRAM ═════════
// Tarik data user dari Telegram (Kalau dites di PC akan jadi 'Guest')
const tgUser = tg.initDataUnsafe?.user;
const userId = tgUser?.id || 'DEV_TEST_123';
const userName = tgUser?.first_name || 'Modder';

let isTrialExpired = false;
let isPremium = false; // Nanti ini diubah jadi true kalau user udah bayar

function initTrialSystem() {
  const trialKey = `d4nzxml_trial_start_${userId}`;
  let trialStart = localStorage.getItem(trialKey);

  // Kalau user baru pertama kali buka
  if (!trialStart) {
    trialStart = Date.now();
    localStorage.setItem(trialKey, trialStart);
  }

  // Hitung selisih hari
  const now = Date.now();
  const diffTime = Math.abs(now - parseInt(trialStart));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const sisaHari = 7 - diffDays;

  const statusBox = document.getElementById('statusBox');

  if (sisaHari <= 0 && !isPremium) {
    isTrialExpired = true;
    statusBox.innerHTML = `👋 Halo <b>${userName}</b>!<br>❌ Masa Trial 7 Hari kamu sudah habis.<br>Silakan hubungi @D4nzxml untuk Upgrade Premium.`;
    statusBox.className = 'status-box error';
    
    // Disable tombol utama
    document.getElementById('patchBtn').disabled = true;
    document.getElementById('patchBtn').innerHTML = '🔒 UPGRADE PREMIUM';
    document.getElementById('btnGenerate').disabled = true;
  } else if (!isPremium) {
    statusBox.innerHTML = `👋 Welcome <b>${userName}</b>!<br>✅ Akses VIP Terbuka (Sisa Trial: ${sisaHari} Hari).<br>Silakan pilih video untuk diproses.`;
    statusBox.className = 'status-box working';
  } else {
    statusBox.innerHTML = `👋 Welcome back <b>${userName}</b>!<br>👑 STATUS: PREMIUM LIFETIME.<br>Silakan pilih video untuk diproses.`;
    statusBox.className = 'status-box success';
  }
}
// Panggil sistem trial saat web diload
initTrialSystem();
// ══════════════════════════════════════════════════


const _CFG = {
  elstVal: 0x10000001,
  sigPvg:  '@Tiktok D4nzxmll',
  sigEnc:  'D4nzxml-v2.0',
};

// ── RIPPLE EFFECT ──────────────────────────────
function addRipple(btn) {
  btn.addEventListener('click', function(e) {
    if(btn.disabled) return; // Jangan ada efek kalau tombol dikunci
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}
document.querySelectorAll('.btn-main, .btn-secondary, .nav-btn, .upload-btn, .fps-item')
  .forEach(addRipple);

// ── NAVIGATION ─────────────────────────────────
const navBtns  = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    if (!target) return;
    sections.forEach(s => s.classList.remove('active'));
    navBtns.forEach(b => b.classList.remove('active'));
    document.getElementById(target).classList.add('active');
    btn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ── FPS RADIO ──────────────────────────────────
const fpsItems = document.querySelectorAll('.fps-item');
fpsItems.forEach(item => {
  item.addEventListener('click', () => {
    fpsItems.forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
  });
});

// ── HOME: FILE SELECTION ───────────────────────
const fileInput   = document.getElementById('fileInput');
const fileDisplay = document.getElementById('fileDisplay');
const statusBox   = document.getElementById('statusBox');
const patchBtn    = document.getElementById('patchBtn');
let   selectedFile = null;

function setStatus(msg, type = '') {
  statusBox.innerHTML = msg; // Ganti ke innerHTML biar bisa pakai tag <br>
  statusBox.className   = 'status-box' + (type ? ' ' + type : '');
}

document.getElementById('selectLabel').addEventListener('click', (e) => {
    if (isTrialExpired) {
        e.preventDefault();
        tg.showAlert("Masa trial kamu habis! Upgrade Premium untuk upload video.");
        return;
    }
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (isTrialExpired) return; 

  selectedFile = e.target.files[0];
  if (selectedFile) {
    fileDisplay.textContent = '📄 ' + selectedFile.name;
    fileDisplay.classList.add('has-file');
    patchBtn.disabled = false;
    setStatus('File siap diproses.', 'ready');
    // Auto-fill nama file di Termux section
    const fnInput = document.getElementById('fileName');
    if (fnInput && !fnInput.value) fnInput.value = selectedFile.name;
  }
});

// ── CORE: MP4 PATCH ────────────────────────────
function inplacePatch(data, searchStr, replaceStr) {
  const enc = new TextEncoder();
  const sb  = enc.encode(searchStr);
  const rb  = enc.encode(replaceStr);
  const len = sb.length;
  for (let i = 0; i <= data.length - len; i++) {
    let match = true;
    for (let j = 0; j < len; j++) {
      if (data[i + j] !== sb[j]) { match = false; break; }
    }
    if (match) {
      for (let j = 0; j < len; j++) data[i + j] = j < rb.length ? rb[j] : 0x00;
      return true;
    }
  }
  return false;
}

function patchElst(data, view) {
  const magic = [0x65, 0x6C, 0x73, 0x74];
  for (let i = 0; i <= data.length - 4; i++) {
    if (data[i] === magic[0] && data[i+1] === magic[1] &&
        data[i+2] === magic[2] && data[i+3] === magic[3]) {
      view.setUint32(i + 8, _CFG.elstVal, false);
      return true;
    }
  }
  return false;
}

// ── HOME: PROCESS & DOWNLOAD ───────────────────
patchBtn.addEventListener('click', async () => {
  if (isTrialExpired) {
      tg.showAlert("Silakan Upgrade Premium ke @D4nzxml untuk menggunakan fitur ini.");
      return;
  }
  if (!selectedFile) return;
  patchBtn.disabled = true;
  setStatus('🔍 Menganalisis struktur file...', 'working');
  try {
    const arrayBuffer = await selectedFile.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const log  = [];

    setStatus('⚙️ Memproses file...', 'working');
    if (patchElst(data, view)) {
      log.push('✓ Struktur video diproses');
    } else {
      throw new Error('Format tidak didukung. Pastikan file adalah MP4 valid (H.264).');
    }

    const pvgSearch  = 'PyPVG-10.0.0.2.203';
    const pvgReplace = '@Tiktok D4nzxmll\x00\x00\x00';
    if (inplacePatch(data, pvgSearch, pvgReplace)) {
      log.push('✓ Signature FlyMediaPVG ditanam');
    }

    const encSearch  = 'Lavf61.7.100';
    const encReplace = 'D4nzxml-v2.0';
    if (inplacePatch(data, encSearch, encReplace)) {
      log.push('✓ Encoder tag D4nzxml-v2.0 ditanam');
    }

    setStatus('📦 Menyiapkan file untuk diunduh...', 'working');
    const blob = new Blob([arrayBuffer], { type: selectedFile.type || 'video/mp4' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    const base = selectedFile.name.replace(/\.[^/.]+$/, '');
    a.download = base + '_clean.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus(log.join('<br>') + '<br>✅ Selesai! File diunduh → ' + base + '_clean.mp4', 'success');
  } catch (err) {
    setStatus('❌ Error: ' + err.message, 'error');
  } finally {
    patchBtn.disabled = false;
  }
});

// ── TERMUX: GENERATE COMMAND ───────────────────
const btnGenerate = document.getElementById('btnGenerate');
const outputCard  = document.getElementById('outputCard');
const cmdOutput   = document.getElementById('cmdOutput');
const btnCopy     = document.getElementById('btnCopy');

btnGenerate.addEventListener('click', () => {
  if (isTrialExpired) {
      tg.showAlert("Fitur Termux dikunci. Upgrade Premium untuk membuka.");
      return;
  }

  let dirPath  = document.getElementById('dirPath').value.trim();
  const fileName = document.getElementById('fileName').value.trim();

  if (!fileName) {
    cmdOutput.textContent = '';
    outputCard.classList.remove('visible');
    tg.showAlert('Isi nama file video terlebih dahulu!');
    return;
  }
  if (!dirPath.endsWith('/')) dirPath += '/';

  const fps        = document.querySelector('.fps-item.selected')?.dataset.fps || '60';
  const outputName = 'output_' + fps + 'fps.mp4';
  const cmd        = 'ffmpeg -i "' + dirPath + fileName + '" -r ' + fps +
                     ' -c:v libx264 -preset fast "' + dirPath + outputName + '"';

  cmdOutput.textContent = cmd;
  outputCard.classList.add('visible');

  // Bounce animation pada card
  outputCard.style.animation = 'none';
  requestAnimationFrame(() => {
    outputCard.style.animation = '';
    outputCard.classList.add('visible');
  });
});

btnCopy.addEventListener('click', () => {
  const text = cmdOutput.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    btnCopy.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> TERSALIN!`;
    btnCopy.classList.add('copied');
    // Efek getar HP kalau didukung Telegram
    tg.HapticFeedback.notificationOccurred('success');
    setTimeout(() => {
      btnCopy.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> COPY COMMAND`;
      btnCopy.classList.remove('copied');
    }, 2200);
  });
});

// ── PARTICLE BACKGROUND ─────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx    = canvas.getContext('2d');
  let   parts  = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  class P {
    constructor() {
      this.x  = Math.random() * canvas.width;
      this.y  = Math.random() * canvas.height;
      this.r  = Math.random() * 1.4 + 0.3;
      this.vx = (Math.random() - 0.5) * 0.45;
      this.vy = (Math.random() - 0.5) * 0.45;
    }
    tick() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width)  this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height)  this.vy *= -1;
    }
    draw() {
      ctx.fillStyle = 'rgba(0,210,255,0.35)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function init() {
    parts = [];
    const n = Math.floor((canvas.width * canvas.height) / 10000);
    for (let i = 0; i < n; i++) parts.push(new P());
  }

  function connect() {
    const thr = (canvas.width / 7) * (canvas.height / 7);
    for (let a = 0; a < parts.length; a++) {
      for (let b = a + 1; b < parts.length; b++) {
        const dx = parts[a].x - parts[b].x;
        const dy = parts[a].y - parts[b].y;
        const d  = dx * dx + dy * dy;
        if (d < thr) {
          ctx.strokeStyle = `rgba(0,210,255,${0.08 * (1 - d / thr)})`;
          ctx.lineWidth   = 0.6;
          ctx.beginPath();
          ctx.moveTo(parts[a].x, parts[a].y);
          ctx.lineTo(parts[b].x, parts[b].y);
          ctx.stroke();
        }
      }
    }
  }

  function frame() {
    requestAnimationFrame(frame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach(p => { p.tick(); p.draw(); });
    connect();
  }

  resize();
  init();
  frame();
  window.addEventListener('resize', () => { resize(); init(); });
})();
