// npm ci --prefix tools/advanced-clouds --ignore-scripts --legacy-peer-deps
// node tools/build-advanced-clouds.mjs [--dependencies /path/to/pinned/install]
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const at=process.argv.indexOf('--dependencies');
const dependencies=at<0?resolve(root,'tools/advanced-clouds'):resolve(process.argv[at+1]);
const versions={'@takram/three-clouds':'0.7.6','@takram/three-atmosphere':'0.19.1','@takram/three-geospatial':'0.9.1',postprocessing:'6.38.3',three:'0.180.0',esbuild:'0.25.12'};
for(const [name,version]of Object.entries(versions)){
 const actual=JSON.parse(await readFile(resolve(dependencies,'node_modules',name,'package.json'),'utf8')).version;
 if(actual!==version)throw Error(`${name}: expected ${version}, found ${actual}`);
}
const {build}=await import(pathToFileURL(resolve(dependencies,'node_modules/esbuild/lib/main.js')).href);
const outfile=resolve(root,'range/vendor/takram-clouds.js');
const result=await build({stdin:{contents:`export { CloudsEffect } from '@takram/three-clouds';
export { PrecomputedTexturesLoader, SkyMaterial, getSunLightColor } from '@takram/three-atmosphere';
export { Ellipsoid } from '@takram/three-geospatial';`,resolveDir:dependencies,sourcefile:'takram-clouds-entry.js'},
 bundle:true,format:'esm',outfile,minify:true,legalComments:'eof',metafile:true,
 plugins:[{name:'existing-three-runtime',setup(b){b.onResolve({filter:/^three$/},()=>({path:'./three.module.js',external:true}));}}]});
const retained=[];
for(const [pkg,files,prefix] of [
 ['@takram/three-clouds',['shape.bin','shape_detail.bin','local_weather.png','turbulence.png'],''],
 ['@takram/three-atmosphere',['irradiance.bin','transmittance.bin','scattering.bin'],'atmosphere/'],
])for(const name of files){
 const output=resolve(root,'range/assets/clouds',prefix+name);await mkdir(dirname(output),{recursive:true});
 await copyFile(resolve(dependencies,'node_modules',pkg,'assets',name),output);retained.push(output);
}
retained.push(outfile,resolve(root,'range/assets/clouds/blue-noise-rotation.bin'));
const files={};for(const file of retained){const data=await readFile(file);files[file.slice(root.length+1)]={bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};}
await writeFile(resolve(root,'range/assets/clouds/manifest.json'),JSON.stringify({
 source:'https://github.com/takram-design-engineering/three-geospatial',revision:'b012ad06d858fc035d88aacfd73f092f93c994e4',versions,
 renderer:'WebGL2 / vendored Three r180, one shared Three module',
 noise:'Original spatial void-and-cluster ranks with temporal golden-ratio rotation; not NVIDIA STBN',files,
},null,2)+'\n');
console.log(JSON.stringify({bundleBytes:(await readFile(outfile)).length,assets:retained.length-1,versions},null,2));
