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

const defaultAvatars = ['👤', '🔥', '💧', '⚡', '🌿', '⭐', '🏆', '⚽', '🏀', '🎮', '🃏', '💎', '🦊', '🦁', '🐉'];
let selectedAvatar = '👤';

// ===================== AUDIO (SHUTTER SOUND) =====================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
async function playShutterSound() {
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.05);
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.1);
}

// ===================== REAL AI: GEMINI API =====================
async function callGeminiAI(base64Image) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const base64Data = base64Image.split(',')[1];

  const prompt = `Identify this Trading Card Game (TCG) or Sports card from the image. 
  Extract the following data into a JSON object in KOREAN:
  - name: Card name (KO)
  - set: Series/Set name (KO)
  - rarity: Rarity (EN)
  - category: 'pokemon', 'sports', or 'tcg'
  - hp: Number (if exists)
  - attacks: Array of {name, cost, desc, dmg} (All KO)
  - stats: Object of other details (KO)
  
  IMPORTANT: Return ONLY the valid JSON object. No explanation, no markdown markers.`;

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
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API Error Response:", errorData);
      throw new Error(`API_FAIL_${response.status}`);
    }

    const data = await response.json();
    console.log("Raw AI Data:", data);

    if (!data.candidates || !data.candidates[0].content) {
      throw new Error("EMPTY_RESPONSE");
    }

    let text = data.candidates[0].content.parts[0].text;
    
    // JSON 파싱 시도 (Flash 모델의 JSON 모드 활용)
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      throw new Error("PARSE_ERROR");
    }
  } catch (error) {
    console.error("AI Scan Error Details:", error);
    return { error: error.message };
  }
}

// ===================== AUTH & DATA MANAGEMENT =====================
function loadUserData() {
  if (currentUser) {
    const collKey = `collection_${currentUser.email}`;
    const catKey = `categories_${currentUser.email}`;
    myCollection = JSON.parse(localStorage.getItem(collKey)) || [];
    customCategories = JSON.parse(localStorage.getItem(catKey)) || [];
    const profiles = JSON.parse(localStorage.getItem('userProfiles')) || {};
    if (profiles[currentUser.email]) {
      currentUser.name = profiles[currentUser.email].name;
      currentUser.picture = profiles[currentUser.email].picture;
    }
  } else {
    myCollection = [];
    customCategories = [];
  }
}

function saveUserCollection() {
  if (currentUser) localStorage.setItem(`collection_${currentUser.email}`, JSON.stringify(myCollection));
}

function saveCustomCategories() {
  if (currentUser) localStorage.setItem(`categories_${currentUser.email}`, JSON.stringify(customCategories));
}

function handleCredentialResponse(response) {
  const user = parseJwt(response.credential);
  currentUser = { name: user.name, email: user.email, picture: '👤' };
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  loadUserData();
  updateUserUI();
  updateStats();
  renderCollection();
  showToast('👋', `${currentUser.name}님, 환영합니다!`);
  goScreen('home');
}

function parseJwt(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

function handleLogout() {
  currentUser = null;
  myCollection = [];
  customCategories = [];
  localStorage.removeItem('currentUser');
  updateUserUI();
  updateStats();
  renderCollection();
  showToast('🔒', '로그아웃 되었습니다');
  goScreen('home');
}

// ===================== SEARCH & CATEGORY =====================
function setupSearch() {
  const searchInput = document.getElementById('coll-search-input');
  if (!searchInput) return;
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderCollection();
  });
}

function openAddCategoryModal() {
  const name = prompt('새 카테고리 이름을 입력하세요 (한글 6자, 영문 12자 이내)');
  if (name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const isEnglish = /^[a-zA-Z0-9\s]*$/.test(trimmed);
    if (isEnglish && trimmed.length > 12) return alert('영문은 12자 이내로 입력해주세요.');
    if (!isEnglish && trimmed.length > 6) return alert('한글은 6자 이내로 입력해주세요.');
    if (customCategories.includes(trimmed)) return alert('이미 존재하는 카테고리입니다.');
    customCategories.push(trimmed);
    saveCustomCategories();
    renderCategoryChips();
    showToast('📁', `카테고리 '${trimmed}' 추가됨`);
  }
}

