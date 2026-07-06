// Throne room "The Sundered Court" — MAJOR REDESIGN (v2 family).
// Grid: 240x135 (16:9). Floor top row 94 (70% horizon). Warm daylight hall:
// monumental tracery window, open arcade with landscape view, aged stone,
// ivy/moss/planters, ornate gothic throne. Records prims for SVG emission.
const fs = require('fs');
const zlib = require('zlib');

const W = 240, H = 135, SCALE = 4;

const G = Array.from({length:H},()=>Array(W).fill(null));
const prims = [];
const hex2rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
function paint(x,y,w,h,hex,a=1){
  prims.push({x,y,w,h,hex,a});
  const src=hex2rgb(hex);
  for(let yy=y;yy<y+h;yy++){
    if(yy<0||yy>=H)continue;
    for(let xx=x;xx<x+w;xx++){
      if(xx<0||xx>=W)continue;
      const dst=G[yy][xx]||[0x6b,0x5c,0x48];
      G[yy][xx]=a>=1?src.slice():[
        Math.round(dst[0]*(1-a)+src[0]*a),
        Math.round(dst[1]*(1-a)+src[1]*a),
        Math.round(dst[2]*(1-a)+src[2]*a)];
    }
  }
}

// ---- palette: warm aged stone, bright sky, living green ----
const S0='#2e2620',S1='#4a3f33',S2='#6b5c48',S3='#8d7b60',S4='#b3a184',S5='#d8c9a8';
const K1='#6fb7e8',K2='#a8d8f5',K3='#e8f4fc';
const M1='#8fa5c4',M2='#6d87ab';
const V1='#2e5c34',V2='#4a8248',V3='#6fa85c';
const R0='#5c1616',R1='#8a2020',R2='#b03030';
const Gd0='#8a6420',Gd1='#c99b3a',Gd2='#ecc95e';
const T1='#40301f',T2='#59422b';
const F1='#4e463a',F0='#332c24';
const FL='#e8873a',FL2='#ffd27a';
const LT='#fdf6e3';

// ============ WALL BASE + big soft tonal variation ============
paint(0,0,240,135,S2,1);
paint(0,8,30,86,S2,1);
paint(6,20,18,30,S3,0.25);
paint(160,8,80,40,S3,0.2);
paint(80,50,60,20,S1,0.15);

// ============ CEILING BAND + corbels ============
paint(0,0,240,7,S0,1);
paint(0,7,240,1,S4,1);
paint(0,8,240,1,S1,1);
for(let x=12;x<240;x+=24){ paint(x,9,4,3,S3,1); paint(x+1,12,2,1,S1,1); }

// ============ MONUMENTAL TRACERY WINDOW (x30-78, rows 10-70) ============
// stone surround
paint(30,10,48,60,S3,1);
paint(30,10,48,2,S4,1);
// pointed opening (stepped apex) filled with sky
paint(50,12,8,2,K3,1);
paint(46,14,16,2,K3,1);
paint(42,16,24,2,K2,1);
paint(38,18,32,4,K2,1);
paint(34,22,40,26,K2,1);
paint(34,40,40,8,K1,1);
// clouds
paint(40,26,10,2,K3,1); paint(58,32,12,2,K3,1); paint(46,36,8,2,K3,1);
// far mountains + near ridge
paint(34,44,40,6,M1,1);
paint(36,42,10,2,M1,1); paint(56,42,12,2,M1,1);
paint(34,50,40,4,M2,1);
paint(44,48,8,2,M2,1);
// treeline
paint(34,54,40,8,V1,1);
paint(36,52,6,2,V1,1); paint(48,52,8,2,V1,1); paint(62,52,6,2,V1,1);
paint(38,55,4,2,V2,1); paint(52,56,6,2,V2,1); paint(64,55,3,2,V2,1);
// meadow at sill
paint(34,62,40,4,V2,1); paint(34,62,40,1,V3,1);
// birds
paint(45,27,2,1,M2,1); paint(52,25,2,1,M2,1);
// mullions + transoms (center mullion runs to the apex)
paint(53,14,3,52,S3,1);
paint(42,26,2,40,S2,1);
paint(65,26,2,40,S2,1);
paint(34,40,40,1,S3,1);
paint(34,41,40,1,S2,1);
// frame inner shadow
paint(33,22,1,44,S1,1); paint(75,22,1,44,S1,1);
// sill
paint(30,66,48,4,S3,1); paint(30,66,48,1,S4,1); paint(29,70,50,2,S1,1);
// moss on the sill
paint(36,65,4,1,V2,1); paint(58,65,3,1,V2,1); paint(70,66,2,1,V1,1);

