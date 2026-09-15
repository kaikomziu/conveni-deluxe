'use strict';

/* =========================================================
   CONVENI DELUXE - game data
   ========================================================= */

const PRODUCTS = [
  { id:'onigiri',  name:'おにぎり',   emoji:'🍙', price:120, unlockCost:0,      weight:10 },
  { id:'pan',      name:'パン',       emoji:'🥐', price:150, unlockCost:600,    weight:9 },
  { id:'drink',    name:'飲み物',     emoji:'🥤', price:130, unlockCost:1500,   weight:9 },
  { id:'bento',    name:'お弁当',     emoji:'🍱', price:480, unlockCost:4000,   weight:7 },
  { id:'sweets',   name:'スイーツ',   emoji:'🍰', price:300, unlockCost:9000,   weight:6 },
  { id:'icecream', name:'アイス',     emoji:'🍦', price:220, unlockCost:18000,  weight:6 },
  { id:'fried',    name:'揚げ物',     emoji:'🍗', price:380, unlockCost:35000,  weight:5 },
  { id:'coffee',   name:'コーヒー',   emoji:'☕', price:200, unlockCost:70000,  weight:5 },
  { id:'magazine', name:'雑誌',       emoji:'📖', price:650, unlockCost:130000, weight:3 },
  { id:'lottery',  name:'くじ引き',   emoji:'🎫', price:900, unlockCost:250000, weight:2 },
];
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p=>[p.id,p]));

const REGISTER_COSTS = [0, 8000, 60000]; // cost to have index+1 lanes (index0=already have)
const MAX_LANES = 3;
const MAX_QUEUE = 6;

const EQUIP = {
  scanSpeed: {
    name:'スキャン速度アップ', icon:'⚡', max:8, baseCost:400, costMult:2.05,
    desc:(lv)=>`長押し時間: ${(scanDuration(lv)/1000).toFixed(2)}秒 → ${(scanDuration(lv+1)/1000).toFixed(2)}秒`,
  },
  patience: {
    name:'接客マニュアル', icon:'📋', max:8, baseCost:350, costMult:2.0,
    desc:(lv)=>`お客さんの忍耐時間 +${(patienceMs(lv+1)-patienceMs(lv))/1000|0}秒`,
  },
  spawnRate: {
    name:'集客キャンペーン', icon:'📣', max:8, baseCost:500, costMult:2.15,
    desc:(lv)=>`来客間隔を短縮 (現在 約${(spawnInterval(lv)/1000).toFixed(1)}秒 → 約${(spawnInterval(lv+1)/1000).toFixed(1)}秒)`,
  },
  priceMultiplier: {
    name:'値札の見直し', icon:'🏷️', max:10, baseCost:1200, costMult:2.5,
    desc:(lv)=>`販売価格 +8% (現在 +${lv*8}% → +${(lv+1)*8}%)`,
  },
  vipChance: {
    name:'VIP会員カード', icon:'💳', max:8, baseCost:2200, costMult:2.3,
    desc:(lv)=>`VIP来店率 ${(vipChance(lv)*100).toFixed(1)}% → ${(vipChance(lv+1)*100).toFixed(1)}%`,
  },
  vipBonus: {
    name:'VIPラウンジ', icon:'🥂', max:6, baseCost:5000, costMult:2.6,
    desc:(lv)=>`VIP購入額 ×${vipMultiplier(lv).toFixed(1)} → ×${vipMultiplier(lv+1).toFixed(1)}`,
  },
  baitoSpeed: {
    name:'バイト研修', icon:'🎓', max:8, baseCost:3000, costMult:2.25,
    desc:(lv)=>`バイトの作業時間 ${(baitoDuration(lv)/1000).toFixed(2)}秒 → ${(baitoDuration(lv+1)/1000).toFixed(2)}秒`,
  },
};

const AVATARS = ['🧑','👩','👨','🧑‍🦱','👵','👴','🧑‍🎓','👩‍🦰','🧔','👩‍🦳'];
const VIP_AVATARS = ['🤵','👸','🕴️'];
const QTY_WEIGHTS = [ {q:1,weight:65}, {q:2,weight:25}, {q:3,weight:10} ];

