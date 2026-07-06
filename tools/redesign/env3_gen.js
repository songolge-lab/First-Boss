// "The Sundered Court" — FULL RESTART (env3). One bespoke hand-composed pixel
// tableau, 320x135, floor at row 94. No repeating bay module: every opening,
// stone feature, crack, moss patch and ornament is individually placed. The
// outside world is ONE continuous panorama; each opening crops a different
// part of it. True pixel art: flat palette colors in the grid; light shafts /
// vignette are separate overlay prims (not blended), so the art stays crisp.
const fs = require('fs');
const zlib = require('zlib');

const W = 320, H = 135, SCALE = 4;

const PAL = {
  // warm stone
  a:'#2b241c', b:'#4a3f31', c:'#6b5c46', d:'#8a785e', e:'#a8987a', f:'#c7b898',
  // pale trim stone
  p:'#7e7a6a', q:'#9c977f', r:'#bdb79c',
  // sky / clouds
  K:'#6fb7e8', k:'#a4d4f2', j:'#e6f2fb', w:'#f2f8fd',
  // mountains / hills
  M:'#90a6c2', m:'#6e88a8', h:'#7c9884',
  // greens
  G:'#24462a', g:'#2e5c34', v:'#4a8248', V:'#6fa85c', y:'#8fc474',
  // reds
  R:'#5c1616', s:'#8a2020', S:'#b03030', T:'#d24848',
  // golds
  o:'#8a6420', O:'#c99b3a', x:'#ecc95e', X:'#f7e9a0',
  // dark wood / iron
  D:'#241a12', n:'#40301f', N:'#59422b',
  // floor
  u:'#4e463a', U:'#332c24',
  // flame
  F:'#e8873a', L:'#ffd27a',
};

const grid = Array.from({length:H},()=>Array(W).fill('.'));
const overlays = [];   // {x,y,w,h,hex,a} translucent passes (shafts, vignette)
const pset=(x,y,k)=>{ if(x>=0&&x<W&&y>=0&&y<H) grid[y][x]=k; };
const rect=(x,y,w,h,k)=>{ for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) pset(xx,yy,k); };
const hln=(x,y,w,k)=>rect(x,y,w,1,k);
const vln=(x,y,h,k)=>rect(x,y,1,h,k);
const ov=(x,y,w,h,hex,a)=>overlays.push({x,y,w,h,hex,a});

// deterministic hash
const hash=(x,y)=>{ const n=Math.sin(x*127.1+y*311.7)*43758.5453; return n-Math.floor(n); };

// =====================================================================
// CONTINUOUS PANORAMA (absolute world coords; openings crop it)
// =====================================================================
function interp(pts){
  const arr=new Array(W);
  for(let i=0;i<pts.length-1;i++){
    const [x0,y0]=pts[i],[x1,y1]=pts[i+1];
    for(let x=x0;x<=x1&&x<W;x++) arr[x]=Math.round(y0+(y1-y0)*(x-x0)/(x1-x0));
  }
  return arr;
}
const ridge1=interp([[0,52],[28,44],[52,50],[80,41],[110,49],[140,45],[170,52],[200,44],[226,50],[258,43],[290,51],[319,47]]);
const ridge2=interp([[0,58],[36,52],[70,57],[104,50],[150,56],[190,51],[240,57],[280,52],[319,58]]);
const hillY =interp([[0,63],[40,60],[90,64],[140,59],[200,63],[260,60],[319,64]]);
// irregular hand-placed tree bumps
const treeTop=new Array(W).fill(66);
[[12,8,3],[34,10,4],[58,7,2],[83,9,5],[101,6,3],[126,10,4],[155,8,3],[178,9,4],[203,7,2],[229,10,5],[251,7,3],[275,9,4],[299,8,3]]
  .forEach(([cx,r,hgt])=>{ for(let x=cx-r;x<=cx+r;x++){ if(x<0||x>=W)continue;
    const t=1-Math.abs(x-cx)/r; const yTop=66-Math.round(hgt*Math.sqrt(Math.max(0,t)));
    if(yTop<treeTop[x]) treeTop[x]=yTop; }});
const clouds=[[30,16,22],[60,12,12],[74,26,16],[160,20,26],[196,14,14],[205,30,10],[262,18,18]];

