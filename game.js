const $ = (id) => document.getElementById(id);
const els = {
  setup: $("setupPanel"), game: $("gamePanel"), result: $("resultPanel"), generalGrid: $("generalGrid"),
  start: $("startBtn"), newGame: $("newGameBtn"), playAgain: $("playAgainBtn"), players: $("players"),
  hand: $("hand"), handCount: $("handCount"), myRole: $("myRole"), turnInfo: $("turnInfo"), phaseInfo: $("phaseInfo"),
  deckInfo: $("deckInfo"), log: $("log"), clearLog: $("clearLogBtn"), message: $("messageBox"), hint: $("actionHint"),
  targetBar: $("targetBar"), skillBar: $("skillBar"), endPlay: $("endPlayBtn"), cancel: $("cancelActionBtn"),
  resultTitle: $("resultTitle"), resultText: $("resultText")
};

const generals = [
  { id:"liubei", name:"刘备", kingdom:"蜀", maxHp:4, skill:"仁德", text:"每回合限一次：将1张手牌交给一名角色，然后摸1张牌。" },
  { id:"guanyu", name:"关羽", kingdom:"蜀", maxHp:4, skill:"武圣", text:"你可以将红色非【杀】手牌当【杀】使用。" },
  { id:"zhangfei", name:"张飞", kingdom:"蜀", maxHp:4, skill:"咆哮", text:"出牌阶段使用【杀】没有次数限制。" },
  { id:"caocao", name:"曹操", kingdom:"魏", maxHp:4, skill:"奸雄", text:"受到牌造成的伤害后，获得造成伤害的牌（若仍可获得）。" },
  { id:"xiahoudun", name:"夏侯惇", kingdom:"魏", maxHp:4, skill:"刚烈", text:"受到伤害后，伤害来源弃1张牌；无牌则失去1点体力。" },
  { id:"sunquan", name:"孙权", kingdom:"吴", maxHp:4, skill:"制衡", text:"每回合限一次：弃1张手牌并摸1张牌。" },
  { id:"zhouyu", name:"周瑜", kingdom:"吴", maxHp:3, skill:"英姿", text:"摸牌阶段额外摸1张牌。" },
  { id:"huatuo", name:"华佗", kingdom:"群", maxHp:3, skill:"急救", text:"濒死时可自动将一张红色手牌当【桃】使用。" }
];

const cardDefs = {
  slash:{name:"杀",type:"基本牌",desc:"对攻击范围内一名角色使用；其不出闪则受到1点伤害。",target:"enemy"},
  dodge:{name:"闪",type:"基本牌",desc:"抵消一次【杀】或【万箭齐发】。",target:"response"},
  peach:{name:"桃",type:"基本牌",desc:"回复1点体力；濒死时也可救援。",target:"self"},
  wine:{name:"酒",type:"基本牌",desc:"本回合下一张【杀】伤害+1。",target:"self"},
  duel:{name:"决斗",type:"锦囊牌",desc:"双方轮流打出【杀】，先无法出杀者受到1点伤害。",target:"enemy"},
  dismantle:{name:"过河拆桥",type:"锦囊牌",desc:"弃置一名其他角色的一张牌。",target:"enemy"},
  steal:{name:"顺手牵羊",type:"锦囊牌",desc:"获得距离1的一名其他角色的一张牌。",target:"enemyNear"},
  draw2:{name:"无中生有",type:"锦囊牌",desc:"摸两张牌。",target:"self"},
  barbarians:{name:"南蛮入侵",type:"锦囊牌",desc:"其他角色需打出【杀】，否则受到1点伤害。",target:"all"},
  arrows:{name:"万箭齐发",type:"锦囊牌",desc:"其他角色需打出【闪】，否则受到1点伤害。",target:"all"},
  weapon:{name:"青龙偃月刀",type:"装备牌",desc:"武器：攻击范围视为2。",target:"equip",slot:"weapon"},
  armor:{name:"八卦阵",type:"装备牌",desc:"防具：需要【闪】时，有50%概率自动视为出闪。",target:"equip",slot:"armor"}
};

let game = null;
let selectedGeneral = null;
let selectedCardIndex = null;
let actionMode = null;
let humanWaiting = false;
let aiRunning = false;