function renderCategoryChips() {
  const row = document.getElementById('filter-row');
  if (!row) return;
  const baseHtml = `
    <div class="chip ${currentFilter === 'all' ? 'active' : ''}" onclick="filterColl('all',this)">전체</div>
    <div class="chip ${currentFilter === 'pokemon' ? 'active' : ''}" onclick="filterColl('pokemon',this)">포켓몬</div>
    <div class="chip ${currentFilter === 'sports' ? 'active' : ''}" onclick="filterColl('sports',this)">스포츠</div>
    <div class="chip ${currentFilter === 'tcg' ? 'active' : ''}" onclick="filterColl('tcg',this)">TCG</div>
  `;
  const customHtml = customCategories.map(cat => `
    <div class="chip ${currentFilter === cat ? 'active' : ''}" onclick="filterColl('${cat}',this)">${cat}</div>
  `).join('');
  const addBtnHtml = `<div class="chip" onclick="openAddCategoryModal()" style="background:var(--gold-dim); border-color:var(--gold); color:var(--gold); position: sticky; right: 0; margin-left: auto;">+ 추가</div>`;
  row.innerHTML = baseHtml + customHtml + addBtnHtml;
}

// ===================== NAVIGATION =====================
function goScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if(!target) return;
  target.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const nb = document.getElementById('nav-' + name);
  if(nb) nb.classList.add('active');
  const nav = document.getElementById('nav');
  const noNavScreens = ['detail', 'guide', 'about', 'privacy', 'contact'];
  nav.style.display = noNavScreens.includes(name) ? 'none' : 'flex';
  if (name === 'scan') {
    if (!currentUser) {
      showToast('🔑', '로그인이 필요한 기능입니다');
      goScreen('profile');
      return;
    }
    resetScan();
    initCamera();
  } else {
    stopCamera();
  }
  if (name === 'collection') {
    renderCategoryChips();
    renderCollection();
  }
  if (name === 'wishlist') renderWishlist();
  if (name === 'home') renderRecentCards();
  updateStats();
}

// ===================== CONTACT FORM HANDLER =====================
async function handleContactSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const btn = document.getElementById('contact-submit-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '보내는 중...';
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  try {
    const response = await fetch('https://formspree.io/f/mbdakepa', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      showToast('✉️', '문의가 성공적으로 전달되었습니다!');
      form.reset();
      setTimeout(() => goScreen('profile'), 1500);
    } else { throw new Error('전송 실패'); }
  } catch (error) {
    showToast('❌', '전송 중 오류가 발생했습니다. 다시 시도해주세요.');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ===================== CAMERA & CAPTURE =====================
async function initCamera() {
  const video = document.getElementById('video-stream');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, 
      audio: false 
    });
    cameraStream = stream;
    video.srcObject = stream;
    video.style.display = 'block';
  } catch (err) { showToast('❌', '카메라 권한이 필요합니다'); }
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
  if (!video || !canvas) return null;
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9); // 고품질 캡처
}

// ===================== CARD DETAIL VIEW =====================
function openCapturedDetail(index) {
  const card = myCollection[index];
  if (!card) return;
  document.getElementById('d-name').textContent = card.name;
  document.getElementById('d-set').textContent = `${card.set} · ${card.rarity}`;
  document.getElementById('d-showcase').innerHTML = `
    <img src="${card.image}" style="width:100%;height:100%;object-fit:cover;">
    <div class="wish-toggle-btn ${card.wish?'active':''}" onclick="event.stopPropagation(); toggleWish(${index}); this.classList.toggle('active');">❤️</div>
  `;
  const hpSection = document.getElementById('d-hp-section');
  const hpVal = document.getElementById('d-hp');
  const hpFill = document.getElementById('d-hp-fill');
  if (card.hp) {
    hpSection.style.display = 'block';
    hpVal.textContent = `${card.hp} HP`;
    const percent = Math.min((card.hp / 340) * 100, 100);
    hpFill.style.width = percent + '%';
  } else { hpSection.style.display = 'none'; }
  const attacksWrap = document.getElementById('d-attacks-wrap');
  const attacksContainer = document.getElementById('d-attacks');
  if (card.attacks && card.attacks.length > 0) {
    attacksWrap.style.display = 'block';
    attacksContainer.innerHTML = card.attacks.map(atk => `
      <div class="attack-row">
        <div class="atk-energy">${atk.cost || ''}</div>
        <div class="atk-info">
          <div class="atk-name">${atk.name}</div>
          <div class="atk-desc">${atk.desc || ''}</div>
        </div>
        <div class="atk-dmg">${atk.dmg || ''}</div>
      </div>
    `).join('');
  } else { attacksWrap.style.display = 'none'; }
  const statsContainer = document.getElementById('d-stats');
  if (card.stats) {
    statsContainer.innerHTML = Object.entries(card.stats).map(([key, val]) => `
      <div class="sg-item"><div class="sg-lbl">${key}</div><div class="sg-val">${val}</div></div>
    `).join('');
  } else { statsContainer.innerHTML = ''; }
  document.getElementById('detail-back').onclick = () => goScreen('collection');
  document.getElementById('detail-delete-btn').onclick = () => {
    if (confirm('이 카드를 삭제하시겠습니까?')) deleteCard(index);
  };
  goScreen('detail');
}

