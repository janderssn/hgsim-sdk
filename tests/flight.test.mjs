import assert from 'node:assert/strict';
import {createSoaringState, stepSoaring, sinkPolar, sampleSoaringAir, glidePathAngle, barTargetSpeed, judgeTouchdown,
  scoreLanding, stallSpeed, liftCoefficient, dragCoefficient, groundEffectFactor, SOARING_DEFAULTS as cfg} from '../src/flight.js';
const still = {terrainHeight:()=>0, thermals:[], wind:{x:0,z:0}};
const flat = {...still, terrainSkimming:true, skimHeight:()=>0};
const simulate = (state, seconds, input, environment=still, fps=60) => {
  for(let i=0;i<seconds*fps;i++) stepSoaring(state, typeof input==='function'?input(i/fps, state):input, 1/fps, environment);
  return state;
};
const energy = (state)=>cfg.gravity*state.y + state.airspeed*state.airspeed/2;
const deg = r=>r*180/Math.PI, rad = d=>d*Math.PI/180;
const results=[];
function test(name,fn){ fn(); results.push(name); console.log('PASS',name); }
/** Flies until the body touches the ground; returns the touchdown and its score (flat ground unless env says otherwise). */
function landing(state, control, environment=flat, seconds=40){
  for(let i=0;i<seconds*60;i++){
    const feet=state.y-environment.terrainHeight(state.x,state.z)-cfg.footHeight;
    stepSoaring(state, control(i/60, state, feet)||{}, 1/60, environment);
    if(state.y<environment.terrainHeight(state.x,state.z)+2.3){
      const h=state.airspeed*Math.cos(state.pathAngle),vx=Math.sin(state.heading)*h+state.windX,vz=Math.cos(state.heading)*h+state.windZ;
      const score=scoreLanding({verticalSpeed:-state.verticalSpeed,groundSpeed:Math.hypot(vx,vz),bank:state.bank,heading:state.heading,airspeed:state.airspeed,wind:environment.wind,x:state.x,z:state.z,
        flare:{pressed:state.flarePressed,feet:state.flareFeet,ratio:state.flareRatio,balloon:state.flareBalloon,stalled:Number.isFinite(state.flareStallFeet)}},{x:state.x,z:state.z,radius:60});
      return {seconds:(i+1)/60,vertical:-state.verticalSpeed,ground:Math.hypot(vx,vz),airspeed:state.airspeed,...score};
    }
  }
  return null;
}
const holdFrom=h=>{let hold=false;return (t,s,feet)=>{if(!hold&&feet<h)hold=true;return {pitch:hold?1:0};};};

/* ---------- the wing ---------- */
test('the polar is a hang glider: stall near 9.7 m/s, min sink about 1.1 m/s, best glide about 10.5',()=>{
  const vs=stallSpeed();assert.ok(vs>9&&vs<10.5,'stall '+vs);
  let minSink=9,at=0,bestLD=0;for(let v=8;v<=30;v+=.1){const s=sinkPolar(v);if(s<minSink){minSink=s;at=v;}bestLD=Math.max(bestLD,v/s);}
  assert.ok(minSink>0.9&&minSink<1.3,'min sink '+minSink);assert.ok(at>9&&at<12,'min sink speed '+at);assert.ok(bestLD>9&&bestLD<14,'best L/D '+bestLD);
  assert.ok(liftCoefficient(cfg.stallAlpha)>1.3&&liftCoefficient(rad(22))<liftCoefficient(cfg.stallAlpha),'lift falls just past the stall');
  assert.ok(dragCoefficient(rad(30))>0.5,'a stalled sail is a brake');
  assert.ok(groundEffectFactor(1)<0.3&&groundEffectFactor(12)>0.9,'ground effect within a span');
  console.log('POLAR',JSON.stringify({stall:vs,trim:barTargetSpeed(0),fullIn:barTargetSpeed(-1),minSink,minSinkSpeed:at,bestLD}));
});
test('still air only ever dissipates energy, whatever the bar and the weight shift do',()=>{
  const state=createSoaringState({y:2500});let previous=energy(state);
  for(let i=0;i<60*60;i++){
    stepSoaring(state,{roll:Math.sin(i/90)*0.7,pitch:Math.sin(i/80)},1/60,still);
    const current=energy(state);assert.ok(current<previous+1e-7);previous=current;
  }
  assert.ok(state.y<2500);
});
test('trim is steady: the neutral bar settles on the trim speed at the polar sink, with no drift',()=>{
  const state=createSoaringState({y:2000});simulate(state,20,{});
  const trim=barTargetSpeed(0);
  assert.ok(Math.abs(state.airspeed-trim)<0.1,'speed '+state.airspeed+' vs '+trim);
  assert.ok(Math.abs(-state.verticalSpeed-sinkPolar(trim))<0.08,'sink '+state.verticalSpeed+' vs polar '+sinkPolar(trim));
  assert.ok(Math.abs(deg(state.alpha)-deg(cfg.alphaTrim))<0.5);
});

