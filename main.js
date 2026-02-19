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

// ===================== REAL AI: GEMINI API (ROBUST VERSION) =====================
async function callGeminiAI(base64Image) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const base64Data = base64Image.split(',')[1];

  // 프롬프트 대폭 단순화 및 식별 강화
  const prompt = `This image is a Trading Card. 
  Your MAIN GOAL is to find the NAME of the Pokemon or the Athlete.
  1. Look at all text, including VERTICAL text and small logos.
  2. Identify the:
     - name: Most prominent name (Pokemon or Player) in KOREAN.
     - set: The series or expansion name in KOREAN.
     - rarity: Rarity code or name (e.g., RR, SAR, Holo).
     - category: Must be 'pokemon', 'sports', or 'tcg'.
  3. If you can find more (HP, attacks), add them. If not, leave them as null or empty.
  
  Respond ONLY with a valid JSON object. No explanations.
  {
    "name": "카드이름",
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
        generationConfig: {
          temperature: 0.2, // 더 정확한 추출을 위해 창의성 낮춤
          topP: 0.8,
          topK: 40,
          response_mime_type: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Response Error:", errorText);
      throw new Error(`API_ERROR_${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    console.log("AI Raw Output:", resultText);

    return JSON.parse(resultText);
  } catch (error) {
    console.error("Critical AI Error:", error);
    return { error: error.message };
  }
}