const TUTORIAL_STEPS = [
  { icon:'🏪', title:'ようこそ CONVENI DELUXEへ', body:'あなたは今日からコンビニの店長。売っているのは「おにぎり」1種類だけ…この小さなお店を、少しずつ大きくしていこう。' },
  { icon:'👆', title:'長押しでスキャン', body:'レジにお客さんが来たら、そのレジを長押ししよう。押し続けると輪っかが満タンになり、会計完了でお金がもらえる。途中で指を離すと進み具合が減ってしまうので注意。' },
  { icon:'⏳', title:'お客さんは気が短い', body:'列で待つお客さんには忍耐ゲージがある。待たせすぎると怒って帰ってしまい、お店の評判(⭐)も下がってしまう。手早く対応しよう。' },
  { icon:'👑', title:'VIPとまとめ買い', body:'たまに来るVIP客は購入額が豪華。さらにお客さんは「おにぎり×3」のようにまとめ買いすることもあり、個数が多いほどスキャンに時間がかかるぶん実入りも大きい。' },
  { icon:'💻', title:'PCでお店を強化', body:'貯まったお金は「PC」画面で使おう。新商品の仕入れ、スキャン速度や集客力などの設備投資、そしてレジを自動化してくれる「バイト」の雇用ができる。' },
  { icon:'🌙', title:'さあ、開店しよう', body:'バイトを雇えば、あなたが離席している間もお店は自動で稼いでくれる。焦らずコツコツお店を育てていこう！' },
];

/* =========================================================
   Formulas
   ========================================================= */
function scanDuration(lv){ return Math.max(320, 900 - lv*72); }
function patienceMs(lv){ return 11000 + lv*1800; }
function spawnInterval(lv){ return Math.max(2600, 6200 - lv*430); }
function priceMult(lv){ return 1 + lv*0.08; }
function vipChance(lv){ return Math.min(0.30, 0.05 + lv*0.025); }
function vipMultiplier(lv){ return 4 + lv*0.5; }
function baitoDuration(lv){ return Math.max(850, 2600 - lv*220); }
function qtyDurationMult(qty){ return 1 + (qty-1)*0.6; }
function custScanDuration(cust){ return scanDuration(S.equip.scanSpeed) * qtyDurationMult(cust.qty); }
function custBaitoDuration(cust){ return baitoDuration(S.equip.baitoSpeed) * qtyDurationMult(cust.qty); }
function custPrice(cust){
  const product = PRODUCT_MAP[cust.itemId];
  let price = product.price * cust.qty * priceMult(S.equip.priceMultiplier);
  if(cust.isVIP) price *= vipMultiplier(S.equip.vipBonus);
  return Math.round(price);
}
function equipCost(key, lv){
  const e = EQUIP[key];
  return Math.round(e.baseCost * Math.pow(e.costMult, lv) / 10) * 10;
}
function baitoCost(hiredCount){
  return Math.round(6000 * Math.pow(2.35, hiredCount) / 10) * 10;
}

/* =========================================================
   State
   ========================================================= */
function freshState(){
  return {
    money: 300,
    totalEarned: 0,
    customersServed: 0,
    customersLost: 0,
    reputation: 50,
    unlocked: { onigiri:true },
    equip: { scanSpeed:0, patience:0, spawnRate:0, priceMultiplier:0, vipChance:0, vipBonus:0, baitoSpeed:0 },
    registerCount: 1,
    baito: [false, false, false],
    baitoHiredCount: 0,
    lanes: [ laneObj(), laneObj(), laneObj() ],
    queue: [],
    spawnTimer: 3000,
    lastSave: Date.now(),
    tutorialSeen: false,
  };
}
function laneObj(){ return { customer:null, progress:0, holding:false }; }

let S = load() || freshState();
handleOfflineProgress();

let nextCustId = 1;

/* =========================================================
   Persistence
   ========================================================= */
function save(){
  S.lastSave = Date.now();
  try{ localStorage.setItem('conveniDeluxeSave', JSON.stringify(S)); }catch(e){}
}
function load(){
  try{
    const raw = localStorage.getItem('conveniDeluxeSave');
    if(!raw) return null;
    const d = JSON.parse(raw);
    const f = freshState();
    // merge to survive schema additions
    d.equip = Object.assign({}, f.equip, d.equip);
    d.baito = d.baito && d.baito.length===3 ? d.baito : f.baito;
    d.lanes = [laneObj(), laneObj(), laneObj()]; // never restore mid-scan state
    d.queue = []; // don't restore queued customers (avoid stale patience issues)
    d.spawnTimer = 2000;
    return Object.assign(f, d);
  }catch(e){ return null; }
}
function handleOfflineProgress(){
  const elapsed = Date.now() - (S.lastSave || Date.now());
  const offlineSec = Math.min(elapsed/1000, 3*3600);
  const baitoLanes = S.baito.slice(0, S.registerCount).filter(Boolean).length;
  if(offlineSec < 30 || baitoLanes===0) return;
  const avgPrice = avgUnlockedPrice() * priceMult(S.equip.priceMultiplier);
  const itemsPerSec = 1/(baitoDuration(S.equip.baitoSpeed)/1000);
  const earnings = Math.round(baitoLanes * itemsPerSec * avgPrice * offlineSec * 0.45);
  if(earnings > 0){
    S.money += earnings;
    S.totalEarned += earnings;
    pendingOfflineReport = { seconds:offlineSec, earnings };
  }
}
function avgUnlockedPrice(){
  const list = PRODUCTS.filter(p=>S.unlocked[p.id]);
  if(!list.length) return 0;
  return list.reduce((a,p)=>a+p.price,0)/list.length;
}
let pendingOfflineReport = null;