function vistaCol(x, yTop, yBot){
  for(let y=yTop;y<=yBot;y++){
    let k;
    if(y<ridge1[x])      k = y<24?'j':(y<40?'k':'K');
    else if(y<ridge2[x]) k='M';
    else if(y<hillY[x])  k='m';
    else if(y<treeTop[x])k='h';
    else if(y<66)        k = (hash(x,3)>0.9 && y===treeTop[x])?'v':'g';
    else if(y===66)      k='V';
    else if(y<74)        k='v';
    else                 k='g';
    pset(x,y,k);
  }
  // clouds (only over sky)
  for(const [cx,cy,cw] of clouds){
    if(x>=cx&&x<cx+cw&&cy>=yTop&&cy+1<=yBot&&cy<ridge1[x]-2){
      pset(x,cy,'w'); if(x>cx&&x<cx+cw-1) pset(x,cy+1,'w');
    }
  }
  // one cypress (arcade-left view only, by position)
  if(x>=156&&x<=168){
    const cx=162, t=1-Math.abs(x-cx)/7;
    if(t>0){ const top=40+Math.round((1-t)*10);
      for(let y=Math.max(top,yTop);y<=Math.min(72,yBot);y++) pset(x,y,(x+y)%5===0?'g':'G');
    }
    if((x===161||x===162)) for(let y=Math.max(66,yTop);y<=Math.min(73,yBot);y++) pset(x,y,'n');
  }
  // distant turret (arcade-right view only) — pale keep against the hills
  if(x>=198&&x<=208){
    for(let y=Math.max(46,yTop);y<=Math.min(64,yBot);y++) pset(x,y, x>=206?'b':(x===198?'r':'p'));
    const roofTop=40+Math.abs(x-203);
    for(let y=Math.max(roofTop,yTop);y<=Math.min(45,yBot);y++) if(Math.abs(x-203)<=(45-y)) pset(x,y,'R');
    if(x>=201&&x<=205) for(let y=Math.max(58,yTop);y<=Math.min(63,yBot);y++) pset(x,y,'D');
    if(x>=202&&x<=204&&50>=yTop&&50<=yBot) pset(x,50,'b');
    if(x===204&&38>=yTop&&38<=yBot){ pset(x,38,'S'); pset(x,37,'S'); }
  }
  // two birds
  if((x===66||x===68)&&20>=yTop&&20<=yBot) pset(x,20,'m');
  if(x===67&&19>=yTop&&19<=yBot) pset(x,19,'m');
}

// =====================================================================
// 1. WALL FIELD + CEILING (irregular masonry, hand-placed features)
// =====================================================================
rect(0,8,W,86,'c');
// ceiling cornice
rect(0,0,W,6,'a'); hln(0,6,W,'p'); hln(0,7,W,'b');
[[24,0],[58,1],[96,0],[140,1],[190,0],[238,1],[282,0],[308,0]].forEach(([x,o])=>{
  rect(x,8,4,3,'d'); pset(x+1,11,'b'); if(o)pset(x+3,8,'e');
});
// irregular course lines (varied spacing)
const courses=[18,29,39,50,60,71,82];
courses.forEach(cy=>hln(0,cy,W,'b'));
// head joints: varied widths per course, offset per course
courses.forEach((cy,i)=>{
  const next=(i+1<courses.length?courses[i+1]:90);
  let x=Math.floor(hash(i,7)*20);
  while(x<W){ vln(x,cy+1,next-cy-1,'b'); x+=16+Math.floor(hash(x,i)*18); }
});
// hand-placed feature stones (unique tones / chips)
[[6,30,14,8,'d'],[52,72,18,9,'b'],[120,20,12,9,'d'],[226,64,16,6,'d'],
 [240,30,10,8,'b'],[300,62,14,8,'d'],[36,61,12,9,'b'],[142,8,14,9,'d']]
 .forEach(([x,y,w2,h2,k])=>{ rect(x,y,w2,h2,k); hln(x,y,w2,k==='d'?'e':'c'); });
// chipped corners (each different)
pset(6,30,'b'); pset(7,30,'b'); pset(6,31,'b');
rect(311,8,3,2,'b'); pset(313,10,'b');
// wall cracks (three, each a different hand-drawn path)
[[124,44],[125,45],[125,46],[124,47],[124,48],[125,49],[126,50],[126,51]].forEach(([x,y])=>pset(x,y,'a'));
[[220,70],[221,71],[221,72],[221,73],[220,75],[219,77],[222,75],[223,76]].forEach(([x,y])=>pset(x,y,'a'));
[[36,52],[37,53],[38,53],[39,54],[40,56]].forEach(([x,y])=>pset(x,y,'a'));
// wall moss patches (two, different shapes)
[[228,88,'g'],[229,87,'v'],[230,88,'g'],[231,89,'g'],[229,89,'v']].forEach(([x,y,k])=>pset(x,y,k));
[[98,90,'g'],[99,89,'g'],[100,90,'v'],[99,91,'g']].forEach(([x,y,k])=>pset(x,y,k));
// baseboard
rect(0,90,W,4,'b'); hln(0,90,W,'p');

