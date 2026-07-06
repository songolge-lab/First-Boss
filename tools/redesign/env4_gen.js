// "The Midnight Court" — env4, NIGHT redesign of the throne hall.
// One bespoke hand-composed 320x135 pixel tableau, floor at row 94.
// New in env4 vs env3:
//   * night panorama (moon seen through the rose window, stars, dark ridges
//     with moonlit rims, lit windows in the distant keep, fireflies)
//   * a quantized warm-light field: every stone pixel resolves cool /
//     torch-warmed / flame-hot from hand-placed light sources, so interior
//     lighting is selective and continuous — never tiled
//   * dthrone-inspired throne: black + gold silhouette, crown crest, red
//     center drape, scrolled arms, spreading cloth skirt, claw feet
//   * environmental storytelling: torn banner, faded pennant, carpet holes /
//     wear / fray, repaired wall patch, put-log holes, mason's mark, cobweb,
//     leaning shield + spear, guttered candle, owl on the balustrade
// True pixel art: flat palette in the grid; glows/shafts/vignette are
// separate overlay prims so the art stays crisp.
const fs = require('fs');
const zlib = require('zlib');

const W = 320, H = 135, SCALE = 4;
const OUT = 'env4_v3';

const PAL = {
  // night sky (top -> horizon glow)
  A:'#081020', B:'#0d1730', C:'#142344', Q:'#1d3054',
  // stars / moon
  W:'#dfe7f4', w:'#7d89a4', U:'#efe9d3', u:'#c9c3a8',
  // panorama silhouettes
  V:'#16223f', Y:'#31456e',            // far ridge + moonlit rim
  v:'#101a33', H:'#0c1526',            // near ridge, hills
  T:'#0c1a16', t:'#16302a',            // trees, moonlit tree tops
  G:'#0d1d14', y:'#14291c',            // meadow dark/lit
  K:'#141d33', k:'#0d1425',            // distant keep, keep roof
  // stone — cool night ramp (j = joint)
  j:'#141219', a:'#211f27', b:'#2d2b35', c:'#3a3743', d:'#484450', e:'#575263',
  // stone — torch-warmed ramp (J = warm joint)
  J:'#241a12', f:'#332a22', g:'#443830', h:'#56463a', i:'#685646',
  // stone — flame-hot ramp
  n:'#4a3828', l:'#61492f', m:'#7a5c3a', p:'#8f6c44',
  // moonlit floor pool
  '&':'#3d4557', '*':'#4c576e',
  // gold
  o:'#6e4d17', O:'#a67b26', x:'#d9ab3f', X:'#f6dc82',
  // crimson + faded cloth
  R:'#3c0a12', r:'#5c1119', S:'#7e1e2b', s:'#9c2e3c', q:'#7b4e55',
  // throne blacks
  '!':'#0c0b10', '@':'#16151c', '#':'#201f28', '$':'#2b2a36',
  // wood / iron
  D:'#17110b', E:'#2a1e12', N:'#3f2f1c', '6':'#20242e', '7':'#343a48',
  // marble (statue)
  '(':'#4f4f60', M:'#6b6b7c', ')':'#8a8a9c',
  // night greens (ivy / moss / bush)
  '{':'#132218', '}':'#1b3122', '~':'#27442f',
  // flame + smoke
  Z:'#a84e1c', F:'#e8873a', L:'#ffd27a', z:'#3a3a46',
};

const grid = Array.from({length:H},()=>Array(W).fill('.'));
const overlays = [];   // {x,y,w,h,hex,a}
const pset=(x,y,k2)=>{ if(x>=0&&x<W&&y>=0&&y<H) grid[y][x]=k2; };
const rect=(x,y,w2,h2,k2)=>{ for(let yy=y;yy<y+h2;yy++) for(let xx=x;xx<x+w2;xx++) pset(xx,yy,k2); };
const hln=(x,y,w2,k2)=>rect(x,y,w2,1,k2);
const vln=(x,y,h2,k2)=>rect(x,y,1,h2,k2);
const ov=(x,y,w2,h2,hex,a2)=>overlays.push({x,y,w:w2,h:h2,hex,a:a2});
const hash=(x,y)=>{ const n2=Math.sin(x*127.1+y*311.7)*43758.5453; return n2-Math.floor(n2); };

// =====================================================================
// WARM LIGHT FIELD — hand-placed flame sources; 2px-quantized falloff
// =====================================================================
const SRC = [
  {x:148,y:51,r:30,i:1.00},                    // pier torch
  {x:172,y:9,r:16,i:0.75},{x:178,y:8,r:16,i:0.75},{x:189,y:9,r:14,i:0.7}, // corona candles
  {x:226,y:58,r:13,i:0.75},                    // shrine candles
  {x:229,y:42,r:24,i:0.95},{x:235,y:38,r:26,i:1.0},{x:243,y:42,r:24,i:0.95}, // candelabrum L
  {x:306,y:56,r:18,i:0.8},{x:314,y:54,r:20,i:0.85},                          // candelabrum R
];
const warm = new Float32Array(W*H);
for(let y=0;y<H;y++) for(let x=0;x<W;x++){
  const qx=x&~1, qy=y&~1; let mx=0;
  for(const s2 of SRC){ const d2=Math.hypot(qx-s2.x,(qy-s2.y)*1.35)/s2.r; const val=s2.i*(1-d2); if(val>mx)mx=val; }
  warm[y*W+x]=mx;
}
const RAMP = {
  cool:{0:'j',1:'a',2:'b',3:'c',4:'d',5:'e'},
  w1:  {0:'J',1:'f',2:'g',3:'h',4:'i',5:'i'},
  w2:  {0:'J',1:'n',2:'l',3:'m',4:'p',5:'p'},
};
function stone(x,y,v){
  const wv = (x>=0&&x<W&&y>=0&&y<H) ? warm[y*W+x] : 0;
  const fam = wv>0.5?'w2': wv>0.24?'w1':'cool';
  pset(x,y,RAMP[fam][v]);
}

// =====================================================================
// NIGHT PANORAMA (continuous world; openings crop it)
// =====================================================================
function interp(pts){
  const arr=new Array(W);
  for(let i2=0;i2<pts.length-1;i2++){
    const [x0,y0]=pts[i2],[x1,y1]=pts[i2+1];
    for(let x=x0;x<=x1&&x<W;x++) arr[x]=Math.round(y0+(y1-y0)*(x-x0)/(x1-x0));
  }
  return arr;
}
const ridge1=interp([[0,50],[24,45],[46,49],[72,42],[98,48],[126,44],[152,50],[178,43],[206,49],[232,45],[260,50],[288,44],[319,49]]);
const ridge2=interp([[0,57],[30,53],[62,58],[92,52],[128,57],[160,53],[196,58],[228,54],[262,58],[296,53],[319,57]]);
const hillY =interp([[0,63],[36,60],[76,64],[118,60],[158,63],[198,60],[238,64],[278,61],[319,63]]);
const treeTop=new Array(W).fill(66);
[[10,7,3],[33,9,4],[57,6,2],[81,9,5],[102,7,3],[124,10,4],[150,8,3],[176,9,4],[199,6,2],[227,10,5],[252,7,3],[277,9,4],[300,8,3]]
  .forEach(([cx,r2,hgt])=>{ for(let x=cx-r2;x<=cx+r2;x++){ if(x<0||x>=W)continue;
    const t2=1-Math.abs(x-cx)/r2; const yT=66-Math.round(hgt*Math.sqrt(Math.max(0,t2)));
    if(yT<treeTop[x]) treeTop[x]=yT; }});
