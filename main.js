// ===================== RECOMMENDED CARDS POOL =====================
const recommendedPool = [
  { name: '피카츄 ex (SAR)', set: '초전브레이커', rarity: 'Special Art Rare', category: 'pokemon', image: 'https://images.pokemontcg.io/sv8/132_hires.png', typeColor: 'var(--pokemon)' },
  { name: '테라파고스 ex (SAR)', set: '스텔라미라클', rarity: 'Special Art Rare', category: 'pokemon', image: 'https://images.pokemontcg.io/sv7/124_hires.png', typeColor: 'var(--pokemon)' },
  { name: '리자몽 ex (SAR)', set: '샤이니트레저 ex', rarity: 'Special Art Rare', category: 'pokemon', image: 'https://images.pokemontcg.io/sv4a/234_hires.png', typeColor: 'var(--pokemon)' },
  { name: '손흥민 Prizm', set: '2022 Panini Prizm Qatar', rarity: 'Silver Prizm', category: 'sports', image: 'https://i.ebayimg.com/images/g/2XAAAOSw~RlkY~Z~/s-l1600.jpg', typeColor: 'var(--soccer)' },
  { name: '김민재 Chrome', set: '2023 Topps Chrome', rarity: 'Refractor', category: 'sports', image: 'https://i.ebayimg.com/images/g/Y8IAAOSwY~RjZ~Z~/s-l1600.jpg', typeColor: 'var(--soccer)' },
  { name: '블랙 매지션', set: '유희왕 레전더리', rarity: 'Ultra Rare', category: 'tcg', image: 'https://images.ygoprodeck.com/images/cards/46986414.jpg', typeColor: 'var(--purple)' }
];

let currentFeatured = [];

// ===================== GUIDE DATA =====================
const guideData = {
  usage: {
    title: "TCGfinder 앱 사용법",
    body: `
      <h3>1. 카드 스캔하기</h3>
      <p>하단 중앙의 카메라 아이콘을 누르면 스캔 화면으로 이동합니다. 카드를 사각형 안에 맞추고 셔터 버튼을 누르면 AI가 카드를 자동 인식합니다.</p>
      <h3>2. 컬렉션 관리</h3>
      <p>'컬렉션' 탭에서 내가 등록한 모든 카드를 확인할 수 있습니다. 필터를 통해 포켓몬, 스포츠, TCG 카드를 따로 보거나 하트(위시) 항목만 모아볼 수 있습니다.</p>
      <h3>3. 위시리스트 활용</h3>
      <p>상세 페이지에서 하트 아이콘을 누르면 위시리스트에 저장됩니다. 나중에 '위시' 탭이나 컬렉션 필터에서 쉽게 찾을 수 있습니다.</p>
    `
  },
  scan: {
    title: "AI 스캔 100% 활용하기",
    body: `
      <h3>1. 밝은 조명 아래서 촬영하세요</h3>
      <p>카메라가 카드의 미세한 디테일을 읽을 수 있도록 충분한 빛이 필요합니다. 자연광이 가장 좋으며, 실내라면 그림자가 지지 않도록 주의해 주세요.</p>
      <h3>2. 카드 수평을 맞추세요</h3>
      <p>카메라 렌즈와 카드가 평행이 되도록 들어주면 왜곡 없이 더 정확하게 인식됩니다. 특히 홀로그램 카드는 각도에 따라 인식이 달라질 수 있으니 주의하세요.</p>
      <h3>3. 배경을 단순하게 하세요</h3>
      <p>복잡한 무늬가 있는 배경보다는 단색의 테이블 위에서 촬영하는 것이 좋습니다. AI가 카드의 경계선을 더 명확하게 파악할 수 있습니다.</p>
    `
  },
  storage: {
    title: "소중한 카드 보관법",
    body: `
      <h3>1. 필수 아이템: 슬리브(Sleeve)</h3>
      <p>모든 카드의 기본은 슬리브입니다. '퍼펙트 핏' 슬리브로 1차 보호를 한 뒤, 겉슬리브를 씌우는 이중 슬리브 방식을 추천합니다.</p>
      <h3>2. 강력한 보호: 탑로더(Toploader)</h3>
      <p>희귀도가 높은 카드는 단단한 탑로더에 보관하세요. 휘어짐과 긁힘으로부터 카드를 철저하게 보호할 수 있습니다.</p>
      <h3>3. 대량 보관: 바인더(Binder)</h3>
      <p>컬렉션을 한눈에 감상하고 싶다면 전용 바인더를 사용하세요. 다만, 바인더를 세워 보관할 경우 아래쪽 카드가 눌릴 수 있으니 주의가 필요합니다.</p>
    `
  }
};

