(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const messageEl = document.getElementById('message');

  const W = canvas.width, H = canvas.height, TILE = 40;
  const keys = new Set();
  let player, platforms, stars, enemies, camera, score, lives, state, goal, worldWidth, particles;

  // Level layout: platforms are intentionally simple so it's easy to mod.
  function buildLevel() {
    worldWidth = 3000;
    platforms = [
      {x:0,y:480,w:680,h:60}, {x:760,y:480,w:360,h:60},
      {x:1200,y:480,w:430,h:60}, {x:1710,y:480,w:400,h:60},
      {x:2180,y:480,w:820,h:60},
      {x:250,y:385,w:150,h:22}, {x:490,y:315,w:130,h:22},
      {x:820,y:390,w:130,h:22}, {x:1010,y:330,w:120,h:22},
      {x:1330,y:380,w:160,h:22}, {x:1530,y:300,w:120,h:22},
      {x:1830,y:390,w:150,h:22}, {x:2040,y:320,w:120,h:22},
      {x:2290,y:390,w:150,h:22}, {x:2520,y:330,w:140,h:22},
      {x:2730,y:270,w:130,h:22}
    ];
    stars = [
      [290,345],[530,275],[860,350],[1040,290],[1370,340],[1570,260],
      [1870,350],[2075,280],[2330,350],[2560,290],[2770,230],
      [680,430],[1150,430],[1660,430],[2140,430],[2450,430]
    ].map(([x,y])=>({x,y,taken:false}));
    enemies = [
      {x:420,y:448,min:390,max:630,dir:1,alive:true},
      {x:900,y:358,min:820,max:930,dir:-1,alive:true},
      {x:1410,y:448,min:1280,max:1580,dir:1,alive:true},
      {x:1880,y:358,min:1830,max:1930,dir:-1,alive:true},
      {x:2380,y:448,min:2240,max:2470,dir:1,alive:true}
    ];
    goal = {x:2860,y:340,w:28,h:140};
  }
  function reset(full=true) {
    if (full) { score = 0; lives = 3; buildLevel(); }
    player = {x:70,y:400,w:28,h:38,vx:0,vy:0,onGround:false,invuln:0};
    camera = 0; particles = [];
    state = 'ready'; updateHud();
    message('PRESS ENTER TO START');
  }
  function message(txt) { messageEl.textContent = txt; messageEl.classList.remove('hidden'); }
  function hideMessage() { messageEl.classList.add('hidden'); }
  function updateHud() { scoreEl.textContent = String(score).padStart(3,'0'); livesEl.textContent = lives; }
  function start() { if (state === 'ready') { state='playing'; hideMessage(); } }
  function rect(x,y,w,h,color) { ctx.fillStyle=color; ctx.fillRect(Math.round(x),Math.round(y),w,h); }
  function drawCloud(x,y,s=1) {
    rect(x,y,58*s,18*s,'#f6ffff'); rect(x+12*s,y-12*s,28*s,16*s,'#f6ffff');
    rect(x+34*s,y-6*s,22*s,12*s,'#f6ffff');
  }
  function drawBackground() {
    rect(0,0,W,H,'#78d7ff');
    // distant hills
    for(let i=0;i<8;i++){
      const x = i*180 - (camera*0.22)%180;
      rect(x,365,120,115,'#70c9a0'); rect(x+20,340,80,25,'#70c9a0');
      rect(x+45,320,35,20,'#70c9a0');
    }
    for(let i=0;i<7;i++) drawCloud(i*190-(camera*.12)%190,80+(i%3)*50,.8+(i%2)*.2);
    // tiny sparkles
    for(let i=0;i<20;i++) rect((i*137-camera*.35)%W, 40+(i*47)%260, 3,3,'#eaffff');
  }
  function drawPlatform(p) {
    const x=p.x-camera;
    if(x+p.w<0 || x>W) return;
    rect(x,p.y,p.w,p.h,'#8c4d39'); rect(x,p.y,p.w,10,'#43b85b');
    rect(x,p.y+10,p.w,4,'#277e50');
    for(let xx=8;xx<p.w;xx+=32) { rect(x+xx,p.y+20,4,4,'#6b382e'); rect(x+xx+12,p.y+36,4,4,'#6b382e'); }
  }
  function drawStar(s) {
    if(s.taken) return;
    const x=s.x-camera, y=s.y;
    ctx.fillStyle='#ffe66d'; ctx.beginPath();
    for(let i=0;i<10;i++){
      const r=i%2===0?13:6, a=-Math.PI/2+i*Math.PI/5;
      const px=x+Math.cos(a)*r, py=y+Math.sin(a)*r;
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();ctx.fill(); rect(x-2,y-5,4,10,'#fff7ba');
  }
  function drawEnemy(e) {
    if(!e.alive) return;
    const x=e.x-camera;
    rect(x,e.y,30,25,'#9c4de0'); rect(x+4,e.y-5,22,8,'#9c4de0');
    rect(x+5,e.y+7,6,7,'#fff'); rect(x+19,e.y+7,6,7,'#fff');
    rect(x+7,e.y+9,3,4,'#201b42'); rect(x+21,e.y+9,3,4,'#201b42');
    rect(x+4,e.y+22,8,5,'#5731a0'); rect(x+19,e.y+22,8,5,'#5731a0');
  }
  function drawPlayer() {
    const x=player.x-camera, y=player.y;
    if(player.invuln>0 && Math.floor(player.invuln/5)%2===0) return;
    // Original little explorer sprite, assembled from pixel blocks.
    rect(x+5,y,18,7,'#4c2c73'); rect(x+2,y+5,24,6,'#ffbd69');
    rect(x+5,y+11,18,13,'#ffbd69'); rect(x+7,y+14,4,4,'#252044'); rect(x+19,y+14,4,4,'#252044');
    rect(x+4,y+23,22,10,'#ff5c8a'); rect(x+1,y+24,5,10,'#ffbd69'); rect(x+22,y+24,5,10,'#ffbd69');
    rect(x+5,y+32,7,6,'#30305e'); rect(x+17,y+32,7,6,'#30305e');
    rect(x+5,y+37,9,2,'#ffe66d'); rect(x+16,y+37,9,2,'#ffe66d');
  }
  function drawGoal() {
    const x=goal.x-camera;
    rect(x+12,goal.y,7,140,'#f7f2d8'); rect(x+19,goal.y+5,42,28,'#ff5c8a');
    rect(x+19,goal.y+5,15,8,'#ffe66d');
    rect(x+2,goal.y+140,30,8,'#8c4d39');
  }
  function overlap(a,b) { return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
  function update() {
    if(state!=='playing') return;
    const accel=.65, max=4.6, gravity=.55;
    if(keys.has('ArrowLeft')||keys.has('a')) player.vx=Math.max(player.vx-accel,-max);
    else if(keys.has('ArrowRight')||keys.has('d')) player.vx=Math.min(player.vx+accel,max);
    else player.vx*=.78;
    if((keys.has('Space')||keys.has('ArrowUp')||keys.has('w'))&&player.onGround){player.vy=-12.2;player.onGround=false;}
    player.vy=Math.min(player.vy+gravity,13);
    player.x+=player.vx; player.x=Math.max(0,Math.min(worldWidth-player.w,player.x));
    // Horizontal collisions are deliberately forgiving.
    for(const p of platforms) if(overlap(player,p)) {
      if(player.vx>0) player.x=p.x-player.w;
      else if(player.vx<0) player.x=p.x+p.w;
      player.vx=0;
    }
    player.y+=player.vy; player.onGround=false;
    for(const p of platforms) if(overlap(player,p)) {
      if(player.vy>0){player.y=p.y-player.h;player.onGround=true;}
      else if(player.vy<0) player.y=p.y+p.h;
      player.vy=0;
    }
    for(const s of stars) if(!s.taken && overlap(player,{x:s.x-12,y:s.y-12,w:24,h:24})){
      s.taken=true;score+=10;updateHud();
      particles.push({x:s.x,y:s.y,life:24});
    }
    for(const e of enemies) if(e.alive){
      e.x+=e.dir*1.1;
      if(e.x<e.min||e.x>e.max)e.dir*=-1;
      if(overlap(player,{x:e.x,y:e.y,w:30,h:27})){
        if(player.vy>1 && player.y+player.h-e.y<18){e.alive=false;player.vy=-8;score+=20;updateHud();}
        else if(player.invuln<=0){lives--;updateHud();player.invuln=90;player.vy=-7;player.vx=player.x<e.x?-5:5;
          if(lives<=0){state='over';message('GAME OVER  •  PRESS R');}
        }
      }
    }
    if(player.y>H+80){
      lives--;updateHud();
      if(lives<=0){state='over';message('GAME OVER  •  PRESS R');}
      else {player.x=Math.max(40,player.x-100);player.y=350;player.vy=0;player.invuln=90;}
    }
    if(player.invuln>0)player.invuln--;
    if(player.x+player.w>goal.x && player.y+player.h>goal.y){
      state='won';message('LEVEL CLEAR!  •  PRESS R');
    }
    camera=Math.max(0,Math.min(worldWidth-W,player.x-W*.35));
    particles=particles.filter(p=>p.life-->0);
  }
  function render() {
    drawBackground();
    for(const p of platforms)drawPlatform(p);
    for(const s of stars)drawStar(s);
    for(const e of enemies)drawEnemy(e);
    drawGoal();drawPlayer();
    for(const p of particles){rect(p.x-camera,p.y-p.life,3,3,'#fff7ba');}
    // little level label
    ctx.fillStyle='#202044';ctx.font='12px monospace';ctx.fillText('PIXEL PLAINS',18,24);
  }
  function loop(){update();render();requestAnimationFrame(loop);}
  window.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','Space'].includes(e.code))e.preventDefault();
    keys.add(e.code==='Space'?'Space':e.key);
    if(e.code==='Enter')start();
    if(e.key.toLowerCase()==='r')reset(true);
  });
  window.addEventListener('keyup',e=>keys.delete(e.code==='Space'?'Space':e.key));
  function bindButton(id,key){
    const b=document.getElementById(id);
    const down=e=>{e.preventDefault();keys.add(key);start();};
    const up=e=>{e.preventDefault();keys.delete(key);};
    b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);
    b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up);
  }
  bindButton('leftBtn','ArrowLeft');bindButton('rightBtn','ArrowRight');bindButton('jumpBtn','Space');
  canvas.addEventListener('click',start);
  reset(true);loop();
})();