// hand-placed stars ([x,y,bright]) and night cloud bands
const STARS=[[8,10,1],[22,16,0],[30,7,1],[48,12,0],[60,9,1],[70,14,0],[88,8,1],[100,16,0],
  [112,11,0],[160,8,1],[170,14,0],[181,10,1],[196,7,0],[204,13,0],[254,9,1],[268,15,0],[300,8,1],[310,12,0],[282,10,1],
  [163,22,0],[196,24,1],[57,25,0]];
const starSet=new Map(STARS.map(([x,y,b2])=>[x+','+y,b2]));
const CLOUDS=[[18,13,26],[148,18,30],[244,11,22]];
// moon disc: r 4.6 at (78,17) — floats inside the rose window
const MOON={cx:78,cy:17,r:4.6};

function vistaCol(x,yTop,yBot){
  for(let y=yTop;y<=yBot;y++){
    let k2;
    if(y<ridge1[x]){
      k2 = y<16?'A':(y<30?'B':(y<42?'C':'Q'));
      for(const [cx2,cy2,cw2] of CLOUDS)
        if(x>=cx2&&x<cx2+cw2&&(y===cy2||y===cy2+1)&&y<ridge1[x]-2) k2=(y===cy2)?'V':'v';
      const md=Math.hypot(x-MOON.cx,y-MOON.cy);
      if(md<=MOON.r){
        k2 = (md>MOON.r-1.1 && (x-MOON.cx<0||y-MOON.cy>1))?'u':'U';      // shaded lower-left limb
        if((x===77&&y===18)||(x===80&&y===16)) k2='u';                    // two craters
      }
      const st=starSet.get(x+','+y);
      if(st!==undefined && md>MOON.r+2) k2 = st? 'W':'w';
    }
    else if(y<ridge2[x]) k2 = (y===ridge1[x] && ((x>52&&x<100)||(x>182&&x<210)))?'Y':'V';
    else if(y<hillY[x])  k2='v';
    else if(y<treeTop[x])k2='H';
    else if(y<66)        k2 = (y===treeTop[x] && hash(x,5)>0.55)?'t':'T';
    else if(y===66)      k2='y';
    else                 k2='G';
    pset(x,y,k2);
  }
  // moon glitter on the meadow (only under the moon side)
  if(x>=60&&x<=100&&(x%9===2)&&68>=yTop&&68<=yBot) pset(x,68,'y');
  // cypress on the terrace (arcade-left view)
  if(x>=157&&x<=165){
    const t2=1-Math.abs(x-161)/5;
    if(t2>0){ const top=42+Math.round((1-t2)*9);
      for(let y=Math.max(top,yTop);y<=Math.min(71,yBot);y++) pset(x,y,'T'); }
    if(x===161) for(let y=Math.max(66,yTop);y<=Math.min(72,yBot);y++) pset(x,y,'k');
  }
  // distant keep silhouette with two lit windows (arcade-right view)
  if(x>=196&&x<=208){
    for(let y=Math.max(47,yTop);y<=Math.min(64,yBot);y++) pset(x,y,'K');
    const roofTop=41+Math.abs(x-202);
    for(let y=Math.max(roofTop,yTop);y<=Math.min(46,yBot);y++) if(Math.abs(x-202)<=(46-y)) pset(x,y,'k');
    if(x===200&&53>=yTop&&53<=yBot) pset(x,53,'F');
    if(x===202&&38>=yTop&&38<=yBot){ pset(x,38,'r'); pset(x,37,'r'); }
  }
  // fireflies over the terrace
  for(const [fx,fy] of [[167,63],[174,60],[203,62]])
    if(x===fx&&fy>=yTop&&fy<=yBot) pset(x,fy,'L');
}

// =====================================================================
// 1. CEILING + WALL FIELD (irregular masonry through the light field)
// =====================================================================
for(let y=8;y<=93;y++) for(let x=0;x<W;x++) stone(x,y,2);
for(let x=0;x<W;x++) stone(x,8,1);                       // shadow under cornice
rect(0,0,W,6,'a'); hln(0,0,W,'j');
for(let x=0;x<W;x++){ stone(x,6,4); stone(x,7,1); }      // cornice edge
[[20,0],[54,1],[92,0],[138,1],[186,0],[234,1],[280,0],[306,0]].forEach(([x,o2])=>{
  stone(x,8,3); stone(x+1,8,3); stone(x+2,8,3); stone(x+1,9,3); stone(x+1,10,1);
  if(o2) stone(x+2,8,4);
});
// masonry: 8 courses, hashed head joints, per-stone tonal treatment
const courses=[17,27,36,46,55,65,74,83];
courses.forEach(cy=>{ for(let x=0;x<W;x++) stone(x,cy,0); });
courses.forEach((cy,i2)=>{
  const next=i2+1<courses.length?courses[i2+1]:93;
  let x=Math.floor(hash(i2,13)*14);
  while(x<W){
    const nx=x+12+Math.floor(hash(x,i2*3)*15);
    for(let y=cy+1;y<next;y++) stone(x,y,0);
    const hv=hash(x,cy);
    if(hv>0.82) for(let y=cy+1;y<next;y++) for(let xx=x+1;xx<Math.min(nx,W);xx++) stone(xx,y,3);
    else if(hv<0.10) for(let y=cy+1;y<next;y++) for(let xx=x+1;xx<Math.min(nx,W);xx++) stone(xx,y,1);
    if(hash(x*7,cy)>0.55) for(let xx=x+1;xx<Math.min(nx,W);xx++) stone(xx,cy+1,hv>0.82?4:3);
    x=nx;
  }
});
// baseboard
for(let x=0;x<W;x++){ stone(x,90,4); stone(x,91,3); stone(x,92,2); stone(x,93,1); }
// --- hand-placed wall storytelling ---
// repaired patch (newer, paler stones + mortar outline)
rect(24,72,14,9,'c'); hln(24,72,14,'d'); vln(24,72,9,'d'); vln(37,72,9,'a'); hln(24,80,14,'a');
vln(30,73,7,'a'); hln(25,76,12,'a');
// two put-log holes (old scaffolding sockets)
rect(58,40,3,3,'j'); hln(58,39,3,'c'); rect(206,30,3,3,'j'); hln(206,29,3,'c');
// mason's mark carved on one stone
pset(130,68,'a'); pset(131,69,'a'); pset(132,68,'a'); pset(131,70,'a');
// three unique cracks
[[26,20],[27,21],[27,22],[26,23],[25,24],[27,24],[28,25],[28,26]].forEach(([x,y])=>pset(x,y,'j'));
[[115,50],[115,51],[116,52],[116,53],[115,54],[115,55],[116,56],[117,57],[117,58]].forEach(([x,y])=>pset(x,y,'j'));
[[242,66],[243,67],[244,67],[245,68],[246,70],[245,71]].forEach(([x,y])=>pset(x,y,'j'));
// chipped cornice corners
pset(311,6,'a'); pset(312,6,'a'); pset(312,7,'j'); pset(2,6,'a'); pset(3,7,'j');
// moss patches (two, night-toned)
[[100,89,'{'],[101,88,'}'],[102,89,'{'],[101,90,'{']].forEach(([x,y,k2])=>pset(x,y,k2));
[[210,90,'{'],[211,89,'}'],[212,90,'{'],[213,91,'{']].forEach(([x,y,k2])=>pset(x,y,k2));
// two old iron banner hooks (their banners long gone)
pset(8,30,'7'); pset(8,31,'6'); pset(34,30,'7'); pset(34,31,'6');

