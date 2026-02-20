// ===================== 1. APP STATE & CONSTANTS =====================
// Version: 1.0.3 - Final Robust Fix
const _k1 = "AIzaSyB9LT3y2aM";
const _k2 = "OkMbFJOHmAa020P";
const _k3 = "Qv3vAOCx8";
const DEFAULT_GEMINI_KEY = _k1 + _k2 + _k3;

let geminiApiKey = localStorage.getItem('user_gemini_key') || DEFAULT_GEMINI_KEY;
const pokemonTcgKey = "706eeb3d-41bf-49e0-9e9d-acca2c909f1e";

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
  window.toastTimer = setTimeout(() => t.classList.remove('show'), 4000);
}

function updateClock() {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  document.querySelectorAll('.real-time-clock').forEach(el => el.textContent = timeStr);
}

// ===================== 3. DATA MANAGEMENT =====================
function loadUserData() {
  if (!currentUser) { myCollection = []; customCategories = []; return; }
  try {
    myCollection = JSON.parse(localStorage.getItem(`collection_${currentUser.email}`)) || [];
    customCategories = JSON.parse(localStorage.getItem(`categories_${currentUser.email}`)) || [];
    const profiles = JSON.parse(localStorage.getItem('userProfiles')) || {};
    if (profiles[currentUser.email]) {
      currentUser.name = profiles[currentUser.email].name;
      currentUser.picture = profiles[currentUser.email].picture;
    }
  } catch (e) { console.error("Data load error:", e); myCollection = []; }
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
  } catch (err) { showToast('❌', '카메라 권한을 허용해 주세요.'); }
}

function stopCamera() {
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
}

function captureFrame() {
  const video = document.getElementById('video-stream');
  const canvas = document.getElementById('capture-canvas');
  if (!video || video.videoWidth === 0 || !canvas) return null;
  const ctx = canvas.getContext('2d');
  const vw = video.videoWidth, vh = video.videoHeight;
  let tw, th, sx, sy;
  if (vw / vh > 3 / 4) { th = vh; tw = vh * (3 / 4); sx = (vw - tw) / 2; sy = 0; }
  else { tw = vw; th = vw * (4 / 3); sx = 0; sy = (vh - th) / 2; }
  canvas.width = 720; canvas.height = 960;
  ctx.drawImage(video, sx, sy, tw, th, 0, 0, 720, 960);
  return canvas.toDataURL('image/jpeg', 0.8);
}

async function callGeminiAI(base64Image) {
  if (!base64Image || !base64Image.includes(',')) return null;
  // 최신 키를 매번 가져오도록 보장
  const currentKey = localStorage.getItem('user_gemini_key') || DEFAULT_GEMINI_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${currentKey}`;
  const prompt = `Identify this TCG card. Respond ONLY with a JSON object.
  {
    "name": "Full English Name for Database Search",
    "name_ko": "한국어 카드 이름",
    "set": "Set Name",
    "category": "pokemon"
  }`;

  try {
    const rawData = base64Image.split(',')[1];
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: rawData } }] }],
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.candidates || !data.candidates[0].content) throw new Error("분석 실패 (이미지를 더 밝게 찍어주세요)");
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (e) {
    console.error("AI Error:", e);
    showToast('❌', e.message);
    return null;
  }
}

async function searchPokemonDB(cardName) {
  if (!cardName) return null;
  const query = encodeURIComponent(cardName);
  try {
    const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${query}"&pageSize=1`, {
      headers: { 'X-Api-Key': pokemonTcgKey } 
    });
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      const card = data.data[0];
      return {
        hp: card.hp || 0,
        rarity: card.rarity || 'Common',
        image: card.images.large || card.images.small,
        attacks: card.attacks || [],
        verified: true
      };
    }
  } catch (e) { console.warn("DB Search failed", e); }
  return null;
}

async function triggerScan() {
  if (scanning) return;
  scanning = true;
  const img = captureFrame();
  if (!img) { showToast('⚠️', '카메라가 준비되지 않았습니다.'); scanning = false; return; }
  await processImage(img);
  scanning = false;
}