function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }
function roleName(role){ return ({lord:"主公",loyalist:"忠臣",rebel:"反贼",renegade:"内奸"})[role]; }
function colorOf(i){ return i%2===0?"red":"black"; }
function suitOf(i){ return ["♥","♦","♣","♠"][i%4]; }
function log(text){ if(!game) return; game.logs.unshift(text); game.logs=game.logs.slice(0,80); renderLog(); }
function setMessage(text){ els.message.textContent=text; }

function buildDeck(){
  const counts={slash:20,dodge:12,peach:8,wine:4,duel:4,dismantle:5,steal:5,draw2:4,barbarians:2,arrows:2,weapon:3,armor:3};
  const deck=[]; let i=0;
  for(const [id,count] of Object.entries(counts)) for(let n=0;n<count;n++,i++) deck.push({id,...cardDefs[id],color:colorOf(i),suit:suitOf(i),uid:`c${i}-${Math.random().toString(36).slice(2,7)}`});
  return shuffle(deck);
}

function draw(player,count=1){
  for(let i=0;i<count;i++){
    if(game.deck.length===0){ if(game.discard.length===0) return; game.deck=shuffle(game.discard.splice(0)); log("弃牌堆已洗回牌堆。"); }
    player.hand.push(game.deck.pop());
  }
}

function makePlayer(general,role,index,isHuman){
  const bonus = role==="lord"?1:0;
  return {index,isHuman,role,general,maxHp:general.maxHp+bonus,hp:general.maxHp+bonus,hand:[],alive:true,equip:{weapon:null,armor:null},slashUsed:0,drunk:false,skillUsed:false};
}

function renderGeneralGrid(){
  els.generalGrid.innerHTML="";
  generals.forEach(g=>{
    const b=document.createElement("button"); b.className="general-card"; b.innerHTML=`<span class="kingdom">${g.kingdom}</span><h3>${g.name} · ${g.maxHp}血</h3><p><strong>${g.skill}</strong>：${g.text}</p>`;
    b.onclick=()=>{ selectedGeneral=g; document.querySelectorAll(".general-card").forEach(x=>x.classList.remove("selected")); b.classList.add("selected"); els.start.disabled=false; };
    els.generalGrid.appendChild(b);
  });
}

function startGame(){
  const roles=shuffle(["lord","loyalist","rebel","renegade"]);
  const remaining=shuffle(generals.filter(g=>g.id!==selectedGeneral.id));
  const players=[makePlayer(selectedGeneral,roles[0],0,true)];
  for(let i=1;i<4;i++) players.push(makePlayer(remaining[i-1],roles[i],i,false));
  game={players,deck:buildDeck(),discard:[],turn:players.findIndex(p=>p.role==="lord"),phase:"准备",logs:[],over:false,winner:null,turnNo:1,lastPlayedCard:null};
  players.forEach(p=>draw(p,4));
  els.setup.classList.add("hidden"); els.result.classList.add("hidden"); els.game.classList.remove("hidden");
  log(`身份已分配。主公是 ${players.find(p=>p.role==="lord").general.name}。`);
  log(`你是【${roleName(players[0].role)}】${players[0].general.name}。`);
  render();
  runTurn(game.turn);
}

function visibleRole(p){ if(p.isHuman||p.role==="lord"||!p.alive) return roleName(p.role); return "身份未知"; }
function hpText(p){ return "♥".repeat(Math.max(0,p.hp))+"♡".repeat(Math.max(0,p.maxHp-p.hp)); }
function playerDistance(a,b){ const n=game.players.length,d=Math.abs(a.index-b.index); return Math.min(d,n-d); }
function attackRange(p){ return p.equip.weapon?2:1; }
function canSlash(source,target){ return source.alive&&target.alive&&source!==target&&playerDistance(source,target)<=attackRange(source); }