/* =========================================================
   Customer logic
   ========================================================= */
function pickWeighted(list){
  const total = list.reduce((a,p)=>a+p.weight,0);
  let r = Math.random()*total;
  for(const p of list){ r -= p.weight; if(r<=0) return p; }
  return list[list.length-1];
}
function spawnCustomer(){
  if(S.queue.length >= MAX_QUEUE) return;
  const unlockedList = PRODUCTS.filter(p=>S.unlocked[p.id]);
  if(!unlockedList.length) return;
  const isVIP = Math.random() < vipChance(S.equip.vipChance);
  let product;
  if(isVIP){
    // VIP leans toward pricier unlocked items
    const rev = unlockedList.map(p=>({...p, weight: unlockedList.indexOf(p)+1}));
    product = pickWeighted(rev);
  } else {
    product = pickWeighted(unlockedList);
  }
  const qty = pickWeighted(QTY_WEIGHTS).q;
  const basePatience = patienceMs(S.equip.patience) * (isVIP?1.4:1) * (0.85 + Math.random()*0.3);
  S.queue.push({
    id: nextCustId++,
    itemId: product.id,
    qty,
    isVIP,
    avatar: isVIP ? VIP_AVATARS[Math.floor(Math.random()*VIP_AVATARS.length)] : AVATARS[Math.floor(Math.random()*AVATARS.length)],
    patienceMax: basePatience,
    patienceLeft: basePatience,
    arrivalGrace: 500, // ms the customer spends visibly walking up before they can be called to a register
  });
}

function completeSale(lane){
  const cust = lane.customer;
  const product = PRODUCT_MAP[cust.itemId];
  const price = custPrice(cust);
  S.money += price;
  S.totalEarned += price;
  S.customersServed++;
  S.reputation = Math.min(100, S.reputation + (cust.isVIP?3:1));
  spawnFloatText(lane._el, `+¥${price.toLocaleString()}`, cust.isVIP);
  const qtyTxt = cust.qty>1 ? `×${cust.qty}` : '';
  if(cust.isVIP) toast(`👑 VIPが ${product.name}${qtyTxt} を購入！ +¥${price.toLocaleString()}`, 'vip');
  lane.customer = null;
  lane.progress = 0;
  lane.holding = false; // require a fresh press for the next customer
}

function loseCustomer(){
  S.customersLost++;
  S.reputation = Math.max(0, S.reputation - 3);
}

/* =========================================================
   Main tick
   ========================================================= */
const TICK = 100;
let rankSubmitAcc = 0;
function tick(){
  rankSubmitAcc += TICK;
  if(rankSubmitAcc > 45000){ rankSubmitAcc = 0; tryRankSubmit(false); }
  // spawn
  S.spawnTimer -= TICK;
  if(S.spawnTimer <= 0){
    spawnCustomer();
    const repBonus = 1 - (S.reputation/100)*0.15;
    S.spawnTimer = spawnInterval(S.equip.spawnRate) * repBonus * (0.8 + Math.random()*0.4);
  }
  // queue patience + arrival grace (customers must be visibly waiting at least a moment
  // before they can be called to a register, so they never seem to "teleport" straight to the scanner)
  for(let i=S.queue.length-1; i>=0; i--){
    const c = S.queue[i];
    c.patienceLeft -= TICK;
    if(c.arrivalGrace > 0) c.arrivalGrace -= TICK;
    if(c.patienceLeft <= 0){
      S.queue.splice(i,1);
      loseCustomer();
      toast('😠 お客さんが待ちきれずに帰ってしまった…', 'bad');
    }
  }
  // lanes
  for(let i=0; i<S.registerCount; i++){
    const lane = S.lanes[i];
    if(!lane.customer && S.queue.length>0 && S.queue[0].arrivalGrace<=0){
      lane.customer = S.queue.shift();
      lane.progress = 0;
    }
    if(lane.customer){
      const isBaito = S.baito[i];
      if(isBaito){
        lane.progress += TICK / custBaitoDuration(lane.customer);
      } else if(lane.holding){
        lane.progress += TICK / custScanDuration(lane.customer);
      } else {
        lane.progress -= TICK / custScanDuration(lane.customer) * 0.55;
      }
      lane.progress = Math.max(0, Math.min(1, lane.progress));
      if(lane.progress >= 1){
        completeSale(lane);
      }
    }
  }
  render();
}

/* =========================================================
   Rendering
   ========================================================= */