// =====================================================================
// 2. THE GRAND WINDOW (x40-112) — three cusped lights + rose, voussoirs
// =====================================================================
// GRAND WINDOW as plate tracery: pierced openings in the wall itself —
// spandrels stay masonry, so no blank plate/pediment read.
// vistas: three tall pointed lights (deep cusped heads)
const lights=[[46,63,54],[67,85,76],[89,107,98]];
for(const [x0,x1,cx] of lights){
  for(let x=x0;x<=x1;x++){
    const top=Math.min(42,31+Math.abs(x-cx));
    vistaCol(x,top,66);
  }
}
// rose window (full circular crop, r=10)
for(let x=66;x<=86;x++){
  const dx=x-76; const s=Math.floor(Math.sqrt(Math.max(0,100-dx*dx)));
  if(s>0) vistaCol(x,21-s,21+s);
}
// two trefoil oculi (r=5)
for(const cx of [55,97]){
  for(let x=cx-5;x<=cx+5;x++){
    const dx=x-cx; const s=Math.floor(Math.sqrt(Math.max(0,25-dx*dx)));
    if(s>0) vistaCol(x,30-s,30+s);
  }
}
// tracery: mullions with cusped heads
vln(64,33,34,'q'); vln(65,33,34,'r'); vln(66,33,34,'p');
vln(86,33,34,'q'); vln(87,33,34,'r'); vln(88,33,34,'p');
for(const [x0,x1,cx] of lights){ pset(cx,30,'q'); pset(cx-1,31,'q'); pset(cx+1,31,'q'); pset(cx,29,'r'); }
// rose ring (2px) + petal spokes + hub
for(let x=65;x<=87;x++){ const dx=x-76; const s=Math.sqrt(Math.max(0,121-dx*dx));
  if(s>0){ pset(x,21-Math.round(s),'q'); pset(x,21+Math.round(s),'q');
    const s2=Math.sqrt(Math.max(0,100-dx*dx));
    pset(x,21-Math.round(s2)-0,'q'); pset(x,21+Math.round(s2),'q'); } }
// petal spokes: STONE-DARK against the bright sky so the tracery reads
[[76,13],[76,29],[68,21],[84,21],[71,16],[81,16],[71,26],[81,26]].forEach(([x,y])=>{
  pset(x,y,'p'); pset(x+(x<76?1:x>76?-1:0), y+(y<21?1:y>21?-1:0), 'b');
});
rect(75,20,3,3,'p'); pset(76,21,'b');
// diagonal petal studs complete the 8-fold rosette
[[71,17],[81,17],[71,25],[81,25],[74,15],[78,15],[74,27],[78,27]].forEach(([x,y])=>pset(x,y,'p'));
// trefoil rings (stone-dark inner ring)
for(const cx of [55,97]){ for(let x=cx-6;x<=cx+6;x++){ const dx=x-cx; const s=Math.sqrt(Math.max(0,36-dx*dx));
  if(s>=0){ pset(x,30-Math.round(s),'q'); pset(x,30+Math.round(s),'q'); }
  const s2=Math.sqrt(Math.max(0,20-dx*dx));
  if(s2>0&&Math.abs(dx)<=4){ pset(x,30-Math.round(s2),'p'); pset(x,30+Math.round(s2),'p'); } } }
// pointed outer arch: 3px stone band hugging the opening, radiating joints
for(let i=0;i<=36;i++){
  const yL=34-Math.round(i*27/36);
  const xL=40+i, xR=112-i;
  pset(xL,yL,'q'); pset(xL,yL-1,'d'); pset(xL,yL-2,'d'); pset(xL,yL-3,'b');
  pset(xR,yL,'q'); pset(xR,yL-1,'d'); pset(xR,yL-2,'d'); pset(xR,yL-3,'b');
  if(i%6===3){ pset(xL,yL-4,'b'); pset(xR,yL-4,'b'); }
}
pset(76,6,'r'); pset(76,5,'q'); pset(75,6,'d'); pset(77,6,'d'); // apex cross-stub
// jambs (deep reveal: shadow left, lit right)
rect(40,34,5,33,'q'); vln(45,36,31,'b'); vln(40,34,33,'d');
rect(108,34,5,33,'q'); vln(108,36,31,'r'); vln(112,34,33,'d');
// sill ledge + moss + stain
rect(38,67,78,4,'q'); hln(38,67,78,'r'); hln(38,71,78,'b');
[[48,66,'v'],[49,66,'v'],[50,66,'g'],[73,66,'g'],[74,66,'v'],[99,66,'v'],[100,66,'g'],[99,67,'g']].forEach(([x,y,k])=>pset(x,y,k));
vln(70,72,5,'b'); vln(71,74,4,'b');
// potted plant on the sill (right side, asymmetric)
rect(101,61,6,6,'N'); hln(101,61,6,'n'); hln(102,66,4,'D');
[[103,56,'g'],[104,55,'v'],[102,57,'g'],[105,57,'v'],[104,58,'g'],[106,58,'y'],[103,53,'y'],[105,54,'g']].forEach(([x,y,k])=>pset(x,y,k));