// ============ PIER A (x78-100): aged masonry, banner, vine ============
paint(78,8,22,86,S3,1);
paint(78,8,2,86,S4,1);
paint(98,8,2,86,S1,1);
paint(77,8,24,6,S4,1); paint(77,13,24,1,S1,1);
paint(77,88,24,6,S4,1); paint(77,88,24,1,S5,1);
// coursing + varied stones
paint(79,26,20,1,S1,0.6); paint(79,40,20,1,S1,0.6); paint(79,54,20,1,S1,0.6); paint(79,68,20,1,S1,0.6);
paint(80,28,6,4,S2,1); paint(90,42,7,4,S2,1); paint(82,56,5,4,S2,1); paint(91,70,6,4,S2,1);
// crack + chipped corner
paint(93,30,1,2,S0,1); paint(92,32,1,2,S0,1); paint(93,34,1,2,S0,1);
paint(77,14,2,2,S1,1);
// moss at the base
paint(79,86,4,2,V1,1); paint(81,84,3,2,V2,1); paint(96,90,3,2,V1,1);
// vine from the capital
paint(97,14,1,6,V1,1); paint(96,20,1,6,V1,1); paint(97,26,1,8,V1,1);
paint(95,18,2,2,V3,1); paint(96,30,2,2,V2,1);
// banner (forked tail, gold fringe)
paint(82,15,14,2,Gd1,1);
paint(83,17,12,30,R1,1);
paint(83,17,1,30,R0,1);
paint(86,26,6,6,Gd1,1); paint(88,28,2,2,R2,1);
paint(83,47,4,4,R1,1); paint(91,47,4,4,R1,1);
paint(83,50,4,1,Gd1,1); paint(91,50,4,1,Gd1,1); paint(87,46,4,1,Gd1,1);
// bracket torch
paint(96,44,3,2,S1,1);
paint(96,40,3,4,FL,1); paint(97,38,1,3,FL2,1);
paint(90,34,14,14,FL,0.07);

// ============ OPEN ARCADE (x100-148): view to the outside world ============
paint(100,12,48,80,S3,1);
// pointed opening
paint(120,14,8,2,K3,1);
paint(114,16,20,2,K2,1);
paint(108,18,32,2,K2,1);
paint(104,20,40,56,K2,1);
paint(104,44,40,10,K1,1);
// clouds
paint(112,26,12,2,K3,1); paint(128,34,10,2,K3,1);
// mountains
paint(104,50,40,6,M1,1); paint(112,48,10,2,M1,1);
paint(104,54,40,5,M2,1); paint(126,52,9,2,M2,1);
// near tree canopy (closer, lusher than the window's)
paint(104,58,40,18,V1,1);
paint(106,56,10,2,V1,1); paint(122,55,12,3,V1,1); paint(136,57,8,2,V1,1);
paint(108,60,8,3,V2,1); paint(124,58,9,3,V2,1); paint(134,64,7,3,V2,1);
paint(112,58,4,2,V3,1); paint(128,57,4,2,V3,1);
// arch molding (double order)
paint(104,20,1,56,S1,1); paint(143,20,1,56,S1,1);
paint(105,20,1,52,S2,1); paint(142,20,1,52,S2,1);
// balustrade
paint(100,76,48,2,S4,1);
for(let x=104;x<=140;x+=6){ paint(x,78,2,8,S3,1); }
paint(100,86,48,3,S2,1); paint(100,86,48,1,S3,1);
paint(100,89,48,3,S3,1);
// moss on the rail
paint(110,75,4,1,V2,1); paint(130,75,3,1,V2,1);

// ============ PIER B (x148-166): aged masonry, short banner ============
paint(148,8,18,86,S3,1);
paint(148,8,2,86,S4,1);
paint(164,8,2,86,S1,1);
paint(147,8,20,6,S4,1); paint(147,13,20,1,S1,1);
paint(147,88,20,6,S4,1); paint(147,88,20,1,S5,1);
paint(149,30,16,1,S1,0.6); paint(149,46,16,1,S1,0.6); paint(149,62,16,1,S1,0.6);
paint(151,33,6,4,S2,1); paint(157,49,6,4,S2,1);
paint(153,64,1,2,S0,1); paint(154,66,1,2,S0,1);
paint(162,86,3,2,V1,1); paint(149,84,3,2,V2,1);
paint(151,15,12,2,Gd1,1);
paint(152,17,10,22,R1,1);
paint(152,17,1,22,R0,1);
paint(154,24,6,5,Gd1,1); paint(156,26,2,2,R2,1);
paint(152,39,3,3,R1,1); paint(159,39,3,3,R1,1);
paint(152,41,3,1,Gd1,1); paint(159,41,3,1,Gd1,1);