const $ = sel => document.querySelector(sel);
const moneyDisplay = $('#moneyDisplay');
const repDisplay = $('#repDisplay');
const queueRow = $('#queueRow');
const queueCount = $('#queueCount');
const lanesRow = $('#lanesRow');
const pcMoney = $('#pcMoney');

function fmtMoney(n){
  n = Math.round(n);
  if(n >= 100000000) return '¥' + (n/100000000).toFixed(2).replace(/\.00$/,'') + '億';
  if(n >= 10000) return '¥' + (n/10000).toFixed(n<1000000?1:0) + '万';
  return '¥' + n.toLocaleString();
}
function fmtMoneyFull(n){ return '¥' + Math.round(n).toLocaleString(); }

function render(){
  moneyDisplay.textContent = fmtMoney(S.money);
  moneyDisplay.title = fmtMoneyFull(S.money);
  pcMoney.textContent = fmtMoney(S.money);
  repDisplay.textContent = `⭐ ${Math.round(S.reputation)}`;
  queueCount.textContent = S.queue.length;

  renderQueue();
  renderLanes();

  $('#statTotalEarned').textContent = fmtMoney(S.totalEarned);
  $('#statServed').textContent = S.customersServed;
  $('#statLost').textContent = S.customersLost;
}

let queueSignature = '';
function renderQueue(){
  const sig = S.queue.map(c=>c.id).join(',');
  if(sig !== queueSignature){
    queueSignature = sig;
    queueRow.innerHTML = '';
    for(const c of S.queue){
      const p = PRODUCT_MAP[c.itemId];
      const div = document.createElement('div');
      div.className = 'cust cust-new';
      div.dataset.custId = c.id;
      div.innerHTML = `
        ${c.isVIP?'<div class="vip-badge">👑</div>':''}
        <div class="avatar">${c.avatar}</div>
        <div class="want">${p.emoji}${c.qty>1?`×${c.qty}`:''}</div>
        <div class="patience-bar"><div class="patience-fill"></div></div>
      `;
      updateCustEl(div, c);
      queueRow.appendChild(div);
      setTimeout(()=>div.classList.remove('cust-new'), 220);
    }
  } else {
    const children = queueRow.children;
    for(let i=0; i<S.queue.length; i++){
      updateCustEl(children[i], S.queue[i]);
    }
  }
}
// Only ever toggles individual modifier classes (never overwrites the whole
// className string) so the one-shot pop-in animation is never restarted by
// the per-tick patience-bar update.
function updateCustEl(div, c){
  const ratio = c.patienceLeft / c.patienceMax;
  div.classList.toggle('vip', !!c.isVIP);
  div.classList.toggle('warn', ratio<0.5);
  div.classList.toggle('danger', ratio<0.22);
  const fill = div.querySelector('.patience-fill');
  if(fill) fill.style.width = Math.max(0,ratio*100) + '%';
}

let laneSignature = ['','',''];
function renderLanes(){
  for(let i=0; i<MAX_LANES; i++){
    if(i >= S.registerCount){
      if(laneSignature[i] !== 'locked'){
        laneSignature[i] = 'locked';
        const div = document.createElement('div');
        div.className = 'lane locked';
        div.textContent = `🔒 未設置のレジ (PCの「設備」から増設)`;
        replaceLaneEl(i, div);
      }
      continue;
    }
    const lane = S.lanes[i];
    const isBaito = S.baito[i];
    const sig = `${isBaito}|${lane.customer?lane.customer.id:'-'}`;
    if(laneSignature[i] !== sig){
      laneSignature[i] = sig;
      const div = document.createElement('div');
      div.dataset.lane = i;
      if(!lane.customer){
        div.className = 'lane empty' + (isBaito?' baito-lane':'');
        div.innerHTML = `<span>${isBaito?'👷 バイト待機中':'お客さん待ち…'}</span>` + (isBaito?'<div class="baito-tag">STAFF</div>':'');
      } else {
        const p = PRODUCT_MAP[lane.customer.itemId];
        const price = custPrice(lane.customer);
        const qtyTxt = lane.customer.qty>1 ? ` ×${lane.customer.qty}` : '';
        div.className = 'lane' + (isBaito?' baito-lane':' active-scan');
        div.innerHTML = `
          ${isBaito?'<div class="baito-tag">STAFF</div>':''}
          ${lane.customer.isVIP?'<div class="vip-badge-lane">👑</div>':''}
          <div class="scan-ring" style="--p:0"><span class="scan-item-emoji">${p.emoji}</span></div>
          <div class="lane-info">
            <div class="lane-item-name">${p.name}${qtyTxt}${lane.customer.isVIP?' <b style="color:#c9950a">VIP</b>':''}</div>
            <div class="lane-price">${fmtMoneyFull(price)}</div>
            <div class="lane-hint">${isBaito?'自動スキャン中…':'長押しでスキャン'}</div>
          </div>
        `;
      }
      replaceLaneEl(i, div);
      if(lane.customer){
        div.classList.add('lane-arrive');
        setTimeout(()=>div.classList.remove('lane-arrive'), 500);
      }
    }
    // cosmetic per-tick updates (no structural rebuild)
    const el = S.lanes[i]._el;
    if(el && lane.customer){
      const ring = el.querySelector('.scan-ring');
      if(ring) ring.style.setProperty('--p', lane.progress);
      el.classList.toggle('pressed', !!lane.holding);
      const priceEl = el.querySelector('.lane-price');
      if(priceEl) priceEl.textContent = fmtMoneyFull(custPrice(lane.customer));
    }
  }
}
function replaceLaneEl(i, div){
  const old = lanesRow.children[i];
  if(old) lanesRow.replaceChild(div, old);
  else lanesRow.appendChild(div);
  if(i < S.registerCount) S.lanes[i]._el = div;
}