function renderPlayers(){
  els.players.innerHTML="";
  game.players.forEach((p,i)=>{
    const d=document.createElement("div");
    d.className=`player-card ${p.isHuman?"me":""} ${!p.alive?"dead":""} ${i===game.turn&&!game.over?"current":""}`;
    d.innerHTML=`<div class="player-head"><div><div class="player-name">${p.general.name}${p.isHuman?"（你）":""}</div><div class="meta">${p.general.kingdom} · ${p.general.skill}</div></div><span class="role-tag">${visibleRole(p)}</span></div><div class="hp">${hpText(p)} ${p.hp}/${p.maxHp}</div><div class="meta">手牌：${p.hand.length} 张<br>状态：${p.alive?"存活":"阵亡"}</div><div class="equip">武器：${p.equip.weapon?.name||"无"} ｜ 防具：${p.equip.armor?.name||"无"}</div>`;
    els.players.appendChild(d);
  });
}

function renderHand(){
  const me=game.players[0]; els.hand.innerHTML=""; els.handCount.textContent=`${me.hand.length} 张`;
  me.hand.forEach((c,i)=>{
    const d=document.createElement("button"); d.className=`card ${selectedCardIndex===i?"selected":""}`;
    d.innerHTML=`<div><div class="name">${c.name}</div><div class="type">${c.suit} · ${c.color==="red"?"红":"黑"} · ${c.type}</div></div><div class="desc">${c.desc}</div>`;
    d.disabled=!humanWaiting||game.over; d.onclick=()=>selectHumanCard(i); els.hand.appendChild(d);
  });
}

function renderLog(){ els.log.innerHTML=game?game.logs.map(x=>`<div class="log-entry">${x}</div>`).join(""):""; }
function renderStatus(){ const me=game.players[0],cur=game.players[game.turn]; els.myRole.textContent=roleName(me.role); els.turnInfo.textContent=`${cur.general.name} · 第${game.turnNo}轮`; els.phaseInfo.textContent=game.phase; els.deckInfo.textContent=`${game.deck.length} 张`; }
function render(){ if(!game)return; renderPlayers(); renderHand(); renderLog(); renderStatus(); renderSkills(); els.endPlay.classList.toggle("hidden",!humanWaiting); }

function discardCard(player,index){ const [c]=player.hand.splice(index,1); if(c) game.discard.push(c); return c; }
function takeCard(player,index){ return player.hand.splice(index,1)[0]; }
function randomCardIndex(p){ return p.hand.length?Math.floor(Math.random()*p.hand.length):-1; }
function findCard(p,id){ return p.hand.findIndex(c=>c.id===id); }
function findRedCard(p){ return p.hand.findIndex(c=>c.color==="red"); }

function attitude(a,b){
  if(a===b) return 2;
  if(a.role==="lord"||a.role==="loyalist") return (b.role==="lord"||b.role==="loyalist")?2:-2;
  if(a.role==="rebel") return b.role==="rebel"?2:-2;
  return -1;
}
function enemiesOf(p){ return game.players.filter(x=>x.alive&&x!==p&&attitude(p,x)<0); }
function friendsOf(p){ return game.players.filter(x=>x.alive&&x!==p&&attitude(p,x)>0); }

function consumeResponse(p,id){
  const idx=findCard(p,id); if(idx>=0){ const c=discardCard(p,idx); log(`${p.general.name} 打出【${c.name}】。`); return true; }
  if(id==="dodge"&&p.equip.armor&&Math.random()<.5){ log(`${p.general.name} 的【八卦阵】判定生效，视为打出【闪】。`); return true; }
  return false;
}

async function rescue(target){
  if(target.hp>0) return true;
  const order=[target,...game.players.filter(p=>p.alive&&p!==target)];
  for(const helper of order){
    let idx=findCard(helper,"peach");
    if(idx<0&&helper.general.id==="huatuo") idx=findRedCard(helper);
    if(idx>=0 && (helper===target||attitude(helper,target)>0)){
      const c=discardCard(helper,idx); target.hp+=1; log(`${helper.general.name} 使用${c.id==="peach"?"【桃】":"【急救】"}救回 ${target.general.name}。`); return true;
    }
  }
  return false;
}

