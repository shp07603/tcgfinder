// ===================== APP STATE =====================
const GEMINI_API_KEY = "AIzaSyB9LT3y2aMOkMbFJOHmAa020PQv3vAOCx8";
let previousScreen = 'home';
let cameraStream = null;
let capturedImageData = null;
let currentAiResult = null;
let scanning = false;

let currentFilter = 'all';
let currentSort = 'newest';
let searchQuery = '';

let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let myCollection = [];
let customCategories = [];

// ===================== AUDIO (SHUTTER SOUND) =====================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
async function playShutterSound() {
  try {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.05);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) { console.error("Audio error:", e); }
}

// ===================== REAL AI: GEMINI API =====================
async function callGeminiAI(base64Image) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const base64Data = base64Image.split(',')[1];

  const prompt = `Identify the Trading Card in this image.
  Focus on the NAME of the Pokemon or Athlete (at the top or center).
  Return ONLY a valid JSON object in KOREAN:
  {
    "name": "이름 (필수)",
    "set": "세트명",
    "rarity": "레어도",
    "category": "pokemon|sports|tcg",
    "hp": 0,
    "attacks": [{"name": "기술명", "desc": "설명", "dmg": "데미지"}],
    "stats": {}
  }`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }],
        generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
      })
    });

    const data = await response.json();
    if (!data.candidates) throw new Error("No candidates");
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}

// ===================== CAMERA & CAPTURE =====================
async function initCamera() {
  const video = document.getElementById('video-stream');
  if (!video) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, 
      audio: false 
    });
    cameraStream = stream;
    video.srcObject = stream;
    video.onloadedmetadata = () => video.play();
    video.style.display = 'block';
  } catch (err) { 
    console.error("Camera Error:", err);
    showToast('❌', '카메라 권한을 허용해 주세요.'); 
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
}

function captureFrame() {
  const video = document.getElementById('video-stream');
  const canvas = document.getElementById('capture-canvas');
  if (!video || video.videoWidth === 0) return null;

  const ctx = canvas.getContext('2d');
  const vWidth = video.videoWidth;
  const vHeight = video.videoHeight;
  
  // 3:4 중앙 크롭
  let targetW, targetH, startX, startY;
  if (vWidth / vHeight > 3 / 4) {
    targetH = vHeight; targetW = vHeight * (3 / 4);
    startX = (vWidth - targetW) / 2; startY = 0;
  } else {
    targetW = vWidth; targetH = vWidth * (4 / 3);
    startX = 0; startY = (vHeight - targetH) / 2;
  }

  canvas.width = 600; canvas.height = 800;
  ctx.drawImage(video, startX, startY, targetW, targetH, 0, 0, 600, 800);
  return canvas.toDataURL('image/jpeg', 0.8);
}

// ===================== NAVIGATION =====================
function goScreen(name) {
  const screens = document.querySelectorAll('.screen');
  const target = document.getElementById('screen-' + name);
  if (!target) return;

  screens.forEach(s => s.classList.remove('active'));
  target.classList.add('active');

  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(b => b.classList.remove('active'));
  const nb = document.getElementById('nav-' + name);
  if (nb) nb.classList.add('active');

  const nav = document.getElementById('nav');
  const noNavScreens = ['detail', 'guide', 'about', 'privacy', 'contact'];
  if (nav) nav.style.display = noNavScreens.includes(name) ? 'none' : 'flex';

  if (name === 'scan') {
    if (!currentUser) { showToast('🔑', '로그인이 필요합니다'); goScreen('profile'); return; }
    resetScan(); initCamera();
  } else { stopCamera(); }

  if (name === 'collection') { renderCategoryChips(); renderCollection(); }
  if (name === 'home') renderRecentCards();
  updateStats();
}

// ===================== UI UPDATE =====================
function updateUserUI() {
  const loggedOut = document.getElementById('profile-logged-out');
  const loggedIn = document.getElementById('profile-logged-in');
  const headerAvatar = document.getElementById('header-avatar');
  const userPhoto = document.getElementById('user-photo');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');

  if (currentUser) {
    if (loggedOut) loggedOut.style.display = 'none';
    if (loggedIn) loggedIn.style.display = 'flex';
    if (userName) userName.textContent = currentUser.name;
    if (userEmail) userEmail.textContent = currentUser.email;
    const pic = currentUser.picture || '👤';
    if (headerAvatar) headerAvatar.textContent = pic;
    if (userPhoto) userPhoto.textContent = pic;
  } else {
    if (loggedOut) loggedOut.style.display = 'flex';
    if (loggedIn) loggedIn.style.display = 'none';
    if (headerAvatar) headerAvatar.textContent = '👤';
    renderGoogleButton();
  }
}