/* =========================================================
   Lane pointer interaction (long press)
   ========================================================= */
function laneFromEvent(e){
  const el = e.target.closest('.lane');
  if(!el || el.dataset.lane===undefined) return null;
  const idx = Number(el.dataset.lane);
  if(idx>=S.registerCount) return null;
  if(S.baito[idx]) return null;
  return S.lanes[idx];
}
lanesRow.addEventListener('pointerdown', e=>{
  const lane = laneFromEvent(e);
  const laneEl = e.target.closest('.lane');
  if(lane && lane.customer){
    lane.holding = true;
    laneEl.classList.add('pressed');
    // keep receiving this pointer's move/up even if the finger drifts off the
    // element slightly (very common on touch) so the scan doesn't cancel itself
    if(laneEl.setPointerCapture){
      try{ laneEl.setPointerCapture(e.pointerId); }catch(err){}
    }
  }
});
function releaseAll(){
  for(const lane of S.lanes) lane.holding = false;
  document.querySelectorAll('.lane.pressed').forEach(el=>el.classList.remove('pressed'));
}
// Only a genuine release (pointerup/pointercancel) or losing the window's focus stops
// the scan — NOT pointerleave, which fires from small finger drift even while captured.
lanesRow.addEventListener('pointerup', releaseAll);
lanesRow.addEventListener('pointercancel', releaseAll);
window.addEventListener('blur', releaseAll);

/* =========================================================
   Float text / toast
   ========================================================= */
function spawnFloatText(laneEl, text, isVip){
  if(!laneEl) return;
  const rect = laneEl.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = 'floattext';
  div.textContent = text;
  if(isVip) div.style.color = '#c9950a';
  div.style.left = (rect.left + rect.width/2 - 20) + 'px';
  div.style.top = (rect.top + 10) + 'px';
  document.getElementById('floatWrap').appendChild(div);
  setTimeout(()=>div.remove(), 1000);
}
function toast(msg, type){
  const div = document.createElement('div');
  div.className = 'toast' + (type?` ${type}`:'');
  div.textContent = msg;
  document.getElementById('toastWrap').appendChild(div);
  setTimeout(()=>div.remove(), 2500);
}

/* =========================================================
   View / tab switching
   ========================================================= */
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById(btn.dataset.view+'View').classList.add('active');
    if(btn.dataset.view==='pc') renderPC();
  });
});
document.querySelectorAll('.pc-tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.pc-tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.pc-panel').forEach(v=>v.classList.remove('active'));
    document.getElementById('panel'+capitalize(btn.dataset.pctab)).classList.add('active');
    if(btn.dataset.pctab==='ranking') renderRankingPanel();
  });
});
function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

/* =========================================================
   PC panels
   ========================================================= */
function renderPC(){
  renderProductsPanel();
  renderEquipPanel();
  renderStaffPanel();
  renderSettingsPanel();
}

function buyBtn(label, cost, canAfford, onClick, extraClass){
  const btn = document.createElement('button');
  btn.className = 'buy-btn' + (extraClass?` ${extraClass}`:'');
  btn.innerHTML = label;
  btn.disabled = !canAfford;
  if(canAfford) btn.addEventListener('click', onClick);
  return btn;
}

