// Hero "Dawnguard Knight" pixel sprite generator + PNG preview writer.
// Grid: 30 wide x 24 tall, side view facing right. Feet on row 23.
// In-game: HERO_PIXEL = 2 -> 48 px tall (unchanged size category).
const fs = require('fs');
const zlib = require('zlib');

const W = 30, H = 24, SCALE = 12;

const PAL = {
  '0': [0x10,0x14,0x1e], // outline / darkest
  '1': [0x2e,0x34,0x44], // dark steel / far side
  '2': [0x4a,0x54,0x68], // base steel
  '3': [0x7c,0x88,0xa0], // lit steel
  '4': [0xae,0xb9,0xcc], // bright plate / blade steel
  '5': [0xe2,0xe8,0xf2], // rim glint
  'n': [0x14,0x1c,0x30], // cape shadow
  'm': [0x1c,0x24,0x38], // cape body
  'l': [0x7f,0xd4,0xff], // cold blue glow
  'L': [0xb8,0xec,0xff], // bright blue
  'g': [0xc9,0x96,0x2e], // gold accent
};

const G = Array.from({length:H},()=>Array(W).fill('.'));
const set=(x,y,k)=>{if(x>=0&&x<W&&y>=0&&y<H)G[y][x]=k;};
const hspan=(y,x1,x2,k)=>{for(let x=x1;x<=x2;x++)set(x,y,k);};
const vspan=(x,y1,y2,k)=>{for(let y=y1;y<=y2;y++)set(x,y,k);};

// ============ CAPE (behind everything, flows down-back) ============
hspan(6,8,9,'m');
hspan(7,6,9,'m'); set(6,7,'n');
hspan(8,6,9,'m'); set(6,8,'n');
hspan(9,5,8,'m'); set(5,9,'n');
hspan(10,5,8,'m'); set(5,10,'n');
hspan(11,5,7,'m'); set(5,11,'n');
hspan(12,4,7,'m'); set(4,12,'n');
hspan(13,4,7,'m'); set(4,13,'n');
hspan(14,4,6,'m'); set(4,14,'n');
hspan(15,4,6,'m'); set(4,15,'n');
hspan(16,3,6,'m'); set(3,16,'n');
hspan(17,3,5,'m'); set(3,17,'n');
hspan(18,3,5,'n');
set(3,19,'n'); set(5,19,'n');

// ============ BACK ARM (far side) ============
vspan(8,8,12,'1'); vspan(9,8,12,'1');
hspan(13,8,9,'1');

// ============ BACK LEG + FOOT (far side) ============
vspan(10,15,17,'1'); vspan(11,15,17,'1'); vspan(12,15,17,'1');
hspan(18,10,12,'1');
vspan(10,19,21,'1'); vspan(11,19,21,'1'); vspan(12,19,21,'1');
hspan(22,8,13,'1');
hspan(23,9,13,'0');

// ============ TORSO / CUIRASS ============
hspan(6,10,17,'2');
hspan(7,10,17,'2');
hspan(8,10,17,'2');
hspan(9,10,17,'2');
hspan(10,10,16,'2');
hspan(11,11,16,'2');
hspan(12,11,16,'1');
// lit chest face
hspan(7,12,16,'3'); hspan(8,12,16,'3'); hspan(9,12,16,'3');
hspan(7,13,16,'4');
// chest emblem (cold blue sigil, clear of the pauldron)
set(12,9,'l'); set(13,9,'L'); set(12,10,'l'); set(13,10,'l');
// belt buckle + cape clasp
set(13,12,'g'); set(10,6,'g');

// ============ PLATE SKIRT / FAULD ============
hspan(13,10,17,'2'); set(12,13,'1'); set(15,13,'1');
hspan(14,10,17,'2'); set(12,14,'1'); set(15,14,'1');
hspan(15,11,16,'1');

// ============ FRONT LEG + SABATON ============
vspan(14,15,17,'2'); vspan(15,15,17,'2'); vspan(16,15,17,'3');
hspan(18,14,16,'3'); set(16,18,'4');
vspan(14,19,21,'2'); vspan(15,19,21,'2'); vspan(16,19,21,'3');
hspan(22,14,19,'3'); set(15,22,'4'); set(16,22,'4');
hspan(23,14,18,'0');

// ============ HELM: crowned ridges, brow + cheek guard, blue visor ============
set(11,0,'2'); set(13,0,'g'); set(15,0,'2');
hspan(1,10,16,'2'); hspan(1,11,15,'3'); set(12,1,'4'); set(13,1,'4');
hspan(2,9,16,'3'); set(14,2,'4'); set(15,2,'4'); set(16,2,'4');
hspan(3,9,16,'2'); set(13,3,'0'); set(14,3,'l'); set(15,3,'L'); set(16,3,'1');
hspan(4,10,15,'2'); set(11,4,'1'); set(12,4,'1'); set(14,4,'3'); set(15,4,'3');
hspan(5,11,14,'1');

// ============ LEAD PAULDRON (layered, foreground) ============
hspan(6,15,18,'4'); set(16,6,'5');
hspan(7,14,19,'3'); set(14,7,'4'); set(19,7,'4');
hspan(8,14,19,'3');
hspan(9,15,18,'2');

// ============ LEAD ARM + FIST ============
vspan(17,10,12,'2'); vspan(18,10,11,'3');
hspan(12,18,20,'3'); set(20,12,'4');
hspan(13,18,20,'3'); set(19,13,'1');

// ============ SWORD: bright steel, cold blue glow edge ============
vspan(21,12,14,'1'); set(21,13,'l');
(()=>{
  for(let x=22;x<=29;x++){
    const y=13+Math.floor((x-22)/2);
    set(x,y,'4');
    set(x,y+1,'l');
  }
  set(29,16,'L'); set(29,17,'l');
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
    const k=G[Math.floor(y/SCALE)][Math.floor(x/SCALE)];
    const o=row+1+x*4;
    if(k==='.'){
      const dark=((Math.floor(x/24)+Math.floor(y/24))%2)===0;
      raw[o]=dark?0x16:0x1a; raw[o+1]=dark?0x13:0x17; raw[o+2]=dark?0x22:0x27; raw[o+3]=255;
    } else { const[r,g,b]=PAL[k]; raw[o]=r;raw[o+1]=g;raw[o+2]=b;raw[o+3]=255; }
  }
}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(IW,0);ihdr.writeUInt32BE(IH,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
fs.writeFileSync(__dirname+'/hero_v2.png',png);
fs.writeFileSync(__dirname+'/hero_matrix.txt',G.map(r=>r.join('')).join('\n'));
console.log('wrote hero_v2.png',IW,'x',IH);