// =====================================================================
// 2. NARROW LANCET SLIT (x14-24) + relieving arch + cobweb
// =====================================================================
for(let x=15;x<=23;x++){ const top=20+Math.abs(x-19); vistaCol(x,top,56); }
for(let i2=0;i2<=5;i2++){ stone(14+i2,25-i2,4); stone(24-i2,25-i2,4); }
for(let y=25;y<=56;y++){ stone(14,y,4); stone(24,y,4); }
vln(15,26,30,'a');
// relieving arch over the lancet
for(let i2=0;i2<=7;i2++){ stone(12+i2,16-Math.round(i2*0.6),3); stone(26-i2,16-Math.round(i2*0.6),3); }
stone(19,11,3); stone(18,11,3); stone(20,12,3);
// sill
for(let x=13;x<=25;x++){ stone(x,57,4); stone(x,58,3); } stone(13,59,1); stone(25,59,1);
pset(16,56,'}'); pset(17,56,'{');
// cobweb in the reveal corner
pset(16,21,'w'); pset(17,22,'w'); pset(18,21,'w'); pset(16,23,'w'); pset(15,21,'w');

// =====================================================================
// 3. SMALL FADED PENNANT (between lancet and grand window)
// =====================================================================
hln(28,12,8,'O'); pset(27,12,'x'); pset(36,12,'x');
rect(29,13,6,10,'q'); vln(29,13,10,'r');
rect(30,23,4,4,'q');
pset(30,27,'q'); pset(31,28,'q'); pset(33,27,'q');       // swallowtail points
pset(32,17,'x'); pset(31,17,'o');                        // worn roundel
pset(33,20,'r'); pset(30,21,'r');                        // stains

// =====================================================================
// 4. THE GRAND WINDOW (x40-112): moon in the rose, nested orders
// =====================================================================
const lights=[[46,63,54],[67,85,76],[89,107,98]];
for(const [x0,x1,cx2] of lights){
  for(let x=x0;x<=x1;x++){ const top=Math.min(42,31+Math.abs(x-cx2)); vistaCol(x,top,66); }
}
for(let x=66;x<=86;x++){ const dx=x-76; const s2=Math.floor(Math.sqrt(Math.max(0,100-dx*dx)));
  if(s2>0) vistaCol(x,21-s2,21+s2); }
for(const cx2 of [55,97]){
  for(let x=cx2-5;x<=cx2+5;x++){ const dx=x-cx2; const s2=Math.floor(Math.sqrt(Math.max(0,25-dx*dx)));
    if(s2>0) vistaCol(x,30-s2,30+s2); }
}
// mullions (cool pale stone against night sky)
vln(64,33,34,'c'); vln(65,33,34,'e'); vln(66,33,34,'b');
vln(86,33,34,'c'); vln(87,33,34,'e'); vln(88,33,34,'b');
for(const [x0,x1,cx2] of lights){ pset(cx2,30,'d'); pset(cx2-1,31,'c'); pset(cx2+1,31,'c'); pset(cx2,29,'e');
  pset(cx2-3,34,'c'); pset(cx2+3,34,'c'); }              // cusp nubs
// rose ring (2px) + short cusp nubs on the inner edge — the moon floats
// free in the middle so its disc silhouettes cleanly
for(let x=65;x<=87;x++){ const dx=x-76; const s2=Math.sqrt(Math.max(0,121-dx*dx));
  if(s2>0){ pset(x,21-Math.round(s2),'c'); pset(x,21+Math.round(s2),'c');
    const s3=Math.sqrt(Math.max(0,100-dx*dx));
    pset(x,21-Math.round(s3),'d'); pset(x,21+Math.round(s3),'d'); } }
[[76,13],[76,29],[68,21],[84,21],[70,15],[82,15],[70,27],[82,27]].forEach(([x,y])=>pset(x,y,'b'));
// trefoil rings
for(const cx2 of [55,97]){ for(let x=cx2-6;x<=cx2+6;x++){ const dx=x-cx2; const s2=Math.sqrt(Math.max(0,36-dx*dx));
  if(s2>=0){ pset(x,30-Math.round(s2),'c'); pset(x,30+Math.round(s2),'c'); }
  const s3=Math.sqrt(Math.max(0,20-dx*dx));
  if(s3>0&&Math.abs(dx)<=4){ pset(x,30-Math.round(s3),'b'); pset(x,30+Math.round(s3),'b'); } } }
// pointed outer arch — TWO nested orders + radiating joints
for(let i2=0;i2<=36;i2++){
  const yL=34-Math.round(i2*27/36);
  const xL=40+i2, xR=112-i2;
  pset(xL,yL,'d'); pset(xL,yL-1,'c'); pset(xL,yL-2,'d'); pset(xL,yL-3,'b');
  pset(xR,yL,'d'); pset(xR,yL-1,'c'); pset(xR,yL-2,'d'); pset(xR,yL-3,'b');
  if(i2%6===3){ pset(xL,yL-4,'a'); pset(xR,yL-4,'a'); pset(xL,yL-2,'a'); pset(xR,yL-2,'a'); }
}
pset(76,5,'e'); pset(76,4,'d'); pset(75,5,'c'); pset(77,5,'c');
// jambs with carved capitals
rect(40,34,5,33,'c'); vln(45,36,31,'a'); vln(40,34,33,'d');
rect(108,34,5,33,'c'); vln(108,36,31,'e'); vln(112,34,33,'d');
rect(39,32,7,3,'d'); hln(39,32,7,'e'); pset(39,34,'b'); pset(45,34,'b');
rect(107,32,7,3,'d'); hln(107,32,7,'e'); pset(107,34,'b'); pset(113,34,'b');
// sill + moss + dead leaf + potted plant (night-toned)
for(let x=38;x<=115;x++){ stone(x,67,5); stone(x,68,4); stone(x,69,3); stone(x,70,1); }
[[50,66,'}'],[51,66,'{'],[74,66,'{'],[75,66,'}'],[98,66,'}'],[99,66,'{'],[98,67,'{']].forEach(([x,y,k2])=>pset(x,y,k2));
pset(58,66,'J');                                         // one dead leaf
vln(70,71,4,'a'); vln(71,73,3,'a');                      // sill stain
rect(101,61,6,6,'E'); hln(101,61,6,'N'); hln(102,66,4,'D');
[[103,56,'{'],[104,55,'}'],[102,57,'{'],[105,57,'}'],[104,58,'{'],[106,58,'~'],[103,53,'~'],[105,54,'{']].forEach(([x,y,k2])=>pset(x,y,k2));