function renderProductsPanel(){
  const panel = $('#panelProducts');
  panel.innerHTML = '';
  for(const p of PRODUCTS){
    const unlocked = !!S.unlocked[p.id];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="icon">${p.emoji}</div>
      <div class="body">
        <div class="title">${p.name} ${unlocked?'':'<span class="tag-locked">未入荷</span>'}</div>
        <div class="desc">販売価格 ${fmtMoneyFull(p.price)} / 個</div>
      </div>
    `;
    const btnHost = document.createElement('div');
    if(unlocked){
      const badge = document.createElement('button');
      badge.className = 'buy-btn owned';
      badge.textContent = '入荷済み';
      badge.disabled = true;
      btnHost.appendChild(badge);
    } else {
      const can = S.money >= p.unlockCost;
      btnHost.appendChild(buyBtn(`仕入れ<br>${fmtMoney(p.unlockCost)}`, p.unlockCost, can, ()=>{
        S.money -= p.unlockCost;
        S.unlocked[p.id] = true;
        toast(`📦 ${p.name} が入荷しました！`);
        renderPC(); render(); save();
      }));
    }
    card.appendChild(btnHost);
    panel.appendChild(card);
  }
}

function renderEquipPanel(){
  const panel = $('#panelEquip');
  panel.innerHTML = '';

  // register expansion cards
  for(let i=1; i<MAX_LANES; i++){
    const owned = S.registerCount > i;
    const cost = REGISTER_COSTS[i];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="icon">🖥️</div>
      <div class="body">
        <div class="title">レジ増設 (${i+1}台目)</div>
        <div class="desc">レジを増やして同時に接客できる人数を増やす</div>
      </div>
    `;
    const host = document.createElement('div');
    if(owned){
      const b = document.createElement('button');
      b.className='buy-btn owned'; b.textContent='設置済み'; b.disabled=true;
      host.appendChild(b);
    } else if(S.registerCount === i){
      const can = S.money >= cost;
      host.appendChild(buyBtn(`増設<br>${fmtMoney(cost)}`, cost, can, ()=>{
        S.money -= cost; S.registerCount++;
        toast('🖥️ レジを増設しました！');
        renderPC(); render(); save();
      }));
    } else {
      const b = document.createElement('button');
      b.className='buy-btn'; b.textContent='先に前のレジを'; b.disabled=true;
      host.appendChild(b);
    }
    card.appendChild(host);
    panel.appendChild(card);
  }

  // leveled equipment
  for(const key of ['scanSpeed','patience','spawnRate','priceMultiplier','vipChance','vipBonus']){
    panel.appendChild(equipCard(key));
  }
}

function equipCard(key){
  const e = EQUIP[key];
  const lv = S.equip[key];
  const maxed = lv >= e.max;
  const cost = maxed ? 0 : equipCost(key, lv);
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="icon">${e.icon}</div>
    <div class="body">
      <div class="title">${e.name}</div>
      <div class="desc">${maxed ? '最大レベルに到達' : e.desc(lv)}</div>
      <div class="lvl">Lv. ${lv} / ${e.max}</div>
    </div>
  `;
  const host = document.createElement('div');
  if(maxed){
    const b = document.createElement('button');
    b.className='buy-btn max'; b.textContent='MAX'; b.disabled=true;
    host.appendChild(b);
  } else {
    const can = S.money >= cost;
    host.appendChild(buyBtn(`強化<br>${fmtMoney(cost)}`, cost, can, ()=>{
      S.money -= cost; S.equip[key]++;
      toast(`${e.icon} ${e.name} Lv.${S.equip[key]} になった！`);
      renderPC(); render(); save();
    }));
  }
  card.appendChild(host);
  return card;
}

function renderStaffPanel(){
  const panel = $('#panelStaff');
  panel.innerHTML = '';

  for(let i=0; i<S.registerCount; i++){
    const hired = S.baito[i];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="icon">${hired?'👷':'🙍'}</div>
      <div class="body">
        <div class="title">${i+1}番レジのバイト</div>
        <div class="desc">${hired ? '自動でスキャン・会計してくれる' : 'このレジを自動化するバイトを雇う'}</div>
      </div>
    `;
    const host = document.createElement('div');
    if(hired){
      const b = document.createElement('button');
      b.className='buy-btn owned'; b.textContent='勤務中'; b.disabled=true;
      host.appendChild(b);
    } else {
      const cost = baitoCost(S.baitoHiredCount);
      const can = S.money >= cost;
      host.appendChild(buyBtn(`雇う<br>${fmtMoney(cost)}`, cost, can, ()=>{
        S.money -= cost; S.baito[i] = true; S.baitoHiredCount++;
        toast('👷 バイトを雇いました！');
        renderPC(); render(); save();
      }));
    }
    card.appendChild(host);
    panel.appendChild(card);
  }
  if(S.registerCount < MAX_LANES){
    const note = document.createElement('div');
    note.className = 'card';
    note.innerHTML = `<div class="icon">🔒</div><div class="body"><div class="title">未設置のレジ</div><div class="desc">「設備」タブでレジを増設するとバイトを雇えます</div></div>`;
    panel.appendChild(note);
  }
  panel.appendChild(equipCard('baitoSpeed'));
}

