/** Original field map, sampled from the same ground height as the playable range. */
import { ALPINE_TRAILS } from './alpine-sites.js';
export function createAlpineRouteMap(THREE, groundHeight, sites) {
  const width = 384, height = 256, pixels = new Uint8Array(width * height * 4);
  const palette = [[.47,.53,.31],[.59,.62,.38],[.70,.68,.46],[.78,.72,.52],[.84,.77,.59]];
  const nx = 65, nz = 65, heights = new Float32Array(nx * nz);
  const bounds = { minX: -330, maxX: 330, minZ: -780, maxZ: 240 };
  for (let z=0;z<nz;z++) for (let x=0;x<nx;x++) heights[z*nx+x]=groundHeight(bounds.minX+x/(nx-1)*660,bounds.minZ+z/(nz-1)*1020);
  const ink=[.31,.30,.20], cream=[.88,.82,.63];
  function pixel(x,y,color) { x=Math.round(x);y=Math.round(y);if(x<0||x>=width||y<0||y>=height)return;const i=(y*width+x)*4;for(let c=0;c<3;c++)pixels[i+c]=Math.round(Math.max(0,Math.min(1,color[c]))*255);pixels[i+3]=255; }
  function point(x,z) { return [22+(x-bounds.minX)/660*340, 32+(z-bounds.minZ)/1020*202]; }
  function line(a,b,color,thickness=1) { const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=n;i++){const t=i/Math.max(1,n);for(let ox=-thickness/2;ox<=thickness/2;ox++)for(let oy=-thickness/2;oy<=thickness/2;oy++)pixel(a[0]+(b[0]-a[0])*t+ox,a[1]+(b[1]-a[1])*t+oy,color);} }
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    let color=cream;
    if(x>=22&&x<=362&&y>=32&&y<=234) {
      const gx=(x-22)/340*64,gz=(y-32)/202*64,ix=Math.min(63,Math.floor(gx)),iz=Math.min(63,Math.floor(gz)),tx=gx-ix,tz=gz-iz;
      const h00=heights[iz*65+ix],h10=heights[iz*65+ix+1],h01=heights[(iz+1)*65+ix],h11=heights[(iz+1)*65+ix+1];
      const elevation=(h00*(1-tx)+h10*tx)*(1-tz)+(h01*(1-tx)+h11*tx)*tz;
      const p=Math.max(0,Math.min(3.99,elevation/78)),index=Math.floor(p),f=p-index;
      color=palette[index].map((v,c)=>v*(1-f)+palette[index+1][c]*f);
      const contour=Math.abs(((elevation+1000)%10)-5),shade=Math.max(-.10,Math.min(.10,(h10-h00)*.004-(h01-h00)*.007));
      color=color.map((v,c)=>(contour<.65?v*.65+ink[c]*.35:v)+shade);
    }
    const paper=.98+.015*Math.sin(x*2.31+y*1.79);pixel(x,y,color.map(v=>v*paper));
  }
  for(const path of ALPINE_TRAILS) for(let i=1;i<path.length;i++)line(point(...path[i-1]),point(...path[i]),[.48,.26,.13],2);
  const air=[point(0,-560),point(0,-150),point(0,0)];for(let j=1;j<air.length;j++){const a=air[j-1],b=air[j];for(let i=0;i<16;i+=2)line([a[0]+(b[0]-a[0])*i/16,a[1]+(b[1]-a[1])*i/16],[a[0]+(b[0]-a[0])*(i+1)/16,a[1]+(b[1]-a[1])*(i+1)/16],[.14,.32,.32],1);}
  for(const site of sites){const p=point(site.x,site.z);for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)pixel(p[0]+dx,p[1]+dy,Math.abs(dx)===3||Math.abs(dy)===3?ink:[.91,.58,.25]);}
  for(const radius of [3,7,11]){const p=point(0,0);for(let i=0;i<70;i++){const a=i/70*Math.PI*2;pixel(p[0]+Math.cos(a)*radius,p[1]+Math.sin(a)*radius,[.94,.88,.69]);}}
  const glyphs={A:['01110','10001','10001','11111','10001','10001','10001'],E:['11111','10000','10000','11110','10000','10000','11111'],G:['01111','10000','10000','10111','10001','10001','01110'],I:['111','010','010','010','010','010','111'],L:['10000','10000','10000','10000','10000','10000','11111'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],R:['11110','10001','10001','11110','10100','10010','10001'],D:['11110','10001','10001','10001','10001','10001','11110'],F:['11111','10000','10000','11110','10000','10000','10000'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],C:['01111','10000','10000','10000','10000','10000','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],P:['11110','10001','10001','11110','10000','10000','10000'],S:['01111','10000','10000','01110','00001','00001','11110']};
  function label(value,x,y,scale=1){for(const ch of value){const glyph=glyphs[ch];if(glyph)for(let row=0;row<7;row++)for(let col=0;col<glyph[row].length;col++)if(glyph[row][col]==='1')for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++)pixel(x+col*scale+dx,y+row*scale+dy,ink);x+=(glyph?glyph[0].length+1:3)*scale;}}
  label('GOLDEN RANGE',100,10,2);label('LAUNCH',204,64);label('LANDING',204,194);label('TRAIL GUIDE',22,241);label('N',351,42);
  line([353,63],[353,52],ink,1);line([353,52],[350,57],ink,1);line([353,52],[356,57],ink,1);
  for(const [a,b] of [[[21,31],[363,31]],[[363,31],[363,235]],[[363,235],[21,235]],[[21,235],[21,31]]])line(a,b,ink);
  // Data rows are top-down, whereas UV maps are bottom-up.
  const flipped=new Uint8Array(pixels.length);for(let y=0;y<height;y++)flipped.set(pixels.subarray(y*width*4,(y+1)*width*4),(height-1-y)*width*4);
  const texture=new THREE.DataTexture(flipped,width,height,THREE.RGBAFormat);texture.name='Original Golden Range contour and trail guide';texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