function renderGoogleButton() {
  const btnContainer = document.getElementById("google-login-btn");
  if (btnContainer && typeof google !== 'undefined') {
    google.accounts.id.renderButton(btnContainer, { theme: "outline", size: "large", width: 240, shape: "pill" });
  }
}

function updateStats() {
  const totalEl = document.getElementById('total-count');
  const subEl = document.getElementById('coll-sub');
  const profTotal = document.getElementById('prof-total');
  const profWish = document.getElementById('prof-wish');

  const total = myCollection.length;
  const wish = myCollection.filter(c => c.wish).length;

  if (totalEl) totalEl.textContent = total;
  if (subEl) subEl.textContent = `${total}장 보유중`;
  if (profTotal) profTotal.textContent = total;
  if (profWish) profWish.textContent = wish;
}

// ===================== COLLECTION & CATEGORY =====================
function renderCollection() {
  const grid = document.getElementById('coll-grid');
  if (!grid) return;
  const filtered = myCollection.filter(c => 
    (currentFilter === 'all' || c.category === currentFilter) && 
    (!searchQuery || c.name.toLowerCase().includes(searchQuery))
  );
  
  grid.innerHTML = filtered.map((card) => {
    const realIdx = myCollection.indexOf(card);
    return `
      <div class="cg-card" onclick="openCapturedDetail(${realIdx})">
        <div class="cg-bg"><img src="${card.image}" style="width:100%; height:100%; object-fit:cover;"></div>
        <div class="cg-overlay"><div class="cg-name">${card.name}</div><div class="cg-rare">${card.rarity || ""}</div></div>
      </div>
    `;
  }).join('') + `<div class="cg-add" onclick="goScreen('scan')"><div class="cg-add-icon">+</div><div class="cg-add-lbl">카드 추가</div></div>`;
}

function renderCategoryChips() {
  const row = document.getElementById('filter-row');
  if (!row) return;
  row.innerHTML = `
    <div class="chip ${currentFilter==='all'?'active':''}" onclick="currentFilter='all';renderCollection();renderCategoryChips()">전체</div>
    <div class="chip ${currentFilter==='pokemon'?'active':''}" onclick="currentFilter='pokemon';renderCollection();renderCategoryChips()">포켓몬</div>
    <div class="chip ${currentFilter==='sports'?'active':''}" onclick="currentFilter='sports';renderCollection();renderCategoryChips()">스포츠</div>
    ${customCategories.map(cat => `<div class="chip ${currentFilter===cat?'active':''}" onclick="currentFilter='${cat}';renderCollection();renderCategoryChips()">${cat}</div>`).join('')}
    <div class="chip" onclick="addCategory()" style="background:var(--gold-dim); border-color:var(--gold); color:var(--gold); margin-left:auto;">+ 추가</div>
  `;
}

function addCategory() {
  const n = prompt('새 카테고리 이름?');
  if (n && n.trim()) {
    customCategories.push(n.trim());
    localStorage.setItem(`categories_${currentUser.email}`, JSON.stringify(customCategories));
    renderCategoryChips();
  }
}