function renderSettingsPanel(){
  const panel = $('#panelSettings');
  panel.innerHTML = `
    <div class="card" style="flex-direction:column; align-items:stretch; gap:8px;">
      <div class="title">📊 経営データ</div>
      <div class="settings-note">
        累計売上: ${fmtMoneyFull(S.totalEarned)}<br>
        接客した人数: ${S.customersServed}人<br>
        逃した人数: ${S.customersLost}人<br>
        評判: ${Math.round(S.reputation)} / 100
      </div>
    </div>
    <button class="settings-btn" id="resetBtn">🗑️ セーブデータをリセット</button>
  `;
  panel.querySelector('#resetBtn').addEventListener('click', ()=>{
    if(confirm('本当に最初からやり直しますか？この操作は取り消せません。')){
      localStorage.removeItem('conveniDeluxeSave');
      S = freshState();
      toast('セーブデータをリセットしました');
      renderPC(); render(); save();
    }
  });
}

/* =========================================================
   Offline modal
   ========================================================= */
function showOfflineModalIfNeeded(){
  if(!pendingOfflineReport) return;
  const mins = Math.floor(pendingOfflineReport.seconds/60);
  $('#offlineBody').textContent = `バイトがお店を守ってくれました。\n離席時間: 約${mins}分\n売上: ${fmtMoneyFull(pendingOfflineReport.earnings)}`;
  $('#offlineModal').classList.remove('hidden');
  pendingOfflineReport = null;
}
$('#offlineClose').addEventListener('click', ()=>{
  $('#offlineModal').classList.add('hidden');
});

/* =========================================================
   Tutorial
   ========================================================= */
let tutStep = 0;
function renderTutStep(){
  const step = TUTORIAL_STEPS[tutStep];
  $('#tutIcon').textContent = step.icon;
  $('#tutTitle').textContent = step.title;
  $('#tutBody').textContent = step.body;
  $('#tutDots').innerHTML = TUTORIAL_STEPS.map((_,i)=>`<span class="${i===tutStep?'on':''}"></span>`).join('');
  $('#tutPrev').style.visibility = tutStep===0 ? 'hidden' : 'visible';
  $('#tutNext').textContent = tutStep === TUTORIAL_STEPS.length-1 ? '開店する！' : 'つぎへ';
}
function openTutorial(){
  tutStep = 0;
  renderTutStep();
  $('#tutorialModal').classList.remove('hidden');
}
function closeTutorial(){
  $('#tutorialModal').classList.add('hidden');
  if(!S.tutorialSeen){ S.tutorialSeen = true; save(); }
}
$('#tutPrev').addEventListener('click', ()=>{ if(tutStep>0){ tutStep--; renderTutStep(); } });
$('#tutNext').addEventListener('click', ()=>{
  if(tutStep < TUTORIAL_STEPS.length-1){ tutStep++; renderTutStep(); }
  else closeTutorial();
});
$('#tutorialSkip').addEventListener('click', closeTutorial);
$('#helpBtn').addEventListener('click', openTutorial);

/* =========================================================
   Online Ranking (Supabase, shared project — see other kaikomziu.github.io games)
   ========================================================= */
const RANK_TABLE = 'conveni_deluxe_scores';
const RANK_URL = 'https://kifnzvktwbomxthzvvgy.supabase.co';
const RANK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZm56dmt0d2JvbXh0aHp2dmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzgxMzgsImV4cCI6MjA5MzQxNDEzOH0.M7nXP-u--6J_6rRpgz1cJj21_7KX6MtfTmZy77Xf_IE';
const RANK_DEPTS = {
  earned: { column:'total_earned', label:'累計売上', icon:'💴', fmt:v=>fmtMoneyFull(v) },
  served: { column:'customers_served', label:'接客数', icon:'🧑‍🤝‍🧑', fmt:v=>`${Math.floor(v).toLocaleString()}人` },
};
let rankClient = null;
function sbClient(){
  if(rankClient) return rankClient;
  if(!window.supabase || !window.supabase.createClient) return null;
  // kaikomziu.github.io is a shared origin across all these games (shared localStorage),
  // so never let this pick up another game's Supabase login session.
  rankClient = window.supabase.createClient(RANK_URL, RANK_KEY, {
    auth: { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false },
    global: { headers: { Authorization:'Bearer '+RANK_KEY } },
  });
  return rankClient;
}
async function rankFetchTop(column, limit){
  const c = sbClient(); if(!c) throw new Error('接続できませんでした');
  const { data, error } = await c.from(RANK_TABLE)
    .select('name,total_earned,customers_served')
    .order(column, { ascending:false })
    .limit(limit);
  if(error) throw error;
  return data || [];
}
async function rankEstimate(column, value){
  const c = sbClient(); if(!c) return null;
  const { count, error } = await c.from(RANK_TABLE)
    .select('id', { count:'exact', head:true })
    .gt(column, value);
  if(error) return null;
  return (count||0) + 1;
}
async function rankSubmit(id, name, totalEarned, customersServed){
  const c = sbClient(); if(!c) throw new Error('接続できませんでした');
  const cleanName = (String(name||'').trim().slice(0,12)) || '名無し';
  const row = {
    id, name: cleanName,
    total_earned: Math.max(0, totalEarned||0),
    customers_served: Math.max(0, Math.floor(customersServed||0)),
    updated_at: new Date().toISOString(),
  };
  const { error } = await c.from(RANK_TABLE).upsert(row, { onConflict:'id' });
  if(error) throw error;
}
function escHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

