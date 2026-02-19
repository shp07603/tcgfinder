// ===================== CURATED FEATURED CARDS =====================
const featuredCards = [
  {
    name: 'Pikachu VMAX',
    set: 'Celebrations',
    rarity: 'Ultra Rare',
    category: 'pokemon',
    image: 'https://images.pokemontcg.io/cel25/5_hires.png',
    typeColor: 'var(--pokemon)'
  },
  {
    name: 'Lionel Messi',
    set: '2022 Panini Prizm',
    rarity: 'Gold Prizm',
    category: 'soccer',
    image: 'https://i.ebayimg.com/images/g/Y8IAAOSwY~RjZ~Z~/s-l1600.jpg',
    typeColor: 'var(--soccer)'
  },
  {
    name: 'Charizard ex',
    set: 'Scarlet & Violet-151',
    rarity: 'Special Illustration Rare',
    category: 'pokemon',
    image: 'https://images.pokemontcg.io/sv3pt5/199_hires.png',
    typeColor: 'var(--pokemon)'
  },
  {
    name: 'Erling Haaland',
    set: '2023 Topps Chrome',
    rarity: 'Superfractor',
    category: 'soccer',
    image: 'https://i.ebayimg.com/images/g/unYAAOSw~RlkY~Z~/s-l1600.jpg',
    typeColor: 'var(--soccer)'
  }
];

// ===================== SCAN DATA =====================
const scanResults = [
  { id: 'charizard', name:'리자몽 VMAX', set:'Fusion Strike', rarity:'252/264 · Ultra Rare', cat:'포켓몬 TCG', emoji:'⚡', bg:'bg-holo', conf:'98.4', category: 'pokemon' },
  { id: 'mbappe', name:'음바페 Gold Prizm', set:'2024 Topps Chrome', rarity:'Gold · /50', cat:'축구 카드', emoji:'⚽', bg:'bg-soccer', conf:'96.1', category: 'soccer' },
];

let scanIdx = 0;
let previousScreen = 'home';
let cameraStream = null;
let capturedImageData = null;
let currentAiResult = null;

// User Collection State
let myCollection = JSON.parse(localStorage.getItem('myCollection')) || [];

// ===================== THEME =====================
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  showToast(newTheme === 'dark' ? '🌙' : '☀️', `${newTheme === 'dark' ? '다크' : '라이트'} 모드로 변경됐습니다`);
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// ===================== CAMERA & CAPTURE =====================
async function initCamera() {
  const video = document.getElementById('video-stream');
  const placeholder = document.querySelector('.vf-placeholder');
  const hint = document.querySelector('.vf-hint');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    cameraStream = stream;
    video.srcObject = stream;
    video.style.display = 'block';
    if(placeholder) placeholder.style.display = 'none';
    hint.textContent = '카드를 사각형 안에 맞춰주세요';
  } catch (err) {
    console.error("Camera error:", err);
    showToast('❌', '카메라 권한이 필요합니다');
    hint.textContent = '카메라 권한을 허용해주세요';
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  const video = document.getElementById('video-stream');
  if(video) {
    video.srcObject = null;
    video.style.display = 'none';
  }
  const placeholder = document.querySelector('.vf-placeholder');
  if(placeholder) placeholder.style.display = 'block';
}

function captureFrame() {
  const video = document.getElementById('video-stream');
  const canvas = document.getElementById('capture-canvas');
  if (!video || !canvas) return null;

  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  return canvas.toDataURL('image/jpeg', 0.8);
}

// ===================== VISION AI (PLACEHOLDER) =====================
async function analyzeImageWithAI(imageData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const result = scanResults[scanIdx % scanResults.length];
      scanIdx++;
      resolve(result);
    }, 1500);
  });
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
  nav.style.display = (name === 'detail') ? 'none' : 'flex';

  if (name === 'scan') {
    resetScan();
    initCamera();
  } else {
    stopCamera();
  }

  if (name === 'collection') {
    renderCollection();
  }

  if (name === 'home') {
    renderFeaturedCards();
    renderRecentCards();
  }

  updateStats();
  previousScreen = name !== 'detail' ? name : previousScreen;
}