async function handleDeath(target,killer){
  if(await rescue(target)) return;
  target.alive=false; target.hp=0;
  target.hand.forEach(c=>game.discard.push(c)); target.hand=[];
  if(target.equip.weapon) game.discard.push(target.equip.weapon); if(target.equip.armor) game.discard.push(target.equip.armor); target.equip={weapon:null,armor:null};
  log(`${target.general.name} 阵亡，身份为【${roleName(target.role)}】。`);
  if(killer&&killer.alive){
    if(target.role==="rebel"){ draw(killer,3); log(`${killer.general.name} 击杀反贼，摸3张牌。`); }
    if(killer.role==="lord"&&target.role==="loyalist"){ killer.hand.forEach(c=>game.discard.push(c)); killer.hand=[]; if(killer.equip.weapon) game.discard.push(killer.equip.weapon); if(killer.equip.armor) game.discard.push(killer.equip.armor); killer.equip={weapon:null,armor:null}; log("主公误杀忠臣，弃置全部手牌和装备。"); }
  }
  checkWinner();
}

async function dealDamage(target,source,amount,card=null){
  if(!target.alive||game.over) return;
  target.hp-=amount; log(`${target.general.name} 受到 ${amount} 点伤害，剩余 ${Math.max(0,target.hp)} 点体力。`);
  if(target.general.id==="caocao"&&card){ target.hand.push(card); const di=game.discard.findIndex(x=>x.uid===card.uid); if(di>=0) game.discard.splice(di,1); log(`${target.general.name} 发动【奸雄】，获得了【${card.name}】。`); }
  if(target.general.id==="xiahoudun"&&source&&source.alive){ if(source.hand.length){ const c=discardCard(source,randomCardIndex(source)); log(`${target.general.name} 发动【刚烈】，${source.general.name} 弃置【${c.name}】。`); } else { source.hp-=1; log(`${target.general.name} 发动【刚烈】，${source.general.name} 失去1点体力。`); if(source.hp<=0) await handleDeath(source,target); } }
  if(target.hp<=0) await handleDeath(target,source);
  render();
}

async function resolveSlash(source,target,card){
  const bonus=source.drunk?1:0; source.drunk=false;
  if(consumeResponse(target,"dodge")){ log(`${target.general.name} 闪避了 ${source.general.name} 的【杀】。`); return; }
  await dealDamage(target,source,1+bonus,card);
}

async function resolveDuel(source,target,card){
  log(`${source.general.name} 对 ${target.general.name} 发起【决斗】。`);
  let attacker=source,defender=target;
  while(attacker.alive&&defender.alive&&!game.over){
    const idx=findCard(defender,"slash");
    if(idx<0){ await dealDamage(defender,attacker,1,card); break; }
    const c=discardCard(defender,idx); log(`${defender.general.name} 在决斗中打出【杀】。`); [attacker,defender]=[defender,attacker];
  }
}

function removeRandomPropertyCard(target,steal=false,receiver=null){
  const pool=[]; target.hand.forEach((c,i)=>pool.push({kind:"hand",i,c})); if(target.equip.weapon) pool.push({kind:"weapon",c:target.equip.weapon}); if(target.equip.armor) pool.push({kind:"armor",c:target.equip.armor});
  if(!pool.length) return null;
  const pick=pool[Math.floor(Math.random()*pool.length)]; let c;
  if(pick.kind==="hand") c=takeCard(target,pick.i); else { c=target.equip[pick.kind]; target.equip[pick.kind]=null; }
  if(steal&&receiver) receiver.hand.push(c); else game.discard.push(c);
  return c;
}