async function processImage(base64Data) {
  capturedImageData = base64Data;
  document.getElementById('ai-result').style.display = 'none';
  showToast('🔍', 'AI가 카드를 분석하고 있습니다...');
  
  const aiRes = await callGeminiAI(base64Data);
  if (!aiRes || !aiRes.name) return;

  showToast('📡', 'DB에서 카드 정보를 확인 중...');
  let dbData = await searchPokemonDB(aiRes.name);

  const finalResult = {
    name: aiRes.name_ko || aiRes.name,
    name_en: aiRes.name,
    set: aiRes.set,
    category: aiRes.category,
    rarity: dbData ? dbData.rarity : "Unknown",
    hp: dbData ? dbData.hp : 0,
    attacks: dbData ? dbData.attacks : [],
    image: base64Data
  };

  currentAiResult = finalResult;
  document.getElementById('ai-thumb').innerHTML = `<img src="${base64Data}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
  document.getElementById('ai-name').textContent = finalResult.name;
  document.getElementById('ai-set').textContent = finalResult.set || "";
  document.getElementById('ai-rarity').textContent = finalResult.rarity;
  document.getElementById('ai-cat').textContent = finalResult.category;
  
  const tag = document.querySelector('.ai-tag');
  tag.innerHTML = dbData ? "✦ DB 검증됨 ✅" : "✦ AI 인식 결과";
  tag.style.color = dbData ? "var(--green)" : "var(--gold)";

  document.getElementById('ai-result').style.display = 'block';
  document.getElementById('ai-result').scrollIntoView({ behavior: 'smooth' });
  showToast('✨', '인식 성공!');
}

function handleGallerySelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 720; canvas.height = 960;
      const iw = img.width, ih = img.height;
      let tw, th, sx, sy;
      if (iw / ih > 3 / 4) { th = ih; tw = ih * (3 / 4); sx = (iw - tw) / 2; sy = 0; }
      else { tw = iw; th = iw * (4 / 3); sx = 0; sy = (ih - th) / 2; }
      ctx.drawImage(img, sx, sy, tw, th, 0, 0, 720, 960);
      processImage(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
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
  if (document.getElementById('total-count')) document.getElementById('total-count').textContent = total;
  if (document.getElementById('coll-sub')) document.getElementById('coll-sub').textContent = `${total}장 보유중`;
  if (document.getElementById('prof-total')) document.getElementById('prof-total').textContent = total;
  if (document.getElementById('prof-wish')) document.getElementById('prof-wish').textContent = wish;
}

function renderCollection() {
  const grid = document.getElementById('coll-grid');
  if (!grid) return;
  const filtered = myCollection.filter(c => 
    (currentFilter === 'all' || c.category === currentFilter) && 
    (!searchQuery || c.name.toLowerCase().includes(searchQuery))
  );
  grid.innerHTML = filtered.map(card => {
    const idx = myCollection.indexOf(card);
    return `<div class="cg-card" onclick="openCapturedDetail(${idx})"><div class="cg-bg"><img src="${card.image}" style="width:100%; height:100%; object-fit:cover;"></div><div class="cg-overlay"><div class="cg-name">${card.name}</div><div class="cg-rare">${card.rarity || ""}</div></div></div>`;
  }).join('') + `<div class="cg-add" onclick="goScreen('scan')"><div class="cg-add-icon">+</div><div class="cg-add-lbl">카드 추가</div></div>`;
}

function renderCategoryChips() {
  const row = document.getElementById('filter-row');
  if (!row) return;
  row.innerHTML = `<div class="chip ${currentFilter==='all'?'active':''}" onclick="setFilter('all')">전체</div><div class="chip ${currentFilter==='pokemon'?'active':''}" onclick="setFilter('pokemon')">포켓몬</div><div class="chip ${currentFilter==='sports'?'active':''}" onclick="setFilter('sports')">스포츠</div>${customCategories.map(cat => `<div class="chip ${currentFilter===cat?'active':''}" onclick="setFilter('${cat}')">${cat}</div>`).join('')}<div class="chip" onclick="addCategory()" style="background:var(--gold-dim); border-color:var(--gold); color:var(--gold); margin-left:auto;">+ 추가</div>`;
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
  if (myCollection.length === 0) { scroll.innerHTML = '<div style="padding:20px; color:var(--text3); font-size:12px;">최근 추가된 카드가 없습니다</div>'; return; }
  scroll.innerHTML = myCollection.slice(0, 5).map(card => `<div class="r-card" onclick="openCapturedDetail(${myCollection.indexOf(card)})"><div class="r-card-img"><img src="${card.image}" style="width:100%; height:100%; object-fit:cover;"></div><div class="r-card-name">${card.name}</div></div>`).join('');
}

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
    document.getElementById('d-attacks').innerHTML = card.attacks.map(a => `<div class="attack-row"><div class="atk-info"><div class="atk-name">${a.name}</div><div class="atk-desc">${a.desc || ""}</div></div><div class="atk-dmg">${a.dmg || ""}</div></div>`).join('');
  } else { atkS.style.display = 'none'; }
  document.getElementById('detail-back').onclick = () => goScreen('collection');
  document.getElementById('detail-delete-btn').onclick = () => { if(confirm('삭제할까요?')) { myCollection.splice(index,1); saveUserCollection(); goScreen('collection'); } };
  goScreen('detail');
}

function addToCollection() {
  if (!currentAiResult || !capturedImageData) return;
  myCollection.unshift({ ...currentAiResult, image: capturedImageData, date: new Date().toISOString() });
  saveUserCollection();
  showToast('✅', '컬렉션에 추가되었습니다!');
  goScreen('collection');
}

function handleCredentialResponse(r) {
  try {
    const u = JSON.parse(decodeURIComponent(escape(window.atob(r.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
    currentUser = { name: u.name, email: u.email, picture: '👤' };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    loadUserData(); updateUserUI(); goScreen('home');
  } catch (e) { console.error("Auth error:", e); }
}

function handleLogout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    currentUser = null; localStorage.removeItem('currentUser');
    loadUserData(); updateUserUI(); goScreen('home');
    showToast('👋', '로그아웃 되었습니다.');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const target = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', target);
  localStorage.setItem('theme', target);
  showToast(target === 'dark' ? '🌙' : '☀️', `${target === 'dark' ? '다크' : '라이트'} 모드로 변경됨`);
}

function shareCollection() {
  if (myCollection.length === 0) { showToast('⚠️', '공유할 카드가 없습니다.'); return; }
  if (navigator.share) {
    navigator.share({ title: '나의 TCG 컬렉션', text: `TCGfinder에서 나의 ${myCollection.length}장의 카드를 구경해보세요!`, url: window.location.href })
    .then(() => showToast('📤', '공유 완료!'))
    .catch((error) => console.log('Error sharing', error));
  } else { showToast('❌', '이 기기에서는 공유 기능이 지원되지 않습니다.'); }
}

async function requestFullPermissions() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    showToast('✅', '카메라 권한이 허용되었습니다.');
  } catch (err) { showToast('❌', '권한 요청에 실패했습니다.'); }
}

function openEditProfile() {
  if (!currentUser) return;
  const modal = document.getElementById('edit-profile-modal');
  document.getElementById('edit-nickname').value = currentUser.name || '';
  document.getElementById('edit-preview-icon').textContent = currentUser.picture || '👤';
  const avatars = ['👤', '🐱', '🐶', '🦊', '🦁', '🐸', '🤖', '👾', '⭐', '🔥', '⚡', '💎', '🦄', '🐲', '👻'];
  document.getElementById('avatar-picker').innerHTML = avatars.map(a => `<div class="avatar-option" onclick="selectAvatar('${a}')">${a}</div>`).join('');
  modal.style.display = 'flex';
}

function closeEditProfile() { document.getElementById('edit-profile-modal').style.display = 'none'; }
function selectAvatar(icon) { window.selectedAvatar = icon; document.getElementById('edit-preview-icon').textContent = icon; }

function saveProfile() {
  const newName = document.getElementById('edit-nickname').value.trim();
  if (!newName) { showToast('⚠️', '닉네임을 입력해주세요.'); return; }
  const newPic = window.selectedAvatar || currentUser.picture || '👤';
  currentUser.name = newName; currentUser.picture = newPic;
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  const profiles = JSON.parse(localStorage.getItem('userProfiles')) || {};
  profiles[currentUser.email] = { name: newName, picture: newPic };
  localStorage.setItem('userProfiles', JSON.stringify(profiles));
  updateUserUI(); closeEditProfile(); showToast('✅', '프로필이 수정되었습니다.');
}

function setGeminiKey() {
  const currentKey = geminiApiKey === DEFAULT_GEMINI_KEY ? "" : geminiApiKey;
  const newKey = prompt("Gemini API 키를 입력해 주세요 (비워두면 기본 키 사용):", currentKey);
  if (newKey !== null) {
    if (newKey.trim() === "") {
      localStorage.removeItem('user_gemini_key'); geminiApiKey = DEFAULT_GEMINI_KEY;
      showToast('🔄', '기본 API 키로 재설정되었습니다.');
    } else {
      localStorage.setItem('user_gemini_key', newKey.trim()); geminiApiKey = newKey.trim();
      showToast('✅', 'API 키가 업데이트되었습니다.');
    }
  }
}

const GUIDE_CONTENT = {
  usage: { title: 'TCGfinder 앱 사용법', body: `<h3>반갑습니다!</h3><p>TCGfinder는 AI로 카드를 관리하는 도구입니다.</p><h3>1. 카드 스캔</h3><p>중앙 📷 버튼으로 AI 스캔을 시작하세요.</p><h3>2. 컬렉션</h3><p>저장된 카드는 언제든 상세 정보와 기술을 확인할 수 있습니다.</p>` },
  scan: { title: 'AI 스캔 팁', body: `<h3>정확한 인식을 위해</h3><ul><li>밝은 곳에서 촬영하세요.</li><li>카드가 가이드 사각형에 꽉 차게 맞춰주세요.</li><li>빛 반사가 심하면 각도를 살짝 조절하세요.</li></ul>` },
  storage: { title: '카드 보관법', body: `<h3>가치 보존</h3><p>고가의 카드는 '슬리브'와 '탑로더'에 이중으로 보관하는 것을 추천합니다. 습기와 직사광선을 피하세요.</p>` }
};

function openGuide(slug) {
  const guide = GUIDE_CONTENT[slug];
  if (!guide) return;
  document.getElementById('guide-title').textContent = guide.title;
  document.getElementById('guide-body').innerHTML = guide.body;
  goScreen('guide');
}

window.onload = () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (typeof google !== 'undefined') {
    google.accounts.id.initialize({ client_id: "724218200034-j2oa5nfjnilom3m56jchg1pcf26u3kkf.apps.googleusercontent.com", callback: handleCredentialResponse });
  }
  loadUserData(); updateUserUI(); updateClock();
  const searchInput = document.getElementById('coll-search-input');
  if (searchInput) { searchInput.addEventListener('input', (e) => { searchQuery = e.target.value.toLowerCase(); renderCollection(); }); }
  setInterval(updateClock, 1000);
  goScreen('home');
};