// =====================================================================
// 5. PIER 1 (x118-150): column, AGED banner, torch + smoke, shield+spear
// =====================================================================
for(let y=8;y<=93;y++){ // engaged shaft re-lit through the field
  stone(127,y,1); stone(128,y,2); stone(129,y,2); stone(130,y,3); stone(131,y,3);
  stone(132,y,4); stone(133,y,4); stone(134,y,4); stone(135,y,3);
  stone(136,y,3); stone(137,y,2); stone(138,y,2); stone(139,y,1);
}
for(let x=116;x<=151;x++){ stone(x,30,5); stone(x,31,4); stone(x,32,4); stone(x,33,3); stone(x,34,1); } // capital
pset(117,31,'e'); pset(150,31,'e'); pset(116,30,'a'); pset(116,31,'j');   // capital chip
for(let x=116;x<=151;x++){ stone(x,84,4); stone(x,85,4); stone(x,86,3); stone(x,87,1); } // base
// banner: rod, aged cloth, worn chevron crest, torn hem, hanging thread
hln(120,36,28,'O'); pset(119,36,'x'); pset(148,36,'x');
rect(122,37,24,33,'r'); vln(122,37,33,'R'); vln(145,37,33,'S');
rect(136,54,9,12,'q');                                    // sun-bleached patch
for(let i2=0;i2<=8;i2++){ const yy=50-(i2<4?i2:8-i2);
  if(i2!==2&&i2!==6){ pset(129+i2,yy,'O'); pset(129+i2,yy+1,'O'); } }      // chevron w/ worn gaps
rect(131,42,5,5,'o'); rect(132,43,3,3,'x'); pset(133,44,'S');              // crest roundel
// torn hem: four tails of different lengths + a hole + a thread
rect(122,70,5,7,'r'); hln(122,76,5,'R');
rect(128,70,6,4,'r'); pset(130,71,'b'); pset(131,71,'b'); hln(128,73,6,'R');
rect(135,70,5,6,'q'); hln(135,75,5,'R');
rect(141,70,5,3,'r'); pset(142,73,'r'); pset(144,74,'r');
vln(126,77,4,'R');                                        // hanging thread
// torch bracket + flame + smoke wisps
rect(146,55,4,3,'E'); pset(149,54,'E'); pset(146,58,'D');
pset(147,52,'Z'); rect(146,49,3,4,'F'); pset(147,47,'L'); pset(147,48,'L'); pset(148,48,'L');
pset(146,44,'z'); pset(147,42,'z'); pset(146,40,'z'); pset(147,37,'z');
// leaning round shield + spear at the base (old guard post)
for(let yy=86;yy<=92;yy++) for(let xx=119;xx<=127;xx++){
  const dx=xx-123,dy=yy-89; if(dx*dx+dy*dy<=11){ pset(xx,yy,(dx*dx+dy*dy>=8)?'7':'r'); } }
pset(123,89,'O'); pset(121,91,'6'); pset(122,92,'6');
[[116,79],[117,80],[117,81],[118,82],[118,83],[119,84],[119,85],[120,86],[120,87],[121,88],[121,89],[122,90],[122,91]].forEach(([x,y])=>pset(x,y,'N'));
pset(115,78,'7'); pset(116,77,'e'); pset(116,78,'7');

// =====================================================================
// 6. OPEN DOUBLE ARCADE (x150-214): night terrace, owl, moonlit rail
// =====================================================================
for(let x=154;x<=182;x++){ const dx=(x-168)/14; const top=30-Math.round(10*Math.sqrt(Math.max(0,1-dx*dx))); vistaCol(x,top,73); }
for(let x=188;x<=210;x++){ const dx=(x-199)/11; const top=33-Math.round(8*Math.sqrt(Math.max(0,1-dx*dx))); vistaCol(x,top,73); }
for(let x=153;x<=183;x++){ const dx=(x-168)/15; const s2=Math.sqrt(Math.max(0,1-dx*dx));
  const yy=30-Math.round(11*s2); pset(x,yy,'d'); pset(x,yy-1,'c'); if(x%6===0){ pset(x,yy-2,'a'); pset(x,yy,'b'); } }
for(let x=187;x<=211;x++){ const dx=(x-199)/12; const s2=Math.sqrt(Math.max(0,1-dx*dx));
  const yy=33-Math.round(9*s2); pset(x,yy,'d'); pset(x,yy-1,'d'); pset(x,yy-2,'c'); if(x%5===0) pset(x,yy-3,'a'); }
// colonnette with entasis
rect(183,28,4,46,'c'); vln(183,28,46,'b'); vln(186,28,46,'e'); pset(182,50,'c'); pset(187,50,'c');
rect(181,24,8,4,'d'); hln(181,24,8,'e'); hln(181,27,8,'a');
rect(181,70,8,4,'d'); hln(181,70,8,'e');
vln(150,20,74,'c'); vln(151,20,74,'d'); vln(213,24,70,'d'); vln(214,24,70,'c');
// small round night-oculus above the right arch (another unique opening)
for(let x=196;x<=202;x++){ const dx=x-199; const s2=Math.floor(Math.sqrt(Math.max(0,12.25-dx*dx)));
  if(s2>0) vistaCol(x,16-s2,16+s2); }
for(let x=195;x<=203;x++){ const dx=x-199; const s2=Math.sqrt(Math.max(0,20.25-dx*dx));
  pset(x,16-Math.round(s2),'d'); pset(x,16+Math.round(s2),'c'); }
// balustrade — moonlit top rail, uneven balusters, one broken, an owl
hln(150,74,64,'e'); hln(150,75,64,'d'); hln(150,76,64,'b');
rect(150,77,64,9,'a');
rect(150,86,64,3,'c'); hln(150,86,64,'d'); hln(150,88,64,'a');
[154,160,167,173,181,189,202,208].forEach(bx=>{ rect(bx,77,2,9,'c'); pset(bx,80,'d'); pset(bx+1,81,'b'); });
rect(196,82,2,4,'c'); pset(196,81,'d'); pset(197,80,'{');   // broken stub + moss
// small owl perched at the left rail end
pset(152,70,'6'); pset(154,70,'6');
rect(152,71,3,3,'6'); pset(153,71,'L'); pset(152,73,'7'); pset(154,73,'7');

