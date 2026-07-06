// VFX sampler sheet — pixel effect frames for the redesigned world.
// 12 cells of 40x40 (4 cols x 3 rows, 4px gaps): sheet 180x136.
// Row 0: boss slash lifecycle (anticipation / strike / fade) + charged laser
// Row 1: hero light wave lifecycle (gather / crescent / dissolve) + parry ring
// Row 2: boss dash / hero dash / boss charge-up aura / landing dust
const fs = require('fs');
const zlib = require('zlib');

const W = 180, H = 136, SCALE = 5;
const BG = [0x13,0x10,0x20];

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
      const dst=G[yy][xx]||BG;
      G[yy][xx]=a>=1?src.slice():[
        Math.round(dst[0]*(1-a)+src[0]*a),
        Math.round(dst[1]*(1-a)+src[1]*a),
        Math.round(dst[2]*(1-a)+src[2]*a)];
    }
  }
}

// boss ember ramp / hero light ramp / neutral
const E0='#6e0f1c',E1='#a8182a',E2='#e0263a',E3='#ff5a4a',SMK='#1a1420',UMB='#14101c';
const L0='#4a7a9e',L1='#7fd4ff',L2='#b8ecff',L3='#eaf6ff';
const ST0='#2e3444',ST1='#7c88a0',ST2='#aeb9cc',CAPE='#141c30',GLD='#c9962e';
const DU0='#4a3f33',DU1='#6b5c48',DU2='#8d7b60',DU3='#b3a184';

// sheet backdrop + cell frames
paint(0,0,180,136,'#131020',1);
const cell=(c,r)=>[4+c*44,4+r*44];
for(let r=0;r<3;r++)for(let c=0;c<4;c++){
  const[ox,oy]=cell(c,r);
  paint(ox-1,oy-1,42,1,'#2b2740',1); paint(ox-1,oy+40,42,1,'#2b2740',1);
  paint(ox-1,oy,1,40,'#2b2740',1); paint(ox+40,oy,1,40,'#2b2740',1);
}

// ---------- arc helper: vertical crescent, dir=-1 opens right (boss), +1 opens left (hero)
function crescent(ox,oy,dir,layers){
  for(let y=6;y<=34;y++){
    const t=(y-6)/28*Math.PI;
    const s=Math.sin(t);
    const xo=20-dir*Math.round(14*s);
    const wdt=Math.max(1,Math.round(1+4*s));
    // layers: [outerColor, bodyColor, innerColor]
    if(dir<0){
      paint(ox+xo-1,oy+y,1,1,layers[0],1);
      paint(ox+xo,oy+y,Math.max(1,wdt-1),1,layers[1],1);
      paint(ox+xo+wdt-1,oy+y,1,1,layers[2],1);
      if(y>=16&&y<=24) paint(ox+xo+wdt,oy+y,1,1,layers[3],1);
    } else {
      paint(ox+xo+1,oy+y,1,1,layers[0],1);
      paint(ox+xo-wdt+2,oy+y,Math.max(1,wdt-1),1,layers[1],1);
      paint(ox+xo-wdt+1,oy+y,1,1,layers[2],1);
      if(y>=16&&y<=24) paint(ox+xo-wdt,oy+y,1,1,layers[3],1);
    }
  }
}

