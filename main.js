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
  pikachu: {
    name:'피카츄 ex', set:'Scarlet & Violet Promo · #SVP-EN058',
    emoji:'⭐', bg:'bg-gold', holo:true,
    tags:['Gold','ex Card','Near Mint'],
    tagClasses:['t-ultra','t-holo','t-mint'],
    hp:120, hpPct:50,
    stats:{ 타입:'⚡ 전기', 카드사:'Nintendo', 등급:'Near Mint', 추가일:'25.02.10' },
    attacks:[
      { energy:'⚡', name:'Thunderbolt', desc:'에너지 전부 폐기', dmg:'200' }
    ],
    category:'pokemon'
  },
  blastoise: {
    name:'거북왕 (Blastoise)', set:'Base Set · #2/102',
    emoji:'🌊', bg:'bg-water', holo:true,
    tags:['Holo Rare','Base Set','Good'],
    tagClasses:['t-holo','t-ultra','t-mint'],
    hp:100, hpPct:42,
    stats:{ 타입:'🌊 물', 카드사:'Nintendo', 등급:'Good', 추가일:'25.01.22' },
    attacks:[
      { energy:'🌊🌊', name:'Hydro Pump', desc:'부착 물 에너지 수에 따라 추가 데미지', dmg:'40+' }
    ],
    category:'pokemon'
  },
  pedri: {
    name:'Pedri González', set:'2024 Panini Prizm · #145',
    emoji:'🌀', bg:'bg-soccer', holo:false,
    tags:['Prizm','Silver','Near Mint'],
    tagClasses:['t-holo','t-ultra','t-mint'],
    hp:null,
    stats:{ 카드사:'Panini', 시즌:'2023-24', 등급:'Near Mint', 추가일:'25.01.18' },
    attacks:[],
    category:'soccer'
  },
  venusaur: {
    name:'이상해꽃 (Venusaur)', set:'Base Set · #15/102',
    emoji:'🌿', bg:'bg-green', holo:false,
    tags:['Rare','Base Set','Good'],
    tagClasses:['t-ultra','t-holo','t-mint'],
    hp:100, hpPct:45,
    stats:{ 타입:'🌿 풀', 카드사:'Nintendo', 등급:'Good', 추가일:'25.01.05' },
    attacks:[
      { energy:'🌿🌿', name:'Solarbeam', desc:'', dmg:'60' }
    ],
    category:'pokemon'
  },
  bellingham: {
    name:'Jude Bellingham', set:'2023-24 Topps Chrome · RC',
    emoji:'⚡', bg:'bg-soccer', holo:false,
    tags:['Rookie','Chrome','Mint'],
    tagClasses:['t-ultra','t-holo','t-mint'],
    hp:null,
    stats:{ 카드사:'Topps', 시즌:'2023-24', 등급:'Mint', 추가일:'25.01.30' },
    attacks:[],
    category:'soccer'
  },
  charmander: {
    name:'파이리 (Charmander)', set:'Paldea Evolved · #47/193',
    emoji:'🔥', bg:'bg-fire', holo:false,
    tags:['Common','Paldea','Near Mint'],
    tagClasses:['t-mint','t-ultra','t-mint'],
    hp:70, hpPct:30,
    stats:{ 타입:'🔥 불꽃', 카드사:'Nintendo', 등급:'Near Mint', 추가일:'25.02.01' },
    attacks:[
      { energy:'🔥', name:'Ember', desc:'에너지 1장 폐기', dmg:'30' }
    ],
    category:'pokemon'
  },
  haaland: {
    name:'Erling Haaland', set:'2024 Topps · #88',
    emoji:'⚽', bg:'bg-soccer', holo:false,
    tags:['Base','Topps','Mint'],
    tagClasses:['t-ultra','t-mint','t-mint'],
    hp:null,
    stats:{ 카드사:'Topps', 시즌:'2023-24', 등급:'Mint', 추가일:'25.02.05' },
    attacks:[],
    category:'soccer'
  }
};

// ===================== SCAN DATA =====================
const scanResults = [
  { name:'리자몽 VMAX', set:'Fusion Strike', rarity:'252/264 · Ultra Rare', cat:'포켓몬 TCG', emoji:'⚡', bg:'bg-holo', conf:'98.4' },
  { name:'음바페 Gold Prizm', set:'2024 Topps Chrome', rarity:'Gold · /50', cat:'축구 카드', emoji:'⚽', bg:'bg-soccer', conf:'96.1' },
  { name:'피카츄 ex', set:'SV Promo', rarity:'SVP-EN058 · Promo', cat:'포켓몬 TCG', emoji:'⭐', bg:'bg-gold', conf:'99.2' },
  { name:'Bellingham RC', set:'2023-24 Topps Chrome', rarity:'Rookie Card', cat:'축구 카드', emoji:'⚡', bg:'bg-soccer', conf:'97.8' },
  { name:'거북왕 Holo', set:'Base Set', rarity:'2/102 · Holo Rare', cat:'포켓몬 TCG', emoji:'🌊', bg:'bg-water', conf:'94.5' },
];
let scanIdx = 0;
let totalCards = 247;
let previousScreen = 'home';

// ===================== NAVIGATION =====================
function goScreen(name) {
  // hide all
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });
  // show target
  const target = document.getElementById('screen-' + name);
  if(!target) return;
  target.classList.add('active');

  // nav highlight
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const nb = document.getElementById('nav-' + name);
  if(nb) nb.classList.add('active');

  // hide nav on scan/detail
  const nav = document.getElementById('nav');
  if(name === 'detail') {
    nav.style.display = 'none';
  } else {
    nav.style.display = 'flex';
  }

  // hide scan result when entering scan
  if(name === 'scan') {
    resetScan();
  }

  previousScreen = name !== 'detail' ? name : previousScreen;
}