// =====================================================================
// 7. IRON CORONA CHANDELIER (now LIT; one candle guttered)
// =====================================================================
vln(178,0,7,'6');
[[171,6],[170,7],[169,8],[168,9]].forEach(([x,y])=>pset(x,y,'6'));
[[185,6],[186,7],[187,8],[188,9]].forEach(([x,y])=>pset(x,y,'6'));
hln(166,12,24,'7'); hln(166,13,24,'6'); hln(167,14,22,'7');
pset(166,14,'6'); pset(189,14,'6'); pset(178,15,'7');
// candles: five, uneven heights; the 4th is guttered (ember + smoke)
[[167,3],[172,4],[178,5],[189,3]].forEach(([cx2,h2])=>{
  rect(cx2,12-h2,2,h2,'u');
  pset(cx2,12-h2-1,'F'); pset(cx2+1,12-h2-1,'F'); pset(cx2,12-h2-2,'L');
});
rect(183,10,2,2,'u'); pset(183,9,'Z'); pset(184,7,'z'); pset(183,5,'z');
pset(171,15,'u'); pset(180,15,'u');                       // wax drips

// =====================================================================
// 8. PIER 2 (x214-240): statue niche + votive candles + vine
// =====================================================================
vln(214,8,86,'c');
for(let x=212;x<=242;x++){ stone(x,28,5); stone(x,29,4); stone(x,30,3); stone(x,31,1); }
for(let x=220;x<=234;x++){ const dx=(x-227)/7; const top=40-Math.round(6*Math.sqrt(Math.max(0,1-dx*dx)));
  for(let y=top;y<=62;y++) pset(x,y,'a'); pset(x,top,'d'); }
rect(220,34,15,3,'a');
rect(221,52,13,11,'f');                                   // candle-warmed niche floor
// statue: bowed robed figure (dim marble, candle-lit on its right)
rect(222,57,11,3,'d'); hln(222,57,11,'e');                // plinth
rect(226,40,3,2,'M'); pset(227,39,'M'); pset(228,40,')'); // bowed head
rect(224,43,8,1,'M'); pset(224,43,'(');                   // shoulders
for(let y=44;y<=56;y++){ const w2=8-Math.floor((y-44)/6); rect(227-Math.floor(w2/2),y,w2,1,'M'); }
vln(225,45,11,'('); vln(229,44,12,'(');                   // robe folds
pset(231,47,')'); pset(231,48,')'); pset(230,53,')');     // warm rim from candles
pset(224,48,'M'); pset(223,49,'(');                       // folded arm
// votive candles + melted wax
rect(224,55,1,2,'u'); rect(228,56,1,1,'u');
pset(224,54,'F'); pset(224,53,'L'); pset(228,55,'F'); pset(229,57,'u');
// vine down the pier's right edge
for(let y=30;y<=74;y++){ const wob=Math.round(Math.sin(y*0.22)*2); pset(237+wob,y,'{'); }
[[238,37,'}'],[239,37,'}'],[238,38,'~'],[236,49,'}'],[237,49,'}'],[237,62,'}'],[238,63,'~'],[236,70,'}']].forEach(([x,y,k2])=>pset(x,y,k2));

// =====================================================================
// 9. THRONE APSE (x244-316): crown, keystone, oculus, swag drapes
// =====================================================================
for(let x=246;x<=314;x++){
  const dx=(x-280)/34; const s2=Math.sqrt(Math.max(0,1-dx*dx));
  const top=22-Math.round(17*s2);
  pset(x,top,'d'); pset(x,top+1,'c'); pset(x,top+2,'b');
  pset(x,top+3,'a'); pset(x,top+4,'a');                   // shadow under the crown ring
  for(let y=top+5;y<=93;y++) pset(x,y,'b');               // recess kept a step above black
  if(x%7===0){ pset(x,top,'b'); pset(x,top+1,'a'); }      // radial joints
}
// carved keystone with trefoil
rect(277,3,7,5,'d'); hln(277,3,7,'e'); pset(278,5,'a'); pset(280,4,'a'); pset(282,5,'a'); pset(280,6,'a');
// oculus: night sky + one star + stone ring
for(let x=276;x<=284;x++){ const dx=x-280; const s2=Math.floor(Math.sqrt(Math.max(0,16-dx*dx)));
  if(s2>0) for(let y=12-s2;y<=12+s2;y++) pset(x,y,y<11?'B':'C'); }
pset(282,10,'W'); pset(277,13,'w');
for(let x=275;x<=285;x++){ const dx=x-280; const s2=Math.sqrt(Math.max(0,25-dx*dx));
  pset(x,12-Math.round(s2),'d'); pset(x,12+Math.round(s2),'c'); }
// interior warm wash low in the apse (candelabra reach)
for(let y=56;y<=93;y++) for(let x=248;x<=312;x++){
  if(grid[y][x]!=='b') continue;
  const wv=warm[y*W+x];
  if(wv>0.45) pset(x,y,'g'); else if(wv>0.26) pset(x,y,'f');
}
// ---- swag drapes framing the throne (left long, right short + frayed) ----
for(let t2=0;t2<=1.001;t2+=0.04){
  const sx=Math.round(251-7*t2), sy=Math.round(24+30*t2*t2);
  rect(sx,sy,3,2,'R'); if((Math.round(t2*25)%3)===0) pset(sx+1,sy,'S'); else pset(sx+1,sy,'r');
}
rect(243,54,4,2,'x'); pset(242,55,'O');                   // gold tieback
for(let y=56;y<=75;y++){ const w2=(y<66)?4:3; rect(243,y,w2,1,'R'); if(y%5===0)pset(244,y,'r'); }
pset(244,64,'a'); pset(245,64,'a');                       // tear hole
pset(243,76,'R'); pset(245,76,'R');                       // split hem
for(let t2=0;t2<=1.001;t2+=0.05){
  const sx=Math.round(309+6*t2), sy=Math.round(25+18*t2*t2);
  rect(sx,sy,3,2,'R'); if((Math.round(t2*20)%3)===1) pset(sx+1,sy,'r');
}
rect(313,43,3,2,'x');
for(let y=45;y<=57;y++){ rect(314,y,3,1,'R'); if(y%4===0)pset(315,y,'r'); }
pset(314,58,'R'); pset(316,58,'R'); pset(315,59,'R');     // frayed end