// =====================================================================
// 3. NARROW LANCET SLIT (x14-24) — unique second window
// =====================================================================
for(let x=15;x<=23;x++){ const top=20+Math.abs(x-19); vistaCol(x,top,56); }
for(let i=0;i<=5;i++){ pset(14+i,25-i,'q'); pset(24-i,25-i,'q'); }
vln(14,25,32,'q'); vln(24,25,32,'q');
vln(15,26,30,'b');
rect(13,57,13,3,'q'); hln(13,57,13,'r');
pset(16,56,'v'); pset(17,56,'g');
vln(17,60,6,'b'); pset(18,63,'b');

// =====================================================================
// 4. PIER 1 (x118-150): engaged column, banner w/ unique crest, torch
// =====================================================================
rect(118,8,32,86,'c');
// rounded engaged shaft (tonal cylinder)
vln(127,12,80,'b'); rect(128,12,2,80,'c'); rect(130,12,3,80,'d'); rect(133,12,3,80,'e');
rect(136,12,2,80,'d'); rect(138,12,2,80,'c'); vln(140,12,80,'b');
// capital + volutes + chip
rect(116,30,36,6,'q'); hln(116,30,36,'r'); hln(116,35,36,'b');
pset(118,32,'p'); pset(149,32,'p'); pset(117,31,'p'); pset(150,31,'p');
rect(116,30,3,2,'b'); pset(116,32,'a');
// base
rect(116,84,36,6,'q'); hln(116,84,36,'r'); hln(116,89,36,'b');
// banner: rod, cloth, chevron crest, three uneven tails
hln(120,37,28,'O');
rect(122,38,24,36,'s'); vln(122,38,36,'R'); vln(145,38,36,'T');
for(let i=0;i<=8;i++){ const yy=54-(i<4?i:8-i); pset(129+i,yy,'O'); pset(129+i,yy+1,'O'); }
rect(132,44,4,4,'x'); pset(133,45,'s'); pset(134,45,'s');
rect(122,74,8,6,'s'); hln(122,79,8,'O');
rect(132,74,6,4,'s'); hln(132,77,6,'O');
rect(140,74,6,7,'s'); hln(140,80,6,'O');
// torch bracket on the right face
rect(146,56,4,3,'n'); pset(149,55,'n');
rect(146,50,3,5,'F'); pset(147,48,'L'); pset(147,49,'L');
// moss at base (right side only)
[[142,88,'g'],[143,87,'g'],[144,88,'v'],[145,88,'g'],[146,89,'g']].forEach(([x,y,k])=>pset(x,y,k));

// =====================================================================
// 5. OPEN DOUBLE ARCADE (x150-214): two DIFFERENT round arches, terrace
// =====================================================================
// vistas through both arches (different heights/widths)
for(let x=154;x<=182;x++){ const dx=(x-168)/14; const top=30-Math.round(10*Math.sqrt(Math.max(0,1-dx*dx))); vistaCol(x,top,73); }
for(let x=188;x<=210;x++){ const dx=(x-199)/11; const top=33-Math.round(8*Math.sqrt(Math.max(0,1-dx*dx))); vistaCol(x,top,73); }
// arch rings + voussoir joints
for(let x=153;x<=183;x++){ const dx=(x-168)/15; const s=Math.sqrt(Math.max(0,1-dx*dx));
  const yy=30-Math.round(11*s); pset(x,yy,'q'); pset(x,yy-1,'d'); if(x%6===0) pset(x,yy-2,'b'); }
for(let x=187;x<=211;x++){ const dx=(x-199)/12; const s=Math.sqrt(Math.max(0,1-dx*dx));
  const yy=33-Math.round(9*s); pset(x,yy,'q'); pset(x,yy-1,'q'); pset(x,yy-2,'d'); if(x%5===0) pset(x,yy-3,'b'); }