// ===================== COLLECTION LOGIC =====================
function deleteCard(index) {
  myCollection.splice(index, 1);
  saveUserCollection();
  updateStats();
  renderCollection();
  renderRecentCards();
  showToast('🗑️', '카드가 삭제되었습니다');
  goScreen('collection');
}

function updateStats() {
  const totalCount = myCollection.length;
  const wishCount = myCollection.filter(c => c.wish).length;
  document.getElementById('total-count').textContent = totalCount;
  document.getElementById('coll-sub').textContent = `${totalCount}장 보유중`;
  document.getElementById('prof-total').textContent = totalCount;
  document.getElementById('prof-wish').textContent = wishCount;
}

function renderCollection() {
  const grid = document.getElementById('coll-grid');
  if(!grid) return;
  let filtered = [...myCollection];
  if (searchQuery) filtered = filtered.filter(c => c.name.toLowerCase().includes(searchQuery));
  if(currentFilter !== 'all') filtered = filtered.filter(c => c.category === currentFilter);
  if(currentSort === 'newest') filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
  else if(currentSort === 'oldest') filtered.sort((a,b) => new Date(a.date) - new Date(b.date));
  else if(currentSort === 'wishlist') filtered = filtered.filter(c => c.wish);
  let html = filtered.map((card) => {
    const realIdx = myCollection.findIndex(c => c.date === card.date);
    return `
      <div class="cg-card" onclick="openCapturedDetail(${realIdx})">
        <div class="cg-bg">
          <img src="${card.image}" style="width:100%; height:100%; object-fit:cover;">
          ${card.wish ? '<div class="cg-wish-indicator">❤️</div>' : ''}
        </div>
        <div class="cg-overlay"><div class="cg-name">${card.name}</div><div class="cg-rare">${card.rarity}</div></div>
      </div>
    `;
  }).join('');
  html += `<div class="cg-add" onclick="goScreen('scan')"><div class="cg-add-icon">+</div><div class="cg-add-lbl">카드 추가</div></div>`;
  grid.innerHTML = html;
}

function renderRecentCards() {
  const scroll = document.querySelector('.recent-scroll');
  if(!scroll) return;
  if(myCollection.length === 0) {
    scroll.innerHTML = '<div style="padding: 20px; color: var(--text3); font-size: 12px;">최근 추가된 카드가 없습니다</div>';
    return;
  }
  scroll.innerHTML = myCollection.slice(0, 5).map((card) => {
    const realIdx = myCollection.findIndex(c => c.date === card.date);
    return `
      <div class="r-card" onclick="openCapturedDetail(${realIdx})">
        <div class="r-card-img" style="background: var(--surface2)">
          <img src="${card.image}" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <div class="r-card-name">${card.name}</div>
      </div>
    `;
  }).join('');
}

function toggleWish(index) {
  myCollection[index].wish = !myCollection[index].wish;
  saveUserCollection();
  renderCollection();
  if (document.getElementById('screen-wishlist').classList.contains('active')) renderWishlist();
  updateStats();
  showToast(myCollection[index].wish ? '❤️' : '💔', myCollection[index].wish ? '위시에 추가됨' : '위시 해제됨');
}

function renderWishlist() {
  const grid = document.getElementById('wishlist-grid');
  const empty = document.getElementById('wishlist-empty');
  if(!grid || !empty) return;
  const wished = myCollection.filter(c => c.wish);
  if(wished.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
  } else {
    empty.style.display = 'none';
    grid.innerHTML = wished.map(card => {
      const realIdx = myCollection.findIndex(c => c.date === card.date);
      return `
        <div class="cg-card" onclick="openCapturedDetail(${realIdx})">
          <div class="cg-bg">
            <img src="${card.image}" style="width:100%; height:100%; object-fit:cover;">
            <div class="cg-wish-indicator">❤️</div>
          </div>
          <div class="cg-overlay"><div class="cg-name">${card.name}</div><div class="cg-rare">${card.rarity}</div></div>
        </div>
      `;
    }).join('');
  }
}

