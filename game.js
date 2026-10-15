(() => {
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const W=canvas.width,H=canvas.height, SAVE_KEY='pixelQuestSaveV2';
const keys=new Set();
let audioCtx=null,muted=false,gameState='title',worldIndex=0,score=0,lives=3,camera=0,player,level,particles=[],frame=0;
let checkpointScore=0,unlocked=0,bossNotice=0;
const WORLDS=[
 {name:'SUNNY GRASSLAND',theme:'grass',sky:'#78d7ff',hill:'#70c9a0',ground:'#8c4d39',top:'#43b85b',accent:'#ffe66d',boss:'MOSS TITAN',bossColor:'#7cbd50',length:3000},
 {name:'CRYSTAL CAVES',theme:'cave',sky:'#27244f',hill:'#49417c',ground:'#4d426f',top:'#61d8d0',accent:'#9bf8ef',boss:'CRYSTAL GOLEM',bossColor:'#6de0db',length:3200},
 {name:'LAVA KINGDOM',theme:'lava',sky:'#371d39',hill:'#74364b',ground:'#5c3044',top:'#ff784f',accent:'#ffe66d',boss:'EMBER DRAGON',bossColor:'#ff654d',length:3400},
 {name:'STAR SKY',theme:'sky',sky:'#171c4c',hill:'#343e82',ground:'#4a477f',top:'#d6b5ff',accent:'#fff3a6',boss:'NOVA GUARDIAN',bossColor:'#d6b5ff',length:3600}
];
function loadSave(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');unlocked=Math.max(0,Math.min(WORLDS.length-1,s.unlocked||0));score=Math.max(0,s.score||0);return s;}catch{return {};}}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({unlocked,score,world:worldIndex,updated:Date.now()}));}catch{}updateHUD();}
function updateHUD(){$('score').textContent=String(score).padStart(4,'0');$('lives').textContent=lives;$('worldLabel').textContent=`WORLD ${worldIndex+1} / ${WORLDS.length}`;$('shield').textContent=player&&player.shield>0?'ON':'OFF';}
function audio(){if(muted)return null;try{audioCtx ||= new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx;}catch{return null;}}
function tone(freq,duration=.09,type='square',volume=.035,delay=0){const a=audio();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,a.currentTime+delay);g.gain.setValueAtTime(volume,a.currentTime+delay);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+delay+duration);o.connect(g);g.connect(a.destination);o.start(a.currentTime+delay);o.stop(a.currentTime+delay+duration);}
function sfx(name){if(name==='jump'){tone(320,.08);tone(500,.1,'square',.025,.05);}if(name==='coin'){tone(740,.07);tone(990,.12,'square',.025,.07);}if(name==='hit'){tone(180,.18,'sawtooth',.04);tone(110,.22,'square',.025,.08);}if(name==='power'){tone(440,.1);tone(660,.1,'square',.03,.08);tone(880,.16,'square',.03,.16);}if(name==='win'){[523,659,784,1046].forEach((n,i)=>tone(n,.22,'square',.03,i*.12));}if(name==='lose'){tone(330,.2);tone(247,.3,'square',.03,.2);tone(165,.4,'square',.03,.45);}if(name==='boss'){tone(100,.3,'sawtooth',.05);tone(80,.35,'sawtooth',.04,.2);}}
function makeLevel(){
 const w=WORLDS[worldIndex],L=w.length;
 const platforms=[{x:0,y:480,w:630,h:60},{x:720,y:480,w:350,h:60},{x:1150,y:480,w:400,h:60},{x:1640,y:480,w:390,h:60},{x:2120,y:480,w:L-2120,h:60}];
 const elevated=[[240,390,150],[470,315,130],[780,390,140],[980,325,120],[1250,380,150],[1460,300,120],[1720,390,150],[1930,315,130],[2210,385,150],[2440,320,140],[2680,380,150]];
 elevated.forEach(([x,y,pw])=>platforms.push({x,y,w:pw,h:22}));
 const stars=[];for(let x=270;x<L-280;x+=190){const p=elevated.find(a=>Math.abs(a[0]-x)<80);stars.push({x,y:p?p[1]-35:425,taken:false});}
 const enemies=[];for(let x=390;x<L-500;x+=460)enemies.push({x,y:448,min:x-65,max:x+120,dir:1,alive:true,type:'walker'});
 const boss={x:L-220,y:390,w:92,h:88,hp:worldIndex===3?5:4,maxHp:worldIndex===3?5:4,dir:-1,active:false,defeated:false,attack:0};
 const powerups=[
 {x:850,y:350,type:'shield',taken:false},{x:1580,y:260,type:'double',taken:false},{x:2260,y:345,type:'blast',taken:false}
 ];
 return {w,L,platforms,stars,enemies,boss,powerups,goal:{x:L-65,y:330,w:24,h:150}};
}
function freshPlayer(){return {x:70,y:400,w:28,h:40,vx:0,vy:0,onGround:false,jumps:0,maxJumps:1,shield:0,blast:0,invuln:0,anim:0,face:1};}
function beginWorld(index){worldIndex=Math.max(0,Math.min(WORLDS.length-1,index));level=makeLevel();player=freshPlayer();camera=0;particles=[];frame=0;bossNotice=0;gameState='playing';hideOverlay();updateHUD();save();}
function showOverlay(kicker,title,desc,primary,secondary=''){gameState='menu';$('panelKicker').textContent=kicker;$('panelTitle').textContent=title;$('panelText').textContent=desc;$('playBtn').textContent=primary;$('continueBtn').style.display=secondary?'inline-block':'none';$('continueBtn').textContent=secondary||'';$('overlay').classList.remove('hidden');}
function hideOverlay(){$('overlay').classList.add('hidden');}
function newGame(){score=0;lives=3;worldIndex=0;unlocked=0;beginWorld(0);}
function continueGame(){const s=loadSave();score=Math.max(0,s.score||0);worldIndex=Math.min(unlocked,s.world||0);lives=3;beginWorld(worldIndex);}
function resetWorld(){beginWorld(worldIndex);}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function drawCloud(x,y,s=1,c='#f6ffff'){rect(x,y,55*s,17*s,c);rect(x+10*s,y-12*s,28*s,16*s,c);rect(x+33*s,y-5*s,24*s,12*s,c);}
function background(){
 const w=level.w;rect(0,0,W,H,w.sky);
 if(w.theme==='sky'){for(let i=0;i<45;i++)rect((i*83-camera*.18+W*20)%W,(i*53)%380,2+(i%3),2+(i%3),i%2?'#fff3a6':'#b9c8ff');}
 for(let i=0;i<9;i++){const x=i*160-(camera*.2)%160;rect(x,365,115,115,w.hill);rect(x+18,342,80,23,w.hill);rect(x+42,320,38,22,w.hill);}
 if(w.theme==='grass'){for(let i=0;i<6;i++)drawCloud(i*210-(camera*.12)%210,75+(i%3)*50,.85);}
 if(w.theme==='cave'){for(let i=0;i<13;i++){let x=i*95-(camera*.3)%95;rect(x,0,30,70,w.hill);rect(x+8,65,14,22,w.sky);rect(x+35,0,12,35,'#7a70b4');}}
 if(w.theme==='lava'){for(let i=0;i<12;i++){let x=i*100-(camera*.2)%100;rect(x,420,45,60,'#c74648');rect(x+12,410,20,10,'#ff784f');}}
}
function platformDraw(p){let x=p.x-camera;if(x+p.w<0||x>W)return;rect(x,p.y,p.w,p.h,level.w.ground);rect(x,p.y,p.w,9,level.w.top);rect(x,p.y+9,p.w,4,'#252044');for(let xx=10;xx<p.w;xx+=34){rect(x+xx,p.y+22,4,4,'#30264d');if(p.h>30)rect(x+xx+12,p.y+39,4,4,'#30264d');}}
function starDraw(s){if(s.taken)return;let x=s.x-camera,y=s.y;ctx.fillStyle=level.w.accent;ctx.beginPath();for(let i=0;i<10;i++){let r=i%2===0?13:6,a=-Math.PI/2+i*Math.PI/5,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();rect(x-2,y-5,4,10,'#fff');}
function enemyDraw(e){if(!e.alive)return;let x=e.x-camera,y=e.y;rect(x,y+5,31,21,'#9c4de0');rect(x+4,y,23,9,'#9c4de0');rect(x+5,y+9,6,7,'#fff');rect(x+20,y+9,6,7,'#fff');rect(x+7,y+11,3,4,'#201b42');rect(x+22,y+11,3,4,'#201b42');rect(x+3,y+24,9,5,'#5731a0');rect(x+20,y+24,9,5,'#5731a0');}
function heroDraw(){
 const p=player,x=Math.round(p.x-camera),y=Math.round(p.y),step=p.onGround&&Math.abs(p.vx)>.4?Math.floor(p.anim/5)%2:0;
 if(p.invuln>0&&Math.floor(frame/4)%2===0)return;
 if(p.shield>0){ctx.strokeStyle='#78d7ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+14,y+20,27+Math.sin(frame*.18)*2,0,Math.PI*2);ctx.stroke();}
 // Custom pixel explorer: cap, hair, face, scarf, jacket, animated legs.
 rect(x+4,y,20,6,'#302044');rect(x+1,y+4,25,5,'#ff5c8a');rect(x+5,y+8,18,13,'#ffbd69');
 rect(x+(p.face>0?18:6),y+12,4,5,'#252044');rect(x+5,y+8,5,7,'#7a3d54');
 rect(x+3,y+20,22,12,'#4f8dff');rect(x+2,y+21,7,10,'#ffbd69');rect(x+21,y+21,6,10,'#ffbd69');
 rect(x+5,y+30,7,7-step*2,'#302044');rect(x+17,y+30,7,7-(1-step)*2,'#302044');
 rect(x+4,y+36-step*2,10,4,'#ffe66d');rect(x+16,y+36-(1-step)*2,10,4,'#ffe66d');
 rect(x+4,y+22,19,3,'#ff5c8a');p.anim++;
}
function powerDraw(a){if(a.taken)return;let x=a.x-camera,y=a.y;const color=a.type==='shield'?'#78d7ff':a.type==='double'?'#ff8bdb':'#ffe66d';rect(x-11,y-11,22,22,color);rect(x-5,y-5,10,10,'#fff');ctx.fillStyle='#202044';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText(a.type==='shield'?'S':a.type==='double'?'2':'B',x,y+4);ctx.textAlign='left';}
function bossDraw(b){
 if(b.defeated)return;let x=b.x-camera,y=b.y,c=level.w.bossColor;
 rect(x+12,y+10,68,60,c);rect(x,y+25,16,35,c);rect(x+76,y+25,16,35,c);rect(x+20,y,52,18,c);rect(x+20,y+68,18,17,c);rect(x+54,y+68,18,17,c);
 rect(x+24,y+25,14,14,'#fff');rect(x+54,y+25,14,14,'#fff');rect(x+29,y+29,6,8,'#252044');rect(x+59,y+29,6,8,'#252044');
 rect(x+36,y+48,22,5,'#252044');rect(x+30,y+57,34,4,level.w.accent);
 rect(x+5,y-18,82,7,'#252044');rect(x+7,y-16,78*(b.hp/b.maxHp),3,'#ff5c8a');
}
function goalDraw(){let x=level.goal.x-camera;rect(x,330,7,150,'#f7f2d8');rect(x+7,335,48,30,'#ff5c8a');rect(x+7,335,18,10,level.w.accent);rect(x-10,480,35,8,level.w.ground);}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function burst(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.8)*5,life:24,color});}
function hurt(){
 if(player.invuln>0)return;
 if(player.shield>0){player.shield=0;player.invuln=70;burst(player.x+14,player.y+20,'#78d7ff');sfx('power');updateHUD();return;}
 lives--;player.invuln=100;player.vy=-7;player.vx=player.x<level.boss.x?-5:5;sfx('hit');updateHUD();
 if(lives<=0){sfx('lose');showOverlay('ADVENTURE OVER','TRY AGAIN, HERO','You made it this far. Every run teaches you something.','TRY AGAIN','TITLE SCREEN');}
}
function update(){
 if(gameState!=='playing')return;frame++;
 const p=player,acc=.62,max=4.6;
 if(keys.has('ArrowLeft')||keys.has('a')){p.vx=Math.max(-max,p.vx-acc);p.face=-1;}
 else if(keys.has('ArrowRight')||keys.has('d')){p.vx=Math.min(max,p.vx+acc);p.face=1;}else p.vx*=.78;
 if((keys.has('Space')||keys.has('ArrowUp')||keys.has('w'))&&!p.jumpHeld){if(p.onGround||p.jumps<p.maxJumps){p.vy=p.jumps===0?-12.1:-10.8;p.jumps++;p.onGround=false;sfx('jump');}p.jumpHeld=true;}
 if(!(keys.has('Space')||keys.has('ArrowUp')||keys.has('w')))p.jumpHeld=false;
 p.vy=Math.min(p.vy+.55,13);p.x=Math.max(0,Math.min(level.L-p.w,p.x+p.vx));
 for(const q of level.platforms)if(overlap(p,q)){if(p.vx>0)p.x=q.x-p.w;else if(p.vx<0)p.x=q.x+q.w;p.vx=0;}
 p.y+=p.vy;p.onGround=false;
 for(const q of level.platforms)if(overlap(p,q)){if(p.vy>0){p.y=q.y-p.h;p.onGround=true;p.jumps=0;}else if(p.vy<0)p.y=q.y+q.h;p.vy=0;}
 for(const s of level.stars)if(!s.taken&&overlap(p,{x:s.x-12,y:s.y-12,w:24,h:24})){s.taken=true;score+=10;burst(s.x,s.y,level.w.accent,5);sfx('coin');save();}
 for(const a of level.powerups)if(!a.taken&&overlap(p,{x:a.x-13,y:a.y-13,w:26,h:26})){a.taken=true;if(a.type==='shield')p.shield=900;if(a.type==='double')p.maxJumps=2;if(a.type==='blast')p.blast=1;score+=25;sfx('power');burst(a.x,a.y,'#78d7ff',12);updateHUD();save();}
 for(const e of level.enemies)if(e.alive){e.x+=e.dir*1.1;if(e.x<e.min||e.x>e.max)e.dir*=-1;if(overlap(p,{x:e.x,y:e.y,w:31,h:29})){if(p.vy>1&&p.y+p.h-e.y<18){e.alive=false;p.vy=-8;score+=20;sfx('hit');burst(e.x,e.y,'#9c4de0');save();}else hurt();}}
 const b=level.boss;
 if(p.x>level.L-680&&!b.defeated){b.active=true;bossNotice++;if(bossNotice===1){sfx('boss');$('tip').textContent=`BOSS: ${level.w.boss} — stomp or use POWER!`;}}
 if(b.active&&!b.defeated&&lives>0){
   b.x+=b.dir*(1.25+worldIndex*.2);if(b.x<level.L-500||b.x>level.L-135)b.dir*=-1;
   b.attack++;if(b.attack%145===0){burst(b.x+45,b.y+45,level.w.accent,10);}
   if(overlap(p,{x:b.x,y:b.y,w:b.w,h:b.h})){
     if(p.blast>0){p.blast=0;b.hp=Math.max(0,b.hp-2);p.vy=-8;sfx('power');burst(b.x+45,b.y+40,'#ffe66d',18);}
     else if(p.vy>1&&p.y+p.h-b.y<22){b.hp--;p.vy=-9;sfx('hit');burst(b.x+45,b.y+25,level.w.accent,12);}
     else hurt();
     if(b.hp<=0){b.defeated=true;score+=150;unlocked=Math.max(unlocked,Math.min(WORLDS.length-1,worldIndex+1));sfx('win');save();$('tip').textContent=`${level.w.boss} defeated! Reach the flag!`;}
   }
 }
 if(p.shield>0)p.shield--;if(p.invuln>0)p.invuln--;
 if(p.y>H+70){hurt();if(lives>0){p.x=Math.max(40,p.x-120);p.y=340;p.vy=0;}}
 if(p.x+p.w>level.goal.x&&level.boss.defeated){
   if(worldIndex<WORLDS.length-1){score+=100;unlocked=Math.max(unlocked,worldIndex+1);save();sfx('win');showOverlay('WORLD COMPLETE',`WORLD ${worldIndex+1} CLEAR!`,`You beat ${level.w.boss}. Ready for ${WORLDS[worldIndex+1].name.toLowerCase()}?`,'NEXT WORLD','REPLAY WORLD');}
   else{score+=250;save();sfx('win');showOverlay('YOU DID IT!','PIXEL LEGEND','All worlds cleared! You are the guardian of the pixel realms.','PLAY AGAIN','TITLE SCREEN');}
 }
 camera=Math.max(0,Math.min(level.L-W,p.x-W*.35));particles=particles.filter(a=>a.life-->0);for(const a of particles){a.x+=a.vx;a.y+=a.vy;a.vy+=.12;}updateHUD();
}
function render(){
 background();for(const q of level.platforms)platformDraw(q);for(const s of level.stars)starDraw(s);for(const a of level.powerups)powerDraw(a);for(const e of level.enemies)enemyDraw(e);bossDraw(level.boss);goalDraw();heroDraw();
 for(const a of particles)rect(a.x-camera,a.y,4,4,a.color);
 ctx.fillStyle='#fff';ctx.font='12px monospace';ctx.fillText(level.w.name,16,24);
 if(level.boss.active&&!level.boss.defeated){ctx.fillStyle='#252044';ctx.fillRect(W/2-120,15,240,20);ctx.fillStyle=level.w.bossColor;ctx.fillRect(W/2-116,19,232*(level.boss.hp/level.boss.maxHp),12);ctx.fillStyle='#fff';ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText(level.w.boss,W/2,49);ctx.textAlign='left';}
}
function loop(){update();render();requestAnimationFrame(loop);}
function usePower(){if(gameState!=='playing')return;if(player.blast>0){const b=level.boss;if(b.active&&!b.defeated&&Math.abs((player.x+player.w/2)-(b.x+b.w/2))<220){b.hp=Math.max(0,b.hp-2);player.blast=0;sfx('power');burst(b.x+45,b.y+40,'#ffe66d',18);if(b.hp===0){b.defeated=true;score+=150;unlocked=Math.max(unlocked,Math.min(WORLDS.length-1,worldIndex+1));save();}updateHUD();}else{$('tip').textContent='Get closer to the boss to use your blast!';}}else if(player.shield<=0){player.shield=600;sfx('power');updateHUD();}else{$('tip').textContent='Your shield is already active!';}}
$('playBtn').addEventListener('click',()=>{audio();const label=$('playBtn').textContent;if(label==='NEXT WORLD')beginWorld(Math.min(worldIndex+1,WORLDS.length-1));else if(label==='PLAY AGAIN'||label==='TRY AGAIN')newGame();else if(label==='REPLAY WORLD')beginWorld(worldIndex);else newGame();});
$('continueBtn').addEventListener('click',()=>{audio();if($('playBtn').textContent==='NEXT WORLD')beginWorld(worldIndex);else if($('playBtn').textContent==='TRY AGAIN')showOverlay('MAIN MENU','PIXEL QUEST','Your saved progress is safe.','START ADVENTURE');else if($('playBtn').textContent==='PLAY AGAIN')showOverlay('MAIN MENU','PIXEL QUEST','Want to explore again?','START ADVENTURE');else beginWorld(worldIndex);});
$('muteBtn').addEventListener('click',()=>{muted=!muted;$('muteBtn').textContent=`SOUND: ${muted?'OFF':'ON'}`;if(!muted)tone(600,.07);});
$('resetSaveBtn').addEventListener('click',()=>{if(confirm('Erase your saved Pixel Quest progress?')){try{localStorage.removeItem(SAVE_KEY);}catch{}score=0;unlocked=0;worldIndex=0;showOverlay('SAVE RESET','PIXEL QUEST','A fresh adventure awaits.','START ADVENTURE');updateHUD();}});
function bindButton(id,key){const b=$(id),down=e=>{e.preventDefault();audio();keys.add(key);},up=e=>{e.preventDefault();keys.delete(key);};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up);}
bindButton('leftBtn','ArrowLeft');bindButton('rightBtn','ArrowRight');bindButton('jumpBtn','Space');$('powerBtn').addEventListener('pointerdown',e=>{e.preventDefault();audio();usePower();});
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','Space'].includes(e.code))e.preventDefault();keys.add(e.code==='Space'?'Space':e.key);if(e.key.toLowerCase()==='x')usePower();if(e.key.toLowerCase()==='r'&&gameState==='playing')resetWorld();if(e.code==='Enter'&&gameState==='title'){audio();newGame();}});
window.addEventListener('keyup',e=>keys.delete(e.code==='Space'?'Space':e.key));
canvas.addEventListener('pointerdown',()=>{if(gameState==='title'){audio();newGame();}});
loadSave();level=makeLevel();player=freshPlayer();updateHUD();showOverlay('WELCOME, EXPLORER','PIXEL QUEST','Three worlds. Three bosses. Power-ups, secrets and retro sounds await.','START ADVENTURE','CONTINUE SAVE');loop();
})();