function updateStats() {
  const totalCount = myCollection.length;
  const pokeCount = myCollection.filter(c => c.category === 'pokemon').length;
  const soccerCount = myCollection.filter(c => c.category === 'soccer').length;
  const rareCount = myCollection.filter(c => c.rarity && c.rarity.toLowerCase().includes('rare')).length;

  // Home Screen Stats
  const totalEl = document.getElementById('total-count');
  if(totalEl) totalEl.textContent = totalCount;
  
  const heroPills = document.querySelectorAll('.hero-pill .hp-val');
  if(heroPills.length >= 3) {
    heroPills[0].textContent = `🔴 ${pokeCount}`;
    heroPills[1].textContent = `⚽ ${soccerCount}`;
    heroPills[2].textContent = `★ ${rareCount}`;
  }

  const catTabs = document.querySelectorAll('.cat-tab');
  if(catTabs.length >= 3) {
    catTabs[0].textContent = `전체 ${totalCount}`;
    catTabs[1].textContent = `🔴 포켓몬 ${pokeCount}`;
    catTabs[2].textContent = `⚽ 축구 ${soccerCount}`;
  }

  // Collection Screen Subtitle
  const collSub = document.getElementById('coll-sub');
  if(collSub) collSub.textContent = totalCount + '장 보유중';

  const collChips = document.querySelectorAll('#filter-row .chip');
  if(collChips.length >= 4) {
    collChips[0].textContent = `전체 ${totalCount}`;
    collChips[1].textContent = `🔴 포켓몬 ${pokeCount}`;
    collChips[2].textContent = `⚽ 축구 ${soccerCount}`;
    collChips[3].textContent = `★ 레어 ${rareCount}`;
  }
}

// ===================== RENDER HOME COMPONENTS =====================
function renderFeaturedCards() {
  const grid = document.querySelector('#screen-home .card-grid');
  if(!grid) return;

  grid.innerHTML = featuredCards.map(card => `
    <div class="c-card" onclick="showToast('ℹ️', '추천 카드 상세 정보는 준비 중입니다')">
      <div class="c-img" style="background: var(--surface2)">
        <img src="${card.image}" style="width:100%; height:100%; object-fit:contain; padding: 10px;">
        <div class="rarity-badge rb-rare" style="font-size: 7px;">${card.rarity.toUpperCase()}</div>
      </div>
      <div class="c-info">
        <div class="c-name">${card.name}</div>
        <div class="c-meta"><div class="type-dot" style="background:${card.typeColor}"></div>${card.set}</div>
      </div>
    </div>
  `).join('');
}

function renderRecentCards() {
  const scroll = document.querySelector('.recent-scroll');
  if(!scroll) return;

  if(myCollection.length === 0) {
    scroll.innerHTML = '<div style="padding: 20px; color: var(--text3); font-size: 12px;">최근 추가된 카드가 없습니다</div>';
    return;
  }

  // Show last 5 added cards
  const recent = myCollection.slice(0, 5);
  scroll.innerHTML = recent.map((card, index) => `
    <div class="r-card" onclick="openCapturedDetail(${index})">
      <div class="r-card-img" style="background: var(--surface2)">
        <img src="${card.image}" style="width:100%; height:100%; object-fit:cover;">
      </div>
      <div class="r-card-name">${card.name}</div>
    </div>
  `).join('');
}