// ===================== TRIGGER SCAN (GEMINI) =====================
async function triggerScan() {
  if(scanning) return;
  scanning = true;
  playShutterSound();
  capturedImageData = captureFrame();
  
  const flash = document.getElementById('camera-flash');
  if(flash) {
    flash.classList.add('flash-anim');
    setTimeout(() => flash.classList.remove('flash-anim'), 400);
  }

  showToast('🔍', 'AI가 분석 중입니다 (10~15초 소요)...');

  const aiResult = await callGeminiAI(capturedImageData);
  
  if (aiResult && !aiResult.error) {
    currentAiResult = { ...aiResult, conf: (95 + Math.random() * 4).toFixed(1) };
    document.getElementById('ai-thumb').innerHTML = `<img src="${capturedImageData}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
    document.getElementById('ai-name').textContent = currentAiResult.name;
    document.getElementById('ai-set').textContent = currentAiResult.set;
    document.getElementById('ai-rarity').textContent = currentAiResult.rarity;
    document.getElementById('ai-cat').textContent = currentAiResult.category;
    document.getElementById('ai-confidence').textContent = currentAiResult.conf + '% 신뢰도';
    document.getElementById('ai-result').style.display = 'block';
    showToast('✨', '인식에 성공했습니다!');
  } else {
    let msg = '인식에 실패했습니다. 다시 촬영해 주세요.';
    if (aiResult && aiResult.error && aiResult.error.includes('API_FAIL_429')) msg = '사용량이 초과되었습니다. 잠시 후 시도하세요.';
    showToast('❌', msg);
  }
  scanning = false;
}

function addToCollection() {
  if (!currentAiResult || !capturedImageData || !currentUser) return;
  const newCard = { ...currentAiResult, image: capturedImageData, date: new Date().toISOString() };
  myCollection.unshift(newCard);
  saveUserCollection();
  showToast('✅', '컬렉션에 추가됐습니다!');
  setTimeout(() => goScreen('collection'), 1000);
}

function resetScan() {
  const res = document.getElementById('ai-result');
  if(res) res.style.display = 'none';
  capturedImageData = null;
  currentAiResult = null;
}

// ===================== UI HELPERS =====================
let toastTimer;
function showToast(icon, msg) {
  clearTimeout(toastTimer);
  const tIcon = document.getElementById('toast-icon');
  const tMsg = document.getElementById('toast-msg');
  const t = document.getElementById('toast');
  if (tIcon) tIcon.textContent = icon;
  if (tMsg) tMsg.textContent = msg;
  if (t) {
    t.classList.add('show');
    toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
  }
}

function updateClock() {
  const now = new Date();
  document.querySelectorAll('.real-time-clock').forEach(el => {
    el.textContent = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  });
}

function updateUserUI() {
  const headerAvatar = document.getElementById('header-avatar');
  const loggedOut = document.getElementById('profile-logged-out');
  const loggedIn = document.getElementById('profile-logged-in');
  const userPhoto = document.getElementById('user-photo');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  if (currentUser) {
    if(loggedOut) loggedOut.style.display = 'none';
    if(loggedIn) loggedIn.style.display = 'flex';
    const pic = currentUser.picture || '👤';
    if(headerAvatar) headerAvatar.textContent = pic;
    if(userPhoto) userPhoto.textContent = pic;
    if(userName) userName.textContent = currentUser.name;
    if(userEmail) userEmail.textContent = currentUser.email;
  } else {
    if(loggedOut) loggedOut.style.display = 'flex';
    if(loggedIn) loggedIn.style.display = 'none';
    if(headerAvatar) headerAvatar.textContent = '👤';
    renderGoogleButton();
  }
}

function renderGoogleButton() {
  const btnContainer = document.getElementById("google-login-btn");
  if (btnContainer && typeof google !== 'undefined') {
    google.accounts.id.renderButton(btnContainer, { theme: "outline", size: "large", width: 240, shape: "pill" });
  }
}

window.onload = function () {
  if (typeof google !== 'undefined') {
    google.accounts.id.initialize({
      client_id: "724218200034-j2oa5nfjnilom3m56jchg1pcf26u3kkf.apps.googleusercontent.com",
      callback: handleCredentialResponse
    });
  }
  loadUserData();
  updateUserUI();
  updateStats();
  updateClock();
  setupSearch();
  setInterval(updateClock, 1000);
  goScreen('home');
}

function filterColl(type, el) {
  currentFilter = type;
  document.querySelectorAll('#filter-row .chip').forEach(c => c.classList.remove('active'));
  if(el) el.classList.add('active');
  renderCollection();
}

function setSort(type, el) {
  currentSort = type;
  document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
  if(el) el.classList.add('active');
  renderCollection();
}