// ========== R0C0: boss slash — ANTICIPATION ==========
(()=>{const[ox,oy]=cell(0,0);
  [[12,10],[8,16],[7,20],[8,24],[12,30]].forEach(([x,y])=>paint(ox+x,oy+y,1,2,E0,1));
  paint(ox+9,oy+18,1,4,E1,1);
  [[24,12],[26,20],[24,28]].forEach(([x,y])=>{paint(ox+x,oy+y,1,1,E1,1);paint(ox+x+2,oy+y,1,1,E0,1);});
  paint(ox+16,oy+19,2,2,E0,0.6);
})();
// ========== R0C1: boss slash — STRIKE ==========
(()=>{const[ox,oy]=cell(1,0);
  crescent(ox,oy,-1,[SMK,E1,E2,E3]);
  paint(ox+24,oy+8,2,1,E1,0.5); paint(ox+26,oy+32,2,1,E1,0.5);
})();
// ========== R0C2: boss slash — FADE ==========
(()=>{const[ox,oy]=cell(2,0);
  paint(ox+12,oy+8,1,3,E1,1); paint(ox+10,oy+12,1,3,E0,1);
  paint(ox+8,oy+22,1,4,E1,1); paint(ox+10,oy+27,1,3,E0,1); paint(ox+13,oy+31,1,2,E0,1);
  paint(ox+6,oy+14,2,2,SMK,1); paint(ox+5,oy+26,2,2,SMK,1); paint(ox+11,oy+18,2,2,SMK,0.7);
  [[16,10],[18,16],[15,22],[18,28],[16,33],[22,20]].forEach(([x,y])=>paint(ox+x,oy+y,1,1,E0,1));
  paint(ox+20,oy+13,1,1,E1,1); paint(ox+21,oy+26,1,1,E1,1);
})();
// ========== R0C3: boss charged LASER ==========
(()=>{const[ox,oy]=cell(3,0);
  paint(ox+2,oy+14,36,12,E2,0.13);
  paint(ox+6,oy+16,32,1,E2,1);
  paint(ox+6,oy+17,32,2,E1,1);
  paint(ox+6,oy+19,32,3,UMB,1);
  paint(ox+6,oy+22,32,2,E1,1);
  paint(ox+6,oy+24,32,1,E2,1);
  [[8,17],[16,17],[24,17],[32,17]].forEach(([x,y])=>paint(ox+x,oy+y,3,1,E3,1));
  [[12,23],[20,23],[28,23],[35,23]].forEach(([x,y])=>paint(ox+x,oy+y,3,1,E3,1));
  paint(ox+2,oy+16,4,9,E2,1); paint(ox+3,oy+18,3,5,E3,1); paint(ox+4,oy+19,2,3,UMB,1);
  paint(ox+1,oy+13,2,2,E1,1); paint(ox+1,oy+26,2,2,E1,1);
})();

// ========== R1C0: hero wave — GATHER ==========
(()=>{const[ox,oy]=cell(0,1);
  paint(ox+19,oy+19,2,2,L3,1);
  paint(ox+18,oy+18,1,1,L1,1); paint(ox+21,oy+18,1,1,L1,1);
  paint(ox+18,oy+21,1,1,L1,1); paint(ox+21,oy+21,1,1,L1,1);
  [[13,13],[26,12],[12,26],[27,27],[20,10],[20,30]].forEach(([x,y])=>paint(ox+x,oy+y,1,1,L2,1));
  [[15,15],[24,14],[14,24],[25,25]].forEach(([x,y])=>paint(ox+x,oy+y,1,1,L0,1));
})();
// ========== R1C1: hero wave — CRESCENT ==========
(()=>{const[ox,oy]=cell(1,1);
  crescent(ox,oy,1,[L0,L2,L1,L3]);
  paint(ox+12,oy+9,2,1,L1,0.5); paint(ox+10,oy+31,2,1,L1,0.5);
})();
// ========== R1C2: hero wave — DISSOLVE ==========
(()=>{const[ox,oy]=cell(2,1);
  paint(ox+26,oy+9,1,4,L2,1); paint(ox+28,oy+14,1,3,L1,1);
  paint(ox+30,oy+22,1,4,L2,1); paint(ox+28,oy+27,1,3,L1,1); paint(ox+26,oy+31,1,2,L0,1);
  [[22,12],[20,18],[23,24],[21,30],[16,20],[25,16]].forEach(([x,y])=>paint(ox+x,oy+y,1,1,L1,1));
  [[18,14],[17,26],[24,20]].forEach(([x,y])=>paint(ox+x,oy+y,1,1,L0,1));
  paint(ox+14,oy+19,1,1,L2,1);
})();
// ========== R1C3: hero PARRY RING ==========
(()=>{const[ox,oy]=cell(3,1);
  const R=11;
  for(let a=0;a<64;a++){
    const th=a/64*2*Math.PI;
    const x=20+Math.round(R*Math.cos(th)), y=20+Math.round(R*Math.sin(th));
    paint(ox+x,oy+y,1,1,L1,1);
  }
  [[20,9],[20,31],[9,20],[31,20]].forEach(([x,y])=>paint(ox+x,oy+y,1,1,L3,1));
  [[12,12],[28,12],[12,28],[28,28]].forEach(([x,y])=>{
    const dx=Math.sign(x-20),dy=Math.sign(y-20);
    paint(ox+x+dx*2,oy+y+dy*2,1,1,L2,1); paint(ox+x+dx*3,oy+y+dy*3,1,1,GLD,1);
  });
  for(let a=0;a<32;a++){
    const th=a/32*2*Math.PI;
    const x=20+Math.round(5*Math.cos(th)), y=20+Math.round(5*Math.sin(th));
    paint(ox+x,oy+y,1,1,L1,0.4);
  }
})();

