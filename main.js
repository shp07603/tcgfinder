// ===================== RECOMMENDED CARDS POOL =====================
const recommendedPool = [
  { name: '피카츄 ex (SAR)', set: '초전브레이커', rarity: 'Special Art Rare', category: 'pokemon', image: 'https://images.pokemontcg.io/sv8/132_hires.png', typeColor: 'var(--pokemon)' },
  { name: '테라파고스 ex (SAR)', set: '스텔라미라클', rarity: 'Special Art Rare', category: 'pokemon', image: 'https://images.pokemontcg.io/sv7/124_hires.png', typeColor: 'var(--pokemon)' },
  { name: '리자몽 ex (SAR)', set: '샤이니트레저 ex', rarity: 'Special Art Rare', category: 'pokemon', image: 'https://images.pokemontcg.io/sv4a/234_hires.png', typeColor: 'var(--pokemon)' },
  { name: '뮤 ex (SAR)', set: '포켓몬 151', rarity: 'Special Art Rare', category: 'pokemon', image: 'https://images.pokemontcg.io/sv3pt5/205_hires.png', typeColor: 'var(--pokemon)' },
  { name: '레쿠쟈 VMAX (SA)', set: '창공스트림', rarity: 'Special Art', category: 'pokemon', image: 'https://images.pokemontcg.io/swsh7/218_hires.png', typeColor: 'var(--pokemon)' },
  { name: '손흥민 Prizm', set: '2022 Panini Prizm Qatar', rarity: 'Silver Prizm', category: 'soccer', image: 'https://i.ebayimg.com/images/g/2XAAAOSw~RlkY~Z~/s-l1600.jpg', typeColor: 'var(--soccer)' },
  { name: '김민재 Chrome', set: '2023 Topps Chrome', rarity: 'Refractor', category: 'soccer', image: 'https://i.ebayimg.com/images/g/Y8IAAOSwY~RjZ~Z~/s-l1600.jpg', typeColor: 'var(--soccer)' },
  { name: '이강인 Rookie', set: '2019 Panini Chronicles', rarity: 'Rookie Card', category: 'soccer', image: 'https://i.ebayimg.com/images/g/unYAAOSw~RlkY~Z~/s-l1600.jpg', typeColor: 'var(--soccer)' }
];

let currentFeatured = [];

// ===================== APP STATE =====================
let scanIdx = 0;
let previousScreen = 'home';
let cameraStream = null;
let capturedImageData = null;
let currentAiResult = null;
let scanning = false;

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

// ===================== DYNAMIC DATA FETCHING =====================
function fetchFeaturedCards() {
  // Simulate fetching from web every 10 mins
  // Shuffle and pick 4-6 cards
  const shuffled = [...recommendedPool].sort(() => 0.5 - Math.random());
  currentFeatured = shuffled.slice(0, 6);
  
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  const timeEl = document.getElementById('featured-update-time');
  if(timeEl) timeEl.textContent = `마지막 업데이트: ${timeStr} (10분마다 갱신됨)`;
  
  renderFeaturedCards();
  if(document.getElementById('screen-featured').classList.contains('active')) {
    renderFullFeaturedGrid();
  }
}

// Start 10-minute timer
setInterval(fetchFeaturedCards, 10 * 60 * 1000);

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
  nav.style.display = (name === 'detail' || name === 'featured') ? 'none' : 'flex';

  if (name === 'scan') {
    resetScan();
    initCamera();
  } else {
    stopCamera();
  }

  if (name === 'collection') renderCollection();
  if (name === 'home') {
    renderFeaturedCards();
    renderRecentCards();
  }
  if (name === 'featured') renderFullFeaturedGrid();

  updateStats();
  previousScreen = (name !== 'detail' && name !== 'featured') ? name : previousScreen;
}

function updateStats() {
  const totalCount = myCollection.length;
  const pokeCount = myCollection.filter(c => c.category === 'pokemon').length;
  const soccerCount = myCollection.filter(c => c.category === 'soccer').length;
  const rareCount = myCollection.filter(c => c.rarity && c.rarity.toLowerCase().includes('rare')).length;

  document.getElementById('total-count').textContent = totalCount;
  
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

// ===================== RENDER COMPONENTS =====================
function renderFeaturedCards() {
  const grid = document.querySelector('#screen-home .card-grid');
  if(!grid) return;

  // Show top 4 on home
  grid.innerHTML = currentFeatured.slice(0, 4).map(card => `
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

function renderFullFeaturedGrid() {
  const grid = document.getElementById('featured-full-grid');
  if(!grid) return;

  grid.innerHTML = currentFeatured.map(card => `
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

  scroll.innerHTML = myCollection.slice(0, 5).map((card, index) => `
    <div class="r-card" onclick="openCapturedDetail(${index})">
      <div class="r-card-img" style="background: var(--surface2)">
        <img src="${card.image}" style="width:100%; height:100%; object-fit:cover;">
      </div>
      <div class="r-card-name">${card.name}</div>
    </div>
  `).join('');
}

function renderCollection() {
  const grid = document.getElementById('coll-grid');
  let html = myCollection.map((card, index) => `
    <div class="cg-card" onclick="openCapturedDetail(${index})">
      <div class="cg-bg">
        <img src="${card.image}" style="width:100%; height:100%; object-fit:cover;">
      </div>
      <div class="cg-overlay">
        <div class="cg-name">${card.name}</div>
        <div class="cg-rare">${card.rarity}</div>
      </div>
    </div>
  `).join('');

  html += `
    <div class="cg-add" onclick="goScreen('scan')">
      <div class="cg-add-icon">+</div>
      <div class="cg-add-lbl">카드 추가</div>
    </div>
  `;
  grid.innerHTML = html;
}

// ===================== SCAN & AI =====================
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
  
  // AI Simulation Result
  setTimeout(() => {
    const pool = recommendedPool.filter(c => c.category === (Math.random() > 0.5 ? 'pokemon' : 'soccer'));
    const result = pool[Math.floor(Math.random() * pool.length)];
    
    currentAiResult = { ...result, conf: (95 + Math.random() * 4).toFixed(1) };

    const thumb = document.getElementById('ai-thumb');
    thumb.className = 'ai-thumb bg-holo';
    thumb.innerHTML = `<img src="${capturedImageData}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;

    document.getElementById('ai-name').textContent = currentAiResult.name;
    document.getElementById('ai-set').textContent = currentAiResult.set;
    document.getElementById('ai-rarity').textContent = currentAiResult.rarity;
    document.getElementById('ai-cat').textContent = currentAiResult.category === 'pokemon' ? '포켓몬 TCG' : '스포츠 카드';
    document.getElementById('ai-confidence').textContent = currentAiResult.conf + '% 신뢰도';

    document.getElementById('ai-result').style.display = 'block';

    if(placeholder) placeholder.textContent = '✅';
    hint.textContent = '인식 완료!';
    scanning = false;
  }, 1500);
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

function openCapturedDetail(index) {
  const card = myCollection[index];
  showToast('ℹ️', '상세 정보 준비 중: ' + card.name);
}

// ===================== UI HELPERS =====================
let toastTimer;
function showToast(icon, msg) {
  clearTimeout(toastTimer);
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  const t = document.getElementById('toast');
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
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

function showManual() {
  showToast('✏️', '직접 입력 기능은 개발 중이에요!');
}

// Initial load
loadTheme();
updateClock();
setInterval(updateClock, 10000);
fetchFeaturedCards(); // Initial fetch
goScreen('home');