function openDetail(cardId) {
  const card = cards[cardId];
  if(!card) return;
  previousScreen = document.querySelector('.screen.active').id.replace('screen-','') || 'home';

  // populate detail
  const showcase = document.getElementById('d-showcase');
  showcase.className = 'card-showcase ' + card.bg;
  if(card.holo) {
    showcase.innerHTML = '<div class="holo-shine"></div><span id="d-emoji">' + card.emoji + '</span>';
  } else {
    showcase.innerHTML = '<span id="d-emoji">' + card.emoji + '</span>';
  }

  document.getElementById('d-name').textContent = card.name;
  document.getElementById('d-set').textContent = card.set;

  // tags
  const tagsEl = document.getElementById('d-tags');
  tagsEl.innerHTML = card.tags.map((t,i) =>
    `<div class="d-tag ${card.tagClasses[i]}">${t}</div>`
  ).join('');

  // hp
  const hpSection = document.getElementById('d-hp-section');
  if(card.hp) {
    hpSection.style.display = 'block';
    document.getElementById('d-hp').textContent = card.hp + ' HP';
    document.getElementById('d-hp-fill').style.width = card.hpPct + '%';
  } else {
    hpSection.style.display = 'none';
  }

  // stats
  const statsEl = document.getElementById('d-stats');
  statsEl.innerHTML = Object.entries(card.stats).map(([k,v]) =>
    `<div class="sg-item"><div class="sg-lbl">${k}</div><div class="sg-val ${k==='등급'?'gold-txt':''}">${v}</div></div>`
  ).join('');

  // attacks
  const atkWrap = document.getElementById('d-attacks-wrap');
  if(card.attacks && card.attacks.length > 0) {
    atkWrap.style.display = 'block';
    document.getElementById('d-attacks').innerHTML = card.attacks.map(a =>
      `<div class="attack-row">
        <div class="atk-energy">${a.energy}</div>
        <div class="atk-info">
          <div class="atk-name">${a.name}</div>
          ${a.desc ? `<div class="atk-desc">${a.desc}</div>` : ''}
        </div>
        <div class="atk-dmg">${a.dmg}</div>
      </div>`
    ).join('');
  } else {
    atkWrap.style.display = 'none';
  }

  // back btn
  document.getElementById('detail-back').onclick = () => goScreen(previousScreen);

  goScreen('detail');
}

// ===================== SCAN =====================
let scanning = false;
function triggerScan() {
  if(scanning) return;
  scanning = true;
  const vf = document.getElementById('viewfinder');
  vf.querySelector('.vf-placeholder').textContent = '⏳';
  vf.querySelector('.vf-hint').textContent = 'AI가 분석 중...';

  setTimeout(() => {
    const result = scanResults[scanIdx % scanResults.length];
    scanIdx++;
    // populate ai result
    const thumb = document.getElementById('ai-thumb');
    thumb.className = 'ai-thumb ' + result.bg;
    thumb.innerHTML = (result.bg === 'bg-holo' ? '<div class="holo-shine"></div>' : '') + `<span>${result.emoji}</span>`;

    document.getElementById('ai-name').textContent = result.name;
    document.getElementById('ai-set').textContent = result.set;
    document.getElementById('ai-rarity').textContent = result.rarity;
    document.getElementById('ai-cat').textContent = result.cat;
    document.getElementById('ai-confidence').textContent = result.conf + '% 신뢰도';

    document.getElementById('ai-result').style.display = 'block';

    vf.querySelector('.vf-placeholder').textContent = '✅';
    vf.querySelector('.vf-hint').textContent = '인식 완료!';
    scanning = false;
  }, 1800);
}

function resetScan() {
  document.getElementById('ai-result').style.display = 'none';
  const vf = document.getElementById('viewfinder');
  if(vf.querySelector('.vf-placeholder')) {
    vf.querySelector('.vf-placeholder').textContent = '🃏';
    vf.querySelector('.vf-hint').textContent = '탭하여 카드를 스캔하세요';
  }
  scanning = false;
}

function addToCollection() {
  totalCards++;
  document.getElementById('total-count').textContent = totalCards;
  document.getElementById('coll-sub').textContent = totalCards + '장 보유중';
  showToast('✅', '컬렉션에 추가됐습니다!');
  setTimeout(() => { goScreen('home'); }, 1200);
}

function showManual() {
  showToast('✏️', '직접 입력 기능은 개발 중이에요!');
}

// ===================== FILTERS =====================
function filterHome(type, el) {
  document.querySelectorAll('.cat-tabs .cat-tab').forEach(t => {
    t.className = 'cat-tab';
  });
  if(type === 'all') el.className = 'cat-tab active-all';
  else if(type === 'pokemon') el.className = 'cat-tab active-poke';
  else if(type === 'soccer') el.className = 'cat-tab active-soccer';
}

function filterColl(type, el) {
  document.querySelectorAll('#filter-row .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const grid = document.getElementById('coll-grid');
  const cards_el = grid.querySelectorAll('.cg-card');
  cards_el.forEach(c => c.style.display = 'block');
}

function swapSort(el) {
  document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  showToast('🔄', '정렬 방식이 변경됐습니다');
}

// ===================== TOAST =====================
let toastTimer;
function showToast(icon, msg) {
  clearTimeout(toastTimer);
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  const t = document.getElementById('toast');
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ===================== CLOCK =====================
function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2,'0');
  const m = now.getMinutes().toString().padStart(2,'0');
  const time = h + ':' + m;
  document.querySelectorAll('#clock,#clock2').forEach(el => { if(el) el.textContent = time; });
}
updateClock();
setInterval(updateClock, 10000);

// Initial load
goScreen('home');
