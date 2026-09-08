(function(root){
  'use strict';
  const generals = [
    ['liubei','刘备','蜀',4,'仁德 · 激将','仁德：累计给出两张手牌回复1点体力。激将（主公技）：可请求蜀势力角色提供杀。'],
    ['guanyu','关羽','蜀',4,'武圣','红色手牌或装备可当杀使用或打出。'],
    ['zhangfei','张飞','蜀',4,'咆哮','出牌阶段使用杀没有次数限制。'],
    ['caocao','曹操','魏',4,'奸雄 · 护驾','奸雄：获得伤害牌。护驾（主公技）：需要闪时可请求魏势力角色提供。'],
    ['xiahoudun','夏侯惇','魏',4,'刚烈','受伤后可判定：非红桃，来源弃两张手牌或受1点伤害。'],
    ['sunquan','孙权','吴',4,'制衡 · 救援','制衡：限一次，弃任意手牌或装备并摸等量牌。救援（主公技）：其他吴势力角色濒死救桃额外回复1体力。'],
    ['zhouyu','周瑜','吴',3,'英姿 · 反间','英姿：多摸一张。反间：限一次，其他角色猜花色后获得你随机一张手牌，猜错受1伤害。'],
    ['huatuo','华佗','群',3,'急救 · 青囊','急救：回合外红色手牌或装备当桃。青囊：限一次，弃一张手牌令一名受伤角色回复1体力。']
  ].map(([id,name,kingdom,hp,skill,text])=>({id,name,kingdom,hp,skill,text}));
  const roles={lord:'主公',loyalist:'忠臣',rebel:'反贼',renegade:'内奸'};
  const cards={slash:['杀','攻击范围内；通常每回合限一次，对方可出闪。'],dodge:['闪','响应杀或万箭齐发。'],peach:['桃','回复1点体力，或救援濒死角色。'],duel:['决斗','对方先出杀，双方轮流响应。'],dismantle:['过河拆桥','弃其他角色一张牌：暗置手牌随机，装备可指定。'],steal:['顺手牵羊','获得距离1内其他角色一张手牌或装备。'],draw2:['无中生有','摸两张牌。'],barbarians:['南蛮入侵','其他角色依次出杀，否则受1点伤害。'],arrows:['万箭齐发','其他角色依次出闪，否则受1点伤害。']};
  const equipment={
    crossbow:{slot:'weapon',range:1,name:'诸葛连弩',text:'攻击范围1；出牌阶段杀不限次数。'},
    qinggang:{slot:'weapon',range:2,name:'青釭剑',text:'攻击范围2；使用杀时无视目标防具。'},
    bagua:{slot:'armor',name:'八卦阵',text:'需要闪时可判定：红色视为出闪。'},
    renwang:{slot:'armor',name:'仁王盾',text:'黑色杀对你无效。'},
    chitu:{slot:'offhorse',name:'赤兔',text:'你计算到其他角色的距离-1。'},
    dayuan:{slot:'offhorse',name:'大宛',text:'你计算到其他角色的距离-1。'},
    zixing:{slot:'offhorse',name:'紫骍',text:'你计算到其他角色的距离-1。'},
    jueying:{slot:'defhorse',name:'绝影',text:'其他角色计算到你的距离+1。'},
    dilu:{slot:'defhorse',name:'的卢',text:'其他角色计算到你的距离+1。'},
    zhuahuang:{slot:'defhorse',name:'爪黄飞电',text:'其他角色计算到你的距离+1。'}
  };
  cards.nullify=['无懈可击','抵消锦囊对一个目标的效果；可反制无懈可击。'];
  for(const [id,e] of Object.entries(equipment))cards[id]=[e.name,e.text];
  const deckCounts={slash:24,dodge:15,peach:8,duel:3,dismantle:4,steal:4,draw2:4,barbarians:2,arrows:1,nullify:5,crossbow:2,qinggang:1,bagua:2,renwang:1,chitu:1,dayuan:1,zixing:1,jueying:1,dilu:1,zhuahuang:1};
  const deckSize=Object.values(deckCounts).reduce((a,b)=>a+b,0);
  class Game {
    constructor(random=Math.random){this.random=random;this.phase='identity';this.logs=[];this.deck=[];this.discard=[];this.table=[];this.turn=0;this.round=0;this.winner=null;this.pending=null;this.task=null;this.reputation=[0,0,0,0];this.players=this.shuffle(Object.keys(roles)).map((role,id)=>({id,role,general:null,hp:0,maxHp:0,alive:true,hand:[],equip:[]}));this.log('身份已发放。请选择武将。');}
    shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
    log(s){this.logs.push(s);if(this.logs.length>160)this.logs.shift();}
    name(p){return p.general?.name||`${p.id+1}号位`;}
    start(id){if(this.phase!=='identity')throw Error('本局已开始');const g=generals.find(g=>g.id===id);if(!g)throw Error('请选择武将');const other=this.shuffle(generals.filter(x=>x!==g));this.players.forEach((p,i)=>{p.general=i?other.pop():g;p.hp=p.maxHp=p.general.hp;});let uid=0;for(const [type,n]of Object.entries(deckCounts)){for(let i=0;i<n;i++){const suit=['♥','♦','♠','♣'][uid%4];this.deck.push({uid:uid++,type,suit,red:suit==='♥'||suit==='♦',rank:1+(i%13)});}}this.shuffle(this.deck);this.players.forEach(p=>this.draw(p,4));this.turn=this.players.findIndex(p=>p.role==='lord');this.phase='ready';this.log('各摸4张起手牌，主公先行动；四人局主公不加体力。');}
    draw(p,n){if(!p.alive)return;for(let i=0;i<n;i++){if(!this.deck.length){this.deck=this.shuffle(this.discard.splice(0));if(this.deck.length)this.log('弃牌堆重新洗牌。');}if(!this.deck.length)break;p.hand.push(this.deck.pop());}}
    owned(p){return [...p.hand,...p.equip];}
    equipped(p,slot,exclude){return p.equip.find(c=>equipment[c.type].slot===slot&&c.uid!==exclude);}
    range(p,exclude){return equipment[this.equipped(p,'weapon',exclude)?.type]?.range||1;}
    unlimited(p,exclude){return this.is(p,'zhangfei')||this.equipped(p,'weapon',exclude)?.type==='crossbow';}
    remove(p,uid){for(const zone of [p.hand,p.equip]){const i=zone.findIndex(c=>c.uid===uid);if(i>=0)return zone.splice(i,1)[0];}throw Error('牌不存在');}
    dropAll(p){this.discard.push(...p.hand.splice(0),...p.equip.splice(0));}
    equipCard(p,c){const old=this.equipped(p,equipment[c.type].slot);if(old)this.toss(p,old.uid);p.equip.push(c);this.log(`${this.name(p)}装备${cards[c.type][0]}。`);}
    toss(p,uid){const c=this.remove(p,uid);this.discard.push(c);return c;}
    distance(a,b,exclude){if(a===b)return 0;const alive=this.players.filter(p=>p.alive);const d=Math.abs(alive.indexOf(a)-alive.indexOf(b));return Math.max(1,Math.min(d,alive.length-d)-(this.equipped(a,'offhorse',exclude)?1:0)+(this.equipped(b,'defhorse')?1:0));}
    is(p,id){return p.general?.id===id;}
    responseCards(p,type){return this.owned(p).filter(c=>(p.hand.includes(c)&&c.type===type)||(type==='slash'&&this.is(p,'guanyu')&&c.red)||(type==='peach'&&this.is(p,'huatuo')&&p.id!==this.turn&&c.red));}
    *ask(p,text,options,optional=true,context={}){if(!options.length)return null;return yield {player:p.id,text,...context,options:[...options,...(optional?[{id:'pass',label:'放弃'}]:[])]};}
    judge(){if(!this.deck.length)this.deck=this.shuffle(this.discard.splice(0));const c=this.deck.pop();if(c)this.discard.push(c);return c;}
    lordSkill(p,type){return p.role==='lord'&&((type==='slash'&&this.is(p,'liubei'))||(type==='dodge'&&this.is(p,'caocao')));}
    *requestLord(p,type,retain=false){const skill=type==='slash'?'激将':'护驾';for(let i=1;i<4;i++){const helper=this.players[(p.id+i)%4];if(!helper.alive||helper.general.kingdom!==p.general.kingdom)continue;if(yield* this.respond(helper,type,`${this.name(p)}发动${skill}：是否提供${cards[type][0]}？`,{allowLord:false,retain,beneficiary:p.id}))return true;}this.log(`${skill}无人响应。`);return false;}
    *respond(p,type,text,{allowLord=true,ignoreArmor=false,retain=false,beneficiary=null}={}){
      let armorTried=false,lordTried=false;
      while(true){const options=this.responseCards(p,type).map(c=>({id:c.uid,label:`${c.suit}${c.rank} ${cards[c.type][0]} → ${cards[type][0]}`}));
        if(type==='dodge'&&!ignoreArmor&&!armorTried&&this.equipped(p,'armor')?.type==='bagua')options.push({id:'bagua',label:'发动八卦阵'});
        if(allowLord&&!lordTried&&this.lordSkill(p,type))options.push({id:'lord',label:type==='slash'?'发动激将':'发动护驾'});
        const uid=yield* this.ask(p,text,options,true,{kind:'response',beneficiary});
        if(uid===null||uid==='pass')return false;
        if(uid==='bagua'){armorTried=true;const c=this.judge();this.log(`八卦阵判定：${c?c.suit+c.rank:'无牌'}。`);if(c?.red)return true;continue;}
        if(uid==='lord'){lordTried=true;if(yield* this.requestLord(p,type,retain))return true;continue;}
        const c=this.remove(p,uid);(retain?this.table:this.discard).push(c);this.responseCard=c;this.log(`${this.name(p)}打出${cards[type][0]}。`);return true;
      }
    }
    *nullified(source,target,type){let canceled=false;const held=[];
      // Restart a complete response window after every counter. Keep counters out of the recycle pile.
      while(true){let countered=false;for(let i=0;i<4;i++){const p=this.players[(this.turn+i)%4];if(!p.alive)continue;
          const uid=yield* this.ask(p,`${cards[type][0]} → ${this.name(target)}：${canceled?'已被抵消，可反制无懈恢复效果':'是否使用无懈可击抵消效果'}？`,p.hand.filter(c=>c.type==='nullify').map(c=>({id:c.uid,label:'使用无懈可击'})),true,{kind:'nullify',source:source.id,target:target.id,trick:type,canceled});
          if(uid!==null&&uid!=='pass'){const c=this.remove(p,uid);held.push(c);this.table.push(c);canceled=!canceled;countered=true;this.log(`${this.name(p)}使用无懈可击，${cards[type][0]}对${this.name(target)}${canceled?'暂时无效':'恢复生效'}。`);break;}
        }if(!countered)break;
      }
      for(const c of held){this.table.splice(this.table.indexOf(c),1);this.discard.push(c);}return canceled;
    }
    checkWinner(){const alive=this.players.filter(p=>p.alive);if(!alive.some(p=>p.role==='lord'))this.winner=alive.length===1&&alive[0].role==='renegade'?'renegade':'rebel';else if(!alive.some(p=>p.role==='rebel'||p.role==='renegade'))this.winner='lord';if(this.winner){this.phase='over';this.log(`${this.winner==='lord'?'主公与忠臣':roles[this.winner]}获胜。`);}return !!this.winner;}
    *dying(p,source){while(p.hp<=0&&p.alive){let saved=false;for(let i=0;i<4;i++){const helper=this.players[(this.turn+i)%4];if(!helper.alive)continue;if(yield* this.respond(helper,'peach',`${this.name(p)}濒死（${p.hp}体力），是否出桃救援？`)){p.hp=Math.min(p.maxHp,p.hp+((this.is(p,'sunquan')&&p.role==='lord'&&helper!==p&&helper.general.kingdom==='吴')?2:1));saved=true;if(p.hp>0)break;}}if(!saved){p.alive=false;this.dropAll(p);this.log(`${this.name(p)}阵亡，身份是${roles[p.role]}。`);if(this.checkWinner())return;if(source?.alive){if(p.role==='rebel'){this.draw(source,3);this.log('击杀反贼，奖励3张牌。');}if(p.role==='loyalist'&&source.role==='lord'){this.dropAll(source);this.log('主公误杀忠臣，弃置全部手牌和装备。');}}}}}
    *damage(p,source,card){if(!p.alive||this.winner)return;p.hp--;this.log(`${this.name(p)}受到1点伤害。`);if(p.hp<=0)yield* this.dying(p,source);if(!p.alive||this.winner)return;
      if(this.is(p,'caocao')&&card&&this.table.includes(card)){const a=yield* this.ask(p,'是否发动奸雄，获得伤害牌？',[{id:'yes',label:'发动奸雄'}]);if(a==='yes'){this.table.splice(this.table.indexOf(card),1);p.hand.push(card);}}
      if(this.is(p,'xiahoudun')&&source?.alive){const a=yield* this.ask(p,'是否发动刚烈？',[{id:'yes',label:'发动刚烈'}]);if(a!=='yes')return;if(!this.deck.length)this.deck=this.shuffle(this.discard.splice(0));const judge=this.deck.pop();if(!judge)return;this.discard.push(judge);this.log(`刚烈判定：${judge.suit}${judge.rank}。`);if(judge.suit!=='♥'){let choice='hurt';if(source.hand.length>=2)choice=yield* this.ask(source,'刚烈：弃两张手牌或受1点伤害。',[{id:'discard',label:'弃两张手牌'},{id:'hurt',label:'受到伤害'}],false);if(choice==='discard'){for(let i=0;i<2;i++){const uid=yield* this.ask(source,'选择刚烈弃牌',source.hand.map(c=>({id:c.uid,label:cards[c.type][0]})),false);this.toss(source,uid);}}else yield* this.damage(source,p,null);}}
    }
    run(generator){if(this.task)throw Error('请先完成当前响应');this.task=generator;this.advance();}
    advance(value){const next=this.task.next(value);this.pending=next.done?null:next.value;if(next.done)this.task=null;}
    answer(id){if(!this.pending||!this.pending.options.some(o=>o.id===id))throw Error('无效响应');this.advance(id);}
    begin(){if(this.phase!=='ready'||this.task||this.winner)throw Error('不能开始回合');const p=this.players[this.turn];p.slashes=0;p.used=false;p.given=0;p.secondaryUsed=false;p.jijiangFailed=false;this.round++;this.draw(p,this.is(p,'zhouyu')?3:2);this.phase='play';this.log(`第${this.round}回合：${this.name(p)}摸牌，进入出牌阶段。`);}
    targets(p,type,exclude){return this.players.filter(q=>q.alive&&q!==p&&(type!=='slash'||this.distance(p,q,exclude)<=this.range(p,exclude))&&(type!=='steal'||this.distance(p,q,exclude)<=1)&&(!['steal','dismantle'].includes(type)||this.owned(q).length));}
    options(p=this.players[this.turn]){if(this.phase!=='play'||p.id!==this.turn||this.task||!p.alive)return [];const result=[];
      for(const c of this.owned(p)){const types=p.hand.includes(c)?[c.type]:[];if(this.is(p,'guanyu')&&c.red&&c.type!=='slash')types.push('slash');
        for(const type of types){if(['dodge','nullify'].includes(type)||(type==='peach'&&p.hp>=p.maxHp)||(type==='slash'&&p.slashes>=1&&!this.unlimited(p,c.uid)))continue;
          if(['slash','duel','steal','dismantle'].includes(type)){for(const q of this.targets(p,type,c.uid))result.push({uid:c.uid,type,target:q.id});}else result.push({uid:c.uid,type,target:p.id});}}
      if(this.lordSkill(p,'slash')&&!p.jijiangFailed&&(p.slashes<1||this.unlimited(p)))for(const q of this.targets(p,'slash'))result.push({uid:'jijiang',type:'slash',target:q.id});
      return result;
    }
    play(action){if(!this.options().some(a=>a.uid===action.uid&&a.type===action.type&&a.target===action.target))throw Error('这张牌当前无法如此使用');this.run(this.resolve(action));}
    *slashEffect(p,q,c){const ignoreArmor=this.equipped(p,'weapon')?.type==='qinggang';
      if(!ignoreArmor&&this.equipped(q,'armor')?.type==='renwang'&&!c.red){this.log('仁王盾抵消黑色杀。');return;}
      if(!(yield* this.respond(q,'dodge',`${this.name(p)}对你使用杀，是否出闪？`,{ignoreArmor})))yield* this.damage(q,p,c);
    }
    *resolve({uid,type,target}){const p=this.players[this.turn],q=this.players[target];let c;
      if(uid==='jijiang'){if(!(yield* this.requestLord(p,'slash',true))){p.jijiangFailed=true;return;}c=this.responseCard;}else{c=this.remove(p,uid);this.table.push(c);}
      this.log(`${this.name(p)}使用${cards[type][0]}${q!==p?' → '+this.name(q):''}。`);if(q!==p&&q.role==='lord')this.reputation[p.id]--;
      if(equipment[type]){this.table.splice(this.table.indexOf(c),1);this.equipCard(p,c);}
      else if(type==='slash'){p.slashes++;yield* this.slashEffect(p,q,c);}
      else if(type==='peach')p.hp=Math.min(p.maxHp,p.hp+1);
      else if(['arrows','barbarians'].includes(type)){for(let i=1;i<4;i++){const other=this.players[(p.id+i)%4];if(!other.alive||this.winner)continue;if(yield* this.nullified(p,other,type))continue;if(!(yield* this.respond(other,type==='arrows'?'dodge':'slash',`${cards[type][0]}：请响应。`)))yield* this.damage(other,p,c);}}
      else if(!(yield* this.nullified(p,q,type))){
        if(type==='draw2')this.draw(p,2);
        else if(type==='duel'){let defender=q,attacker=p;while(defender.alive&&attacker.alive&&!this.winner){if(!(yield* this.respond(defender,'slash',`与${this.name(attacker)}决斗，请出杀。`))){yield* this.damage(defender,attacker,c);break;}[defender,attacker]=[attacker,defender];}}
        else if(type==='dismantle'||type==='steal'){const choices=q.equip.map(c=>({id:c.uid,label:`装备：${cards[c.type][0]}`}));if(q.hand.length)choices.unshift({id:'hand',label:`随机手牌（${q.hand.length}张）`});const choice=yield* this.ask(p,`选择${this.name(q)}的${type==='steal'?'获得':'弃置'}区域`,choices,false,{kind:'zone',target:q.id});if(choice!==null){const taken=this.remove(q,choice==='hand'?q.hand[Math.floor(this.random()*q.hand.length)].uid:choice);if(type==='steal')p.hand.push(taken);else this.discard.push(taken);}}
      }
      if(this.table.includes(c)){this.table.splice(this.table.indexOf(c),1);this.discard.push(c);}if(!p.alive&&!this.winner)this.nextTurn();
    }
    skill(uids,target){const p=this.players[this.turn];if(this.phase!=='play'||this.task||!p.alive)throw Error('现在不能发动技能');if(!uids.length||new Set(uids).size!==uids.length||uids.some(id=>!this.owned(p).some(c=>c.uid===id)))throw Error('请选择有效手牌');if(this.is(p,'sunquan')&&!p.used){p.used=true;uids.forEach(id=>this.toss(p,id));this.draw(p,uids.length);this.log('孙权发动制衡。');}else if(this.is(p,'liubei')){if(uids.some(id=>!p.hand.some(c=>c.uid===id)))throw Error('仁德只能交出手牌');const q=this.players[target];if(!q?.alive||q===p)throw Error('请选择其他存活角色');uids.forEach(id=>q.hand.push(this.remove(p,id)));if(p.given<2&&p.given+uids.length>=2)p.hp=Math.min(p.maxHp,p.hp+1);p.given+=uids.length;this.log(`刘备发动仁德，交给${this.name(q)}${uids.length}张牌。`);}else throw Error('技能不可用');}
    secondary(target,uid){const p=this.players[this.turn],q=this.players[target];
      if(this.phase!=='play'||this.task||!p.alive||p.secondaryUsed||!q?.alive)throw Error('现在不能发动技能');
      if(this.is(p,'huatuo')){if(q.hp>=q.maxHp||!p.hand.some(c=>c.uid===uid))throw Error('青囊需一张手牌及受伤目标');p.secondaryUsed=true;this.toss(p,uid);q.hp=Math.min(q.maxHp,q.hp+1);this.log(`华佗发动青囊，${this.name(q)}回复1体力。`);}
      else if(this.is(p,'zhouyu')){if(q===p||!p.hand.length)throw Error('反间需有手牌且选择其他角色');p.secondaryUsed=true;this.run(this.fanjian(p,q));}
      else throw Error('没有可发动的技能');
    }
    *fanjian(p,q){const suit=yield* this.ask(q,'反间：猜一种花色，然后获得周瑜随机一张手牌。',['♥','♦','♠','♣'].map(s=>({id:s,label:s})),false,{kind:'fanjian'});
      const c=this.remove(p,p.hand[Math.floor(this.random()*p.hand.length)].uid);q.hand.push(c);this.log(`反间亮牌：${c.suit}${c.rank} ${cards[c.type][0]}，${this.name(q)}猜${suit}。`);if(c.suit!==suit)yield* this.damage(q,p,null);if(!p.alive&&!this.winner)this.nextTurn();
    }
    end(){if(this.phase!=='play'||this.task||this.winner)throw Error('不能结束回合');this.run(this.discardPhase());}
    *discardPhase(){this.phase='discard';const p=this.players[this.turn];while(p.alive&&p.hand.length>Math.max(0,p.hp)){const uid=yield* this.ask(p,`弃牌阶段：还需弃${p.hand.length-Math.max(0,p.hp)}张。`,p.hand.map(c=>({id:c.uid,label:`${c.suit}${c.rank} ${cards[c.type][0]}`})),false);this.toss(p,uid);}this.nextTurn();}
    nextTurn(){if(this.winner)return;do{this.turn=(this.turn+1)%4;}while(!this.players[this.turn].alive);this.phase='ready';}
    // AI only uses its own identity and public information; it cannot inspect hidden roles.
    enemyScore(p,q){if(q===p)return -99;if(p.role==='rebel')return q.role==='lord'?10:2;if(p.role==='loyalist')return q.role==='lord'?-10:4-this.reputation[q.id];if(p.role==='lord')return 3-this.reputation[q.id];return q.role==='lord'?(this.players.filter(x=>x.alive).length===2?10:-5):5;}
    value(c){return {peach:9,dodge:7,slash:5,draw2:8}[c.type]||4;}
    equipmentScore(p,type){const old=this.equipped(p,equipment[type].slot);if(!old)return 15;if(old.type===type)return 0;
      if(type==='crossbow'&&this.players.some(q=>q.alive&&this.enemyScore(p,q)>0&&this.distance(p,q)<=1))return 15;
      if(type==='qinggang'&&old.type!=='crossbow')return 15;
      return 0;
    }
    aiStep(){if(this.winner)return;
      if(this.pending){const req=this.pending,p=this.players[req.player];let pick=req.options[0];const pass=req.options.find(o=>o.id==='pass');
        if(req.kind==='nullify'){const ally=this.enemyScore(p,this.players[req.target])<0;const wantsCancel=req.trick==='draw2'?!ally:ally;if(wantsCancel===req.canceled)pick=pass;}
        else if(req.kind==='response'&&req.beneficiary!==null&&this.enemyScore(p,this.players[req.beneficiary])>0)pick=pass||pick;
        else if(req.text.includes('濒死')){const dying=this.players.find(x=>x.alive&&x.hp<=0);if(dying&&dying!==p&&this.enemyScore(p,dying)>0)pick=pass||pick;}
        else if(req.kind==='zone'){const q=this.players[req.target];const threat=q.equip.find(c=>equipment[c.type].slot==='armor')||q.equip.find(c=>equipment[c.type].slot==='weapon')||q.equip[0];if(threat)pick=req.options.find(o=>o.id===threat.uid);}
        else if(req.kind==='fanjian')pick=req.options[Math.floor(this.random()*4)];
        else if(req.text.includes('弃')){const actual=req.options.filter(o=>p.hand.some(c=>c.uid===o.id));if(actual.length)pick=actual.sort((a,b)=>this.value(p.hand.find(c=>c.uid===a.id))-this.value(p.hand.find(c=>c.uid===b.id)))[0];}
        this.answer(pick.id);return;
      }
      if(this.phase==='ready'){this.begin();return;}const p=this.players[this.turn];
      if(this.is(p,'huatuo')&&!p.secondaryUsed&&p.hand.length){const friend=this.players.find(q=>q.alive&&q.hp<q.maxHp&&this.enemyScore(p,q)<0);if(friend){this.secondary(friend.id,[...p.hand].sort((a,b)=>this.value(a)-this.value(b))[0].uid);return;}}
      if(this.is(p,'zhouyu')&&!p.secondaryUsed&&p.hand.length){const enemy=this.players.filter(q=>q.alive&&q!==p).sort((a,b)=>this.enemyScore(p,b)-this.enemyScore(p,a))[0];if(enemy&&this.enemyScore(p,enemy)>0){this.secondary(enemy.id);return;}}

      if(this.is(p,'liubei')&&p.given<2&&p.hand.length){const friend=this.players.find(q=>q.alive&&q!==p&&this.enemyScore(p,q)<0);if(friend){this.skill([p.hand[0].uid],friend.id);return;}}
      const actions=this.options().map(a=>({...a,score:equipment[a.type]?this.equipmentScore(p,a.type):a.type==='peach'?30:a.type==='draw2'?20:['arrows','barbarians'].includes(a.type)?1:this.enemyScore(p,this.players[a.target])})).filter(a=>a.score>0&&!(a.type==='slash'&&this.equipped(this.players[a.target],'armor')?.type==='renwang'&&this.equipped(p,'weapon')?.type!=='qinggang'&&a.uid!=='jijiang'&&!this.owned(p).find(c=>c.uid===a.uid)?.red)).sort((a,b)=>b.score-a.score);if(actions.length){this.play(actions[0]);return;}if(this.is(p,'sunquan')&&!p.used&&p.hand.length){const weak=p.hand.filter((c,i)=>!equipment[c.type]&&(this.value(c)<6||(['peach','dodge'].includes(c.type)&&p.hand.findIndex(x=>x.type===c.type)<i))).map(c=>c.uid);if(weak.length){this.skill(weak);return;}}this.end();
    }
  }
  const api={Game,generals,roles,cards,equipment,deckCounts,deckSize};if(typeof module!=='undefined')module.exports=api;else root.SGS=api;
})(typeof globalThis!=='undefined'?globalThis:this);
