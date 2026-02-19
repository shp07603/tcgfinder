// ===================== 1. APP STATE & CONSTANTS =====================
const GEMINI_API_KEY = "AIzaSyB9LT3y2aMOkMbFJOHmAa020PQv3vAOCx8";
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let myCollection = [];
let customCategories = [];
let cameraStream = null;
let capturedImageData = null;
let currentAiResult = null;
let scanning = false;
let currentFilter = 'all';
let searchQuery = '';

// ===================== 2. CORE UTILS =====================
function showToast(icon, msg) {
  const t = document.getElementById('toast');
  const tIcon = document.getElementById('toast-icon');
  const tMsg = document.getElementById('toast-msg');
  if (!t || !tIcon || !tMsg) return;
  
  clearTimeout(window.toastTimer);
  tIcon.textContent = icon;
  tMsg.textContent = msg;
  t.classList.add('show');
  window.toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

function updateClock() {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  document.querySelectorAll('.real-time-clock').forEach(el => el.textContent = timeStr);
}

// ===================== 3. DATA MANAGEMENT =====================
function loadUserData() {
  if (!currentUser) {
    myCollection = [];
    customCategories = [];
    return;
  }
  try {
    myCollection = JSON.parse(localStorage.getItem(`collection_${currentUser.email}`)) || [];
    customCategories = JSON.parse(localStorage.getItem(`categories_${currentUser.email}`)) || [];
    const profiles = JSON.parse(localStorage.getItem('userProfiles')) || {};
    if (profiles[currentUser.email]) {
      currentUser.name = profiles[currentUser.email].name;
      currentUser.picture = profiles[currentUser.email].picture;
    }
  } catch (e) {
    console.error("Data load error:", e);
    myCollection = [];
  }
}

function saveUserCollection() {
  if (currentUser) localStorage.setItem(`collection_${currentUser.email}`, JSON.stringify(myCollection));
}

// ===================== 4. CAMERA & AI LOGIC =====================
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
    showToast('❌', '카메라를 켤 수 없습니다.');
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
}

function captureFrame() {
  const video = document.getElementById('video-stream');
  const canvas = document.getElementById('capture-canvas');
  if (!video || video.videoWidth === 0 || !canvas) return null;

  const ctx = canvas.getContext('2d');
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  
  // 3:4 중앙 크롭 계산
  let tw, th, sx, sy;
  if (vw / vh > 3 / 4) {
    th = vh; tw = vh * (3 / 4);
    sx = (vw - tw) / 2; sy = 0;
  } else {
    tw = vw; th = vw * (4 / 3);
    sx = 0; sy = (vh - th) / 2;
  }

  canvas.width = 600; canvas.height = 800;
  ctx.drawImage(video, sx, sy, tw, th, 0, 0, 600, 800);
  return canvas.toDataURL('image/jpeg', 0.8);
}

