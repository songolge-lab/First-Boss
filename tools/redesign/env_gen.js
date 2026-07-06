// Throne room "The Sundered Court" pixel arena generator.
// Grid: 192x108 (16:9). Floor top at row 76 (70% horizon, matches camera).
// Records paint primitives so the same scene can be emitted as SVG rects.
const fs = require('fs');
const zlib = require('zlib');

const W = 192, H = 108, SCALE = 5;

// grid of [r,g,b] (null = unpainted -> falls back to W2 wall)
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
      const dst=G[yy][xx]||[0x32,0x2b,0x40];
      G[yy][xx]=a>=1?src.slice():[
        Math.round(dst[0]*(1-a)+src[0]*a),
        Math.round(dst[1]*(1-a)+src[1]*a),
        Math.round(dst[2]*(1-a)+src[2]*a)];
    }
  }
}

// ---- palette ----
const W0='#191622',W1='#241f30',W2='#322b40',W3='#453b54';
const F0='#171226',F1='#251d31',F2='#342a42';
const L0='#6c82a8',L1='#8ba6cc',L2='#c6d8f0';
const C0='#3f0b16',C1='#641326',C2='#8a1f2e';
const G0='#8a6d24',G1='#c9962e',G2='#e8c25a';
const T0='#14101c';
const FL='#e8873a',FL2='#ffd27a';

// ============ BACK WALL BASE ============
paint(0,0,192,108,W2,1);

// ============ CEILING CORNICE ============
paint(0,0,192,6,W0,1);
paint(0,6,192,1,W3,1);
paint(0,7,192,1,W1,1);

// wall moldings (horizontal rhythm)
paint(0,22,192,1,W3,0.5);
paint(0,60,192,1,W3,0.5);

// ============ LANCET WINDOWS (A: x18, B: x70), pointed tops ============
function lancet(x){
  // pointed apex rows 10-18 (stepping in), body rows 18-56
  paint(x+9,10,6,2,L2,1);
  paint(x+6,12,12,3,L2,1);
  paint(x+3,15,18,3,L1,1);
  paint(x,18,24,22,L1,1);
  paint(x,40,24,16,L0,1);
  // bright upper glow
  paint(x+3,18,18,6,L2,1);
  // frame
  paint(x-1,18,1,38,W3,1); paint(x+24,18,1,38,W3,1);
  paint(x-1,56,26,2,W3,1);
  // mullion + transom
  paint(x+11,15,2,41,W1,1);
  paint(x,34,24,2,W1,1);
  // sill shadow
  paint(x-1,58,26,1,W0,0.6);
}
lancet(18);
lancet(70);

// ============ ROSE WINDOW above the throne (stepped circle) ============
paint(140,8,8,1,W3,1);
paint(138,9,12,1,W3,1);
paint(136,10,16,4,W3,1);
paint(138,14,12,1,W3,1);
paint(140,15,8,1,W3,1);
paint(140,9,8,1,L1,1);
paint(138,10,12,4,L1,1);
paint(140,14,8,1,L1,1);
paint(141,10,6,3,L2,1);
paint(142,11,3,2,W1,1);

// ============ PILASTERS ============
function pilaster(x){
  paint(x,8,8,68,W1,1);
  paint(x,8,2,68,W3,0.6);       // lit edge
  paint(x-1,8,10,4,W3,1);       // capital
  paint(x-1,70,10,6,W3,1);      // base
}
pilaster(54);
pilaster(100);
pilaster(180);
paint(0,8,6,68,W1,1); paint(5,8,1,68,W3,0.6); // partial left pilaster

// ============ BANNERS (crimson, gold sigil, torn hems) ============
function banner(x){
  paint(x,13,10,2,G0,1);          // rod
  paint(x+1,15,8,26,C1,1);
  paint(x+1,15,1,26,C0,1);        // shadow edge
  paint(x+3,22,4,4,G1,1);         // sigil diamond
  paint(x+4,23,2,2,C1,1);
  // torn hem
  paint(x+1,41,2,3,C1,1); paint(x+5,41,2,4,C1,1); paint(x+8,41,1,2,C1,1);
}
banner(55);
banner(101);
banner(181);