// =====================================================================
// 10. THE THRONE (dthrone-inspired: black+gold, crown crest, red drape)
// =====================================================================
// dais: four steps rising to y76 (tread/face shading via light field)
function step(yT,yF,half){
  for(let x=280-half;x<=280+half;x++){ stone(x,yT,4); stone(x,yT+1,3); }
  for(let y=yF;y<=yF+2&&y<=93;y++) for(let x=280-half;x<=280+half;x++) stone(x,y,(y===yF)?2:1);
}
step(76,78,26); step(81,83,33); step(86,88,39); step(91,92,44);
hln(254,76,53,'i');                                        // top nosing catches candlelight
// step chips + rosettes (one half-worn)
pset(254,76,'a'); pset(306,81,'a'); pset(247,86,'a'); pset(300,91,'j');
[[255,84],[305,84]].forEach(([x,y])=>{ pset(x,y,'O'); pset(x+1,y,'O'); pset(x,y+1,'O'); pset(x+1,y+1,'x'); });
pset(245,89,'O'); pset(246,89,'O');                        // worn rosette (half gone)
// runner up the dais with a traffic-worn center
for(let y=76;y<=93;y++) rect(272,y,18,1,'r');
vln(272,76,18,'o'); vln(289,76,18,'o');
for(let y=78;y<=92;y++) rect(279,y,3,1,'q');               // worn pale center
hln(273,77,16,'S'); hln(273,82,16,'S'); hln(273,87,16,'S');
// ---- throne body ----
const thr=(y,half,k2)=>{ rect(280-half,y,half*2+1,1,k2); };
// finial cross + orb
pset(280,15,'X'); vln(280,16,4,'x'); pset(279,17,'O'); pset(281,17,'O');
hln(277,18,7,'O'); pset(280,18,'X');
rect(278,20,5,3,'x'); pset(280,21,'X'); hln(278,23,5,'o');
// crown band with points and rubies
[[272,2],[276,3],[284,3],[288,2]].forEach(([x,h2])=>{ for(let yy=0;yy<h2;yy++) pset(x,23-yy,yy===h2-1?'X':'O'); });
rect(272,24,17,4,'O'); hln(272,24,17,'x'); hln(273,25,15,'x');
pset(274,26,'S'); pset(279,26,'S'); pset(280,26,'S'); pset(285,26,'S');
pset(274,27,'R'); pset(280,27,'R'); pset(285,27,'R');
thr(28,8,'o');
// head panel -> shoulders -> wings (half-width sculpted by hand);
// gold rim brightens where the candelabra reach (lower rows)
const HWS=[[29,8],[30,9],[31,9],[32,10],[33,10],[34,11],[35,11],[36,12],[37,13],[38,15],[39,16],[40,17],[41,18],[42,18],
  [43,19],[44,19],[45,19],[46,19],[47,19],[48,19],[49,19],[50,19],[51,19],[52,19],
  [53,18],[54,17],[55,16],[56,15],[57,15],[58,14]];
for(const [y,half] of HWS){
  thr(y,half,'@');
  const ek=(y>=42)?'x':'O';
  pset(280-half,y,ek); pset(280+half,y,ek);
  pset(280-half+1,y,(y>=50)?'$':'#'); pset(280+half-1,y,(y>=50)?'$':'#');
}
// wing scroll piercings — true holes: the candle-warmed recess shows through
for(let y=44;y<=48;y++){ rect(266,y,3,1,'f'); rect(292,y,3,1,'f'); pset(265,y,'!'); pset(269,y,'!'); pset(291,y,'!'); pset(295,y,'!'); }
pset(267,44,'g'); pset(293,44,'g');
pset(267,43,'o'); pset(293,43,'o'); pset(267,49,'o'); pset(293,49,'o');
// subtle inner fold lines on the black
vln(273,36,22,'#'); vln(287,36,22,'#'); vln(280,52,7,'!');
// red center drape (crown to seat) + gold fringe
for(let y=29;y<=62;y++){ const w2=(y<34)?3:5; rect(280-w2,y,w2*2+1,1,'R');
  pset(280-w2+1,y,'r'); pset(280+w2-1,y,'r');
  if(y>31&&y<52){ pset(279,y,'S'); pset(280,y,'S'); pset(281,y,'S'); } }
hln(277,63,7,'r');
for(let x=274;x<=286;x+=2) pset(x,64,'x');
// armrests: scrolled volutes, gold caps, shadow line beneath
for(let y=58;y<=66;y++){ rect(258,y,8,1,'@'); rect(294,y,8,1,'@'); }
hln(258,58,8,'x'); hln(294,58,8,'x');
hln(259,59,7,'$'); hln(294,59,7,'$');
rect(257,59,4,4,'O'); pset(258,60,'x'); pset(259,61,'x');
rect(299,59,4,4,'O'); pset(300,60,'x'); pset(301,61,'x');
vln(257,58,9,'O'); vln(302,58,9,'O');
hln(258,67,8,'!'); hln(294,67,8,'!');
// cloth skirt spreading to the dais (folds + worn gold hem)
const SKT=[[59,14],[60,15],[61,16],[62,16],[63,17],[64,18],[65,19],[66,19],[67,20],[68,21],[69,21],[70,22],[71,22],[72,23],[73,23],[74,23],[75,23]];
for(const [y,half] of SKT){
  thr(y,half,'@');
  pset(280-half,y,'x'); pset(280+half,y,'x');
}
[[268,60,15],[276,62,13],[284,61,14],[290,64,11]].forEach(([x,y0,len])=>{ for(let y=y0;y<y0+len&&y<=75;y++) pset(x,y,(y>66)?'$':'#'); });
[[263,62,13],[272,64,11],[287,65,10],[296,66,9]].forEach(([x,y0,len])=>{ for(let y=y0;y<y0+len&&y<=75;y++) pset(x,y,'!'); });
hln(260,75,41,'!');
for(let x=258;x<=302;x++){ if((x>264&&x<268)||(x>287&&x<290)) continue; pset(x,76,'x'); } // worn hem
// claw feet
[[256,74],[301,74]].forEach(([x,y])=>{ rect(x,y,3,2,'O'); pset(x,y+2,'x'); pset(x+2,y+2,'x'); });

// =====================================================================
// 11. CANDELABRA (left tall 3-arm, right short 2-arm) + planter
// =====================================================================
// left — stands between statue pier and dais
rect(230,92,13,2,'o'); hln(229,93,15,'O');
vln(235,44,48,'o'); vln(236,44,48,'O');
[[52,'O'],[66,'O'],[80,'O']].forEach(([y,k2])=>{ hln(234,y,4,k2); });
hln(229,46,7,'o'); hln(236,46,7,'o');
vln(229,44,2,'o'); vln(242,44,2,'o');
rect(228,42,3,2,'x'); rect(241,42,3,2,'x'); rect(234,40,4,2,'x');
pset(229,41,'F'); pset(229,40,'Z'); pset(235,38,'F'); pset(236,38,'F'); pset(235,37,'L'); pset(236,36,'L');
pset(242,41,'F'); pset(242,40,'L');
pset(235,33,'z'); pset(236,31,'z');                       // smoke over the tall flame
// right — different design, one flame dying
rect(306,92,10,2,'o');
vln(310,58,34,'o'); vln(311,58,34,'O');
hln(305,62,6,'o'); hln(311,62,6,'o');
rect(304,60,3,2,'x'); rect(315,60,3,2,'x');
pset(305,58,'F'); pset(305,57,'L'); pset(316,59,'Z'); pset(316,57,'z');
// slim planter at far right edge
rect(315,84,5,10,'E'); hln(315,84,5,'N'); vln(315,84,10,'N');
[[316,80,'{'],[317,78,'}'],[318,80,'{'],[317,82,'~'],[316,76,'{'],[318,76,'{']].forEach(([x,y,k2])=>pset(x,y,k2));