async function playCard(source,index,target=null,asSlash=false){
  if(!source.alive||game.over) return false;
  let card=source.hand[index]; if(!card) return false;
  const id=asSlash?"slash":card.id;
  if(id==="slash"){
    if(source.slashUsed>=1&&source.general.id!=="zhangfei") return false;
    if(!target||!canSlash(source,target)) return false;
  }
  if(card.id==="peach"&&source.hp>=source.maxHp) return false;
  if(card.id==="steal"&&(!target||playerDistance(source,target)>1)) return false;

  card=takeCard(source,index); game.lastPlayedCard=card; game.discard.push(card);
  log(`${source.general.name} 使用【${id==="slash"&&asSlash?"杀（武圣）":card.name}】${target?`，目标：${target.general.name}`:""}。`);

  if(id==="slash"){ source.slashUsed++; await resolveSlash(source,target,card); }
  else if(id==="peach"){ source.hp=Math.min(source.maxHp,source.hp+1); log(`${source.general.name} 回复1点体力。`); }
  else if(id==="wine"){ source.drunk=true; }
  else if(id==="draw2"){ draw(source,2); }
  else if(id==="duel"){ await resolveDuel(source,target,card); }
  else if(id==="dismantle"){ const c=removeRandomPropertyCard(target,false); log(c?`${target.general.name} 的【${c.name}】被弃置。`:`${target.general.name} 没有可弃置的牌。`); }
  else if(id==="steal"){ const c=removeRandomPropertyCard(target,true,source); log(c?`${source.general.name} 获得了 ${target.general.name} 的一张牌。`:`${target.general.name} 没有可获得的牌。`); }
  else if(id==="barbarians"){
    for(const p of game.players.filter(p=>p.alive&&p!==source)){ if(!consumeResponse(p,"slash")) await dealDamage(p,source,1,card); if(game.over) break; }
  }
  else if(id==="arrows"){
    for(const p of game.players.filter(p=>p.alive&&p!==source)){ if(!consumeResponse(p,"dodge")) await dealDamage(p,source,1,card); if(game.over) break; }
  }
  else if(id==="weapon"||id==="armor"){
    const slot=cardDefs[id].slot; if(source.equip[slot]) game.discard.push(source.equip[slot]); source.equip[slot]=card; const di=game.discard.findIndex(x=>x.uid===card.uid); if(di>=0) game.discard.splice(di,1); log(`${source.general.name} 装备了【${card.name}】。`);
  }
  render(); return true;
}

function checkWinner(){
  if(game.over) return;
  const lord=game.players.find(p=>p.role==="lord"), alive=game.players.filter(p=>p.alive);
  const rebels=alive.filter(p=>p.role==="rebel"), renegade=alive.find(p=>p.role==="renegade");
  if(!lord.alive){
    if(alive.length===1&&renegade){ finishGame("内奸胜利",`${renegade.general.name} 成为最后存活角色。`); }
    else finishGame("反贼胜利","主公已经阵亡。");
  } else if(rebels.length===0&&!renegade){ finishGame("主公阵营胜利","反贼与内奸全部阵亡。"); }
}

function finishGame(title,text){
  game.over=true; humanWaiting=false; aiRunning=false; game.winner=title; els.resultTitle.textContent=title; els.resultText.textContent=text+` 你的身份：${roleName(game.players[0].role)}。`; els.result.classList.remove("hidden"); els.endPlay.classList.add("hidden"); setMessage("对局结束。"); render();
}

async function runTurn(index){
  if(game.over) return;
  let p=game.players[index]; if(!p.alive){ advanceTurn(); return; }
  game.turn=index; p.slashUsed=0; p.drunk=false; p.skillUsed=false; selectedCardIndex=null; clearAction();
  game.phase="摸牌"; render(); setMessage(`${p.general.name} 的回合。`); log(`—— ${p.general.name} 的回合开始 ——`);
  draw(p,p.general.id==="zhouyu"?3:2); if(p.general.id==="zhouyu") log(`${p.general.name} 发动【英姿】，额外摸1张牌。`);
  game.phase="出牌"; render();
  if(p.isHuman){ humanWaiting=true; setMessage("轮到你出牌。点击手牌后选择目标，或直接结束出牌。"); render(); }
  else { aiRunning=true; await delay(350); await aiPlay(p); aiRunning=false; if(!game.over) await finishTurn(p); }
}

async function finishTurn(p){
  if(game.over) return;
  game.phase="弃牌"; render();
  while(p.hand.length>Math.max(0,p.hp)){ const c=discardCard(p,randomCardIndex(p)); log(`${p.general.name} 弃置【${c.name}】。`); }
  game.phase="结束"; p.drunk=false; render(); await delay(p.isHuman?80:250); advanceTurn();
}
function advanceTurn(){
  if(game.over) return; let next=(game.turn+1)%game.players.length; if(next===game.players.findIndex(p=>p.role==="lord")) game.turnNo++; runTurn(next);
}

