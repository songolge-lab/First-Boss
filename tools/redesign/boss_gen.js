// Boss "Hollow Regent" pixel sprite generator v4 + PNG preview writer.
// Grid: 46 wide x 48 tall, side view facing right. Feet on row 47.
const fs = require('fs');
const zlib = require('zlib');

const W = 46, H = 48, SCALE = 8;

const PAL = {
  '0': [0x08,0x08,0x0c], '1': [0x12,0x12,0x1a], '2': [0x1c,0x1d,0x28],
  '3': [0x2a,0x2c,0x3a], '4': [0x3d,0x40,0x52], '5': [0x56,0x5c,0x74],
  'a': [0x6e,0x0f,0x1c], 'b': [0xa8,0x18,0x2a], 'c': [0xe0,0x26,0x3a],
  'd': [0xff,0x5a,0x4a], 'g': [0x3a,0x10,0x14], 'h': [0x57,0x18,0x20],
};

const G = Array.from({length:H},()=>Array(W).fill('.'));
const set=(x,y,k)=>{if(x>=0&&x<W&&y>=0&&y<H)G[y][x]=k;};
const hspan=(y,x1,x2,k)=>{for(let x=x1;x<=x2;x++)set(x,y,k);};
const vspan=(x,y1,y2,k)=>{for(let y=y1;y<=y2;y++)set(x,y,k);};

// ============ HEAD: compact dome, tail sweeps DOWN behind the jaw ============
hspan(0,18,21,'2');
hspan(1,17,23,'2');
hspan(2,16,24,'2');
hspan(3,16,24,'2');
hspan(4,16,24,'2');
hspan(5,16,24,'2');
hspan(6,16,23,'2');
hspan(7,17,22,'2');
hspan(8,17,21,'2');
hspan(9,18,20,'2');
// crown + front face lit
hspan(0,18,20,'4'); hspan(1,18,22,'3'); hspan(2,17,23,'3'); hspan(3,17,23,'3');
hspan(4,18,23,'3');
set(24,2,'4'); set(24,3,'4'); set(24,4,'4');
set(19,0,'5'); set(20,0,'5');
// swept-back tail: descends diagonally behind the skull
hspan(4,14,15,'2');
hspan(5,12,15,'2'); set(12,5,'1');
hspan(6,11,14,'1');
hspan(7,12,13,'1');
set(11,7,'0');
// visor slit
set(21,5,'c'); set(22,5,'d'); set(23,5,'c'); set(22,6,'a');
// jaw shadow
hspan(7,17,20,'1'); hspan(8,17,20,'1'); hspan(9,18,19,'1');

// ============ NECK + COLLAR ============
hspan(10,18,21,'1');
hspan(11,16,23,'2'); set(16,11,'3'); set(23,11,'3');

// ============ TORSO (broad chest, V-taper) ============
hspan(12,13,24,'2');
hspan(13,12,24,'2');
hspan(14,12,24,'2');
hspan(15,13,24,'2');
hspan(16,14,23,'2');
hspan(17,14,23,'2');
hspan(18,15,22,'2');
// chest carapace lit
hspan(12,16,23,'3'); hspan(13,16,23,'3'); hspan(14,16,23,'3'); hspan(15,17,23,'3');
hspan(12,18,23,'4'); vspan(13,13,15,'1');
// sternum ember seam + core (single focused cluster)
set(19,12,'a'); set(19,13,'b');
set(19,14,'c'); set(18,15,'c'); set(20,15,'c'); set(19,16,'c'); set(19,15,'d');
set(19,17,'b'); set(19,18,'a');
// under-pec shadow
hspan(16,15,17,'1'); hspan(17,15,16,'1');

// ============ ABDOMEN: segmented plates (seams stop short of edges) ============
hspan(19,15,22,'2');
hspan(20,15,22,'2');
hspan(21,15,22,'2');
hspan(22,16,22,'2');
hspan(23,16,22,'2');
hspan(24,16,21,'2');
hspan(25,16,21,'2');
hspan(20,16,20,'0');
hspan(23,17,20,'0');
set(18,21,'3'); set(19,21,'3');
set(18,24,'3'); set(19,24,'3');
vspan(22,19,23,'3'); vspan(21,24,25,'3');

// ============ PELVIS ============
hspan(26,15,22,'2');
hspan(27,15,22,'2');
hspan(28,15,22,'1');
hspan(26,18,21,'3'); set(18,27,'3'); set(19,27,'3');

// ============ BACK PAULDRON + BACK ARM (far side: same corruption, one step darker) ============
hspan(12,10,12,'1'); hspan(13,9,12,'1'); hspan(14,9,12,'1');
set(10,12,'2'); set(11,12,'2');
// rear thorns sweeping up-back (mirror language of the lead shoulder)
set(9,11,'2'); set(8,10,'1');
set(11,11,'2');
// dim vein node on the plate
set(10,13,'b');
vspan(10,15,22,'1'); vspan(11,15,22,'1');
vspan(12,15,20,'0');
// elbow thorn + forearm vein trace
set(9,18,'2'); set(8,19,'1');
set(10,21,'b');
// fist with ember knuckle
set(11,22,'2');
set(9,23,'1'); set(10,23,'b'); set(11,23,'1'); hspan(24,10,11,'0');

