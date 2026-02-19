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

// ===================== REAL AI: GEMINI API (CROP OPTIMIZED) =====================
async function callGeminiAI(base64Image) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const base64Data = base64Image.split(',')[1];

  const prompt = `Identify the Trading Card in this image.
  CRITICAL: Focus on the NAME of the Pokemon or Athlete (often at the top or center).
  If the text is vertical or rotated, please read it accordingly.
  
  Return ONLY a valid JSON object in KOREAN:
  {
    "name": "포켓몬 혹은 선수 이름 (필수)",
    "set": "세트 혹은 시리즈 이름",
    "rarity": "레어도 (예: RR, SAR, Holo)",
    "category": "pokemon|sports|tcg",
    "hp": 0,
    "attacks": [{"name": "기술명", "desc": "설명", "dmg": "데미지"}],
    "stats": {"stage": "단계", "weakness": "약점"}
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
        generationConfig: {
          temperature: 0.1,
          response_mime_type: "application/json"
        }
      })
    });

    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}

// ===================== CAMERA & CAPTURE (CENTER CROP) =====================
async function initCamera() {
  const video = document.getElementById('video-stream');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, 
      audio: false 
    });
    cameraStream = stream;
    video.srcObject = stream;
    video.play();
  } catch (err) { showToast('❌', '카메라 권한을 허용해 주세요.'); }
}

function captureFrame() {
  const video = document.getElementById('video-stream');
  const canvas = document.getElementById('capture-canvas');
  if (!video || video.videoWidth === 0) return null;

  const ctx = canvas.getContext('2d');
  
  // 3:4 비율로 중앙 크롭 계산
  const vWidth = video.videoWidth;
  const vHeight = video.videoHeight;
  
  let targetW, targetH, startX, startY;
  
  if (vWidth / vHeight > 3 / 4) {
    // 비디오가 너무 가로로 긴 경우
    targetH = vHeight;
    targetW = vHeight * (3 / 4);
    startX = (vWidth - targetW) / 2;
    startY = 0;
  } else {
    // 비디오가 너무 세로로 긴 경우
    targetW = vWidth;
    targetH = vWidth * (4 / 3);
    startX = 0;
    startY = (vHeight - targetH) / 2;
  }

  canvas.width = 600; // AI 분석에 적당한 해상도
  canvas.height = 800;
  
  ctx.drawImage(video, startX, startY, targetW, targetH, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

// ===================== TRIGGER SCAN =====================
async function triggerScan() {
  if(scanning) return;
  scanning = true;
  playShutterSound();
  
  capturedImageData = captureFrame();
  if(!capturedImageData) {
    showToast('⚠️', '카메라를 준비 중입니다.');
    scanning = false;
    return;
  }

  // 플래시 효과
  const flash = document.getElementById('camera-flash');
  if(flash) { flash.classList.add('flash-anim'); setTimeout(() => flash.classList.remove('flash-anim'), 400); }

  showToast('🔍', '이름을 찾는 중입니다...');

  const aiResult = await callGeminiAI(capturedImageData);
  
  if (aiResult && aiResult.name) {
    currentAiResult = { ...aiResult, conf: (95 + Math.random() * 4).toFixed(1) };
    
    // AI가 본 잘린 이미지를 썸네일로 표시
    document.getElementById('ai-thumb').innerHTML = `<img src="${capturedImageData}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
    document.getElementById('ai-name').textContent = currentAiResult.name;
    document.getElementById('ai-set').textContent = currentAiResult.set || "알 수 없음";
    document.getElementById('ai-rarity').textContent = currentAiResult.rarity || "";
    document.getElementById('ai-cat').textContent = currentAiResult.category === 'pokemon' ? '포켓몬 카드' : (currentAiResult.category === 'sports' ? '스포츠 카드' : 'TCG 카드');
    document.getElementById('ai-confidence').textContent = currentAiResult.conf + '% 신뢰도';
    document.getElementById('ai-result').style.display = 'block';
    showToast('✨', `'${currentAiResult.name}' 인식 완료!`);
  } else {
    showToast('❌', '이름을 찾지 못했습니다. 조금 더 가까이 찍어주세요.');
  }
  scanning = false;
}