async function aiPlay(p){
  if(!p.alive||game.over) return;
  let guard=0;
  while(guard++<20&&!game.over&&p.alive){
    let acted=false;
    let idx=findCard(p,"peach"); if(idx>=0&&p.hp<p.maxHp){ acted=await playCard(p,idx); }
    if(!acted){ idx=findCard(p,"draw2"); if(idx>=0) acted=await playCard(p,idx); }
    if(!acted){ idx=findCard(p,"weapon"); if(idx>=0&&!p.equip.weapon) acted=await playCard(p,idx); }
    if(!acted){ idx=findCard(p,"armor"); if(idx>=0&&!p.equip.armor) acted=await playCard(p,idx); }
    if(!acted&&p.general.id==="sunquan"&&!p.skillUsed&&p.hand.length){ const c=discardCard(p,randomCardIndex(p)); draw(p,1); p.skillUsed=true; log(`${p.general.name} 发动【制衡】，弃【${c.name}】并摸1张牌。`); acted=true; }
    if(!acted&&p.general.id==="liubei"&&!p.skillUsed&&p.hand.length){ const fs=friendsOf(p); if(fs.length){ const t=fs.sort((a,b)=>a.hand.length-b.hand.length)[0],c=takeCard(p,randomCardIndex(p)); t.hand.push(c); draw(p,1); p.skillUsed=true; log(`${p.general.name} 发动【仁德】，交给 ${t.general.name} 一张牌并摸1张牌。`); acted=true; } }
    if(!acted){ idx=findCard(p,"wine"); const slash=findCard(p,"slash"); const targets=enemiesOf(p).filter(t=>canSlash(p,t)); if(idx>=0&&slash>=0&&targets.length&&!p.drunk) acted=await playCard(p,idx); }
    if(!acted){ idx=findCard(p,"slash"); let targets=enemiesOf(p).filter(t=>canSlash(p,t)); if(idx>=0&&targets.length&&(p.slashUsed<1||p.general.id==="zhangfei")){ targets.sort((a,b)=>a.hp-b.hp); acted=await playCard(p,idx,targets[0]); } }
    if(!acted){ idx=findCard(p,"duel"); const targets=enemiesOf(p); if(idx>=0&&targets.length){ targets.sort((a,b)=>a.hp-b.hp); acted=await playCard(p,idx,targets[0]); } }
    if(!acted){ idx=findCard(p,"dismantle"); const targets=enemiesOf(p).filter(t=>t.hand.length||t.equip.weapon||t.equip.armor); if(idx>=0&&targets.length) acted=await playCard(p,idx,targets[0]); }
    if(!acted){ idx=findCard(p,"steal"); const targets=enemiesOf(p).filter(t=>playerDistance(p,t)<=1&&(t.hand.length||t.equip.weapon||t.equip.armor)); if(idx>=0&&targets.length) acted=await playCard(p,idx,targets[0]); }
    if(!acted){ idx=findCard(p,"barbarians"); if(idx>=0&&enemiesOf(p).length>=2) acted=await playCard(p,idx); }
    if(!acted){ idx=findCard(p,"arrows"); if(idx>=0&&enemiesOf(p).length>=2) acted=await playCard(p,idx); }
    if(!acted) break;
    render(); await delay(260);
  }
}

function clearAction(){ actionMode=null; selectedCardIndex=null; els.targetBar.innerHTML=""; els.targetBar.classList.add("hidden"); els.cancel.classList.add("hidden"); els.hint.textContent=humanWaiting?"请选择一张牌。":"等待其他角色行动。"; }
function showTargets(targets,onPick){ els.targetBar.innerHTML=""; els.targetBar.classList.remove("hidden"); els.cancel.classList.remove("hidden"); targets.forEach(t=>{ const b=document.createElement("button"); b.className="target-btn"; b.textContent=t.general.name; b.onclick=()=>onPick(t); els.targetBar.appendChild(b); }); }