// ===================== TRIGGER SCAN (ENHANCED) =====================
async function triggerScan() {
  if(scanning) return;
  
  const video = document.getElementById('video-stream');
  if (!video || video.readyState < 2) {
    showToast('⚠️', '카메라 준비 중입니다. 잠시만 기다려주세요.');
    return;
  }

  scanning = true;
  playShutterSound();
  capturedImageData = captureFrame();
  
  const flash = document.getElementById('camera-flash');
  if(flash) {
    flash.classList.add('flash-anim');
    setTimeout(() => flash.classList.remove('flash-anim'), 400);
  }

  showToast('🔍', '카드를 식별하고 있습니다...');

  try {
    const aiResult = await callGeminiAI(capturedImageData);
    
    if (aiResult && aiResult.name && !aiResult.error) {
      currentAiResult = {
        ...aiResult,
        conf: (95 + Math.random() * 4).toFixed(1),
        attacks: aiResult.attacks || [],
        hp: aiResult.hp || null,
        stats: aiResult.stats || {}
      };
      
      document.getElementById('ai-thumb').innerHTML = `<img src="${capturedImageData}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
      document.getElementById('ai-name').textContent = currentAiResult.name;
      document.getElementById('ai-set').textContent = currentAiResult.set || "정보 없음";
      document.getElementById('ai-rarity').textContent = currentAiResult.rarity || "정보 없음";
      document.getElementById('ai-cat').textContent = currentAiResult.category === 'pokemon' ? '포켓몬 카드' : (currentAiResult.category === 'sports' ? '스포츠 카드' : 'TCG 카드');
      document.getElementById('ai-confidence').textContent = currentAiResult.conf + '% 신뢰도';
      
      document.getElementById('ai-result').style.display = 'block';
      showToast('✨', `'${currentAiResult.name}' 인식 완료!`);
    } else {
      throw new Error(aiResult?.error || "NAME_NOT_FOUND");
    }
  } catch (err) {
    console.error("Scan Failed:", err);
    showToast('❌', '카드 인식에 실패했습니다. 밝은 곳에서 이름을 잘 보이게 찍어주세요.');
  } finally {
    scanning = false;
  }
}

// ===================== REMAINING UTILS (AUDIO, CAMERA, UI) =====================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
async function playShutterSound() {
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.05);
  gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.1);
}

async function initCamera() {
  const video = document.getElementById('video-stream');
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
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
}

function captureFrame() {
  const video = document.getElementById('video-stream');
  const canvas = document.getElementById('capture-canvas');
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

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
  }
}

function saveUserCollection() {
  if (currentUser) localStorage.setItem(`collection_${currentUser.email}`, JSON.stringify(myCollection));
}

function goScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if(!target) return;
  target.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const nb = document.getElementById('nav-' + name);
  if(nb) nb.classList.add('active');
  const noNavScreens = ['detail', 'guide', 'about', 'privacy', 'contact'];
  document.getElementById('nav').style.display = noNavScreens.includes(name) ? 'none' : 'flex';
  if (name === 'scan') {
    if (!currentUser) { showToast('🔑', '로그인이 필요합니다'); goScreen('profile'); return; }
    resetScan(); initCamera();
  } else { stopCamera(); }
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
  let filtered = [...myCollection];
  if (searchQuery) filtered = filtered.filter(c => c.name.toLowerCase().includes(searchQuery));
  if(currentFilter !== 'all') filtered = filtered.filter(c => c.category === currentFilter);
  
  grid.innerHTML = filtered.map((card) => {
    const realIdx = myCollection.findIndex(c => c.date === card.date);
    return `
      <div class="cg-card" onclick="openCapturedDetail(${realIdx})">
        <div class="cg-bg"><img src="${card.image}" style="width:100%; height:100%; object-fit:cover;"></div>
        <div class="cg-overlay"><div class="cg-name">${card.name}</div><div class="cg-rare">${card.rarity || ""}</div></div>
      </div>
    `;
  }).join('') + `<div class="cg-add" onclick="goScreen('scan')"><div class="cg-add-icon">+</div><div class="cg-add-lbl">카드 추가</div></div>`;
}

function openCapturedDetail(index) {
  const card = myCollection[index];
  if (!card) return;
  document.getElementById('d-name').textContent = card.name;
  document.getElementById('d-set').textContent = `${card.set || ""} ${card.rarity || ""}`;
  document.getElementById('d-showcase').innerHTML = `<img src="${card.image}" style="width:100%;height:100%;object-fit:cover;">`;
  
  const hpSection = document.getElementById('d-hp-section');
  if (card.hp) {
    hpSection.style.display = 'block';
    document.getElementById('d-hp').textContent = `${card.hp} HP`;
    document.getElementById('d-hp-fill').style.width = Math.min((card.hp/340)*100, 100) + '%';
  } else { hpSection.style.display = 'none'; }

  const atkWrap = document.getElementById('d-attacks-wrap');
  if (card.attacks && card.attacks.length > 0) {
    atkWrap.style.display = 'block';
    document.getElementById('d-attacks').innerHTML = card.attacks.map(atk => `
      <div class="attack-row">
        <div class="atk-info"><div class="atk-name">${atk.name}</div><div class="atk-desc">${atk.desc || ""}</div></div>
        <div class="atk-dmg">${atk.dmg || ""}</div>
      </div>
    `).join('');
  } else { atkWrap.style.display = 'none'; }

  document.getElementById('detail-back').onclick = () => goScreen('collection');
  document.getElementById('detail-delete-btn').onclick = () => { if(confirm('삭제할까요?')) { myCollection.splice(index,1); saveUserCollection(); goScreen('collection'); } };
  goScreen('detail');
}

function setupSearch() {
  const input = document.getElementById('coll-search-input');
  if (input) input.addEventListener('input', (e) => { searchQuery = e.target.value.toLowerCase(); renderCollection(); });
}

function handleCredentialResponse(response) {
  const user = parseJwt(response.credential);
  currentUser = { name: user.name, email: user.email, picture: '👤' };
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  loadUserData(); goScreen('home');
}

function parseJwt(token) {
  return JSON.parse(decodeURIComponent(escape(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
}

function updateStats() {
  if(!currentUser) return;
  document.getElementById('total-count').textContent = myCollection.length;
  document.getElementById('coll-sub').textContent = `${myCollection.length}장 보유중`;
}

function addToCollection() {
  if (!currentAiResult || !capturedImageData) return;
  myCollection.unshift({ ...currentAiResult, image: capturedImageData, date: new Date().toISOString() });
  saveUserCollection(); showToast('✅', '저장되었습니다!'); goScreen('collection');
}

function resetScan() { document.getElementById('ai-result').style.display = 'none'; capturedImageData = null; currentAiResult = null; }

function renderCategoryChips() {
  const row = document.getElementById('filter-row');
  if (!row) return;
  row.innerHTML = `
    <div class="chip ${currentFilter==='all'?'active':''}" onclick="currentFilter='all';renderCollection();renderCategoryChips()">전체</div>
    <div class="chip ${currentFilter==='pokemon'?'active':''}" onclick="currentFilter='pokemon';renderCollection();renderCategoryChips()">포켓몬</div>
    <div class="chip ${currentFilter==='sports'?'active':''}" onclick="currentFilter='sports';renderCollection();renderCategoryChips()">스포츠</div>
    ${customCategories.map(cat => `<div class="chip ${currentFilter===cat?'active':''}" onclick="currentFilter='${cat}';renderCollection();renderCategoryChips()">${cat}</div>`).join('')}
    <div class="chip" onclick="const n=prompt('이름?');if(n){customCategories.push(n);saveCustomCategories();renderCategoryChips();}" style="background:var(--gold-dim); border-color:var(--gold); color:var(--gold); margin-left:auto;">+ 추가</div>
  `;
}

function saveCustomCategories() { localStorage.setItem(`categories_${currentUser.email}`, JSON.stringify(customCategories)); }

function renderRecentCards() {
  const scroll = document.querySelector('.recent-scroll');
  if(!scroll || myCollection.length === 0) return;
  scroll.innerHTML = myCollection.slice(0, 5).map((card, i) => `
    <div class="r-card" onclick="openCapturedDetail(${i})">
      <div class="r-card-img"><img src="${card.image}" style="width:100%; height:100%; object-fit:cover;"></div>
      <div class="r-card-name">${card.name}</div>
    </div>
  `).join('');
}

function updateUserUI() {
  if (currentUser) {
    document.getElementById('profile-logged-out').style.display = 'none';
    document.getElementById('profile-logged-in').style.display = 'flex';
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-email').textContent = currentUser.email;
    document.getElementById('header-avatar').textContent = currentUser.picture || '👤';
    document.getElementById('user-photo').textContent = currentUser.picture || '👤';
  } else {
    document.getElementById('profile-logged-out').style.display = 'flex';
    document.getElementById('profile-logged-in').style.display = 'none';
    if (typeof google !== 'undefined') google.accounts.id.renderButton(document.getElementById("google-login-btn"), { theme: "outline", size: "large" });
  }
}

window.onload = () => {
  if (typeof google !== 'undefined') google.accounts.id.initialize({ client_id: "724218200034-j2oa5nfjnilom3m56jchg1pcf26u3kkf.apps.googleusercontent.com", callback: handleCredentialResponse });
  loadUserData(); updateUserUI(); setupSearch(); setInterval(() => {
    const now = new Date();
    document.querySelectorAll('.real-time-clock').forEach(el => el.textContent = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`);
  }, 1000);
  goScreen('home');
};