async function callGeminiAI(base64Image) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `Identify the card. Return ONLY JSON in Korean: {"name":"..","set":"..","rarity":"..","category":"pokemon|sports|tcg","hp":0,"attacks":[],"stats":{}}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Image.split(',')[1] } }] }],
        generationConfig: { response_mime_type: "application/json", temperature: 0.1 }
      })
    });
    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (e) {
    console.error("AI Error:", e);
    return null;
  }
}

async function triggerScan() {
  if (scanning) return;
  scanning = true;
  
  const img = captureFrame();
  if (!img) { showToast('⚠️', '카메라가 준비되지 않았습니다.'); scanning = false; return; }
  capturedImageData = img;

  showToast('🔍', '카드를 분석하고 있습니다...');
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
    showToast('❌', '인식 실패. 다시 찍어주세요.');
  }
  scanning = false;
}

// ===================== 5. NAVIGATION & UI =====================
function goScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if (!target) return;
  target.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const nb = document.getElementById('nav-' + name);
  if (nb) nb.classList.add('active');

  const noNav = ['detail', 'guide', 'about', 'privacy', 'contact'];
  const nav = document.getElementById('nav');
  if (nav) nav.style.display = noNav.includes(name) ? 'none' : 'flex';

  if (name === 'scan') {
    if (!currentUser) { showToast('🔑', '로그인이 필요합니다'); goScreen('profile'); return; }
    document.getElementById('ai-result').style.display = 'none';
    initCamera();
  } else { stopCamera(); }

  if (name === 'collection') { renderCategoryChips(); renderCollection(); }
  if (name === 'home') renderRecentCards();
  updateStats();
}

function updateUserUI() {
  const loggedOut = document.getElementById('profile-logged-out');
  const loggedIn = document.getElementById('profile-logged-in');
  const headerAv = document.getElementById('header-avatar');
  const userPh = document.getElementById('user-photo');
  const userNm = document.getElementById('user-name');
  const userEm = document.getElementById('user-email');

  if (currentUser) {
    if (loggedOut) loggedOut.style.display = 'none';
    if (loggedIn) loggedIn.style.display = 'flex';
    if (userNm) userNm.textContent = currentUser.name;
    if (userEm) userEm.textContent = currentUser.email;
    const pic = currentUser.picture || '👤';
    if (headerAv) headerAv.textContent = pic;
    if (userPh) userPh.textContent = pic;
  } else {
    if (loggedOut) loggedOut.style.display = 'flex';
    if (loggedIn) loggedIn.style.display = 'none';
    if (headerAv) headerAv.textContent = '👤';
    renderGoogleButton();
  }
}

function renderGoogleButton() {
  const container = document.getElementById("google-login-btn");
  if (container && typeof google !== 'undefined') {
    google.accounts.id.renderButton(container, { theme: "outline", size: "large", width: 240, shape: "pill" });
  }
}

function updateStats() {
  const total = myCollection.length;
  const wish = myCollection.filter(c => c.wish).length;
  
  const elTotal = document.getElementById('total-count');
  const elSub = document.getElementById('coll-sub');
  const elProfT = document.getElementById('prof-total');
  const elProfW = document.getElementById('prof-wish');

  if (elTotal) elTotal.textContent = total;
  if (elSub) elSub.textContent = `${total}장 보유중`;
  if (elProfT) elProfT.textContent = total;
  if (elProfW) elProfW.textContent = wish;
}

// ===================== 6. RENDER LISTS =====================
function renderCollection() {
  const grid = document.getElementById('coll-grid');
  if (!grid) return;
  const filtered = myCollection.filter(c => 
    (currentFilter === 'all' || c.category === currentFilter) && 
    (!searchQuery || c.name.toLowerCase().includes(searchQuery))
  );
  
  grid.innerHTML = filtered.map(card => {
    const idx = myCollection.indexOf(card);
    return `
      <div class="cg-card" onclick="openCapturedDetail(${idx})">
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
    <div class="chip ${currentFilter==='all'?'active':''}" onclick="setFilter('all')">전체</div>
    <div class="chip ${currentFilter==='pokemon'?'active':''}" onclick="setFilter('pokemon')">포켓몬</div>
    <div class="chip ${currentFilter==='sports'?'active':''}" onclick="setFilter('sports')">스포츠</div>
    ${customCategories.map(cat => `<div class="chip ${currentFilter===cat?'active':''}" onclick="setFilter('${cat}')">${cat}</div>`).join('')}
    <div class="chip" onclick="addCategory()" style="background:var(--gold-dim); border-color:var(--gold); color:var(--gold); margin-left:auto;">+ 추가</div>
  `;
}

function setFilter(f) { currentFilter = f; renderCategoryChips(); renderCollection(); }

function addCategory() {
  const n = prompt('새 카테고리 이름?');
  if (n && n.trim()) {
    customCategories.push(n.trim());
    if (currentUser) localStorage.setItem(`categories_${currentUser.email}`, JSON.stringify(customCategories));
    renderCategoryChips();
  }
}

function renderRecentCards() {
  const scroll = document.querySelector('.recent-scroll');
  if (!scroll) return;
  if (myCollection.length === 0) {
    scroll.innerHTML = '<div style="padding:20px; color:var(--text3); font-size:12px;">최근 추가된 카드가 없습니다</div>';
    return;
  }
  scroll.innerHTML = myCollection.slice(0, 5).map(card => `
    <div class="r-card" onclick="openCapturedDetail(${myCollection.indexOf(card)})">
      <div class="r-card-img"><img src="${card.image}" style="width:100%; height:100%; object-fit:cover;"></div>
      <div class="r-card-name">${card.name}</div>
    </div>
  `).join('');
}

// ===================== 7. DETAIL & ACTIONS =====================
function openCapturedDetail(index) {
  const card = myCollection[index];
  if (!card) return;
  
  document.getElementById('d-name').textContent = card.name;
  document.getElementById('d-set').textContent = `${card.set || ""} ${card.rarity || ""}`;
  document.getElementById('d-showcase').innerHTML = `<img src="${card.image}" style="width:100%;height:100%;object-fit:cover;">`;
  
  const hpS = document.getElementById('d-hp-section');
  if (card.hp) {
    hpS.style.display = 'block';
    document.getElementById('d-hp').textContent = `${card.hp} HP`;
    document.getElementById('d-hp-fill').style.width = Math.min((card.hp/340)*100, 100) + '%';
  } else { hpS.style.display = 'none'; }

  const atkS = document.getElementById('d-attacks-wrap');
  if (card.attacks && card.attacks.length > 0) {
    atkS.style.display = 'block';
    document.getElementById('d-attacks').innerHTML = card.attacks.map(a => `
      <div class="attack-row">
        <div class="atk-info"><div class="atk-name">${a.name}</div><div class="atk-desc">${a.desc || ""}</div></div>
        <div class="atk-dmg">${a.dmg || ""}</div>
      </div>
    `).join('');
  } else { atkS.style.display = 'none'; }

  document.getElementById('detail-back').onclick = () => goScreen('collection');
  document.getElementById('detail-delete-btn').onclick = () => {
    if(confirm('삭제할까요?')) { myCollection.splice(index,1); saveUserCollection(); goScreen('collection'); }
  };
  goScreen('detail');
}

function addToCollection() {
  if (!currentAiResult || !capturedImageData) return;
  myCollection.unshift({ ...currentAiResult, image: capturedImageData, date: new Date().toISOString() });
  saveUserCollection();
  showToast('✅', '저장되었습니다!');
  goScreen('collection');
}

// ===================== 8. AUTH CALLBACKS =====================
function handleCredentialResponse(r) {
  try {
    const u = JSON.parse(decodeURIComponent(escape(window.atob(r.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
    currentUser = { name: u.name, email: u.email, picture: '👤' };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    loadUserData(); updateUserUI(); goScreen('home');
  } catch (e) { console.error("Auth error:", e); }
}

// ===================== 9. INITIALIZATION =====================
window.onload = () => {
  if (typeof google !== 'undefined') {
    google.accounts.id.initialize({ 
      client_id: "724218200034-j2oa5nfjnilom3m56jchg1pcf26u3kkf.apps.googleusercontent.com", 
      callback: handleCredentialResponse 
    });
  }
  
  loadUserData();
  updateUserUI();
  updateClock();
  
  const searchInput = document.getElementById('coll-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderCollection();
    });
  }
  
  setInterval(updateClock, 1000);
  goScreen('home');
};