let rankPid = null, rankName = '';
function loadRankIdentity(){
  try{
    rankPid = localStorage.getItem('conveniDeluxe_pid');
    if(!rankPid){
      rankPid = crypto.randomUUID ? crypto.randomUUID() : 'cd-'+Date.now()+'-'+Math.random().toString(36).slice(2);
      localStorage.setItem('conveniDeluxe_pid', rankPid);
    }
  }catch(e){ rankPid = rankPid || ('cd-'+Date.now()); }
  try{ rankName = localStorage.getItem('conveniDeluxe_name') || ''; }catch(e){}
  const input = $('#rankNameInput');
  if(input) input.value = rankName;
}
let rankLastSubmit = { earned:-1, served:-1 };
let rankSubmitting = false;
async function tryRankSubmit(force){
  if(!rankPid || !rankName) return;
  const grew = S.totalEarned > rankLastSubmit.earned * 1.02 + 1 || S.customersServed > rankLastSubmit.served;
  if(!force && !grew) return;
  if(rankSubmitting) return;
  rankSubmitting = true;
  try{
    await rankSubmit(rankPid, rankName, S.totalEarned, S.customersServed);
    rankLastSubmit.earned = S.totalEarned;
    rankLastSubmit.served = S.customersServed;
  }catch(e){ /* offline etc: silently retry later */ }
  rankSubmitting = false;
}

let rankDept = 'earned';
async function renderRankingPanel(){
  const requestedDept = rankDept;
  const dept = RANK_DEPTS[requestedDept];
  const meBox = $('#rankMeText');
  const listBox = $('#rankListBox');
  const myValue = dept.column==='total_earned' ? S.totalEarned : S.customersServed;
  if(!rankName){
    meBox.textContent = 'なまえを入力して送信すると、世界ランキングに参加できます。';
  } else {
    meBox.innerHTML = `<b>${escHtml(rankName)}</b> の${dept.label}順位を取得中…`;
    rankEstimate(dept.column, myValue).then(r=>{
      if(rankDept !== requestedDept) return;
      meBox.innerHTML = r
        ? `<b>${escHtml(rankName)}</b> の${dept.icon}${dept.label}推定順位: <b>${r.toLocaleString()}位</b>（${dept.fmt(myValue)}）`
        : `順位を取得できませんでした（${dept.fmt(myValue)}）`;
    }).catch(()=>{ if(rankDept===requestedDept) meBox.textContent = '順位の取得に失敗しました。'; });
  }
  listBox.textContent = '読み込み中…';
  try{
    const top = await rankFetchTop(dept.column, 50);
    if(rankDept !== requestedDept) return;
    listBox.innerHTML = top.length ? top.map((r,i)=>`
      <div class="rankrow${r.name===rankName?' me':''}">
        <span class="rk">${i+1}</span>
        <span class="rn">${escHtml(r.name)}</span>
        <span class="rv">${dept.fmt(dept.column==='total_earned'?r.total_earned:r.customers_served)}</span>
      </div>`).join('') : '<div class="rank-empty">まだ誰も記録していません。あなたが一番乗りです！</div>';
  }catch(e){
    if(rankDept === requestedDept) listBox.innerHTML = '<div class="rank-empty">読み込みに失敗しました。「更新」を押して再試行してください。</div>';
  }
}

document.querySelectorAll('.rank-dept-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.rank-dept-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    rankDept = btn.dataset.dept;
    renderRankingPanel();
  });
});
$('#rankSaveBtn').addEventListener('click', ()=>{
  const v = ($('#rankNameInput').value || '').trim().slice(0,12);
  rankName = v;
  try{ localStorage.setItem('conveniDeluxe_name', rankName); }catch(e){}
  $('#rankNameInput').value = rankName;
  tryRankSubmit(true).then(renderRankingPanel);
});
$('#rankRefreshBtn').addEventListener('click', renderRankingPanel);

/* =========================================================
   Boot
   ========================================================= */
render();
renderPC();
loadRankIdentity();
tryRankSubmit(true);
if(!S.tutorialSeen){
  openTutorial();
} else {
  showOfflineModalIfNeeded();
}
setInterval(tick, TICK);
setInterval(save, 5000);
window.addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) save(); });