// =====================================================================
// 12. FLOOR: flagstones + moon pools + warm pool + DAMAGED carpet
// =====================================================================
for(let x=0;x<W;x++) stone(x,94,5);                       // moonlit floor crest line
for(let y=95;y<H;y++) for(let x=0;x<W;x++) stone(x,y,1);
// irregular flag joints
[[18,95,7],[52,95,6],[86,95,7],[121,95,6],[158,95,7],[194,95,6],[229,95,7],[267,95,6],[301,95,7]].forEach(([x,y,len])=>{ for(let yy=y;yy<y+len&&yy<H;yy++) stone(x,yy,0); });
[[0,103,34],[34,104,52],[86,103,46],[132,104,40],[172,103,50],[222,104,46],[268,103,52]].forEach(([x,y,len])=>{ for(let xx=x;xx<x+len&&xx<W;xx++) stone(xx,y,0); });
[[36,106,6],[72,105,7],[110,106,6],[147,105,7],[185,106,6],[224,105,7],[262,106,6],[295,105,7]].forEach(([x,y,len])=>{ for(let yy=y;yy<y+len&&yy<H;yy++) stone(x,yy,0); });
// some flags tonally different
[[20,96,30,6],[123,96,33,6],[232,96,33,6]].forEach(([x,y,w2,h2])=>{ for(let yy=y;yy<y+h2;yy++) for(let xx=x;xx<x+w2;xx++) if(grid[yy][xx]==='a') stone(xx,yy,2); });
// moonlight pools on the stone — stepped slanted bands (cast window shapes)
rect(60,108,46,3,'&'); rect(64,111,46,3,'&'); rect(68,114,42,2,'&');
rect(70,109,26,4,'*'); rect(76,113,22,2,'*');
rect(160,108,40,3,'&'); rect(164,111,36,3,'&');
rect(170,109,20,3,'*');
hln(48,95,64,'&'); hln(156,95,52,'&');
// ---- the carpet (x0..246, rows 96-107) with history ----
rect(0,96,247,12,'r');
hln(0,96,247,'R'); hln(0,107,247,'R');
hln(0,98,247,'o'); hln(0,105,247,'o');
// motif lozenges at uneven spacing (some tarnished)
[[14,101,'O'],[42,102,'O'],[71,101,'o'],[103,102,'O'],[131,101,'O'],[166,102,'o'],[224,101,'O']].forEach(([x,y,k2])=>{
  pset(x,y,k2); pset(x+1,y-1,k2); pset(x+2,y,k2); pset(x+1,y+1,k2); });
// moon-bleached faded zone under the arcade
for(let y=96;y<=107;y++) for(let x=140;x<=168;x++){ const k2=grid[y][x]; if(k2==='r')pset(x,y,'q'); else if(k2==='R')pset(x,y,'r'); }
// worn-out hole (floor shows through, frayed edge)
for(let y=100;y<=105;y++) for(let x=87;x<=95;x++){ const dx=(x-91)/4.5,dy=(y-102.5)/3; if(dx*dx+dy*dy<=1) stone(x,y,1); }
[[87,100],[95,101],[86,103],[96,104],[89,99],[93,106]].forEach(([x,y])=>pset(x,y,'R'));
pset(90,101,'r'); pset(92,104,'r');
// diagonal tear
[[226,99],[227,100],[227,101],[228,102],[228,103],[229,104]].forEach(([x,y])=>pset(x,y,'j'));
pset(226,100,'R'); pset(228,101,'R');
// broken hem spots
[[60,96],[61,96],[62,96],[180,107],[181,107],[182,107],[183,107]].forEach(([x,y])=>stone(x,y,1));
// frayed dais end + loose threads
for(let y=96;y<=107;y++){ if(y%3===0){ pset(246,y,'r'); pset(245,y,'R'); } else if(y%3===1){ pset(244,y,'R'); } }
pset(248,100,'R'); pset(249,104,'R'); pset(250,101,'r');
// woven medallion before the dais: double gold frame, eight-point star,
// flanking diamonds — worn through at its lower-left corner
rect(189,97,30,10,'S');
hln(189,97,30,'O'); hln(189,106,30,'O'); vln(189,97,10,'O'); vln(218,97,10,'O');
hln(191,99,26,'o'); hln(191,104,26,'o'); vln(191,99,6,'o'); vln(216,99,6,'o');
rect(203,101,2,2,'X');
[[203,99],[204,99],[203,104],[204,104],[200,101],[200,102],[207,101],[207,102]].forEach(([x,y])=>pset(x,y,'x'));
[[201,100],[206,100],[201,103],[206,103]].forEach(([x,y])=>pset(x,y,'x'));
[[195,101],[196,100],[197,101],[196,102]].forEach(([x,y])=>pset(x,y,'o'));
[[211,101],[212,100],[213,101],[212,102]].forEach(([x,y])=>pset(x,y,'o'));
[[189,104],[189,105],[189,106],[190,106],[191,106],[192,106]].forEach(([x,y])=>pset(x,y,'q'));
for(let y=103;y<=105;y++) for(let x=190;x<=196;x++){ if(grid[y][x]==='S'&&hash(x,y)>0.45) pset(x,y,'q'); }

// =====================================================================
// 13. IVY (three strands from the cornice, all different)
// =====================================================================
const ivy=(x0,len,ph,cl)=>{ for(let i2=0;i2<len;i2++){ const wob=Math.round(Math.sin((i2+ph)*0.3)*2); pset(x0+wob,8+i2,'{'); }
  cl.forEach(([dy,k2,w2])=>{ const wob=Math.round(Math.sin((dy+ph)*0.3)*2); rect(x0+wob-1,8+dy,w2,2,k2); }); };
ivy(4,34,0,[[6,'}',2],[18,'~',3],[28,'{',2]]);
ivy(9,48,2,[[12,'{',3],[26,'}',2],[40,'}',3]]);
ivy(46,18,4,[[10,'}',2]]);

// =====================================================================
// 14. LIGHT OVERLAYS (moon shafts cool, flame glows warm, vignette)
// =====================================================================
const CF='#cfe0f4', WF='#ff9a3a', DK='#0a0912';
// moon halo
ov(71,10,15,15,'#dfe7f4',0.05); ov(74,13,9,9,'#dfe7f4',0.04);
// rose god-ray, slanting to the floor
ov(70,30,13,22,CF,0.06); ov(76,52,15,24,CF,0.05); ov(84,76,19,19,CF,0.045);
ov(80,95,44,9,CF,0.05);
// window + arcade + lancet pools
ov(46,95,66,9,CF,0.05); ov(154,95,58,8,CF,0.04); ov(15,95,11,5,CF,0.05);
ov(58,14,50,24,CF,0.05); ov(158,32,50,40,CF,0.04);
// warm flame glows
ov(140,44,18,17,WF,0.08); ov(144,48,9,9,WF,0.06);
ov(164,3,28,17,WF,0.07);
ov(219,50,15,13,WF,0.07);
ov(226,34,22,19,WF,0.08); ov(230,38,13,11,WF,0.06);
ov(302,48,17,13,WF,0.07);
ov(248,58,64,24,WF,0.05); ov(270,18,21,14,WF,0.05);
// fireflies + guttered wick sparks
ov(174,60,1,1,'#ffd27a',0.4); ov(190,65,1,1,'#ffd27a',0.35);
// vignette (stronger for night; combat band still readable)
ov(0,0,12,135,DK,0.3); ov(308,0,12,135,DK,0.3); ov(0,0,320,9,DK,0.28);
ov(0,116,320,19,DK,0.26); ov(0,128,320,7,DK,0.22);