/* ---------- the bar ---------- */
test('pulling in dives: the nose drops away, the speed builds past 100 km/h and the dive settles; letting the bar out zooms without a stall',()=>{
  const state=createSoaringState({y:3000});let maxSpeed=0,steepest=0,zoomTop=0,minAfter=99,stalledAfter=false;
  for(let i=0;i<60*30;i++){stepSoaring(state,{pitch:i<480?-1:0},1/60,still);maxSpeed=Math.max(maxSpeed,state.airspeed);
    if(i<480)steepest=Math.min(steepest,state.pathAngle);else{zoomTop=Math.max(zoomTop,state.pathAngle);minAfter=Math.min(minAfter,state.airspeed);stalledAfter||=state.stalled;}}
  assert.ok(maxSpeed*3.6>140&&maxSpeed*3.6<215,'max '+maxSpeed*3.6+' km/h');
  assert.ok(steepest<-rad(30)&&steepest>-rad(85),'steepest '+deg(steepest));
  assert.ok(zoomTop<rad(8),'a free bar carries the speed about level, it does not climb away: '+deg(zoomTop));
  assert.ok(minAfter>2.5&&!state.stalled&&state.airspeed>11,'a dumped bar zooms hard (and may stall over the top) but the wing is flying again within 12 s: min '+minAfter+', now '+state.airspeed);
  console.log('DIVE',JSON.stringify({maxKmh:maxSpeed*3.6,steepestDeg:deg(steepest),zoomTopDeg:deg(zoomTop),minSpeedAfter:minAfter}));
});
test('speed in hand is yours to spend: from 30 m/s a neutral bar holds about level and S zooms it into height',()=>{
  const climb=pitch=>{const s=createSoaringState({y:2000,airspeed:30,pathAngle:0});let top=2000;for(let i=0;i<60*12;i++){stepSoaring(s,{pitch},1/60,still);top=Math.max(top,s.y);}return top-2000;};
  const neutral=climb(0),pushed=climb(1);
  assert.ok(neutral<6,'neutral carries the speed flat: '+neutral);assert.ok(pushed>15&&pushed<36,'S zooms it into height: '+pushed);
  console.log('ZOOM',JSON.stringify({neutral,pushed,ideal:(900-barTargetSpeed(0)**2)/(2*cfg.gravity)}));
});
test('holding the bar fully out at height breaks into a stall: the nose drops, speed returns, and pulling in recovers',()=>{
  const state=createSoaringState({y:2000});let breakAt=null,lowest=0,sink=0,slowFor=0;
  for(let i=0;i<60*8;i++){stepSoaring(state,{pitch:1},1/60,still);if(breakAt===null&&state.stalled)breakAt=i/60;lowest=Math.min(lowest,state.pathAngle);sink=Math.min(sink,state.verticalSpeed);if(state.airspeed<8)slowFor+=1/60;}
  assert.ok(breakAt!==null&&breakAt<5,'stalls within 5 s: '+breakAt);assert.ok(lowest<-rad(20),'the nose drops: '+deg(lowest));assert.ok(sink<-3&&sink>-8,'sink '+sink);
  assert.ok(slowFor<1.5,'it does not hang near zero speed: '+slowFor+' s under 8 m/s');
  simulate(state,3,{pitch:-1});assert.ok(!state.stalled,'pulling in recovers');
  console.log('STALL',JSON.stringify({breakAt,noseDeg:deg(lowest),sink,slowFor}));
});
test('binary bar input is slewed, and the push-out is slower when fast (bar pressure)',()=>{
  const slow=createSoaringState({y:2000,airspeed:11,pathAngle:0}),fast=createSoaringState({y:2000,airspeed:25,pathAngle:0});
  let tSlow=null,tFast=null;
  for(let i=1;i<=240;i++){stepSoaring(slow,{pitch:1},1/120,still);stepSoaring(fast,{pitch:1},1/120,still);if(tSlow===null&&slow.bar>=1-1e-9)tSlow=i/120;if(tFast===null&&fast.bar>=1-1e-9)tFast=i/120;}
  assert.ok(tSlow!==null&&tSlow<1,'full push-out near stall in '+tSlow+' s');assert.ok(tFast===null||tFast>tSlow*1.4,'slower at speed: '+tFast+' vs '+tSlow);
});