// ============ LEAD PAULDRON: corrupted thorn dome (boss1 fusion) ============
vspan(20,12,15,'0');
hspan(11,22,26,'4');
hspan(12,21,27,'3');
hspan(13,20,28,'3');
hspan(14,20,28,'3');
hspan(15,21,27,'3');
hspan(16,22,26,'1');
set(21,12,'4'); set(27,12,'4'); set(28,13,'4'); set(28,14,'1');
set(22,12,'5');
// thorn spikes sweeping up-forward (asymmetric, lead side only)
set(21,11,'3'); set(20,10,'2');
set(24,10,'3'); set(25,9,'3'); set(25,8,'2');
set(27,11,'3'); set(28,10,'3'); set(29,9,'2'); set(29,8,'2'); set(30,7,'1');
// living vein: one diagonal crack rising into the middle thorn
set(23,14,'b'); set(24,13,'c'); set(25,12,'b');
set(25,10,'a');
// vein bleeding into the upper arm
set(25,17,'b'); set(26,18,'a');

// ============ LEAD ARM: bent, blade raised battle-ready ============
vspan(25,16,19,'2'); vspan(26,17,20,'2');
set(26,17,'3'); set(26,18,'3');
set(26,21,'2'); set(27,21,'2'); set(27,20,'2');
set(28,20,'2'); set(28,19,'3'); set(29,18,'2'); set(29,17,'3');

// ============ HAND: fist gripping upward hilt ============
hspan(16,30,33,'3'); set(33,16,'4');
hspan(17,30,33,'3'); set(31,17,'1');
hspan(18,30,33,'3'); set(32,18,'1');
hspan(19,30,32,'1');
// pommel below fist
set(31,20,'2'); set(32,20,'2'); set(31,21,'b');

// ============ SWORD: bold double-crossguard ============
// tier-1: thick lit cross with upswept horn tips
hspan(14,29,37,'3'); set(29,14,'4'); set(37,14,'4');
hspan(15,30,36,'2');
set(29,13,'3'); set(28,12,'2');
set(37,13,'3'); set(38,12,'2');
set(33,15,'c'); set(30,15,'1'); set(36,15,'1');
// tier-2: short cross two rows up (clear of the core columns)
set(31,12,'3'); set(32,12,'3'); set(35,12,'3'); set(36,12,'3');
set(31,11,'2'); set(36,11,'2');
// blade: steep 1:2 rise, unbroken molten core (columns of 3, shared rows)
(()=>{
  const cols=[[33,14],[34,12],[35,10],[36,8],[37,6],[38,4],[39,2]];
  const cores=[];
  for(const[cx,ty] of cols){
    for(let y=ty;y>=ty-2&&y>=0;y--) cores.push([cx,y]);
  }
  cores.push([40,0]);
  for(const[x,y] of cores){
    const core = y>=12?'b':(y>=6?'c':'d');
    set(x,y,core);
  }
  // flanks: dark left edge, lit right edge (only where empty)
  for(const[x,y] of cores){
    if(G[y][x-1]==='.') set(x-1,y,'1');
    if(x+1<W&&G[y][x+1]==='.') set(x+1,y,'3');
  }
  set(40,1,'4'); set(40,2,'4');
})();

// ============ BACK LEG (far side: corrupted plating, one step darker) ============
vspan(14,29,35,'1'); vspan(15,29,35,'1'); vspan(16,29,35,'1'); vspan(17,29,32,'1');
set(16,29,'2'); set(16,30,'2');
// dim thigh vein (mirrors the front-leg crack)
set(15,31,'a'); set(15,32,'b'); set(15,33,'a');
// knee plate with rear thorn + ember node
hspan(36,14,16,'1'); hspan(37,14,16,'1'); hspan(38,14,16,'1');
set(14,36,'2'); set(13,37,'2'); set(12,36,'1');
set(15,37,'b');
// shin ridge lines
vspan(14,39,44,'1'); vspan(15,39,44,'1'); vspan(16,39,42,'1');
set(16,39,'2'); set(16,40,'2'); set(16,41,'2');
// sabaton: ankle plate, heel spur, sharpened top edge
hspan(45,13,17,'1'); set(12,44,'2'); set(11,45,'2'); set(18,45,'2');
hspan(46,12,18,'1'); set(10,46,'1');
hspan(47,13,17,'0');

// ============ FRONT LEG ============
vspan(19,29,35,'2'); vspan(20,29,35,'2'); vspan(21,29,35,'3'); vspan(22,29,35,'3'); vspan(23,30,34,'3');
set(22,29,'4');
set(20,31,'b'); set(20,32,'c'); set(20,33,'b');
hspan(36,19,22,'3'); hspan(37,19,22,'3'); set(21,36,'4');
hspan(38,19,21,'2');
vspan(19,39,44,'2'); vspan(20,39,44,'3'); vspan(21,39,44,'3'); vspan(22,40,44,'3');
hspan(45,19,24,'3'); hspan(45,20,23,'4');
hspan(46,19,26,'3');
hspan(47,20,25,'0');

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
      const dark=((Math.floor(x/16)+Math.floor(y/16))%2)===0;
      raw[o]=dark?0x16:0x1a; raw[o+1]=dark?0x13:0x17; raw[o+2]=dark?0x22:0x27; raw[o+3]=255;
    } else { const[r,g,b]=PAL[k]; raw[o]=r;raw[o+1]=g;raw[o+2]=b;raw[o+3]=255; }
  }
}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(IW,0);ihdr.writeUInt32BE(IH,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
fs.writeFileSync(__dirname+'/boss_v10.png',png);
fs.writeFileSync(__dirname+'/boss_matrix.txt',G.map(r=>r.join('')).join('\n'));
console.log('wrote boss_v10.png',IW,'x',IH);
