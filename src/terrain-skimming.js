/** Soft terrain-skim assist for the energy-based glider (flight.js).
 *  It only shapes the commanded flight-path angle: holding W fast and low blends the command toward a path that
 *  follows a look-ahead terrain envelope at the target clearance, and a protected floor keeps a minimum clearance.
 *  The path filter, its g limits and the energy equation stay in charge, so it never brakes, parks or teleports the
 *  glider: climbs are paid with speed.
 *  state.skimBlend is the guidance weight (it can engage well above the ground to round a fast dive out gently);
 *  state.skimAssist (0..1, read by the HUD, audio, skim pose and the skim bank limit) is that blend faded out with
 *  height: a skim is low flying.
 *  PULL UP: when the ground ahead needs more climb than the glider can deliver it raises state.pullUp, with
 *  state.pullUpReason 'g' (a full pull, S, clears it) or 'energy' (no pull can: turn away), state.pullUpTurn (+1 right /
 *  D, -1 left / A: the side with the lower ground) and state.pullUpLead (seconds until the conflict). */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
export const SKIM_DEFAULTS=Object.freeze({
 clearance:6.5,        // nominal target clearance (m) when the environment gives no skimClearance
 minClearance:3.6,     // protected floor (m)
 engage:[14,30],       // predicted clearance above the target where the guidance fades in (m)
 hold:[45,75],         // wider window once skimming, so crests and drops do not end a skim
 low:[22,48],          // height above the target clearance where skimAssist (the skim proper) fades out (m)
 speed:[11,13],        // airspeed where it fades in (m/s): about 1.15-1.35 x stall, so a run-in floats until the flare
 preview:.9,           // pursuit time toward the target clearance (s)
 lag:.3,               // path-filter lag the follow law compensates for (s)
 follow:3,             // vertical acceleration used to round out a fast descent onto the ground (m/s²)
 followClimb:1.2,      // ... and, flying level, to anticipate rising ground with an early, gentle climb (m/s²)
 floor:.75,            // share of the pull-up g available to the protected floor
 rise:.25,fall:.7,flareFall:.3, // assist time constants: engage, W released, S pull-out (s)
 level:.2,             // smoothing of skimAssist against fast height changes (s)
 filter:.1,            // low-pass on the follow / floor vertical speeds (s)
 boost:1,              // extra path-filter frequency at full assist (rad/s)
 warnOn:.12,warnOff:.5,// pull-up warning delays (s)
 latch:1.5,            // the assist keeps holding this long after W is released during a PULL UP (s)
 highSkip:320,         // far above the ground and everything ahead: the look-ahead is skipped (m)
 steepRise:.15,        // ground rising more steeply than this (along the track) is a wall, not a slope to settle on
 settleSpeed:18,       // below this ground speed (and sinking gently) a gentle slope ahead is a landing, not a warning (m/s)
});
const TIMES=[.25,.5,.8,1.1,1.5,2,2.6,3.3,4.2],H=new Float64Array(TIMES.length);
// Warning-only look-ahead (sampled at 30 Hz): an unclimbable rise should be flagged while there is room to turn.
const FAR=[5.5,7,9],FAR_PERIOD=1/30;
const TAN_BANK=Math.tan(55*Math.PI/180);

/** Highest ground along a full-bank turn to one side (dir +1 right, -1 left; a right turn decreases heading), sampled
 *  1.5, 3 and 4.5 s out: where turning away would actually take the glider. (Probing farther out, on straight rays to
 *  the side, picked the wrong side more often in Monte Carlo runs on the real terrain.) */
function turnArc(state,sample,dir,v,track,gs){
 const w=9.81*TAN_BANK/Math.max(8,v),dt=.5;let x=state.x,z=state.z,h=track,worst=-Infinity;
 for(let i=1;i<=9;i++){if(i*dt>.7)h-=dir*w*dt;x+=Math.sin(h)*gs*dt;z+=Math.cos(h)*gs*dt;if(i%3===0)worst=Math.max(worst,finite(sample(x,z),-Infinity));}
 return worst;
}

/** Per physics step. k: {v, gamma, heading, headingRate, windX, windZ, lift, bar, command, surface, dt, pullAccel,
 *  hardPullAccel, maxClimb, maxDive, stallSpeed}. Updates the state fields above, returns {command, frequencyBoost}. */