async function selectHumanCard(index){
  if(!humanWaiting||game.over||game.turn!==0) return;
  const me=game.players[0],card=me.hand[index]; if(!card)return; selectedCardIndex=index; renderHand();
  const def=cardDefs[card.id];
  if(card.id==="dodge"){ els.hint.textContent="【闪】只能用于响应，不能主动使用。"; return; }
  if(card.id==="peach"&&me.hp>=me.maxHp){ els.hint.textContent="体力已满，不能使用【桃】。"; return; }
  if(["peach","wine","draw2","barbarians","arrows","weapon","armor"].includes(card.id)){ await playCard(me,index); clearAction(); render(); return; }
  let targets=game.players.filter(p=>p.alive&&p!==me);
  if(card.id==="slash") targets=targets.filter(t=>canSlash(me,t));
  if(card.id==="steal") targets=targets.filter(t=>playerDistance(me,t)<=1);
  if(["dismantle","steal"].includes(card.id)) targets=targets.filter(t=>t.hand.length||t.equip.weapon||t.equip.armor);
  if(!targets.length){ els.hint.textContent="当前没有合法目标。"; return; }
  actionMode="card"; els.hint.textContent=`请选择【${card.name}】的目标。`; showTargets(targets,async t=>{ const current=me.hand.findIndex(c=>c.uid===card.uid); if(current>=0) await playCard(me,current,t); clearAction(); render(); });
}

function renderSkills(){
  els.skillBar.innerHTML=""; if(!game||!humanWaiting||game.turn!==0||game.over)return; const me=game.players[0];
  if(me.general.id==="sunquan"&&!me.skillUsed&&me.hand.length){ addSkillButton("制衡：弃1摸1",()=>{ actionMode="zhiheng"; els.hint.textContent="请选择一张手牌作为制衡弃牌。"; }); }
  if(me.general.id==="liubei"&&!me.skillUsed&&me.hand.length){ addSkillButton("仁德：交1摸1",()=>{ actionMode="rende"; els.hint.textContent="先点一张手牌，再选择要交给的角色。"; }); }
  if(me.general.id==="guanyu"){ addSkillButton("武圣：红牌当杀",()=>{ actionMode="wusheng"; els.hint.textContent="选择一张红色非【杀】手牌，再选择攻击范围内目标。"; }); }
}
function addSkillButton(text,fn){ const b=document.createElement("button"); b.className="skill-btn"; b.textContent=text; b.onclick=fn; els.skillBar.appendChild(b); }

els.hand.addEventListener("click",async e=>{
  const cardEl=e.target.closest(".card"); if(!cardEl||!humanWaiting)return;
  const cards=[...els.hand.children],idx=cards.indexOf(cardEl),me=game.players[0],card=me.hand[idx]; if(!card)return;
  if(actionMode==="zhiheng"){ const c=discardCard(me,idx); draw(me,1); me.skillUsed=true; log(`${me.general.name} 发动【制衡】，弃【${c.name}】并摸1张牌。`); clearAction(); render(); }
  else if(actionMode==="rende"){ const targets=game.players.filter(p=>p.alive&&p!==me); showTargets(targets,t=>{ const current=me.hand.findIndex(c=>c.uid===card.uid); if(current>=0){ const c=takeCard(me,current); t.hand.push(c); draw(me,1); me.skillUsed=true; log(`${me.general.name} 发动【仁德】，交给 ${t.general.name} 一张牌并摸1张牌。`); } clearAction(); render(); }); }
  else if(actionMode==="wusheng"&&card.color==="red"&&card.id!=="slash"){ const targets=game.players.filter(p=>p.alive&&p!==me&&canSlash(me,p)); if(!targets.length){ els.hint.textContent="攻击范围内没有合法目标。"; return; } showTargets(targets,async t=>{ const current=me.hand.findIndex(c=>c.uid===card.uid); if(current>=0) await playCard(me,current,t,true); clearAction(); render(); }); }
});

els.endPlay.onclick=async()=>{ if(!humanWaiting||game.over)return; humanWaiting=false; clearAction(); render(); await finishTurn(game.players[0]); };
els.cancel.onclick=()=>{ clearAction(); render(); };
els.clearLog.onclick=()=>{ if(game){game.logs=[];renderLog();} };
els.start.onclick=startGame;
function resetToSetup(){ game=null; humanWaiting=false; aiRunning=false; selectedCardIndex=null; actionMode=null; selectedGeneral=null; els.start.disabled=true; els.game.classList.add("hidden"); els.result.classList.add("hidden"); els.setup.classList.remove("hidden"); renderGeneralGrid(); }
els.newGame.onclick=resetToSetup; els.playAgain.onclick=resetToSetup;

renderGeneralGrid();
