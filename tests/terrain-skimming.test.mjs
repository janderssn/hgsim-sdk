import assert from 'node:assert/strict';
import {createSoaringState,stepSoaring,SOARING_DEFAULTS as cfg} from '../src/flight.js';
import {SKIM_DEFAULTS} from '../src/terrain-skimming.js';
const flat={terrainHeight:()=>0,thermals:[],wind:{x:0,z:0},terrainSkimming:true};
const energy=s=>s.y+s.airspeed*s.airspeed/(2*cfg.gravity);
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};
/** Fly a scripted line and record what a player would feel. */
function run(surface,{fps=60,seconds=12,start={},input=()=>({pitch:-1}),env={}}={}){
 const environment={...flat,terrainHeight:surface,...env},ground=(x,z)=>(environment.skimHeight||surface)(x,z);
 const s=createSoaringState({y:ground(0,0)+40,airspeed:30,pathAngle:0,...start});
 const out={s,minClear:Infinity,maxVsStep:0,maxAssistStep:0,maxLoad:0,minGroundSpeedSkimming:Infinity,trace:[],firstPullUp:null,contact:null,energyRise:0};
 let lastVs=s.verticalSpeed,lastAssist=0,lastE=energy(s);
 for(let i=0;i<seconds*fps;i++){
  const t=(i+1)/fps;stepSoaring(s,input(t),1/fps,environment);
  const clear=s.y-ground(s.x,s.z);out.minClear=Math.min(out.minClear,clear);
  out.maxVsStep=Math.max(out.maxVsStep,Math.abs(s.verticalSpeed-lastVs)*fps/60);lastVs=s.verticalSpeed;
  out.maxAssistStep=Math.max(out.maxAssistStep,Math.abs(s.skimAssist-lastAssist)*fps/60);lastAssist=s.skimAssist;
  out.maxLoad=Math.max(out.maxLoad,Math.cos(s.pathAngle)+s.airspeed*s.pathRate/cfg.gravity);
  if(s.skimAssist>.5)out.minGroundSpeedSkimming=Math.min(out.minGroundSpeedSkimming,s.groundSpeed);
  if(s.pullUp&&out.firstPullUp===null)out.firstPullUp=t;
  const e=energy(s);out.energyRise=Math.max(out.energyRise,e-lastE);lastE=e;
  out.trace.push({t,clear,vs:s.verticalSpeed,v:s.airspeed,assist:s.skimAssist,z:s.z,pull:s.pullUp});
  assert.ok([s.x,s.y,s.z,s.pitch,s.airspeed,s.verticalSpeed].every(Number.isFinite));
  if(clear<2.3){out.contact={t,z:s.z,v:s.airspeed};break;}
 }
 return out;
}
const flips=(trace,from,dead=.3)=>{let sign=0,n=0;for(const p of trace){if(p.t<from)continue;const k=p.vs>dead?1:p.vs<-dead?-1:0;if(k&&sign&&k!==sign)n++;if(k)sign=k;}return n;};