// slender center colonnette with entasis + capital/base
rect(183,28,4,46,'q'); vln(183,28,46,'p'); vln(186,28,46,'p'); pset(182,50,'q'); pset(187,50,'q');
rect(181,24,8,4,'r'); hln(181,27,8,'b');
rect(181,70,8,4,'r'); hln(181,70,8,'p');
// outer arcade jambs
vln(150,20,74,'d'); vln(151,20,74,'q'); vln(213,24,70,'q'); vln(214,24,70,'d');
// quatrefoil relief above the right arch (unique ornament)
rect(194,13,10,8,'c');
[[196,14],[200,14],[196,18],[200,18]].forEach(([cx,cy])=>{ pset(cx,cy,'b'); pset(cx+1,cy,'b'); pset(cx,cy+1,'b'); pset(cx+1,cy+1,'b'); });
for(let x=194;x<=203;x++){ pset(x,12,'q'); pset(x,21,'q'); } vln(193,13,8,'q'); vln(204,13,8,'q');
// balustrade: rail, turned balusters (uneven spacing), one broken stub
rect(150,74,64,2,'r'); hln(150,76,64,'q');
rect(150,86,64,3,'q'); hln(150,86,64,'p'); hln(150,88,64,'b');
rect(150,77,64,9,'b');
const bal=[154,160,167,173,181,189,202,208];
bal.forEach(bx=>{ rect(bx,77,2,9,'q'); pset(bx-1,80,'b')||0; pset(bx,80,'p'); pset(bx+1,81,'p'); });
rect(196,82,2,4,'q'); pset(196,81,'p'); pset(197,80,'g'); // broken baluster + moss tuft

// =====================================================================
// 6. IRON CHANDELIER over the arcade (one candle unlit)
// =====================================================================
for(let y=0;y<14;y++) pset(177+(y%2),y,'D');
hln(171,14,15,'D'); rect(170,15,17,2,'n'); hln(171,17,15,'D');
[[170,1],[175,1],[181,1],[186,0]].forEach(([cx,lit])=>{
  rect(cx,11,2,3,'r');
  if(lit){ pset(cx,9,'F'); pset(cx+1,9,'F'); pset(cx,8,'L'); }
  else { pset(cx,10,'n'); }
});
pset(176,18,'r');

// =====================================================================
// 7. PIER 2 (x214-240): statue niche + descending vine (no banner)
// =====================================================================
rect(214,8,26,86,'c'); vln(214,8,86,'d');
rect(212,28,30,5,'q'); hln(212,28,30,'r'); hln(212,32,30,'b');
// arched niche
for(let x=220;x<=234;x++){ const dx=(x-227)/7; const top=40-Math.round(6*Math.sqrt(Math.max(0,1-dx*dx)));
  for(let y=top;y<=62;y++) pset(x,y,'b'); pset(x,top,'q'); }
rect(220,34,15,3,'b');
// statue: robed figure on plinth
rect(222,57,11,4,'q'); hln(222,57,11,'r');
rect(226,38,3,3,'r'); pset(225,39,'p');
rect(223,41,9,3,'q');
for(let y=44;y<=56;y++){ const w2=9-Math.floor((y-44)/4); rect(227-Math.floor(w2/2),y,w2,1,y%7===0?'p':'q'); }
vln(230,44,10,'p');
// vine (right edge, different rhythm from the left ivy)
for(let y=30;y<=72;y++){ const wob=Math.round(Math.sin(y*0.23)*2); pset(236+wob,y,'g'); }
[[237,38,'v'],[238,38,'v'],[237,39,'v'],[235,50,'V'],[236,50,'V'],[236,63,'v'],[237,63,'g'],[237,64,'v']].forEach(([x,y,k])=>pset(x,y,k));

// =====================================================================
// 8. THRONE APSE (x240-320): curved recess, oculus beam, ornate throne
// =====================================================================
// curved apse crown + recess
for(let x=248;x<=312;x++){
  const dx=(x-280)/32; const s=Math.sqrt(Math.max(0,1-dx*dx));
  const top=24-Math.round(16*s);
  pset(x,top,'d'); pset(x,top+1,'d'); pset(x,top+2,'q');
  for(let y=top+3;y<=93;y++) pset(x,y,'b');
  if(x%7===0) pset(x,top-1,'b');
}
rect(268,26,24,34,'a');
// oculus with sky + ring
for(let x=276;x<=284;x++){ const dx=x-280; const s=Math.floor(Math.sqrt(Math.max(0,16-dx*dx)));
  if(s>0) for(let y=13-s;y<=13+s;y++) pset(x,y,y<12?'j':'k'); }
for(let x=275;x<=285;x++){ const dx=x-280; const s=Math.sqrt(Math.max(0,25-dx*dx));
  pset(x,13-Math.round(s),'q'); pset(x,13+Math.round(s),'q'); }
