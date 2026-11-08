/** Visual-only terrain alignment for the terrain-skimming assist: state.visualBank, the bank to draw (the wing follows a side
 *  slope it skims). Flight bank and heading remain authoritative. world: createWorld (its heightAt is read). */
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const rad=degrees=>degrees*Math.PI/180;
const smooth=(a,b,value)=>{const t=clamp((value-a)/(b-a),0,1);return t*t*(3-2*t);};
const poses=new WeakMap();

function terrainFrame(state,world){
 const x=finite(state.x),z=finite(state.z),heading=finite(state.heading);
 const sample=(px,pz)=>finite(world.heightAt(px,pz));
 const ground=sample(x,z),rightX=Math.cos(heading)*7,rightZ=-Math.sin(heading)*7;
 const terrainBank=Math.atan2(sample(x+rightX,z+rightZ)-sample(x-rightX,z-rightZ),14);
 return {ground,terrainBank};
}
function targetCorrection(state,frame){
 const near=1-smooth(20,55,finite(state.y)-frame.ground);
 const assist=clamp(finite(state.skimAssist),0,1);
 return clamp(frame.terrainBank,-rad(35),rad(35))*.70*near*assist;
}
function composeBank(state,correction){
 const bank=finite(state.bank),manual=1-smooth(rad(20),rad(55),Math.abs(bank));
 // Keep the complete commanded turn. Terrain contributes an additive residual,
 // never an average that would weaken a flat-ground bank.
 const limit=Math.max(rad(35),Math.abs(bank));
 return clamp(bank+correction*manual,-limit,limit);
}

export function updateSkimPose(state,dt,world){
 const bank=finite(state.bank);
 if(state.mode&&state.mode!=='gliding'){
  poses.delete(state);state.visualBank=bank;return bank;
 }
 const frame=terrainFrame(state,world),target=targetCorrection(state,frame);
 const previous=poses.get(state)||0,entering=Math.abs(target)>Math.abs(previous)&&target*previous>=0;
 const alpha=1-Math.exp(-Math.max(0,finite(dt))/(entering?.09:.18));
 let correction=previous+(target-previous)*alpha;
 if(Math.abs(correction)<1e-7)correction=0;
 poses.set(state,correction);
 state.visualBank=composeBank(state,correction);
 return state.visualBank;
}

/** Skim target clearance for createGlider({ skim: { clearance: bankedClearance } }): the nominal 6.5 m body clearance plus a wing-tip allowance when the wing is banked
 *  relative to the slope below it (a level wing over a side slope it is aligned with needs none). */
export const SKIM_CLEARANCE=6.5;
export function bankedClearance(state,world){
 const frame=terrainFrame(state,world);
 const visualBank=Number.isFinite(state.visualBank)?state.visualBank:composeBank(state,targetCorrection(state,frame));
 const extra=7.2*Math.abs(Math.sin(visualBank-frame.terrainBank))-2.5;
 return SKIM_CLEARANCE+clamp(extra,0,4.5);
}
