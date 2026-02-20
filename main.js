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

function handleLogout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    currentUser = null;
    localStorage.removeItem('currentUser');
    loadUserData();
    updateUserUI();
    goScreen('home');
    showToast('👋', '로그아웃 되었습니다.');
  }
}

// ===================== 9. PROFILE ACTIONS =====================
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const target = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', target);
  localStorage.setItem('theme', target);
  showToast(target === 'dark' ? '🌙' : '☀️', `${target === 'dark' ? '다크' : '라이트'} 모드로 변경됨`);
}

function shareCollection() {
  if (myCollection.length === 0) {
    showToast('⚠️', '공유할 카드가 없습니다.');
    return;
  }
  
  if (navigator.share) {
    navigator.share({
      title: '나의 TCG 컬렉션',
      text: `TCGfinder에서 나의 ${myCollection.length}장의 카드를 구경해보세요!`,
      url: window.location.href
    })
    .then(() => showToast('📤', '공유 완료!'))
    .catch((error) => console.log('Error sharing', error));
  } else {
    showToast('❌', '이 기기에서는 공유 기능이 지원되지 않습니다.');
  }
}

async function requestFullPermissions() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    showToast('✅', '카메라 권한이 허용되었습니다.');
  } catch (err) {
    showToast('❌', '권한 요청에 실패했습니다.');
  }
}

// ===================== 11. PROFILE EDITING =====================
function openEditProfile() {
  if (!currentUser) return;
  const modal = document.getElementById('edit-profile-modal');
  const nickInput = document.getElementById('edit-nickname');
  const preview = document.getElementById('edit-preview-icon');
  
  if (modal && nickInput && preview) {
    nickInput.value = currentUser.name || '';
    preview.textContent = currentUser.picture || '👤';
    window.selectedAvatar = currentUser.picture || '👤';
    
    // Render avatar options
    const avatars = ['👤', '🐱', '🐶', '🦊', '🦁', '🐸', '🤖', '👾', '⭐', '🔥', '⚡', '💎', '🦄', '🐲', '👻'];
    const picker = document.getElementById('avatar-picker');
    if (picker) {
      picker.innerHTML = avatars.map(a => `
        <div class="avatar-option" onclick="selectAvatar('${a}')" style="cursor:pointer; font-size:24px; padding:5px; border-radius:50%; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${a}</div>
      `).join('');
    }
    
    modal.style.display = 'flex';
  }
}

function closeEditProfile() {
  const modal = document.getElementById('edit-profile-modal');
  if (modal) modal.style.display = 'none';
}

function selectAvatar(icon) {
  window.selectedAvatar = icon;
  const preview = document.getElementById('edit-preview-icon');
  if (preview) {
    preview.textContent = icon;
    // Add a little pop animation
    preview.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.2)' },
      { transform: 'scale(1)' }
    ], { duration: 300 });
  }
}

function saveProfile() {
  const nickInput = document.getElementById('edit-nickname');
  if (!nickInput) return;
  
  const newName = nickInput.value.trim();
  if (!newName) {
    showToast('⚠️', '닉네임을 입력해주세요.');
    return;
  }
  
  const newPic = window.selectedAvatar || currentUser.picture || '👤';
  
  // Update current user
  currentUser.name = newName;
  currentUser.picture = newPic;
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  
  // Save to persistent profile storage
  try {
    const profiles = JSON.parse(localStorage.getItem('userProfiles')) || {};
    profiles[currentUser.email] = { name: newName, picture: newPic };
    localStorage.setItem('userProfiles', JSON.stringify(profiles));
  } catch (e) {
    console.error("Profile save error:", e);
  }
  
  updateUserUI();
  closeEditProfile();
  showToast('✅', '프로필이 수정되었습니다.');
}

// ===================== 12. GUIDE SYSTEM =====================
const GUIDE_CONTENT = {
  usage: {
    title: 'TCGfinder 앱 사용법',
    body: `
      <h3>반갑습니다, 컬렉터님!</h3>
      <p>TCGfinder는 당신의 소중한 카드 컬렉션을 AI로 쉽고 빠르게 관리할 수 있도록 돕는 도구입니다.</p>
      
      <h3>1. 카드 스캔하기</h3>
      <p>하단 중앙의 📷 버튼을 눌러 스캔 화면으로 이동하세요. 카드를 카메라 가이드 안에 맞추면 AI가 자동으로 카드를 인식합니다.</p>
      
      <h3>2. 컬렉션 관리</h3>
      <p>인식된 카드는 '컬렉션' 탭에 저장됩니다. 카테고리별로 분류하거나 이름으로 검색하여 원하는 카드를 금방 찾을 수 있습니다.</p>
      
      <h3>3. 위시리스트</h3>
      <p>카드 상세 화면에서 ❤️ 버튼을 누르면 위시리스트에 담깁니다. 갖고 싶은 카드를 따로 관리해 보세요.</p>
    `
  },
  scan: {
    title: 'AI 스캔 100% 활용하기',
    body: `
      <h3>정확한 인식을 위한 팁</h3>
      <p>AI 스캔의 정확도를 높이기 위해 다음 사항을 확인해 주세요.</p>
      
      <ul>
        <li><strong>밝은 조명:</strong> 카드가 너무 어둡거나 그림자가 지지 않도록 밝은 곳에서 촬영하세요.</li>
        <li><strong>반사 방지:</strong> 슬리브나 카드 표면의 빛 반사가 심하면 인식이 어려울 수 있습니다. 각도를 살짝 조절해 보세요.</li>
        <li><strong>배경 대조:</strong> 카드와 대비되는 단색 배경에서 촬영하면 더 잘 인식됩니다.</li>
        <li><strong>초점 맞추기:</strong> 화면을 탭하여 카드의 텍스트가 선명하게 보이도록 초점을 잡으세요.</li>
      </ul>
    `
  },
  storage: {
    title: '소중한 카드 보관법',
    body: `
      <h3>카드의 가치를 보존하세요</h3>
      <p>컬렉터에게 카드의 상태는 가장 중요한 가치입니다.</p>
      
      <h3>슬리브와 탑로더</h3>
      <p>기본적으로 '퍼펙트 핏' 슬리브를 씌우고, 그 위에 일반 슬리브를 한 번 더 씌우는 '이중 슬리브'를 추천합니다. 고가의 카드는 단단한 '탑로더'나 '자석 케이스'에 보관하세요.</p>
      
      <h3>온도와 습도</h3>
      <p>카드는 습기에 매우 취약합니다. 습도가 높으면 카드가 휠 수 있으니, 제습제와 함께 밀폐된 상자나 전용 바인더에 보관하는 것이 좋습니다.</p>
      
      <h3>직사광선 피하기</h3>
      <p>햇빛에 오래 노출되면 카드의 색상이 바랠 수 있습니다. 반드시 어둡고 서늘한 곳에 보관해 주세요.</p>
    `
  }
};

function openGuide(slug) {
  const guide = GUIDE_CONTENT[slug];
  if (!guide) return;
  
  const titleEl = document.getElementById('guide-title');
  const bodyEl = document.getElementById('guide-body');
  
  if (titleEl && bodyEl) {
    titleEl.textContent = guide.title;
    bodyEl.innerHTML = guide.body;
    goScreen('guide');
    
    // Scroll to top
    const screenEl = document.getElementById('screen-guide');
    if (screenEl) screenEl.scrollTop = 0;
  }
}

// ===================== 10. INITIALIZATION =====================
window.onload = () => {
  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

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