export function skimGuidance(state,k,environment){
 const cfg=SKIM_DEFAULTS,sample=environment.skimHeight||environment.terrainHeight;
 const {v,gamma,heading,headingRate,windX,windZ,lift,bar,command,surface,dt,pullAccel,maxClimb,maxDive,stallSpeed}=k;
 const hardPull=finite(k.hardPullAccel,pullAccel);
 const y=state.y,cg=Math.cos(gamma),gx=Math.sin(heading)*v*cg+windX,gz=Math.cos(heading)*v*cg+windZ,gs=Math.max(1,Math.hypot(gx,gz)),track=Math.atan2(gx,gz);
 const at=t=>{const a=track+headingRate*t*.5,d=gs*t;return finite(sample?.(state.x+Math.sin(a)*d,state.z+Math.cos(a)*d),surface);};
 const vs=v*Math.sin(gamma)+lift,agl=y-surface;
 let blend=finite(state.skimBlend),protect=finite(state.skimProtect);
 // High above the ground and everything ahead: nothing to follow or warn about, so the look-ahead is skipped.
 if(agl>cfg.highSkip&&blend<1e-3&&protect<1e-3&&y-at(TIMES[TIMES.length-1])>cfg.highSkip*.8){
  state.skimBlend=state.skimAssist=state.skimProtect=state.pullUpTime=state.skimLatch=state.pullUpLead=state.pullUpTurn=0;
  state.skimFollow=state.skimFloor=NaN;state.pullUp=false;state.pullUpReason='';
  return {command,frequencyBoost:0};
 }
 // Predicted ground track (an arc at the current turn rate), sampled 0.25..4.2 s ahead.
 for(let i=0;i<TIMES.length;i++)H[i]=at(TIMES[i]);
 const requested=typeof environment.skimClearance==='function'?environment.skimClearance(state):environment.skimClearance;
 const c=Number.isFinite(requested)?clamp(requested,3.5,12):cfg.clearance;
 // Follow: pursue the target clearance at the preview time, and never descend faster than a firm round-out can stop
 // above every sampled point (this also climbs early, gently, for rising ground). A fast descent is rounded out with
 // the firmer follow acceleration, so a dive is captured close to the ground rather than far above it.
 // Heights are measured from where the glider will be, relative to the ground, once the path filter has caught up
 // (lag compensation on the closure rate, so a steady slope is followed at the target clearance, not above it).
 const p=cfg.preview,ep=H[2]+(H[3]-H[2])*(p-TIMES[2])/(TIMES[3]-TIMES[2]),yl=y+(vs-(H[1]-surface)/TIMES[1])*cfg.lag;
 let follow=(ep+c-yl)/p,floor=-Infinity;const aF=cfg.followClimb+(cfg.follow-cfg.followClimb)*smooth(1,8,-vs),aS=cfg.floor*pullAccel;
 for(let i=0;i<TIMES.length;i++){const t=TIMES[i];follow=Math.max(follow,(H[i]+c-yl)/t-.5*aF*t);floor=Math.max(floor,(H[i]+cfg.minClearance-y)/t-.5*aS*t);}
 floor=Math.max(floor,(surface+cfg.minClearance-y)/.25);
 const lp=1-Math.exp(-dt/cfg.filter);
 state.skimFollow=Number.isFinite(state.skimFollow)?state.skimFollow+(follow-state.skimFollow)*lp:follow;
 state.skimFloor=Number.isFinite(state.skimFloor)?state.skimFloor+(floor-state.skimFloor)*lp:floor;
 // Engagement: fast, holding the bar in, and low (or about to be). Fades in and out, never in one step.
 let predicted=agl;for(let i=0;i<8;i++)predicted=Math.min(predicted,y+vs*TIMES[i]-H[i]);
 const win=blend>.5?cfg.hold:cfg.engage,prox=1-smooth(c+win[0],c+win[1],predicted);
 // Releasing W during a PULL UP does not drop the glider: the assist keeps holding while the pilot turns away
 // (S still pulls out at once).
 state.skimLatch=state.pullUp&&blend>.3&&bar<.15?cfg.latch:Math.max(0,finite(state.skimLatch)-dt);
 const hug=Math.max(smooth(.1,.4,-bar),state.skimLatch>0&&bar<.15?1:0),fast=smooth(cfg.speed[0],cfg.speed[1],v),live=state.stalled?0:1;
 const ease=(value,target,tau)=>{tau=tau||(target>value?cfg.rise:bar>.15?cfg.flareFall:cfg.fall);const next=value+(target-value)*(1-Math.exp(-dt/tau));return next<1e-4&&target===0?0:next;};
 blend=state.skimBlend=ease(blend,prox*hug*fast*live);
 protect=state.skimProtect=ease(protect,prox*hug*live);
 // (smoothed against sudden height changes such as a cliff edge, but never above the blend, so S still releases it fast)
 state.skimAssist=Math.min(blend,ease(finite(state.skimAssist),blend*(1-smooth(c+cfg.low[0],c+cfg.low[1],agl)),cfg.level));
 const sinClimb=Math.sin(maxClimb),sinDive=Math.sin(maxDive);
 const followPath=Math.asin(clamp((state.skimFollow-lift)/v,-sinDive,sinClimb)),floorPath=Math.asin(clamp((state.skimFloor-lift)/v,-1,sinClimb));
 let out=command+blend*(followPath-command);out+=protect*Math.max(0,floorPath-out);
 // Pull-up warning. Each point ahead is tested against what the glider can still climb by then: the kinematic limit
 // of the assist's own pull (80% of it, and the climb-angle cap), of a hard pull (S), and the energy limit (80% of the
 // height the speed above 1.2x stall can buy, minus the glide sink, plus some of the lift). Running out of energy on
 // a gentle rise only means a slow arrival on a slope the glider can settle on, so energy conflicts count only where
 // the ground climbs steeply (over steepRise). Only while skimming or flying fast and low: slow ridge soaring and
 // landing flares near slopes are the pilot's business.
 let gLead=Infinity,eLead=Infinity;
 if(v>11&&agl<150&&(protect>.3||v>20)&&!(state.landing>.3)&&!(finite(state.floatWeight)>.3)){
  const capV=v*sinClimb,energy=.8*Math.max(0,(v*v-1.44*stallSpeed*stallSpeed)/(2*9.81)),glide=.7*lift-1.2;
  const climb=(a,t)=>{const tc=Math.max(0,(capV-vs)/a);return t<=tc?vs*t+.5*a*t*t:vs*tc+.5*a*tc*tc+capV*(t-tc);};
  let tp=0,hp=surface;
  const settle=gs<cfg.settleSpeed&&vs>-2.5;
  const test=(t,h)=>{const need=h+3-y,steep=(h-hp)/(gs*(t-tp))>cfg.steepRise;tp=t;hp=h;
   // Slow, gently sinking, onto a gentle slope: that is a (rough) landing, not a crash to warn about.
   if(!steep&&settle)return;
   // Ground below the glider: only a dive too steep to round out in time (pull up).
   if(need<=0){if(need>climb(.8*pullAccel,t))gLead=Math.min(gLead,t);return;}
   if(need>climb(hardPull,t)||steep&&need>energy+glide*t)eLead=Math.min(eLead,t);else if(need>climb(.8*pullAccel,t))gLead=Math.min(gLead,t);};
  for(let i=0;i<TIMES.length;i++)test(TIMES[i],H[i]);
  if(!state.skimFar)state.skimFar=new Array(FAR.length).fill(0);
  if((state.skimFarAge=finite(state.skimFarAge,FAR_PERIOD)+dt)>=FAR_PERIOD){for(let i=0;i<FAR.length;i++)state.skimFar[i]=at(FAR[i]);state.skimFarAge=0;}
  for(let i=0;i<FAR.length;i++)test(FAR[i],state.skimFar[i]);
 }else state.skimFarAge=FAR_PERIOD;
 // A near conflict (under 2.5 s) that a hard pull can clear says PULL UP; one no pull can clear says TURN, and stays
 // TURN while it lasts (pulling cannot fix it; even close in, turning away saves more flights than a pull).
 const lead=Math.min(gLead,eLead);
 let reason=gLead<Math.min(eLead,2.5)?'g':eLead<Infinity?'energy':gLead<Infinity?'g':'';
 if(reason==='g'&&state.pullUp&&state.pullUpReason==='energy')reason='energy';
 state.pullUpTime=clamp(finite(state.pullUpTime)+(reason?dt:-dt*cfg.warnOn/cfg.warnOff),0,cfg.warnOn);
 state.pullUp=state.pullUp?state.pullUpTime>0:state.pullUpTime>=cfg.warnOn;
 if(reason){state.pullUpReason=reason;state.pullUpLead=lead;}
 else if(!state.pullUp){state.pullUpReason='';state.pullUpLead=0;}
 // The escape: compare the ground to each side (4 Hz), sticking with the chosen side unless the other is clearly lower.
 if(state.pullUp&&state.pullUpReason==='energy'&&sample){
  if(!state.pullUpTurn||(state.skimTurnAge=finite(state.skimTurnAge)+dt)>=.25){
   state.skimTurnAge=0;const right=turnArc(state,sample,1,v,track,gs),left=turnArc(state,sample,-1,v,track,gs);
   // Already turning one way: prefer to keep going unless the other side is much lower.
   const bias=-Math.sign(finite(headingRate))*8,margin=state.pullUpTurn?20:0,cur=finite(state.pullUpTurn);
   const score=dir=>(dir>0?right:left)-dir*bias-(dir===cur?margin:0);
   state.pullUpTurn=score(1)<=score(-1)?1:-1;
  }
 }else if(!state.pullUp)state.pullUpTurn=0;
 return {command:out,frequencyBoost:blend*cfg.boost};
}