// dais: three steps, carved rosettes, uneven wear + chips
rect(254,78,52,6,'q'); hln(254,78,52,'r'); hln(270,78,20,'q');
rect(248,84,64,5,'q'); hln(248,84,64,'r'); hln(268,84,24,'q');
rect(242,89,76,5,'q'); hln(242,89,76,'r'); hln(266,89,28,'q');
hln(254,83,52,'b'); hln(248,88,64,'b');
[[252,91],[279,91],[301,91]].forEach(([x,y])=>{ pset(x,y,'O'); pset(x+1,y,'O'); pset(x,y+1,'O'); pset(x+1,y+1,'O'); });
pset(254,78,'b'); pset(310,84,'b'); pset(243,89,'b');
// carpet strip climbing the dais
rect(272,78,16,16,'s'); vln(272,78,16,'o'); vln(287,78,16,'o');
hln(272,78,16,'S'); hln(272,84,16,'S'); hln(272,89,16,'S');
// ---- the throne (curved gothic back, crown, finial, drape) ----
const hw=(yy)=> yy<32?4 : yy<40?8 : yy<50?13 : yy<60?17 : 22;
for(let y=26;y<=77;y++){ const h2=hw(y); rect(280-h2,y,h2*2,1,'n'); pset(280-h2,y,'D'); pset(280+h2-1,y,'D'); }
for(let y=40;y<=74;y++){ const h2=hw(y); pset(280-h2+1,y,'o'); pset(280+h2-2,y,'o'); }
// finial: stem, gold orb, prongs
rect(279,22,3,4,'n');
rect(277,16,7,6,'x'); hln(278,15,5,'O'); pset(280,17,'X'); hln(277,21,7,'O');
pset(274,19,'O'); pset(275,18,'O'); pset(286,19,'O'); pset(285,18,'O');
// crown cornice + rubies + pinnacle posts
rect(262,38,37,5,'O'); hln(262,38,37,'x');
[[267,40],[279,40],[291,40]].forEach(([x,y])=>{ rect(x,y,2,2,'S'); });
pset(280,36,'X'); pset(279,36,'X');
rect(262,43,4,31,'q'); rect(295,43,4,31,'q');
hln(262,43,4,'r'); hln(295,43,4,'r');
pset(263,41,'x'); pset(297,41,'x');
// pierced trefoils in the upper back
[[272,48],[288,48]].forEach(([cx,cy])=>{ pset(cx,cy,'D'); pset(cx-1,cy+1,'D'); pset(cx+1,cy+1,'D'); pset(cx,cy+2,'a'); });
// quilted crimson inner panel (hand-placed diamond studs, not scattered noise)
rect(266,46,28,18,'s');
[[270,49],[278,49],[286,49],[274,54],[282,54],[270,59],[278,59],[286,59]].forEach(([x,y])=>{ pset(x,y,'R'); pset(x+1,y,'R'); });
// seat cushion + piping
rect(260,63,41,6,'S'); hln(260,63,41,'x'); hln(260,68,41,'R');
// scrolled armrests + claw legs
rect(252,58,10,3,'N'); rect(298,58,10,3,'N');
[[252,56],[253,55],[254,56],[253,57]].forEach(([x,y])=>pset(x,y,'O'));
[[307,56],[306,55],[305,56],[306,57]].forEach(([x,y])=>pset(x,y,'O'));
rect(253,61,3,14,'N'); rect(304,61,3,14,'N');
rect(252,75,5,3,'O'); rect(303,75,5,3,'O');
pset(252,77,'o'); pset(256,77,'o'); pset(303,77,'o'); pset(307,77,'o');
// royal drape over the LEFT armrest (asymmetric, falls onto the step)
rect(248,54,10,4,'S');
for(let y=58;y<=80;y++){ const w2=8-Math.floor((y-58)/9); rect(248,y,w2,1,(y%6===0)?'R':'s'); }
rect(246,80,10,3,'s'); hln(246,82,10,'R'); pset(247,79,'T'); pset(250,80,'T');
pset(246,83,'x'); pset(247,84,'o');
// tall candelabrum LEFT of dais (three arms, uneven flames)
rect(238,46,3,46,'o'); hln(237,52,5,'O'); hln(237,66,5,'O'); hln(237,80,5,'O');
hln(232,52,6,'o'); hln(241,52,6,'o');
pset(232,51,'O'); pset(246,51,'O');
rect(232,48,2,3,'r'); rect(245,48,2,3,'r'); rect(238,44,3,3,'r');
pset(232,46,'F'); pset(238,41,'F'); pset(239,41,'F'); pset(238,40,'L'); pset(245,46,'F'); pset(245,45,'L');
rect(235,92,9,2,'o'); hln(234,93,11,'O');
// planter bush RIGHT of dais
rect(308,86,11,8,'q'); hln(308,86,11,'r'); hln(309,93,9,'b');
for(let y=74;y<=85;y++) for(let x=307;x<=319;x++){
  const dx=x-313,dy=y-80; if(dx*dx+dy*dy*2<=34) pset(x,y,'G');
}
[[310,77,'v'],[311,77,'v'],[314,79,'v'],[315,80,'v'],[309,82,'v'],[312,75,'g'],[316,83,'g']].forEach(([x,y,k])=>pset(x,y,k));
pset(309,76,'y'); pset(315,74,'y'); pset(305,80,'g');