// ===================== SCAN & COLLECTION =====================
async function triggerScan() {
  if(scanning) return;
  scanning = true;
  
  const vf = document.getElementById('viewfinder');
  const placeholder = vf.querySelector('.vf-placeholder');
  const hint = vf.querySelector('.vf-hint');
  
  if(placeholder) {
    placeholder.style.display = 'block';
    placeholder.textContent = '⏳';
  }
  hint.textContent = 'AI가 이미지 분석 중...';

  capturedImageData = captureFrame();
  const result = await analyzeImageWithAI(capturedImageData);
  currentAiResult = result;

  const thumb = document.getElementById('ai-thumb');
  thumb.className = 'ai-thumb ' + result.bg;
  thumb.innerHTML = `<img src="${capturedImageData}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;

  document.getElementById('ai-name').textContent = result.name;
  document.getElementById('ai-set').textContent = result.set;
  document.getElementById('ai-rarity').textContent = result.rarity;
  document.getElementById('ai-cat').textContent = result.cat;
  document.getElementById('ai-confidence').textContent = result.conf + '% 신뢰도';

  document.getElementById('ai-result').style.display = 'block';

  if(placeholder) placeholder.textContent = '✅';
  hint.textContent = '인식 완료!';
  scanning = false;
}

function resetScan() {
  document.getElementById('ai-result').style.display = 'none';
  const vf = document.getElementById('viewfinder');
  const placeholder = vf.querySelector('.vf-placeholder');
  const hint = vf.querySelector('.vf-hint');
  
  if(placeholder) {
    placeholder.textContent = '🃏';
    placeholder.style.display = cameraStream ? 'none' : 'block';
  }
  hint.textContent = cameraStream ? '카드를 사각형 안에 맞춰주세요' : '탭하여 카드를 스캔하세요';
  scanning = false;
  capturedImageData = null;
  currentAiResult = null;
}

function addToCollection() {
  if (!currentAiResult || !capturedImageData) return;

  const newCard = {
    ...currentAiResult,
    image: capturedImageData,
    date: new Date().toISOString()
  };

  myCollection.unshift(newCard);
  localStorage.setItem('myCollection', JSON.stringify(myCollection));

  showToast('✅', '컬렉션에 추가됐습니다!');
  setTimeout(() => { goScreen('collection'); }, 1000);
}

function renderCollection() {
  const grid = document.getElementById('coll-grid');
  let html = '';
  
  myCollection.forEach((card, index) => {
    html += `
      <div class="cg-card" onclick="openCapturedDetail(${index})">
        <div class="cg-bg">
          <img src="${card.image}" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <div class="cg-overlay">
          <div class="cg-name">${card.name}</div>
          <div class="cg-rare">${card.rarity}</div>
        </div>
      </div>
    `;
  });

  html += `
    <div class="cg-add" onclick="goScreen('scan')">
      <div class="cg-add-icon">+</div>
      <div class="cg-add-lbl">카드 추가</div>
    </div>
  `;

  grid.innerHTML = html;
}

function openCapturedDetail(index) {
  const card = myCollection[index];
  showToast('ℹ️', '상세 정보 준비 중: ' + card.name);
}

function showManual() {
  showToast('✏️', '직접 입력 기능은 개발 중이에요!');
}

// ===================== FILTERS & TOAST & CLOCK =====================
let scanning = false;
let toastTimer;
function showToast(icon, msg) {
  clearTimeout(toastTimer);
  const toastIcon = document.getElementById('toast-icon');
  const toastMsg = document.getElementById('toast-msg');
  if(toastIcon) toastIcon.textContent = icon;
  if(toastMsg) toastMsg.textContent = msg;
  const t = document.getElementById('toast');
  if(t) {
    t.classList.add('show');
    toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
  }
}

function filterHome(type, el) {
  document.querySelectorAll('.cat-tabs .cat-tab').forEach(t => t.className = 'cat-tab');
  if(el) {
    if(type === 'all') el.className = 'cat-tab active-all';
    else if(type === 'pokemon') el.className = 'cat-tab active-poke';
    else if(type === 'soccer') el.className = 'cat-tab active-soccer';
  }
}

function filterColl(type, el) {
  document.querySelectorAll('#filter-row .chip').forEach(c => c.classList.remove('active'));
  if(el) el.classList.add('active');
}

function swapSort(el) {
  document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
  if(el) el.classList.add('active');
  showToast('🔄', '정렬 방식이 변경됐습니다');
}

function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2,'0');
  const m = now.getMinutes().toString().padStart(2,'0');
  const time = h + ':' + m;
  document.querySelectorAll('#clock,#clock2').forEach(el => { if(el) el.textContent = time; });
}

// Initial load
loadTheme();
updateClock();
setInterval(updateClock, 10000);
goScreen('home');

// Detail screen helper
function openDetail(cardId) {
  // Can be expanded to use myCollection or featuredCards
  showToast('ℹ️', '상세 정보 준비 중입니다');
}