/* ---------- weight shift and turns ---------- */
test('right input banks promptly and decreases heading in the scene convention; release levels the wing',()=>{
  const state=createSoaringState();
  stepSoaring(state,{roll:1},1/60,still);assert.ok(state.bank>0&&state.bank<rad(2));
  simulate(state,3,{roll:1});assert.ok(state.heading<0);assert.ok(state.bank<=cfg.maxBank+1e-6);
  const small=createSoaringState();simulate(small,8,{roll:.12});assert.ok(small.bank<rad(4));
  simulate(state,5,{});assert.ok(Math.abs(state.bank)<rad(1),'levels on release: '+deg(state.bank));
});
test('full input reaches 45 degrees in about a second and a half; a 360 at full bank takes 6-9 s and never stalls at neutral bar',()=>{
  const state=createSoaringState({y:2000});let at45=null,turned=0,prev=state.heading,t360=null,stalled=false;
  for(let i=0;i<60*15;i++){stepSoaring(state,{roll:1},1/60,still);const t=(i+1)/60;if(at45===null&&state.bank>rad(45))at45=t;
    let d=state.heading-prev;d=Math.atan2(Math.sin(d),Math.cos(d));prev=state.heading;turned+=Math.abs(d);if(t360===null&&turned>=2*Math.PI)t360=t;stalled||=state.stalled;}
  assert.ok(at45!==null&&at45>0.8&&at45<2.2,'45 degrees at '+at45);assert.ok(t360!==null&&t360>6&&t360<9,'360 in '+t360);assert.ok(!stalled);
  console.log('TURN',JSON.stringify({at45,t360,bank:deg(state.bank),speed:state.airspeed,sink:state.verticalSpeed}));
});
test('a steep bank at neutral bar does not stall: the nose drops, the speed builds and the sink grows; pushing out in it does stall',()=>{
  const neutral=createSoaringState({y:2000});simulate(neutral,15,{roll:1});
  assert.ok(!neutral.stalled&&neutral.airspeed>barTargetSpeed(0)+2,'speed builds in the bank: '+neutral.airspeed);
  assert.ok(neutral.verticalSpeed<-2,'sink grows: '+neutral.verticalSpeed);
  const pushed=createSoaringState({y:2000});let stalled=false;simulate(pushed,15,(t,s)=>{if(t>3)stalled||=s.stalled;return {roll:1,pitch:.6};});
  assert.ok(stalled,'pushing out in a 60 degree bank stalls (banked stall speed '+pushed.stallSpeed+')');
  simulate(pushed,6,{pitch:-1});assert.ok(!pushed.stalled,'W recovers');
});