// =====================================================================
// 9. LEFT IVY CASCADE (four strands, all different lengths/rhythms)
// =====================================================================
const ivy=(x0,len,ph,cl)=>{ for(let i=0;i<len;i++){ const wob=Math.round(Math.sin((i+ph)*0.3)*2); pset(x0+wob,8+i,'g'); }
  cl.forEach(([dy,k,w2])=>{ const wob=Math.round(Math.sin((dy+ph)*0.3)*2); rect(x0+wob-1,8+dy,w2,2,k); }); };
ivy(4,36,0,[[6,'v',2],[19,'y',3],[30,'g',2]]);
ivy(11,50,2,[[12,'g',3],[25,'v',2],[41,'v',3]]);
ivy(19,22,5,[[16,'y',2]]);
ivy(27,42,1,[[8,'v',2],[33,'g',3]]);

// =====================================================================
// 10. FLOOR + CARPET (irregular joints, medallion, fringe)
// =====================================================================
rect(0,94,W,41,'u'); hln(0,94,W,'r');
[22,61,88,132,171,220,262,297].forEach(x=>vln(x,95,5,'U'));
hln(0,101,W,'U');
[[130,96],[131,97],[133,97],[134,98]].forEach(([x,y])=>pset(x,y,'U')); pset(132,95,'g');
// carpet to the dais
rect(0,96,252,12,'s');
hln(0,96,252,'R'); hln(0,107,252,'R'); hln(0,98,252,'o'); hln(0,105,252,'o');
[10,34,57,82,105,130,152,176].forEach((x,i)=>{ const up=i%2===0;
  pset(x,up?101:102,'O'); pset(x+1,up?100:103,'O'); pset(x+2,up?101:102,'O'); });
// medallion (woven emblem before the dais)
rect(184,97,32,10,'S'); hln(184,97,32,'O'); hln(184,106,32,'O'); vln(184,97,10,'O'); vln(215,97,10,'O');
[[198,100],[199,99],[200,100],[199,101]].forEach(([x,y])=>pset(x,y,'x'));
pset(190,101,'o'); pset(208,101,'o'); pset(199,98,'o'); pset(199,103,'o');
// fringe at the carpet end
for(let y=97;y<=106;y+=2) pset(252,y,'O');

// =====================================================================
// 11. LIGHT (overlay prims only — art stays flat/crisp underneath)
// =====================================================================
ov(58,12,54,26,PAL.j,0.08); ov(72,38,58,30,PAL.j,0.06); ov(90,68,58,26,PAL.j,0.045);
ov(96,95,66,5,PAL.j,0.05);
ov(72,32,10,60,PAL.j,0.09);                       // rose god-ray
ov(158,30,48,44,PAL.j,0.05); ov(176,74,42,18,PAL.j,0.04);
ov(275,17,10,20,PAL.j,0.07); ov(272,37,14,22,PAL.j,0.05); ov(266,59,28,6,PAL.j,0.045); // oculus beam, stepped + soft
[[70,30],[84,52],[104,74],[128,60],[166,44],[190,60],[282,40]].forEach(([x,y])=>ov(x,y,1,1,PAL.w,0.5));
ov(0,0,10,135,PAL.a,0.25); ov(310,0,10,135,PAL.a,0.25); ov(0,128,W,7,PAL.a,0.25);
ov(0,116,W,19,PAL.a,0.3);

// =====================================================================
// PNG preview (blend overlays + stamp fighters for the mock)
// =====================================================================
// diagnostic: report any non-palette keys, then treat them as background
{ const bad={}; for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const k=grid[y][x];
    if(k!=='.'&&!(k in PAL)){ (bad[String(k)]=bad[String(k)]||[]).push(x+','+y); grid[y][x]='.'; } }
  for(const k in bad) console.log('BAD KEY',JSON.stringify(k),'at',bad[k].slice(0,6).join(' '),'count',bad[k].length);
}
const hex2rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const rgb=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>{
  const k=grid[y][x]; return k==='.'?[43,36,28]:hex2rgb(PAL[k]);
}));
for(const o of overlays){ const src=hex2rgb(o.hex);
  for(let y=o.y;y<o.y+o.h;y++) for(let x=o.x;x<o.x+o.w;x++){
    if(x<0||x>=W||y<0||y>=H) continue; const d=rgb[y][x];
    rgb[y][x]=[Math.round(d[0]*(1-o.a)+src[0]*o.a),Math.round(d[1]*(1-o.a)+src[1]*o.a),Math.round(d[2]*(1-o.a)+src[2]*o.a)];
  } }