// ============ THRONE DAIS (stage right, steps + carpet) ============
paint(170,76,54,4,S3,1); paint(170,76,54,1,S4,1);
paint(164,80,66,5,S3,1); paint(164,80,66,1,S4,1);
paint(158,85,78,5,S3,1); paint(158,85,78,1,S4,1);
paint(152,90,88,4,S3,1); paint(152,90,88,1,S4,1);
// worn nosings + moss
paint(176,76,3,1,S1,1); paint(214,80,3,1,S1,1); paint(160,85,2,1,S1,1);
paint(156,89,2,1,V2,1); paint(231,88,3,1,V2,1);
// carpet climbing the steps
paint(188,76,18,4,R1,1); paint(188,80,18,5,R1,1); paint(188,85,18,5,R2,1); paint(188,90,18,4,R2,1);
paint(188,76,1,18,Gd0,1); paint(205,76,1,18,Gd0,1);

// ============ APSE RECESS: shadowed arch framing the throne ============
paint(188,20,18,4,S1,1);
paint(184,24,26,4,S1,1);
paint(180,28,34,48,S1,1);
paint(181,29,32,1,S0,1);
paint(181,29,1,47,S0,1); paint(212,29,1,47,S0,1);

// ============ THE THRONE: gothic, crowned, scrolled (center x197) ============
// tall back: tapering panels
paint(186,54,22,12,T1,1);
paint(188,42,18,12,T1,1);
paint(190,32,14,10,T1,1);
// finial spire + orb
paint(194,26,6,6,T1,1);
paint(195,22,4,4,Gd2,1); paint(195,22,4,1,Gd1,1);
paint(196,20,2,2,Gd1,1);
// gold crown cornice with jewels (flush with the back)
paint(188,38,18,4,Gd1,1);
paint(188,38,18,1,Gd2,1);
paint(191,39,2,2,R2,1); paint(196,39,2,2,R2,1); paint(201,39,2,2,R2,1);
// carved side pinnacles with pointed tips
paint(184,42,4,14,S2,1); paint(184,40,4,2,Gd1,1); paint(185,38,2,2,Gd1,1); paint(185,36,2,2,Gd2,1);
paint(206,42,4,14,S2,1); paint(206,40,4,2,Gd1,1); paint(207,38,2,2,Gd1,1); paint(207,36,2,2,Gd2,1);
// inner upholstered panel with gold border
paint(190,44,14,18,Gd0,1);
paint(191,45,12,16,R1,1);
paint(193,48,8,1,R0,1); paint(193,52,8,1,R0,1); paint(193,56,8,1,R0,1);
// seat cushion + rail
paint(188,62,18,6,R2,1); paint(188,62,18,1,R1,1);
paint(188,68,18,1,Gd0,1);
// scrolled armrests + supports
paint(178,60,8,2,Gd1,1); paint(178,62,8,4,T2,1); paint(178,61,2,2,Gd1,1);
paint(208,60,8,2,Gd1,1); paint(208,62,8,4,T2,1); paint(214,61,2,2,Gd1,1);
paint(180,66,4,10,T1,1); paint(210,66,4,10,T1,1);
// plinth
paint(182,70,30,6,S3,1); paint(182,70,30,1,S4,1); paint(182,75,30,1,S1,1);

// ============ BRAZIERS on the platform ============
function brazier(x){
  paint(x-7,50,18,16,FL,0.07);
  paint(x-2,62,8,3,Gd1,1); paint(x-2,62,8,1,Gd2,1);
  paint(x+1,65,2,9,Gd0,1);
  paint(x-1,74,6,2,Gd0,1);
  paint(x,56,4,6,FL,1); paint(x+1,53,2,4,FL2,1);
}
brazier(172);
brazier(218);

// ============ PLANTERS with greenery flanking the throne ============
function planter(x){
  paint(x,79,10,6,S3,1); paint(x,79,10,1,S4,1); paint(x+1,84,8,1,S1,1);
  paint(x+1,70,8,9,V1,1);
  paint(x,73,2,4,V1,1); paint(x+8,72,2,5,V1,1);
  paint(x+2,71,4,3,V2,1); paint(x+5,74,3,3,V2,1);
  paint(x+3,72,2,2,V3,1);
}
planter(154);
planter(228);

// ============ IVY on the left wall ============
paint(6,10,1,8,V1,1); paint(5,18,1,8,V1,1); paint(6,26,1,10,V1,1); paint(5,36,1,8,V1,1);
paint(12,10,1,10,V1,1); paint(13,20,1,10,V1,1); paint(12,30,1,8,V1,1);
paint(19,10,1,6,V1,1); paint(18,16,1,8,V1,1);
paint(4,16,3,2,V2,1); paint(11,22,3,2,V2,1); paint(5,32,2,2,V3,1);
paint(12,14,2,2,V3,1); paint(17,18,3,2,V2,1); paint(11,36,2,2,V2,1);
paint(3,24,4,3,V2,1); paint(10,42,3,3,V1,1); paint(16,26,2,3,V2,1);
paint(6,44,2,2,V3,1); paint(14,40,3,2,V2,1);
paint(30,12,2,6,V1,1); paint(29,18,2,3,V2,1); paint(31,22,2,3,V1,1);