/* ---------- air ---------- */
test('circling in a strong thermal with a little push-out climbs steadily without stalling',()=>{
  const env={...still,thermals:[{x:0,z:0,radius:240,strength:6}]};
  const state=createSoaringState({y:1700});let stalled=false;simulate(state,60,(t,s)=>{stalled||=s.stalled;return {roll:.85,pitch:.2};},env);
  assert.ok(!stalled);assert.ok(state.y>1850,'climb '+(state.y-1700));
  const plain=createSoaringState({y:1700});simulate(plain,60,{roll:1},env);assert.ok(plain.y>1760,'even a full-bank neutral circle climbs '+(plain.y-1700));
  console.log('THERMAL',JSON.stringify({climbPerSecond:(state.y-1700)/60,speed:state.airspeed,bank:deg(state.bank)}));
});
test('windward ridge lifts while reversed wind sinks on the lee and cliff spikes stay bounded',()=>{
  const uphill={terrainHeight:(x)=>x*.7,wind:{x:5,z:0}};
  const air=sampleSoaringAir(0,100,0,uphill);assert.ok(air.ridgeLift>2);
  const lee=sampleSoaringAir(0,100,0,{...uphill,wind:{x:-5,z:0}}).ridgeLift;assert.ok(lee<0&&lee>-air.ridgeLift);
  const state=createSoaringState({y:100});simulate(state,15,{},uphill);assert.ok(state.y>110);   // 5 m/s up a 35° slope, 100 m above it: a slow climb
  const spike=sampleSoaringAir(0,1,0,{terrainHeight:(x)=>x>0?100000:0,wind:{x:100,z:0}});
  assert.ok(spike.ridgeLift<=7);
  assert.ok(sampleSoaringAir(0,1200,0,uphill).ridgeLift<air.ridgeLift*.05);
});
test('wind advects ground motion without changing trimmed airspeed',()=>{
  const state=createSoaringState();simulate(state,10,{}, {...still,wind:{x:3,z:-1}});
  const trim=barTargetSpeed(0),along=trim*Math.cos(glidePathAngle(trim))*10;
  assert.ok(Math.abs(state.x-30)<0.05);assert.ok(Math.abs(state.z-(along-10))<0.6);
  assert.ok(Math.abs(state.airspeed-trim)<0.05);
});
test('thermals fade at altitude ceiling and bank adds sink at trim',()=>{
  const env={thermals:[{x:0,z:0,radius:200,strength:7}]};
  assert.equal(sampleSoaringAir(0,cfg.thermalCeiling,0,env).thermalLift,0);
  assert.ok(sampleSoaringAir(0,(cfg.thermalFadeStart+cfg.thermalCeiling)/2,0,env).thermalLift<7);
  assert.ok(sinkPolar(16,cfg.maxBank)>sinkPolar(16,0));
});
test('compact worlds can lower thermal ceiling without changing default lift',()=>{
  const env={...still,thermals:[{x:0,z:0,radius:200,strength:7}]};
  assert.equal(sampleSoaringAir(0,1889.5,0,{...env,thermalCeiling:1889.5,thermalFadeStart:1589.5}).thermalLift,0);
  assert.equal(sampleSoaringAir(0,1889.5,0,{...env,thermalCeiling:1889.5}).thermalLift,0);
  assert.equal(sampleSoaringAir(0,1889.5,0,env).thermalLift,7);
});

/* ---------- frame rate ---------- */
test('flight is stable across 30 and 144 FPS and long pauses are capped',()=>{
  const env={...still,thermals:[{x:-80,z:50,radius:180,strength:5}],wind:{x:2,z:.3}};
  const a=simulate(createSoaringState(),20,{roll:.65,pitch:-.2},env,30);
  const b=simulate(createSoaringState(),20,{roll:.65,pitch:-.2},env,144);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<3,'30/144 Hz spread '+Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z));
  const paused=createSoaringState();stepSoaring(paused,{},30,still);assert.ok(paused.z<=4.01);
});

