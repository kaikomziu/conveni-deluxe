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
  const basePatience = patienceMs(S.equip.patience) * (isVIP?1.4:1) * (0.85 + Math.random()*0.3);
  S.queue.push({
    id: nextCustId++,
    itemId: product.id,
    isVIP,
    avatar: isVIP ? VIP_AVATARS[Math.floor(Math.random()*VIP_AVATARS.length)] : AVATARS[Math.floor(Math.random()*AVATARS.length)],
    patienceMax: basePatience,
    patienceLeft: basePatience,
  });
}

function completeSale(lane){
  const cust = lane.customer;
  const product = PRODUCT_MAP[cust.itemId];
  let price = product.price * priceMult(S.equip.priceMultiplier);
  if(cust.isVIP) price *= vipMultiplier(S.equip.vipBonus);
  price = Math.round(price);
  S.money += price;
  S.totalEarned += price;
  S.customersServed++;
  S.reputation = Math.min(100, S.reputation + (cust.isVIP?3:1));
  spawnFloatText(lane._el, `+¥${price.toLocaleString()}`, cust.isVIP);
  if(cust.isVIP) toast(`👑 VIPが ${product.name} を購入！ +¥${price.toLocaleString()}`, 'vip');
  lane.customer = null;
  lane.progress = 0;
}

function loseCustomer(){
  S.customersLost++;
  S.reputation = Math.max(0, S.reputation - 3);
}

/* =========================================================
   Main tick
   ========================================================= */
const TICK = 100;
function tick(){
  // spawn
  S.spawnTimer -= TICK;
  if(S.spawnTimer <= 0){
    spawnCustomer();
    const repBonus = 1 - (S.reputation/100)*0.15;
    S.spawnTimer = spawnInterval(S.equip.spawnRate) * repBonus * (0.8 + Math.random()*0.4);
  }
  // queue patience
  for(let i=S.queue.length-1; i>=0; i--){
    const c = S.queue[i];
    c.patienceLeft -= TICK;
    if(c.patienceLeft <= 0){
      S.queue.splice(i,1);
      loseCustomer();
      toast('😠 お客さんが待ちきれずに帰ってしまった…', 'bad');
    }
  }
  // lanes
  for(let i=0; i<S.registerCount; i++){
    const lane = S.lanes[i];
    if(!lane.customer && S.queue.length>0){
      lane.customer = S.queue.shift();
      lane.progress = 0;
    }
    if(lane.customer){
      const isBaito = S.baito[i];
      if(isBaito){
        lane.progress += TICK / baitoDuration(S.equip.baitoSpeed);
      } else if(lane.holding){
        lane.progress += TICK / scanDuration(S.equip.scanSpeed);
      } else {
        lane.progress -= TICK / scanDuration(S.equip.scanSpeed) * 0.55;
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

function renderQueue(){
  queueRow.innerHTML = '';
  for(const c of S.queue){
    const p = PRODUCT_MAP[c.itemId];
    const ratio = c.patienceLeft / c.patienceMax;
    const div = document.createElement('div');
    div.className = 'cust' + (c.isVIP?' vip':'') + (ratio<0.5?' warn':'') + (ratio<0.22?' danger':'');
    div.innerHTML = `
      ${c.isVIP?'<div class="vip-badge">👑</div>':''}
      <div class="avatar">${c.avatar}</div>
      <div class="want">${p.emoji}</div>
      <div class="patience-bar"><div class="patience-fill" style="width:${Math.max(0,ratio*100)}%"></div></div>
    `;
    queueRow.appendChild(div);
  }
}

function renderLanes(){
  lanesRow.innerHTML = '';
  for(let i=0; i<MAX_LANES; i++){
    const div = document.createElement('div');
    if(i >= S.registerCount){
      div.className = 'lane locked';
      div.textContent = `🔒 未設置のレジ (PCの「設備」から増設)`;
      lanesRow.appendChild(div);
      continue;
    }
    const lane = S.lanes[i];
    const isBaito = S.baito[i];
    div.className = 'lane' + (isBaito?' baito-lane':'') + (lane.customer && !isBaito ? ' active-scan':'') + (lane.holding?' pressed':'');
    if(!lane.customer){
      div.classList.add('empty');
      div.innerHTML = `<span>${isBaito?'👷 バイト待機中':'お客さん待ち…'}</span>` + (isBaito?'<div class="baito-tag">STAFF</div>':'');
    } else {
      const p = PRODUCT_MAP[lane.customer.itemId];
      const price = Math.round(p.price * priceMult(S.equip.priceMultiplier) * (lane.customer.isVIP?vipMultiplier(S.equip.vipBonus):1));
      div.innerHTML = `
        ${isBaito?'<div class="baito-tag">STAFF</div>':''}
        ${lane.customer.isVIP?'<div class="vip-badge-lane">👑</div>':''}
        <div class="scan-ring" style="--p:${lane.progress}"><span class="scan-item-emoji">${p.emoji}</span></div>
        <div class="lane-info">
          <div class="lane-item-name">${p.name}${lane.customer.isVIP?' <b style="color:#c9950a">VIP</b>':''}</div>
          <div class="lane-price">${fmtMoneyFull(price)}</div>
          <div class="lane-hint">${isBaito?'自動スキャン中…':'長押しでスキャン'}</div>
        </div>
      `;
    }
    lane._el = div;
    div.dataset.lane = i;
    lanesRow.appendChild(div);
    lane._el = div;
  }
  // reattach references for float text after innerHTML rebuild
  for(let i=0;i<S.registerCount;i++) S.lanes[i]._el = lanesRow.children[i];
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
  if(lane && lane.customer){ lane.holding = true; e.target.closest('.lane').classList.add('pressed'); }
});
function releaseAll(){
  for(const lane of S.lanes) lane.holding = false;
  document.querySelectorAll('.lane.pressed').forEach(el=>el.classList.remove('pressed'));
}
lanesRow.addEventListener('pointerup', releaseAll);
lanesRow.addEventListener('pointerleave', releaseAll, true);
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
   Boot
   ========================================================= */
render();
renderPC();
showOfflineModalIfNeeded();
setInterval(tick, TICK);
setInterval(save, 5000);
window.addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) save(); });