// ============ GAMEPLAY-LANE GROUNDING SHADOW ============
paint(0,88,240,6,S0,0.12);

// ============ FLOOR ============
paint(0,94,240,41,F1,1);
paint(0,94,240,1,S4,1);
for(let x=20;x<240;x+=32){ paint(x,95,1,5,F0,1); }
paint(0,101,240,1,F0,0.4);
// floor crack + moss tufts
paint(60,96,2,1,S0,1); paint(62,97,2,1,S0,1); paint(63,98,1,1,V2,1);
paint(130,95,1,2,S0,1); paint(129,97,1,1,V2,1);
// carpet runner to the dais
paint(0,96,152,11,R1,1);
paint(0,96,152,1,R0,1); paint(0,106,152,1,R0,1);
paint(0,97,152,1,Gd0,1); paint(0,105,152,1,Gd0,1);
for(let x=12;x<148;x+=32){ paint(x,100,3,3,Gd1,1); paint(x+1,101,1,1,R1,1); }
// depth darkening
paint(0,118,240,17,'#241d18',0.35);
paint(0,128,240,7,'#241d18',0.3);

// ============ WARM DAYLIGHT SHAFTS (falling toward the throne) ============
paint(44,14,40,26,LT,0.09);
paint(58,40,40,30,LT,0.07);
paint(72,70,40,26,LT,0.05);
paint(74,96,44,6,LT,0.06);
paint(112,20,40,30,LT,0.07);
paint(124,50,40,40,LT,0.05);
paint(130,96,38,5,LT,0.05);
// dust motes
[[52,30],[62,48],[74,66],[88,84],[120,36],[132,58],[144,76],[100,52]].forEach(([x,y])=>paint(x,y,1,1,LT,0.5));

// ============ SOFT VIGNETTE (daylight room: gentle) ============
paint(0,0,8,135,S0,0.25);
paint(232,0,8,135,S0,0.25);
paint(0,130,240,5,S0,0.25);

// ============ STAMP CHARACTERS (PNG preview only) ============
const BOSS_PAL={'0':'#08080c','1':'#12121a','2':'#1c1d28','3':'#2a2c3a','4':'#3d4052','5':'#565c74',
'a':'#6e0f1c','b':'#a8182a','c':'#e0263a','d':'#ff5a4a','g':'#3a1014','h':'#571820'};
const HERO_PAL={'0':'#10141e','1':'#2e3444','2':'#4a5468','3':'#7c88a0','4':'#aeb9cc','5':'#e2e8f2',
'n':'#141c30','m':'#1c2438','l':'#7fd4ff','L':'#b8ecff','g':'#c9962e'};
function stamp(file,pal,ox,oy){
  const rows=fs.readFileSync(__dirname+'/'+file,'utf8').split('\n');
  rows.forEach((r,y)=>{ [...r].forEach((k,x)=>{ if(k!=='.'&&pal[k]) {
    const c=hex2rgb(pal[k]); if(oy+y>=0&&oy+y<H&&ox+x>=0&&ox+x<W) G[oy+y][ox+x]=c;
  }});});
}
stamp('hero_matrix.txt',HERO_PAL,24,70);
stamp('boss_matrix.txt',BOSS_PAL,96,46);

// ============ PNG writer ============
function crc32(buf){let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}
  let crc=0xFFFFFFFF;for(const b of buf)crc=t[(crc^b)&0xFF]^(crc>>>8);return(crc^0xFFFFFFFF)>>>0;}
function chunk(type,data){const t=Buffer.from(type,'ascii');const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
const IW=W*SCALE, IH=H*SCALE;
const raw=Buffer.alloc(IH*(1+IW*4));
for(let y=0;y<IH;y++){
  const row=y*(1+IW*4); raw[row]=0;
  for(let x=0;x<IW;x++){
    const c=G[Math.floor(y/SCALE)][Math.floor(x/SCALE)]||[0x6b,0x5c,0x48];
    const o=row+1+x*4;
    raw[o]=c[0];raw[o+1]=c[1];raw[o+2]=c[2];raw[o+3]=255;
  }
}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(IW,0);ihdr.writeUInt32BE(IH,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
fs.writeFileSync(__dirname+'/env2_v3.png',png);

let svg='';
for(const p of prims){
  svg+=`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.hex}"${p.a<1?` fill-opacity="${p.a}"`:''}/>`;
}
fs.writeFileSync(__dirname+'/env2_prims.svg.txt',svg);
console.log('wrote env2_v3.png',IW,'x',IH,'prims:',prims.length,'svg chars:',svg.length);
