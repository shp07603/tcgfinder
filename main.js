// ===================== CARD DATA =====================
const cards = {
  charizard: {
    name:'리자몽 VMAX', set:'Fusion Strike · #252/264',
    emoji:'⚡', bg:'bg-holo', holo:true,
    tags:['Holo','Ultra Rare','Mint','🔥 불꽃'],
    tagClasses:['t-holo','t-ultra','t-mint','t-fire'],
    hp:330, hpPct:82,
    stats:{ 타입:'🔥 불꽃', 카드사:'Nintendo', 등급:'Mint', 추가일:'25.02.18' },
    attacks:[
      { energy:'🔥🔥', name:'Max Volcanic', desc:'에너지 2장 폐기, 화상 부여', dmg:'220' },
      { energy:'🔥🔥🔥', name:'G-Max Wildfire', desc:'상대 벤치 포켓몬 20 데미지', dmg:'250' }
    ],
    category:'pokemon'
  },
  mbappe: {
    name:'Kylian Mbappé', set:'2024 Topps Chrome · Gold Prizm',
    emoji:'⚽', bg:'bg-soccer', holo:false,
    tags:['Gold Prizm','Numbered /50','Mint'],
    tagClasses:['t-ultra','t-holo','t-mint'],
    hp:null,
    stats:{ 카드사:'Topps', 시즌:'2023-24', 등급:'Mint', 추가일:'25.02.15' },
    attacks:[],
    category:'soccer'
  },
  // ... more cards can be added here
};

// ===================== SCAN DATA =====================
const scanResults = [
  { id: 'charizard', name:'리자몽 VMAX', set:'Fusion Strike', rarity:'252/264 · Ultra Rare', cat:'포켓몬 TCG', emoji:'⚡', bg:'bg-holo', conf:'98.4' },
  { id: 'mbappe', name:'음바페 Gold Prizm', set:'2024 Topps Chrome', rarity:'Gold · /50', cat:'축구 카드', emoji:'⚽', bg:'bg-soccer', conf:'96.1' },
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
  // TODO: 여기에 실제 AI API (예: Gemini Vision, OpenAI Vision) 연동 코드를 넣으세요.
  // 지금은 시뮬레이션을 위해 1.5초 대기 후 랜덤 결과를 반환합니다.
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

  updateStats();
  previousScreen = name !== 'detail' ? name : previousScreen;
}

function updateStats() {
  const totalCount = 247 + myCollection.length;
  const totalEl = document.getElementById('total-count');
  if(totalEl) totalEl.textContent = totalCount;
  
  const collSub = document.getElementById('coll-sub');
  if(collSub) collSub.textContent = totalCount + '장 보유중';
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

  // 1. 실제 이미지 캡처
  capturedImageData = captureFrame();

  // 2. AI 분석 요청 (imageData를 서버나 API로 보낼 준비)
  const result = await analyzeImageWithAI(capturedImageData);
  currentAiResult = result;

  // 3. 결과 표시
  const thumb = document.getElementById('ai-thumb');
  thumb.className = 'ai-thumb ' + result.bg;
  // 캡처한 이미지를 미리보기에 표시
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
  // 기본 카드들 (Hardcoded markers) + 내 컬렉션
  let html = '';
  
  // 내 컬렉션 (캡처된 이미지 포함)
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

  // 기존 하드코딩된 더미 데이터 유지 (예시)
  html += `
    <div class="cg-card" onclick="openDetail('charizard')">
      <div class="cg-bg bg-holo"><div class="holo-shine" style="position:absolute;inset:0"></div>⚡</div>
      <div class="cg-overlay"><div class="cg-name">리자몽 VMAX</div><div class="cg-rare">★ Ultra Rare</div></div>
    </div>
    <div class="cg-add" onclick="goScreen('scan')">
      <div class="cg-add-icon">+</div>
      <div class="cg-add-lbl">카드 추가</div>
    </div>
  `;

  grid.innerHTML = html;
}

// TODO: 캡처된 카드의 상세 페이지 열기 로직 추가 필요
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
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  const t = document.getElementById('toast');
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

function filterHome(type, el) {
  document.querySelectorAll('.cat-tabs .cat-tab').forEach(t => t.className = 'cat-tab');
  if(type === 'all') el.className = 'cat-tab active-all';
  else if(type === 'pokemon') el.className = 'cat-tab active-poke';
  else if(type === 'soccer') el.className = 'cat-tab active-soccer';
}

function filterColl(type, el) {
  document.querySelectorAll('#filter-row .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function swapSort(el) {
  document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
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

// Helper for Detail screen
function openDetail(cardId) {
  // Existing logic...
}