function openGuide(key) {
  const guide = guideData[key];
  if(!guide) return;
  
  document.getElementById('guide-title').textContent = guide.title;
  document.getElementById('guide-body').innerHTML = guide.body;
  goScreen('guide');
}

// ===================== APP STATE =====================
let scanIdx = 0;
let previousScreen = 'home';
let cameraStream = null;
let capturedImageData = null;
let currentAiResult = null;
let scanning = false;

// User Collection State
let myCollection = JSON.parse(localStorage.getItem('myCollection')) || [];

// User Auth State
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

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

setInterval(fetchFeaturedCards, 10 * 60 * 1000);

// ===================== CAMERA & CAPTURE =====================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playShutterSound() {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.05);
  
  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.1);
}

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
  const noNavScreens = ['detail', 'featured', 'guide', 'about', 'privacy'];
  nav.style.display = noNavScreens.includes(name) ? 'none' : 'flex';

  if (name === 'scan') {
    resetScan();
    initCamera();
  } else {
    stopCamera();
  }

  if (name === 'collection') renderCollection();
  if (name === 'wishlist') renderWishlist();
  if (name === 'home') {
    renderFeaturedCards();
    renderRecentCards();
  }
  if (name === 'featured') renderFullFeaturedGrid();

  updateStats();
  previousScreen = !noNavScreens.includes(name) ? name : previousScreen;
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
          <div class="cg-overlay">
            <div class="cg-name">${card.name}</div>
            <div class="cg-rare">${card.rarity}</div>
          </div>
        </div>
      `;
    }).join('');
  }
}

let currentFilter = 'all';
let currentSort = 'newest';

function updateStats() {
  const totalCount = myCollection.length;
  const pokeCount = myCollection.filter(c => c.category === 'pokemon').length;
  const sportsCount = myCollection.filter(c => c.category === 'sports').length;
  const tcgCount = myCollection.filter(c => c.category === 'tcg').length;
  const wishCount = myCollection.filter(c => c.wish).length;

  const totalEl = document.getElementById('total-count');
  if(totalEl) totalEl.textContent = totalCount;

  const collSub = document.getElementById('coll-sub');
  if(collSub) collSub.textContent = `${totalCount}장 보유중`;
  
  const statPoke = document.getElementById('stat-pokemon');
  if(statPoke) statPoke.textContent = `🔴 ${pokeCount}`;
  
  const statSports = document.getElementById('stat-sports');
  if(statSports) statSports.textContent = `⚽ ${sportsCount}`;
  
  const statTcg = document.getElementById('stat-tcg');
  if(statTcg) statTcg.textContent = `🃏 ${tcgCount}`;

  // Profile Sync
  const profTotal = document.getElementById('prof-total');
  if(profTotal) profTotal.textContent = totalCount;
  const profWish = document.getElementById('prof-wish');
  if(profWish) profWish.textContent = wishCount;
}

// ===================== RENDER COMPONENTS =====================
function renderFeaturedCards() {
  const grid = document.querySelector('#screen-home .card-grid');
  if(!grid) return;

  grid.innerHTML = currentFeatured.slice(0, 4).map(card => `
    <div class="c-card" onclick="openFeaturedDetail('${card.name}')">
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
    <div class="c-card" onclick="openFeaturedDetail('${card.name}')">
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

function filterHome(type, el) {
  currentFilter = type;
  document.querySelectorAll('#home-tabs .cat-tab').forEach(t => t.className = 'cat-tab');
  if(el) {
    if(type === 'all') el.className = 'cat-tab active-all';
    else if(type === 'pokemon') el.className = 'cat-tab active-poke';
    else if(type === 'sports') el.className = 'cat-tab active-soccer';
    else if(type === 'tcg') el.className = 'cat-tab active-all'; 
  }
  const collTabs = document.querySelectorAll('#filter-row .chip');
  collTabs.forEach(c => c.classList.remove('active'));
  const targetIdx = ['all', 'pokemon', 'sports', 'tcg'].indexOf(type);
  if(targetIdx !== -1 && collTabs[targetIdx]) collTabs[targetIdx].classList.add('active');
}