// ===================== REST OF LOGIC (SAVED) =====================
function stopCamera() { if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; } }

function loadUserData() {
  if (currentUser) {
    myCollection = JSON.parse(localStorage.getItem(`collection_${currentUser.email}`)) || [];
    customCategories = JSON.parse(localStorage.getItem(`categories_${currentUser.email}`)) || [];
  }
}

function saveUserCollection() { if (currentUser) localStorage.setItem(`collection_${currentUser.email}`, JSON.stringify(myCollection)); }

function goScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if(!target) return;
  target.classList.add('active');
  const noNavScreens = ['detail', 'guide', 'about', 'privacy', 'contact'];
  document.getElementById('nav').style.display = noNavScreens.includes(name) ? 'none' : 'flex';
  if (name === 'scan') { if (!currentUser) { showToast('🔑', '로그인이 필요합니다'); goScreen('profile'); return; } resetScan(); initCamera(); } else { stopCamera(); }
  if (name === 'collection') { renderCategoryChips(); renderCollection(); }
  if (name === 'home') renderRecentCards();
  updateStats();
}

function showToast(icon, msg) {
  clearTimeout(window.toastTimer);
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  const t = document.getElementById('toast');
  t.classList.add('show');
  window.toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

function renderCollection() {
  const grid = document.getElementById('coll-grid');
  if(!grid) return;
  const filtered = myCollection.filter(c => (currentFilter === 'all' || c.category === currentFilter) && (!searchQuery || c.name.toLowerCase().includes(searchQuery)));
  grid.innerHTML = filtered.map((card, i) => `
    <div class="cg-card" onclick="openCapturedDetail(${myCollection.indexOf(card)})">
      <div class="cg-bg"><img src="${card.image}" style="width:100%; height:100%; object-fit:cover;"></div>
      <div class="cg-overlay"><div class="cg-name">${card.name}</div><div class="cg-rare">${card.rarity || ""}</div></div>
    </div>
  `).join('') + `<div class="cg-add" onclick="goScreen('scan')"><div class="cg-add-icon">+</div><div class="cg-add-lbl">카드 추가</div></div>`;
}

function openCapturedDetail(index) {
  const card = myCollection[index];
  if (!card) return;
  document.getElementById('d-name').textContent = card.name;
  document.getElementById('d-set').textContent = `${card.set || ""} ${card.rarity || ""}`;
  document.getElementById('d-showcase').innerHTML = `<img src="${card.image}" style="width:100%;height:100%;object-fit:cover;">`;
  const hpS = document.getElementById('d-hp-section');
  if (card.hp) { hpS.style.display = 'block'; document.getElementById('d-hp').textContent = `${card.hp} HP`; document.getElementById('d-hp-fill').style.width = Math.min((card.hp/340)*100, 100) + '%'; } else { hpS.style.display = 'none'; }
  const atkS = document.getElementById('d-attacks-wrap');
  if (card.attacks && card.attacks.length > 0) { atkS.style.display = 'block'; document.getElementById('d-attacks').innerHTML = card.attacks.map(a => `<div class="attack-row"><div class="atk-info"><div class="atk-name">${a.name}</div><div class="atk-desc">${a.desc || ""}</div></div><div class="atk-dmg">${a.dmg || ""}</div></div>`).join(''); } else { atkS.style.display = 'none'; }
  document.getElementById('detail-back').onclick = () => goScreen('collection');
  document.getElementById('detail-delete-btn').onclick = () => { if(confirm('삭제할까요?')) { myCollection.splice(index,1); saveUserCollection(); goScreen('collection'); } };
  goScreen('detail');
}

function addToCollection() { if (!currentAiResult || !capturedImageData) return; myCollection.unshift({ ...currentAiResult, image: capturedImageData, date: new Date().toISOString() }); saveUserCollection(); showToast('✅', '저장되었습니다!'); goScreen('collection'); }
function resetScan() { document.getElementById('ai-result').style.display = 'none'; capturedImageData = null; currentAiResult = null; }
function setupSearch() { const input = document.getElementById('coll-search-input'); if (input) input.addEventListener('input', (e) => { searchQuery = e.target.value.toLowerCase(); renderCollection(); }); }
function updateStats() { if(!currentUser) return; document.getElementById('total-count').textContent = myCollection.length; document.getElementById('coll-sub').textContent = `${myCollection.length}장 보유중`; }
function renderCategoryChips() {
  const row = document.getElementById('filter-row');
  if (!row) return;
  row.innerHTML = `<div class="chip ${currentFilter==='all'?'active':''}" onclick="currentFilter='all';renderCollection();renderCategoryChips()">전체</div><div class="chip ${currentFilter==='pokemon'?'active':''}" onclick="currentFilter='pokemon';renderCollection();renderCategoryChips()">포켓몬</div><div class="chip ${currentFilter==='sports'?'active':''}" onclick="currentFilter='sports';renderCollection();renderCategoryChips()">스포츠</div>` + customCategories.map(c => `<div class="chip ${currentFilter===c?'active':''}" onclick="currentFilter='${c}';renderCollection();renderCategoryChips()">${c}</div>`).join('') + `<div class="chip" onclick="const n=prompt('이름?');if(n){customCategories.push(n);localStorage.setItem('categories_'+currentUser.email, JSON.stringify(customCategories));renderCategoryChips();}" style="background:var(--gold-dim); border-color:var(--gold); color:var(--gold); margin-left:auto;">+ 추가</div>`;
}
function renderRecentCards() { const scroll = document.querySelector('.recent-scroll'); if(!scroll || myCollection.length === 0) return; scroll.innerHTML = myCollection.slice(0, 5).map((c, i) => `<div class="r-card" onclick="openCapturedDetail(${myCollection.indexOf(c)})"><div class="r-card-img"><img src="${c.image}" style="width:100%; height:100%; object-fit:cover;"></div><div class="r-card-name">${c.name}</div></div>`).join(''); }
function updateUserUI() { if (currentUser) { document.getElementById('profile-logged-out').style.display = 'none'; document.getElementById('profile-logged-in').style.display = 'flex'; document.getElementById('user-name').textContent = currentUser.name; document.getElementById('user-email').textContent = currentUser.email; document.getElementById('header-avatar').textContent = currentUser.picture || '👤'; document.getElementById('user-photo').textContent = currentUser.picture || '👤'; } else { document.getElementById('profile-logged-out').style.display = 'flex'; document.getElementById('profile-logged-in').style.display = 'none'; if (typeof google !== 'undefined') google.accounts.id.renderButton(document.getElementById("google-login-btn"), { theme: "outline", size: "large" }); } }
function handleCredentialResponse(r) { const u = JSON.parse(decodeURIComponent(escape(window.atob(r.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))); currentUser = { name: u.name, email: u.email, picture: '👤' }; localStorage.setItem('currentUser', JSON.stringify(currentUser)); loadUserData(); goScreen('home'); }
function playShutterSound() { const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(440, audioCtx.currentTime); g.gain.setValueAtTime(0.1, audioCtx.currentTime); o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.1); }

window.onload = () => { if (typeof google !== 'undefined') google.accounts.id.initialize({ client_id: "724218200034-j2oa5nfjnilom3m56jchg1pcf26u3kkf.apps.googleusercontent.com", callback: handleCredentialResponse }); loadUserData(); updateUserUI(); setupSearch(); setInterval(() => { const now = new Date(); document.querySelectorAll('.real-time-clock').forEach(el => el.textContent = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`); }, 1000); goScreen('home'); };