// ============ THRONE DAIS (x108-176, center ~142) ============
// red glow aura behind the throne
paint(118,24,50,40,C1,0.08);
// steps (stone, carpet strip up the middle)
paint(122,64,40,4,F2,1); paint(122,64,40,1,W3,1);
paint(116,68,52,4,F2,1); paint(116,68,52,1,W3,1);
paint(110,72,64,4,F2,1); paint(110,72,64,1,W3,1);
paint(134,64,16,4,C1,1); paint(134,68,16,4,C1,1); paint(134,72,16,4,C2,1);
// throne back panel
paint(132,26,20,38,T0,1);
paint(132,26,1,38,G0,1); paint(151,26,1,38,G0,1);
// crown spikes (bold, gold-capped)
paint(133,23,3,3,T0,1); paint(137,21,3,5,T0,1); paint(141,18,3,8,T0,1); paint(145,21,3,5,T0,1); paint(149,23,3,3,T0,1);
paint(133,22,3,1,G1,1); paint(137,20,3,1,G1,1); paint(141,17,3,1,G2,1); paint(145,20,3,1,G1,1); paint(149,22,3,1,G1,1);
// backrest cushion
paint(136,30,12,18,C1,1); paint(136,30,12,1,C2,1);
// cold light halo from the rose window onto the throne
paint(136,26,14,22,L2,0.08);
// seat + armrests
paint(135,48,14,8,C1,1); paint(135,48,14,1,C2,1);
paint(130,46,4,12,W1,1); paint(130,46,4,1,G0,1);
paint(150,46,4,12,W1,1); paint(150,46,4,1,G0,1);
paint(134,56,16,8,W1,1);

// ============ BRAZIERS flanking the dais ============
function brazier(x){
  paint(x-8,42,20,18,FL,0.06);        // wide soft glow
  paint(x-4,46,12,12,FL,0.08);        // inner glow
  paint(x-1,54,6,2,W3,1);             // bowl
  paint(x+1,56,2,14,W1,1);            // pole
  paint(x-1,69,6,2,W1,1);             // foot
  paint(x,50,4,4,FL,1);               // flame
  paint(x+1,48,2,3,FL2,1);            // flame core
}
brazier(103);
brazier(178);

// ============ FLOOR ============
paint(0,76,192,32,F1,1);
paint(0,76,192,1,W3,1);              // floor line highlight
// flagstone joints (sparse, top band only)
for(let x=8;x<192;x+=16){ paint(x,77,1,4,F0,1); }
paint(0,82,192,1,F0,0.35);
// depth darkening toward the bottom
paint(0,94,192,14,F0,0.45);
// carpet runner to the dais (meets the bottom step cleanly)
paint(0,77,134,8,C1,1);
paint(0,77,134,1,C0,1); paint(0,84,134,1,C0,1);
paint(0,78,134,1,G0,1); paint(0,83,134,1,G0,1);
for(let x=10;x<130;x+=24){ paint(x,80,2,2,G0,1); }

// ============ LIGHT SHAFTS from the windows (stepped, alpha) ============
function shafts(x){
  paint(x+2,18,22,14,L2,0.10);
  paint(x+8,32,22,18,L2,0.08);
  paint(x+14,50,22,20,L2,0.06);
  paint(x+20,70,24,8,L2,0.05);
  paint(x+22,78,26,6,L2,0.06);      // pool on the floor
}
shafts(18);
shafts(70);

// ============ DUST MOTES in the beams ============
[[30,26],[38,40],[46,58],[84,30],[92,48],[100,62]].forEach(([x,y])=>paint(x,y,1,1,L2,0.5));

// ============ VIGNETTE ============
paint(0,0,10,108,W0,0.35);
paint(182,0,10,108,W0,0.35);
paint(0,0,192,4,W0,0.4);
paint(0,104,192,4,W0,0.3);

// ============ STAMP CHARACTERS (PNG only; widget uses <use>) ============
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
stamp('hero_matrix.txt',HERO_PAL,22,52);
stamp('boss_matrix.txt',BOSS_PAL,58,28);

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
    const c=G[Math.floor(y/SCALE)][Math.floor(x/SCALE)]||[0x32,0x2b,0x40];
    const o=row+1+x*4;
    raw[o]=c[0];raw[o+1]=c[1];raw[o+2]=c[2];raw[o+3]=255;
  }
}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(IW,0);ihdr.writeUInt32BE(IH,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
fs.writeFileSync(__dirname+'/env_v3.png',png);

// ============ SVG primitive dump (scene without characters) ============
let svg='';
for(const p of prims){
  svg+=`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.hex}"${p.a<1?` fill-opacity="${p.a}"`:''}/>`;
}
fs.writeFileSync(__dirname+'/env_prims.svg.txt',svg);
console.log('wrote env_v3.png',IW,'x',IH,'prims:',prims.length,'svg chars:',svg.length);