const BOSS_PAL={'0':'#08080c','1':'#12121a','2':'#1c1d28','3':'#2a2c3a','4':'#3d4052','5':'#565c74','a':'#6e0f1c','b':'#a8182a','c':'#e0263a','d':'#ff5a4a','g':'#3a1014','h':'#571820'};
const HERO_PAL={'0':'#10141e','1':'#2e3444','2':'#4a5468','3':'#7c88a0','4':'#aeb9cc','5':'#e2e8f2','n':'#141c30','m':'#1c2438','l':'#7fd4ff','L':'#b8ecff','g':'#c9962e'};
function stampRGB(file,pal,ox,oy){ const rows=fs.readFileSync(__dirname+'/'+file,'utf8').replace(/\r/g,'').split('\n').filter(r=>r.length);
  rows.forEach((r,y)=>[...r].forEach((ch,x)=>{ if(ch!=='.'&&pal[ch]&&oy+y<H&&ox+x<W) rgb[oy+y][ox+x]=hex2rgb(pal[ch]); })); }
try{ stampRGB('../First-Boss/tools/redesign/hero_matrix.txt',HERO_PAL,46,70); }catch(e){ try{ stampRGB('hero_matrix.txt',HERO_PAL,46,70);}catch(e2){} }
try{ stampRGB('../First-Boss/tools/redesign/boss_matrix.txt',BOSS_PAL,186,46); }catch(e){ try{ stampRGB('boss_matrix.txt',BOSS_PAL,186,46);}catch(e2){} }

function crc32(buf){let t=[];for(let n2=0;n2<256;n2++){let cc=n2;for(let k2=0;k2<8;k2++)cc=cc&1?0xEDB88320^(cc>>>1):cc>>>1;t[n2]=cc>>>0;}
  let crc=0xFFFFFFFF;for(const b of buf)crc=t[(crc^b)&0xFF]^(crc>>>8);return(crc^0xFFFFFFFF)>>>0;}
function chunk(ty,data){const t=Buffer.from(ty,'ascii');const l=Buffer.alloc(4);l.writeUInt32BE(data.length);
  const cbuf=Buffer.alloc(4);cbuf.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([l,t,data,cbuf]);}
const IW=W*SCALE, IH=H*SCALE, raw=Buffer.alloc(IH*(1+IW*4));
for(let y=0;y<IH;y++){ const ro=y*(1+IW*4); raw[ro]=0;
  for(let x=0;x<IW;x++){ const cpx=rgb[(y/SCALE)|0][(x/SCALE)|0]; const off=ro+1+x*4;
    raw[off]=cpx[0]; raw[off+1]=cpx[1]; raw[off+2]=cpx[2]; raw[off+3]=255; } }
const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(IW,0); ihdr.writeUInt32BE(IH,4); ihdr[8]=8; ihdr[9]=6;
fs.writeFileSync(__dirname+'/env3_v4.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// =====================================================================
// SVG export: 2D-greedy merged rects from the flat grid + overlay list
// =====================================================================
(function(){
  const used=Array.from({length:H},()=>Array(W).fill(false));
  const rects=[];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(used[y][x]) continue; const k=grid[y][x]; if(k==='.'){used[y][x]=true;continue;}
    let w2=1; while(x+w2<W && !used[y][x+w2] && grid[y][x+w2]===k) w2++;
    let h2=1;
    outer: while(y+h2<H){ for(let xx=x;xx<x+w2;xx++) if(used[y+h2][xx]||grid[y+h2][xx]!==k) break outer; h2++; }
    for(let yy=y;yy<y+h2;yy++) for(let xx=x;xx<x+w2;xx++) used[yy][xx]=true;
    rects.push([x,y,w2,h2,k]);
  }
  const byColor={};
  rects.forEach(([x,y,w2,h2,k])=>{ (byColor[k]=byColor[k]||[]).push(`<rect x="${x}" y="${y}" width="${w2}" height="${h2}"/>`); });
  let svg=''; for(const k in byColor) svg+=`<g fill="${PAL[k]}">`+byColor[k].join('')+'</g>';
  let ovs=''; for(const o of overlays) ovs+=`<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="${o.hex}" fill-opacity="${o.a}"/>`;
  fs.writeFileSync(__dirname+'/env3_rects.svg.txt',svg);
  fs.writeFileSync(__dirname+'/env3_overlays.svg.txt',ovs);
  console.log('rects:',rects.length,'svg chars:',svg.length,'| overlays:',overlays.length);
})();
console.log('wrote env3_v4.png',IW,'x',IH);