test('a fast dive is captured near the 6.5 m target: no plunge, no bounce, within the g limits',()=>{
 for(const height of [20,40,80]){const r=run(()=>0,{start:{y:height},seconds:13});
  const last=r.trace.at(-1);
  assert.ok(r.minClear>4.5,height+' m entry dipped to '+r.minClear);assert.ok(Math.abs(last.clear-SKIM_DEFAULTS.clearance)<.8,'settles at '+last.clear);
  assert.ok(r.s.skimAssist>.9);assert.ok(r.maxVsStep<.3,'vertical speed step '+r.maxVsStep);assert.ok(r.maxLoad<=cfg.loadLimit+.02,'load '+r.maxLoad);
  assert.ok(flips(r.trace,4)<=1,'porpoising after capture');
  console.log('CAPTURE',JSON.stringify({height,minClear:r.minClear,final:last.clear,speed:last.v,maxVsStep:r.maxVsStep,maxLoad:r.maxLoad}));}
});
test('skimming obeys energy: no speed from nothing, a flat skim slows, downhill speeds up, uphill slows down',()=>{
 const flatRun=run(()=>0,{start:{y:8,airspeed:40},seconds:8});assert.ok(flatRun.energyRise<1e-9,'energy never rises in still air');
 assert.ok(flatRun.s.airspeed<36,'flat skim decelerates: '+flatRun.s.airspeed);
 const down=run((x,z)=>-.25*z,{start:{y:8,airspeed:25},seconds:8}),up=run((x,z)=>.12*z,{start:{y:8,airspeed:35},seconds:5});
 assert.ok(down.s.airspeed>27,'downhill gains speed: '+down.s.airspeed);assert.ok(up.s.airspeed<28,'uphill costs speed: '+up.s.airspeed);
 assert.ok(down.minClear>4&&up.minClear>4);
 console.log('ENERGY',JSON.stringify({flat:flatRun.s.airspeed,downhill:down.s.airspeed,uphill:up.s.airspeed}));
});
test('rolling terrain stays clear and smooth, consistently at 30, 60 and 144 FPS',()=>{
 const surface=(x,z)=>6*Math.sin(z/60)+3*Math.sin(z/23);
 const runs=[30,60,144].map(fps=>run(surface,{fps,start:{y:20,airspeed:34},seconds:10}));
 for(const r of runs){assert.ok(r.minClear>4,'min clearance '+r.minClear);assert.ok(r.maxLoad<=cfg.loadLimit+.02);assert.ok(r.contact===null);}
 const [a,,c]=runs;assert.ok(Math.hypot(a.s.x-c.s.x,a.s.y-c.s.y,a.s.z-c.s.z)<2,'30/144 Hz spread');
});
test('S pulls out smoothly: the assist fades over several frames and the glider climbs away',()=>{
 const r=run(()=>0,{start:{y:20,airspeed:36},seconds:10,input:t=>t<6?{pitch:-1}:{pitch:1}});
 const after=r.trace.filter(p=>p.t>6),gone=after.find(p=>p.assist<.05);
 assert.ok(r.maxAssistStep<.08,'assist step per frame '+r.maxAssistStep);assert.ok(gone&&gone.t-6<1.3,'assist released within 1.3 s');
 assert.ok(r.maxVsStep<.3);assert.ok(after.at(-1).clear>20,'zooms away from the ground');assert.ok(r.minClear>4.5);
});
test('releasing W eases the assist out and leaves the glider flying level without a pop',()=>{
 const r=run(()=>0,{start:{y:20,airspeed:36},seconds:10,input:t=>t<6?{pitch:-1}:{}});
 const after=r.trace.filter(p=>p.t>6);let monotone=true;for(let i=1;i<after.length;i++)if(after[i].t>7.5&&after[i].assist>after[i-1].assist+1e-9)monotone=false;
 assert.ok(monotone,'the assist keeps fading once the bar is back');assert.ok(r.maxAssistStep<.08);assert.ok(r.maxVsStep<.3);assert.ok(after.at(-1).clear>3,'holds about level, clear of the ground: '+after.at(-1).clear);
});
test('no assist when disabled, when slow, or without the bar pushed in',()=>{
 const off=run(()=>0,{env:{terrainSkimming:false},start:{y:30},seconds:1});assert.equal(off.s.skimAssist,0);
 const slow=run(()=>0,{start:{y:12,airspeed:11},seconds:1,input:()=>({})});assert.equal(slow.s.skimAssist,0);
 const neutral=run(()=>0,{start:{y:12,airspeed:30},seconds:2,input:()=>({})});assert.equal(neutral.s.skimAssist,0);
});
test('a wall that needs more climb than the limits allow raises PULL UP early and never parks the glider',()=>{
 const wall=(x,z)=>z>=300?150:0,r=run(wall,{start:{y:7,airspeed:30},seconds:24});
 assert.ok(r.contact,'an impossible face is hit, not hovered beside');
 assert.ok(r.firstPullUp!==null&&r.contact.t-r.firstPullUp>=1.5,'warning lead '+(r.firstPullUp&&r.contact.t-r.firstPullUp));
 assert.ok(r.minGroundSpeedSkimming>8,'no braking: '+r.minGroundSpeedSkimming);
 console.log('WALL',JSON.stringify({warnedAt:r.firstPullUp,contactAt:r.contact.t,contactSpeed:r.contact.v}));
});
test('a feasible 18 m crest is followed at speed, with no warning and no contact',()=>{
 const hill=(x,z)=>18*Math.exp(-(((z-180)/60)**2)),r=run(hill,{start:{y:10,airspeed:36},seconds:12});
 assert.ok(r.contact===null&&r.minClear>4,'min clearance '+r.minClear);assert.equal(r.firstPullUp,null);assert.ok(r.maxLoad<=cfg.loadLimit+.02);
});
test('optional surface callback follows water or obstacle tops without steering',()=>{
 const r=run(()=>0,{env:{skimHeight:()=>20},start:{y:60,airspeed:34,heading:.4},seconds:10});
 assert.ok(Math.abs(r.trace.at(-1).clear-SKIM_DEFAULTS.clearance)<.7,'clearance over the raised surface '+r.trace.at(-1).clear);assert.equal(r.s.heading,.4);
});
test('the bank clearance callback raises only the following height',()=>{
 const r=run(()=>0,{env:{skimClearance:()=>9},start:{y:30,airspeed:34},seconds:10});assert.ok(Math.abs(r.trace.at(-1).clear-9)<.7);
});
test('the skim never takes the weight shift away: the wing banks as freely low as high, and a hard roll is a full-bank hook',()=>{
 for(const fps of [30,60,144])for(const sign of [-1,1]){
  const roll=sign*.5,skim=createSoaringState({y:7,airspeed:40,pathAngle:0}),free=createSoaringState({y:5000,airspeed:40,pathAngle:0});
  for(let i=0;i<fps*5;i++){stepSoaring(skim,{pitch:-1,roll},1/fps,flat);stepSoaring(free,{pitch:-1,roll},1/fps,flat);}
  assert.ok(skim.skimAssist>.95,'still skimming '+skim.skimAssist);
  assert.ok(Math.abs(Math.abs(skim.bank)-Math.abs(free.bank))<2*Math.PI/180,'skim bank '+skim.bank*180/Math.PI+' vs free '+free.bank*180/Math.PI);
  const hook=createSoaringState({y:7,airspeed:40,pathAngle:0});let hookBank=0;
  for(let i=0;i<fps*5;i++){stepSoaring(hook,{pitch:-1,roll:sign},1/fps,flat);hookBank=Math.max(hookBank,Math.abs(hook.bank));}
  assert.ok(hookBank*180/Math.PI>55,'hard roll banks fully while skimming: peak '+hookBank*180/Math.PI);
  const before=skim.bank;
  stepSoaring(skim,{pitch:1,roll},1/fps,flat);
  assert.ok(Math.abs(skim.bank-before)<.02,'pulling out must not snap the bank');
 }
});
test('the skim proper is low flying: a high dive is rounded out without the skim bank limit or the HUD skim',()=>{
 for(const fps of [30,60,144]){
  const s=createSoaringState({y:160,airspeed:40,pathAngle:-.45});let assistHigh=0,bankHigh=0,low=Infinity,assistLow=0;
  for(let i=0;i<fps*26;i++){stepSoaring(s,{pitch:-1,roll:i<fps*4?1:0},1/fps,flat);if(s.y>60){assistHigh=Math.max(assistHigh,s.skimAssist);bankHigh=Math.max(bankHigh,Math.abs(s.bank));}else assistLow=Math.max(assistLow,s.skimAssist);low=Math.min(low,s.y);}
  assert.ok(assistHigh<.25,'skimAssist above 60 m: '+assistHigh);assert.ok(bankHigh*180/Math.PI>50,'full bank above 60 m: '+bankHigh*180/Math.PI);
  assert.ok(assistLow>.9&&low>4.5,'then it skims low: '+assistLow+' at '+low);
 }
});
test('PULL UP names the escape: TURN toward the lower side for a face no pull can clear, early, with full bank',()=>{
 for(const side of [1,-1]){
  // A 150 m face ahead and a high ridge on one side (left is +x: a right turn, roll +1, decreases heading).
  const surface=(x,z)=>(z>=260?150:0)+(x*side>40?120:0);
  const s=createSoaringState({y:7,airspeed:30,pathAngle:0}),environment={...flat,terrainHeight:surface};let first=null,reason='',turn=0,bank=0,clearedAt=null,clearFor=0;
  // Turn away as hinted while the warning lasts, then level off (as a pilot would) and judge the escape a second later.
  for(let i=0;i<60*8&&s.y-surface(s.x,s.z)>2.3;i++){
   const t=(i+1)/60,warned=first!==null&&t-first>.4,escaping=warned&&clearedAt===null;stepSoaring(s,escaping?{pitch:0,roll:turn}:warned?{pitch:0}:{pitch:-1},1/60,environment);
   if(s.pullUp&&first===null)first=t;if(first!==null&&!reason&&t-first>.3){reason=s.pullUpReason;turn=s.pullUpTurn;}
   if(first!==null&&clearedAt===null){clearFor=s.pullUp?0:clearFor+1/60;if(clearFor>.6&&t-first>2)clearedAt=t;}
   if(escaping)bank=Math.max(bank,Math.abs(s.bank));
   if(clearedAt!==null&&t-clearedAt>1)break;
  }
  assert.ok(first!==null&&first<2.5,'warned early (face ~8.7 s away): '+first);assert.equal(reason,'energy');assert.equal(turn,side,'turns away from the ridge');
  assert.ok(bank*180/Math.PI>50,'full bank while warned: '+bank*180/Math.PI);assert.ok(s.y-surface(s.x,s.z)>2.3,'the hinted turn escapes');
  console.log('ESCAPE',JSON.stringify({side,warnedAt:first,reason,turn,bank:bank*180/Math.PI}));
 }
 // A fast dive at the ground with the bar neutral (no assist): PULL UP, with S as the escape.
 const dive=createSoaringState({y:30,airspeed:40,pathAngle:-.6});let why='';
 for(let i=0;i<30&&!why;i++){stepSoaring(dive,{},1/60,flat);if(dive.pullUp)why=dive.pullUpReason;}
 assert.equal(why,'g');
});
test('releasing W during a PULL UP keeps the assist holding while the pilot turns away',()=>{
 const wall=(x,z)=>z>=300?150:0,s=createSoaringState({y:7,airspeed:30,pathAngle:0}),environment={...flat,terrainHeight:wall};let release=null,minBlend=1,minClear=Infinity;
 for(let i=0;i<60*6;i++){const t=(i+1)/60;if(s.pullUp&&release===null)release=t+.3;const free=release!==null&&t>release;
  stepSoaring(s,free?{pitch:0,roll:1}:{pitch:-1},1/60,environment);if(free&&t<release+1.4){minBlend=Math.min(minBlend,s.skimBlend);minClear=Math.min(minClear,s.y-wall(s.x,s.z));}}
 assert.ok(release!==null&&minBlend>.5,'assist held after W release: '+minBlend);assert.ok(minClear>4,'clearance while turning '+minClear);
});
test('a long gentle rise that outlasts the energy is not a TURN warning: the glider settles onto the slope',()=>{
 const rise=(x,z)=>Math.max(0,z-150)*.08,r=run(rise,{start:{y:7,airspeed:30},seconds:30});
 assert.equal(r.firstPullUp,null,'no warning for a slope the glider can settle on');
 if(r.contact)assert.ok(r.contact.v<16,'a slow arrival: '+r.contact.v);
});
test('a long paused frame stays finite and capped',()=>{
 const s=createSoaringState({y:8,airspeed:30,pathAngle:0});const z=s.z;stepSoaring(s,{pitch:-1},30,flat);
 assert.ok(s.z-z<8);assert.ok([s.x,s.y,s.z,s.airspeed].every(Number.isFinite));
});
console.log(JSON.stringify({passed},null,2));