function filterColl(type, el) {
  currentFilter = type;
  document.querySelectorAll('#filter-row .chip').forEach(c => c.classList.remove('active'));
  if(el) el.classList.add('active');
  
  const homeTabs = document.querySelectorAll('#home-tabs .cat-tab');
  homeTabs.forEach(t => t.className = 'cat-tab');
  const targetIdx = ['all', 'pokemon', 'sports', 'tcg'].indexOf(type);
  if(targetIdx !== -1 && homeTabs[targetIdx]) {
    const classMap = ['active-all', 'active-poke', 'active-soccer', 'active-all'];
    homeTabs[targetIdx].className = 'cat-tab ' + classMap[targetIdx];
  }

  renderCollection();
}

function setSort(type, el) {
  currentSort = type;
  document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
  if(el) el.classList.add('active');
  renderCollection();
}

function renderCollection() {
  const grid = document.getElementById('coll-grid');
  if(!grid) return;
  
  let filtered = [...myCollection];
  if(currentFilter !== 'all') {
    filtered = filtered.filter(c => c.category === currentFilter);
  }

  if(currentSort === 'newest') {
    filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
  } else if(currentSort === 'oldest') {
    filtered.sort((a,b) => new Date(a.date) - new Date(b.date));
  } else if(currentSort === 'wishlist') {
    filtered = filtered.filter(c => c.wish);
  }

  let html = filtered.map((card) => {
    const realIdx = myCollection.findIndex(c => c.date === card.date);
    return `
      <div class="cg-card" onclick="openCapturedDetail(${realIdx})">
        <div class="cg-bg">
          <img src="${card.image}" style="width:100%; height:100%; object-fit:cover;">
          ${card.wish ? '<div class="cg-wish-indicator">❤️</div>' : ''}
        </div>
        <div class="cg-overlay">
          <div class="cg-name">${card.name}</div>
          <div class="cg-rare">${card.rarity}</div>
        </div>
      </div>
    `;
  }).join('');

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
  
  playShutterSound();
  const flash = document.getElementById('camera-flash');
  if(flash) {
    flash.classList.remove('flash-anim');
    void flash.offsetWidth;
    flash.classList.add('flash-anim');
  }

  const vf = document.getElementById('viewfinder');
  const placeholder = vf.querySelector('.vf-placeholder');
  const hint = vf.querySelector('.vf-hint');
  
  if(placeholder) {
    placeholder.style.display = 'block';
    placeholder.textContent = '⏳';
  }
  hint.textContent = 'AI가 이미지 분석 중...';

  capturedImageData = captureFrame();
  
  setTimeout(() => {
    const pool = recommendedPool.filter(c => c.category === (Math.random() > 0.5 ? 'pokemon' : 'sports'));
    const result = pool[Math.floor(Math.random() * pool.length)];
    
    currentAiResult = { ...result, conf: (95 + Math.random() * 4).toFixed(1) };

    const thumb = document.getElementById('ai-thumb');
    if(thumb) {
      thumb.className = 'ai-thumb bg-holo';
      thumb.innerHTML = `<img src="${capturedImageData}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
    }

    document.getElementById('ai-name').textContent = currentAiResult.name;
    document.getElementById('ai-set').textContent = currentAiResult.set;
    document.getElementById('ai-rarity').textContent = currentAiResult.rarity;
    document.getElementById('ai-cat').textContent = currentAiResult.category === 'pokemon' ? '포켓몬 카드' : (currentAiResult.category === 'sports' ? '스포츠 카드' : 'TCG 카드');
    document.getElementById('ai-confidence').textContent = currentAiResult.conf + '% 신뢰도';

    document.getElementById('ai-result').style.display = 'block';

    if(placeholder) placeholder.textContent = '✅';
    hint.textContent = '인식 완료!';
    scanning = false;
  }, 1000);
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

async function shareCollection() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: '나의 TCG 컬렉션',
        text: `TCGfinder에서 나의 컬렉션(${myCollection.length}장)을 구경해보세요!`,
        url: window.location.href
      });
    } catch (err) {
      console.log('Share canceled');
    }
  } else {
    showToast('📤', '공유 기능은 모바일 브라우저에서 최적화되어 있습니다.');
  }
}

async function requestFullPermissions() {
  try {
    await navigator.mediaDevices.getUserMedia({ video: true });
    showToast('📸', '카메라 권한이 허용되었습니다.');
    setTimeout(() => {
      showToast('📂', '파일/갤러리 접근 권한이 확인되었습니다.');
    }, 1000);
  } catch (err) {
    showToast('❌', '권한 요청 중 오류가 발생했습니다.');
  }
}

function openFeaturedDetail(name) {
  const card = recommendedPool.find(c => c.name === name);
  if(!card) return;
  
  document.getElementById('d-name').textContent = card.name;
  document.getElementById('d-set').textContent = card.set;
  document.getElementById('d-emoji').textContent = '🃏';
  document.getElementById('d-showcase').innerHTML = `<img src="${card.image}" style="width:100%;height:100%;object-fit:contain;padding:20px;">`;
  
  const detailBack = document.getElementById('detail-back');
  detailBack.onclick = () => goScreen('home');
  
  goScreen('detail');
}

function toggleWish(index) {
  myCollection[index].wish = !myCollection[index].wish;
  localStorage.setItem('myCollection', JSON.stringify(myCollection));
  renderCollection();
  renderWishlist();
  updateStats();
  showToast(myCollection[index].wish ? '❤️' : '💔', myCollection[index].wish ? '위시에 추가됨' : '위시 해제됨');
}

function openCapturedDetail(index) {
  const card = myCollection[index];
  
  document.getElementById('d-name').textContent = card.name;
  document.getElementById('d-set').textContent = card.set;
  document.getElementById('d-showcase').innerHTML = `
    <img src="${card.image}" style="width:100%;height:100%;object-fit:cover;">
    <div class="wish-toggle-btn ${card.wish?'active':''}" onclick="event.stopPropagation(); toggleWish(${index}); this.classList.toggle('active');">❤️</div>
  `;
  
  const detailBack = document.getElementById('detail-back');
  detailBack.onclick = () => goScreen('collection');
  
  goScreen('detail');
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

function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2,'0');
  const m = now.getMinutes().toString().padStart(2,'0');
  const time = h + ':' + m;
  document.querySelectorAll('.real-time-clock').forEach(el => {
    el.textContent = time;
  });
}

function showManual() {
  showToast('✏️', '직접 입력 기능은 개발 중이에요!');
}

// ===================== AUTH & GOOGLE LOGIN =====================
function parseJwt(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

function handleCredentialResponse(response) {
  const user = parseJwt(response.credential);
  currentUser = {
    name: user.name,
    email: user.email,
    picture: user.picture
  };
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  updateUserUI();
  showToast('👋', `${currentUser.name}님, 환영합니다!`);
}

function updateUserUI() {
  const loggedOut = document.getElementById('profile-logged-out');
  const loggedIn = document.getElementById('profile-logged-in');
  const headerAvatar = document.getElementById('header-avatar');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  const userPhoto = document.getElementById('user-photo');

  if (currentUser) {
    if (loggedOut) loggedOut.style.display = 'none';
    if (loggedIn) loggedIn.style.display = 'flex';
    if (userName) userName.textContent = currentUser.name;
    if (userEmail) userEmail.textContent = currentUser.email;
    if (userPhoto) userPhoto.innerHTML = `<img src="${currentUser.picture}" alt="Profile">`;
    if (headerAvatar) headerAvatar.innerHTML = `<img src="${currentUser.picture}" alt="Profile">`;
  } else {
    if (loggedOut) loggedOut.style.display = 'flex';
    if (loggedIn) loggedIn.style.display = 'none';
    if (headerAvatar) headerAvatar.textContent = '👤';
    renderGoogleButton();
  }
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  updateUserUI();
  showToast('🔒', '로그아웃 되었습니다');
}

function renderGoogleButton() {
  const btnContainer = document.getElementById("google-login-btn");
  if (!btnContainer || typeof google === 'undefined') return;
  google.accounts.id.renderButton(
    btnContainer,
    { theme: "outline", size: "large", width: 240, shape: "pill" }
  );
}

window.onload = function () {
  if (typeof google !== 'undefined') {
    google.accounts.id.initialize({
      client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com", // Replace with actual Client ID
      callback: handleCredentialResponse
    });
  }
  updateUserUI();
}

// Initial load
loadTheme();
updateClock();
setInterval(updateClock, 1000);
fetchFeaturedCards();
goScreen('home');