/* ---------- landing ---------- */
test('touchdown judgement: soft, firm, rough and crash bands on contact speed, ground speed, slope and bank',()=>{
  assert.equal(judgeTouchdown({verticalSpeed:1.2,groundSpeed:6}),'soft');
  assert.equal(judgeTouchdown({verticalSpeed:1.5,groundSpeed:8}),'soft');
  assert.equal(judgeTouchdown({verticalSpeed:2.5,groundSpeed:9}),'firm');
  assert.equal(judgeTouchdown({verticalSpeed:1,groundSpeed:9.5}),'firm');
  assert.equal(judgeTouchdown({verticalSpeed:1,groundSpeed:12}),'rough');
  assert.equal(judgeTouchdown({verticalSpeed:5,groundSpeed:5}),'crash');
  assert.equal(judgeTouchdown({verticalSpeed:1,groundSpeed:20}),'crash');
  assert.equal(judgeTouchdown({verticalSpeed:1,groundSpeed:5,slope:.5}),'crash');
  assert.equal(judgeTouchdown({verticalSpeed:1,groundSpeed:5,bank:.6}),'crash');
});
/** A human-rate pilot (keys updated 10 times a second, S on or off): feathers S low in ground effect, then holds it to flare. */
const feather=({holdFeet=1,flareRatio=1.25,flareFeet=.6}={})=>{let key=0,flared=false,n=0;return (t,s,feet)=>{if(n++%6===0){if(!flared&&feet<flareFeet&&s.airspeed/stallSpeed()<flareRatio)flared=true;key=flared?1:feet<3.5&&(feet<holdFeet||s.verticalSpeed<-.5)?1:0;}return {pitch:key};};};
test('no automatic landing rules: the same input gives the same bar whatever the height, so S cannot round out for you',()=>{
  const low=createSoaringState({y:4,airspeed:13,pathAngle:0}),high=createSoaringState({y:1500,airspeed:13,pathAngle:0});
  for(let i=0;i<60;i++){stepSoaring(low,{pitch:1,landable:true,ground:true},1/60,still);stepSoaring(high,{pitch:1,landable:true},1/60,still);}
  assert.ok(Math.abs(low.bar-high.bar)<.05,'bar '+low.bar+' vs '+high.bar);assert.ok(Math.abs(low.alpha-high.alpha)<rad(1.5),'alpha '+deg(low.alpha)+' vs '+deg(high.alpha));
});
test('never pushing out skids in at trim; holding S from too high stalls and drops in hard',()=>{
  const none=landing(createSoaringState({y:20}),()=>({}));assert.ok(none&&none.ground>11&&none.notes.includes('No flare'),'no flare: '+JSON.stringify(none));
  const high=landing(createSoaringState({y:20}),holdFrom(7));assert.ok(high&&high.vertical>2.2,'from 7 m: '+JSON.stringify(high));
  console.log('NOFLARE',JSON.stringify({none,high}));
});
test('the landing window can be judged by eye: holding S on final from 1.5-2 m is soft, 3 m firm, under 1 m a fast skid, 8 m a crash',()=>{
  for(const h of [1.5,2]){const r=landing(createSoaringState({y:25}),holdFrom(h));assert.ok(r&&r.judged==='soft','from '+h+' m: '+JSON.stringify(r));}
  const firm=landing(createSoaringState({y:25}),holdFrom(3));assert.equal(firm.judged,'firm');
  const late=landing(createSoaringState({y:25}),holdFrom(.5));assert.ok(late.ground>10,'late skids: '+late.ground);
  const high=landing(createSoaringState({y:25}),holdFrom(8));assert.equal(high.judged,'crash');
  const into=landing(createSoaringState({y:25}),holdFrom(2),{...flat,wind:{x:0,z:-4}});assert.ok(into.noStep,'a headwind makes it a no-stepper: '+JSON.stringify(into));
  const down=landing(createSoaringState({y:25}),holdFrom(2),{...flat,wind:{x:0,z:4}});assert.ok(down.judged!=='soft'&&down.ground>10,'downwind: '+JSON.stringify(down));
});
test('near the stall the wing is heavy: a quarter turn takes longer and banks less than at trim',()=>{
  const quarter=(airspeed,pitch)=>{const s=createSoaringState({y:3000,airspeed,pathAngle:0});let turned=0,prev=0;for(let i=0;i<1200;i++){stepSoaring(s,{roll:1,pitch},1/60,still);let d=s.heading-prev;d=Math.atan2(Math.sin(d),Math.cos(d));prev=s.heading;turned+=Math.abs(d);if(turned>=Math.PI/2)return {t:i/60,bank:Math.abs(s.bank)};}return {t:20,bank:0};};
  const slow=quarter(stallSpeed()*1.02,.55),trim=quarter(barTargetSpeed(0),0);
  assert.ok(slow.t>trim.t+.7,'slow '+slow.t+' vs trim '+trim.t);assert.ok(slow.bank<trim.bank-rad(8),'bank '+deg(slow.bank)+' vs '+deg(trim.bank));
});
test('tapping A and D stays smooth: the roll spring never moves more than a degree a frame',()=>{
  const s=createSoaringState({y:2000});let last=s.bank,max=0;
  for(let i=0;i<60*10;i++){stepSoaring(s,{roll:Math.floor(i/12)%2?1:0},1/60,still);max=Math.max(max,Math.abs(s.bank-last));last=s.bank;}
  assert.ok(deg(max)<1,'bank step '+deg(max));
});
test('a hard roll out of a fast low skim is a wingover hook: 180 degrees in under 6 s, speed spent, never into the ground',()=>{
  const state=createSoaringState({y:6+cfg.footHeight,airspeed:35,pathAngle:0});let phase='run',turned=0,prev=0,tHook=0,tDone=null,vDone=null,maxBank=0,minFeet=99;
  landing(state,(t,st,feet)=>{if(phase==='run'&&t>1.5){phase='hook';tHook=t;prev=st.heading;}
    if(phase==='hook'){minFeet=Math.min(minFeet,feet);maxBank=Math.max(maxBank,Math.abs(st.bank));let d=st.heading-prev;d=Math.atan2(Math.sin(d),Math.cos(d));prev=st.heading;turned+=Math.abs(d);if(turned>=Math.PI){phase='out';tDone=t;vDone=st.airspeed;}}
    return phase==='run'?{pitch:-1}:phase==='hook'?{roll:1}:{};},flat,30);
  assert.ok(tDone!==null&&tDone-tHook<6,'hook of '+(tDone-tHook)+' s');assert.ok(deg(maxBank)>55,'full bank: '+deg(maxBank));
  assert.ok(vDone<24,'comes out slow: '+vDone);assert.ok(minFeet>2,'stays off the ground: '+minFeet);
  console.log('HOOK',JSON.stringify({seconds:tDone-tHook,maxBankDeg:deg(maxBank),speedAfter:vDone,minFeet}));
});
test('landing score: no-stepper, headwind and bullseye points; flare notes',()=>{
  const best=scoreLanding({verticalSpeed:1,groundSpeed:2,heading:0,wind:{x:0,z:-4},x:0,z:0,flare:{pressed:true,feet:1.2,ratio:1.1,balloon:0,stalled:true}},{x:0,z:0,radius:60});
  assert.ok(best.noStep&&best.stars===3&&best.notes.includes('Bullseye')&&best.notes.includes('Into wind'),JSON.stringify(best));
  const balloon=scoreLanding({verticalSpeed:3,groundSpeed:7,heading:0,wind:{x:0,z:0},x:0,z:0,flare:{pressed:true,feet:2,ratio:1.6,balloon:1,stalled:true}});
  assert.ok(balloon.notes.includes('Flared too early'));
  assert.equal(scoreLanding({verticalSpeed:1,groundSpeed:12,heading:0,x:0,z:0,flare:{pressed:false}}).notes.includes('No flare'),true);
});
test('a final can be flown down: over landable ground W descends at landing speed and hands off does not climb; elsewhere the assist still holds',()=>{
  const fly=(pitch,ground,kmh)=>{const s=createSoaringState({y:6.5});s.airspeed=kmh/3.6;s.pathAngle=0;s.alpha=2*Math.PI/180;let t=0,peak=s.y;for(;t<12&&s.y>2.3;t+=1/60){stepSoaring(s,{roll:0,pitch,landable:ground,ground},1/60,flat);peak=Math.max(peak,s.y);}return {t,y:s.y,peak};};
  assert.ok(fly(-1,true,70).t<3,'W reaches the field at 70 km/h');
  assert.ok(fly(-1,false,70).t>6,'off a landable field the assist still holds it up');
  const hands=fly(0,true,80);assert.ok(hands.peak<7&&hands.y<4,'hands off settles: '+JSON.stringify(hands));
});
test('a slow final does not float: low over landable ground a hands-off wing comes down sooner, and arrives rough rather than crashing',()=>{
  const fly=ground=>{const s=createSoaringState({y:7.3});s.airspeed=55/3.6;s.pathAngle=0;s.alpha=6*Math.PI/180;let t=0;for(;t<30&&s.y>2.3;t+=1/60)stepSoaring(s,{roll:0,pitch:0,landable:ground,ground},1/60,still);return {t,sink:-s.verticalSpeed,speed:s.airspeed};};
  const field=fly(true),elsewhere=fly(false);
  assert.ok(field.t<7&&elsewhere.t>field.t+2,'float '+JSON.stringify({field,elsewhere}));
  assert.notEqual(judgeTouchdown({verticalSpeed:field.sink,groundSpeed:field.speed}),'crash');
});
test('a tailwind over 1 m/s is too fast to run out unless the flare was very good, and the margin shrinks as it grows',()=>{
  const j=(air,tail,vertical=1)=>judgeTouchdown({verticalSpeed:vertical,groundSpeed:air+tail,tailwind:tail});
  assert.equal(j(7.5,1),'soft');assert.notEqual(j(13,1),'crash','up to 1 m/s nothing changes');
  assert.equal(j(13,1.5),'crash','no flare');assert.equal(j(8.8,2),'crash','an ordinary flare');assert.notEqual(j(7.5,2),'crash','a good flare can be run out');
  assert.equal(j(7.5,4),'crash','the same flare is not enough with more tailwind');assert.notEqual(j(6.5,4),'crash','a very slow one still is');assert.equal(j(7,3,2.4),'crash','sinking hard as well');
  assert.notEqual(judgeTouchdown({verticalSpeed:1,groundSpeed:9,tailwind:-4}),'crash','a headwind is not a tailwind');
  const scored=scoreLanding({verticalSpeed:1,groundSpeed:14,heading:0,airspeed:11,wind:{x:0,z:3}});assert.equal(scored.judged,'crash','the score reads the tailwind from heading and wind');
});
test('skimming has fine control: taps and small stick trim the last metres, a held press still acts, nothing holds the height, a steep dive is untouched',()=>{
  const level=(kmh,h)=>{const s=createSoaringState({y:h+2.3});s.airspeed=kmh/3.6;s.pathAngle=0;s.alpha=(cfg.zeroLiftAlpha+(cfg.mass*9.81/(.5*cfg.airDensity*s.airspeed**2*cfg.wingArea))/cfg.liftSlope);return s;};
  const fly=(kmh,h,pitch,press,seconds=3)=>{const s=level(kmh,h);let low=h,high=h,t=0;for(;t<seconds&&s.y>2.3;t+=1/60){const g=s.y<14;stepSoaring(s,{roll:0,pitch:t<press?pitch:0,landable:g,ground:g},1/60,still);low=Math.min(low,s.y-2.3);high=Math.max(high,s.y-2.3);}return {low,high,hit:s.y<=2.3,t};};
  const hands=fly(130,3,0,0);assert.ok(hands.low>1.8&&hands.high<3.3,'hands off stays near its height '+JSON.stringify(hands));
  const tap=fly(130,3,-1,.1),stick=fly(130,3,-.3,1);assert.ok(!tap.hit&&hands.low-tap.low<.4,'a W tap is a small change '+JSON.stringify(tap));assert.ok(tap.low<hands.low,'but it does something');assert.ok(!stick.hit&&stick.low<hands.low-.3,'small stick trims down '+JSON.stringify(stick));
  assert.ok(fly(130,3,-1,3).hit,'W held still flies into the ground');assert.ok(fly(130,3,1,1).high>6,'S held pulls up within a second');
  assert.equal(fineTerrainFree(),true);
  function fineTerrainFree(){const a=createSoaringState({y:60}),b=createSoaringState({y:600});for(const s of [a,b]){s.airspeed=30;s.pathAngle=-35*Math.PI/180;s.bar=-1;s.alpha=cfg.alphaMin;}let sinkA=0,sinkB=0;for(let i=0;i<30&&a.y>12;i++){stepSoaring(a,{roll:0,pitch:-1},1/60,still);stepSoaring(b,{roll:0,pitch:-1},1/60,{...still,terrainHeight:()=>0});sinkA=a.verticalSpeed;sinkB=b.verticalSpeed;}return Math.abs(sinkA-sinkB)<.5;}
});
console.log(JSON.stringify({passed:results.length,tests:results},null,2));