// ===================== TRIGGER SCAN =====================
async function triggerScan() {
  if (scanning) return;
  scanning = true;
  playShutterSound();
  
  const img = captureFrame();
  if (!img) { showToast('⚠️', '카메라를 확인해 주세요.'); scanning = false; return; }
  capturedImageData = img;

  const flash = document.getElementById('camera-flash');
  if (flash) { flash.classList.add('flash-anim'); setTimeout(() => flash.classList.remove('flash-anim'), 400); }

  showToast('🔍', '카드를 식별하고 있습니다...');
  const res = await callGeminiAI(img);
  
  if (res && res.name) {
    currentAiResult = res;
    document.getElementById('ai-thumb').innerHTML = `<img src="${img}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
    document.getElementById('ai-name').textContent = res.name;
    document.getElementById('ai-set').textContent = res.set || "";
    document.getElementById('ai-rarity').textContent = res.rarity || "";
    document.getElementById('ai-cat').textContent = res.category;
    document.getElementById('ai-result').style.display = 'block';
    showToast('✨', '인식 완료!');
  } else {
    showToast('❌', '인식에 실패했습니다.');
  }
  scanning = false;
}

// ===================== REMAINING LOGIC =====================
function openCapturedDetail(index) {
  const card = myCollection[index];
  if (!card) return;
  document.getElementById('d-name').textContent = card.name;
  document.getElementById('d-set').textContent = `${card.set || ""} ${card.rarity || ""}`;
  document.getElementById('d-showcase').innerHTML = `<img src="${card.image}" style="width:100%;height:100%;object-fit:cover;">`;
  document.getElementById('detail-back').onclick = () => goScreen('collection');
  document.getElementById('detail-delete-btn').onclick = () => { if(confirm('삭제할까요?')) { myCollection.splice(index,1); saveUserCollection(); goScreen('collection'); } };
  goScreen('detail');
}

function addToCollection() {
  if (!currentAiResult || !capturedImageData) return;
  myCollection.unshift({ ...currentAiResult, image: capturedImageData, date: new Date().toISOString() });
  saveUserCollection(); showToast('✅', '저장되었습니다!'); goScreen('collection');
}

function resetScan() { document.getElementById('ai-result').style.display = 'none'; capturedImageData = null; currentAiResult = null; }

function handleCredentialResponse(r) {
  const u = JSON.parse(decodeURIComponent(escape(window.atob(r.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
  currentUser = { name: u.name, email: u.email, picture: '👤' };
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  loadUserData(); updateUserUI(); goScreen('home');
}

function loadUserData() {
  if (currentUser) {
    myCollection = JSON.parse(localStorage.getItem(`collection_${currentUser.email}`)) || [];
    customCategories = JSON.parse(localStorage.getItem(`categories_${currentUser.email}`)) || [];
  }
}

function saveUserCollection() { if (currentUser) localStorage.setItem(`collection_${currentUser.email}`, JSON.stringify(myCollection)); }

function renderRecentCards() {
  const scroll = document.querySelector('.recent-scroll');
  if(!scroll || myCollection.length === 0) return;
  scroll.innerHTML = myCollection.slice(0, 5).map((c, i) => `
    <div class="r-card" onclick="openCapturedDetail(${myCollection.indexOf(c)})">
      <div class="r-card-img"><img src="${c.image}" style="width:100%; height:100%; object-fit:cover;"></div>
      <div class="r-card-name">${c.name}</div>
    </div>
  `).join('');
}

window.onload = () => {
  if (typeof google !== 'undefined') google.accounts.id.initialize({ client_id: "724218200034-j2oa5nfjnilom3m56jchg1pcf26u3kkf.apps.googleusercontent.com", callback: handleCredentialResponse });
  loadUserData(); updateUserUI();
  const searchInput = document.getElementById('coll-search-input');
  if (searchInput) searchInput.addEventListener('input', (e) => { searchQuery = e.target.value.toLowerCase(); renderCollection(); });
  setInterval(() => {
    const now = new Date();
    document.querySelectorAll('.real-time-clock').forEach(el => el.textContent = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`);
  }, 1000);
  goScreen('home');
};

function showToast(icon, msg) {
  const tIcon = document.getElementById('toast-icon');
  const tMsg = document.getElementById('toast-msg');
  const t = document.getElementById('toast');
  if (tIcon) tIcon.textContent = icon;
  if (tMsg) tMsg.textContent = msg;
  if (t) { t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); }
}
async function handleContactSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const btn = document.getElementById('contact-submit-btn');
  btn.disabled = true; btn.textContent = '보내는 중...';
  try {
    const response = await fetch('https://formspree.io/f/mbdakepa', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    });
    if (response.ok) { showToast('✉️', '문의가 전달되었습니다!'); form.reset(); setTimeout(() => goScreen('profile'), 1500); }
  } catch (e) { showToast('❌', '오류 발생'); } finally { btn.disabled = false; btn.textContent = '문의 보내기'; }
}