// =====================================================================
// DIAGNOSTIC + PNG preview (blend overlays; stamp fighters for scale)
// =====================================================================
{ const bad={}; for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const k2=grid[y][x];
    if(k2!=='.'&&!(k2 in PAL)){ (bad[String(k2)]=bad[String(k2)]||[]).push(x+','+y); grid[y][x]='.'; } }
  for(const k2 in bad) console.log('BAD KEY',JSON.stringify(k2),'at',bad[k2].slice(0,6).join(' '),'count',bad[k2].length);
}
const hex2rgb=h2=>[parseInt(h2.slice(1,3),16),parseInt(h2.slice(3,5),16),parseInt(h2.slice(5,7),16)];
const rgb=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>{
  const k2=grid[y][x]; return k2==='.'?[17,15,22]:hex2rgb(PAL[k2]);
}));
for(const o2 of overlays){ const src=hex2rgb(o2.hex);
  for(let y=o2.y;y<o2.y+o2.h;y++) for(let x=o2.x;x<o2.x+o2.w;x++){
    if(x<0||x>=W||y<0||y>=H) continue; const d2=rgb[y][x];
    rgb[y][x]=[Math.round(d2[0]*(1-o2.a)+src[0]*o2.a),Math.round(d2[1]*(1-o2.a)+src[1]*o2.a),Math.round(d2[2]*(1-o2.a)+src[2]*o2.a)];
  } }
const BOSS_PAL={'0':'#08080c','1':'#12121a','2':'#1c1d28','3':'#2a2c3a','4':'#3d4052','5':'#565c74','a':'#6e0f1c','b':'#a8182a','c':'#e0263a','d':'#ff5a4a','g':'#3a1014','h':'#571820'};
const HERO_PAL={'0':'#10141e','1':'#2e3444','2':'#4a5468','3':'#7c88a0','4':'#aeb9cc','5':'#e2e8f2','n':'#141c30','m':'#1c2438','l':'#7fd4ff','L':'#b8ecff','g':'#c9962e'};
function stampRGB(file,pal,ox,oy){ const rows=fs.readFileSync(file,'utf8').replace(/\r/g,'').split('\n').filter(r2=>r2.length);
  rows.forEach((r2,y)=>[...r2].forEach((ch,x)=>{ if(ch!=='.'&&pal[ch]&&oy+y<H&&ox+x<W) rgb[oy+y][ox+x]=hex2rgb(pal[ch]); })); }
try{ stampRGB('C:/Users/berat/First-Boss/tools/redesign/hero_matrix.txt',HERO_PAL,56,70); }catch(e){ console.log('no hero stamp'); }
try{ stampRGB('C:/Users/berat/First-Boss/tools/redesign/boss_matrix.txt',BOSS_PAL,150,46); }catch(e){ console.log('no boss stamp'); }

function crc32(buf){let t2=[];for(let n3=0;n3<256;n3++){let cc=n3;for(let k3=0;k3<8;k3++)cc=cc&1?0xEDB88320^(cc>>>1):cc>>>1;t2[n3]=cc>>>0;}
  let crc=0xFFFFFFFF;for(const b2 of buf)crc=t2[(crc^b2)&0xFF]^(crc>>>8);return(crc^0xFFFFFFFF)>>>0;}
function chunk(ty,data){const t2=Buffer.from(ty,'ascii');const l2=Buffer.alloc(4);l2.writeUInt32BE(data.length);
  const cbuf=Buffer.alloc(4);cbuf.writeUInt32BE(crc32(Buffer.concat([t2,data])));return Buffer.concat([l2,t2,data,cbuf]);}
const IW=W*SCALE, IH=H*SCALE, raw=Buffer.alloc(IH*(1+IW*4));
for(let y=0;y<IH;y++){ const ro=y*(1+IW*4); raw[ro]=0;
  for(let x=0;x<IW;x++){ const cpx=rgb[(y/SCALE)|0][(x/SCALE)|0]; const off=ro+1+x*4;
    raw[off]=cpx[0]; raw[off+1]=cpx[1]; raw[off+2]=cpx[2]; raw[off+3]=255; } }
const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(IW,0); ihdr.writeUInt32BE(IH,4); ihdr[8]=8; ihdr[9]=6;
fs.writeFileSync(__dirname+'/'+OUT+'.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// =====================================================================
// SVG export: greedy-merged rects -> per-color compressed paths (split a/b)
// =====================================================================
(function(){
  const used=Array.from({length:H},()=>Array(W).fill(false));
  const rects=[];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(used[y][x]) continue; const k2=grid[y][x]; if(k2==='.'){used[y][x]=true;continue;}
    let w2=1; while(x+w2<W && !used[y][x+w2] && grid[y][x+w2]===k2) w2++;
    let h2=1;
    outer: while(y+h2<H){ for(let xx=x;xx<x+w2;xx++) if(used[y+h2][xx]||grid[y+h2][xx]!==k2) break outer; h2++; }
    for(let yy=y;yy<y+h2;yy++) for(let xx=x;xx<x+w2;xx++) used[yy][xx]=true;
    rects.push([x,y,w2,h2,k2]);
  }
  const byColor={};
  rects.forEach(([x,y,w2,h2,k2])=>{ (byColor[k2]=byColor[k2]||[]).push(`M${x} ${y}h${w2}v${h2}h-${w2}z`); });
  const groups=[];
  for(const k2 in byColor) groups.push(`<path fill="${PAL[k2]}" d="${byColor[k2].join('')}"/>`);
  let aTxt='', bTxt='', total=groups.reduce((s2,g2)=>s2+g2.length,0);
  let acc=0;
  for(const g2 of groups){ if(acc<total/2){ aTxt+=g2; acc+=g2.length; } else bTxt+=g2; }
  let ovs=''; for(const o2 of overlays) ovs+=`<rect x="${o2.x}" y="${o2.y}" width="${o2.w}" height="${o2.h}" fill="${o2.hex}" fill-opacity="${o2.a}"/>`;
  fs.writeFileSync(__dirname+'/env4_paths_a.txt',aTxt);
  fs.writeFileSync(__dirname+'/env4_paths_b.txt',bTxt);
  fs.writeFileSync(__dirname+'/env4_overlays.txt',ovs);
  console.log('rects:',rects.length,'| paths total:',total,'chars (a:',aTxt.length,'b:',bTxt.length,') | overlays:',overlays.length);
})();
console.log('wrote '+OUT+'.png',IW,'x',IH);