// ========== R2C0: boss DASH ==========
(()=>{const[ox,oy]=cell(0,2);
  paint(ox+6,oy+13,4,14,'#1c1d28',0.35);
  paint(ox+12,oy+13,4,14,'#1c1d28',0.6);
  paint(ox+18,oy+12,5,16,'#1c1d28',1);
  paint(ox+20,oy+15,1,4,E1,1);
  paint(ox+4,oy+12,14,1,E0,0.7);
  paint(ox+3,oy+16,18,1,E1,0.7);
  paint(ox+5,oy+20,22,1,E2,0.8);
  paint(ox+3,oy+24,18,1,E1,0.7);
  paint(ox+4,oy+28,14,1,E0,0.7);
  paint(ox+27,oy+19,6,1,E3,1); paint(ox+25,oy+20,8,1,E2,1); paint(ox+27,oy+21,6,1,E3,1);
  [[9,14],[7,26]].forEach(([x,y])=>paint(ox+x,oy+y,1,1,E0,1));
})();
// ========== R2C1: hero DASH ==========
(()=>{const[ox,oy]=cell(1,2);
  paint(ox+8,oy+15,3,10,ST0,0.35);
  paint(ox+13,oy+15,3,10,ST0,0.6);
  paint(ox+18,oy+14,4,12,ST0,1);
  paint(ox+19,oy+16,1,3,L1,1);
  paint(ox+5,oy+14,12,1,CAPE,0.8);
  paint(ox+4,oy+18,16,1,ST1,0.7);
  paint(ox+6,oy+21,18,1,ST2,0.8);
  paint(ox+4,oy+24,15,1,ST1,0.7);
  paint(ox+24,oy+19,6,1,L2,1); paint(ox+22,oy+20,8,1,L1,1); paint(ox+24,oy+21,6,1,L2,1);
})();
// ========== R2C2: boss CHARGE-UP AURA ==========
(()=>{const[ox,oy]=cell(2,2);
  paint(ox+17,oy+12,6,16,UMB,1);
  paint(ox+19,oy+16,2,2,E3,1);
  const pts=[[20,4,0,1],[31,8,-1,1],[35,20,-1,0],[31,31,-1,-1],[20,35,0,-1],[9,31,1,-1],[5,20,1,0],[9,8,1,1]];
  pts.forEach(([x,y,dx,dy])=>{
    paint(ox+x,oy+y,1,1,E2,1);
    paint(ox+x+dx,oy+y+dy,1,1,E1,1);
    paint(ox+x+dx*2,oy+y+dy*2,1,1,E0,0.8);
  });
  paint(ox+10,oy+32,20,2,E1,0.35);
  paint(ox+8,oy+33,24,1,E0,0.5);
  paint(ox+14,oy+8,1,1,E1,1); paint(ox+26,oy+6,1,1,E0,1);
})();
// ========== R2C3: LANDING DUST (matches the hall's stone) ==========
(()=>{const[ox,oy]=cell(3,2);
  paint(ox+4,oy+30,32,1,DU2,1);
  paint(ox+4,oy+31,32,3,DU0,0.5);
  paint(ox+10,oy+26,3,3,DU1,1); paint(ox+8,oy+24,2,2,DU1,0.7); paint(ox+12,oy+25,1,1,DU3,1);
  paint(ox+6,oy+27,2,2,DU0,1);
  paint(ox+27,oy+26,3,3,DU1,1); paint(ox+30,oy+24,2,2,DU1,0.7); paint(ox+27,oy+25,1,1,DU3,1);
  paint(ox+32,oy+27,2,2,DU0,1);
  paint(ox+17,oy+24,2,1,DU3,1); paint(ox+21,oy+24,2,1,DU3,1);
  paint(ox+16,oy+22,1,1,DU2,1); paint(ox+23,oy+22,1,1,DU2,1);
  paint(ox+14,oy+19,1,1,DU2,0.7); paint(ox+25,oy+19,1,1,DU2,0.7);
})();

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
    const c=G[Math.floor(y/SCALE)][Math.floor(x/SCALE)]||BG;
    const o=row+1+x*4;
    raw[o]=c[0];raw[o+1]=c[1];raw[o+2]=c[2];raw[o+3]=255;
  }
}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(IW,0);ihdr.writeUInt32BE(IH,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
fs.writeFileSync(__dirname+'/vfx_v1.png',png);

let svg='';
for(const p of prims){
  svg+=`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.hex}"${p.a<1?` fill-opacity="${p.a}"`:''}/>`;
}
fs.writeFileSync(__dirname+'/vfx_prims.svg.txt',svg);
console.log('wrote vfx_v1.png',IW,'x',IH,'prims:',prims.length,'svg chars:',svg.length);
