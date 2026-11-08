// Original void-and-cluster spatial rank tile with a temporal golden-ratio shift.
// This is spatial blue noise + a low-discrepancy temporal sequence, not NVIDIA STBN.
import { mkdir, writeFile } from 'node:fs/promises';
const n = 64, count = n * n, depth = 64, sigma = 1.5, radius = 6;
let seed = 1837;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const kernel = [];
for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++)
  kernel.push([x,y,Math.exp(-(x*x+y*y)/(2*sigma*sigma))]);
const active = new Uint8Array(count), energy = new Float64Array(count);
function change(index, delta) {
  const x=index%n, y=Math.floor(index/n); active[index]=delta>0?1:0;
  for(const [dx,dy,w] of kernel) energy[((y+dy+n)%n)*n+(x+dx+n)%n]+=delta*w;
}
function best(occupied, maximum) {
  let value=maximum?-Infinity:Infinity,index=-1;
  for(let i=0;i<count;i++) if(active[i]===occupied && (maximum?energy[i]>value:energy[i]<value)) {value=energy[i];index=i;}
  return index;
}
const initialCount=Math.floor(count*.1);
for(let i=0;i<initialCount;){const p=Math.floor(random()*count);if(!active[p]){change(p,1);i++;}}
for(let i=0;i<10000;i++){
  const cluster=best(1,true); change(cluster,-1);
  const hole=best(0,false);change(hole,1);if(cluster===hole)break;
}
const pattern=active.slice(), field=energy.slice(), ranks=new Uint16Array(count);
for(let rank=initialCount-1;rank>=0;rank--){const p=best(1,true);ranks[p]=rank;change(p,-1);}
active.set(pattern);energy.set(field);
for(let rank=initialCount;rank<count;rank++){const p=best(0,false);ranks[p]=rank;change(p,1);}
const data=new Uint8Array(count*depth), golden=(Math.sqrt(5)-1)/2;
for(let z=0;z<depth;z++)for(let i=0;i<count;i++)data[z*count+i]=Math.floor(((ranks[i]/count+z*golden)%1)*256);
const dir=new URL('../range/assets/clouds/',import.meta.url);await mkdir(dir,{recursive:true});
await writeFile(new URL('blue-noise-rotation.bin',dir),data);
console.log(JSON.stringify({width:n,height:n,depth,bytes:data.length,kind:'Original spatial void-and-cluster ranks with temporal golden-ratio rotation'}));
