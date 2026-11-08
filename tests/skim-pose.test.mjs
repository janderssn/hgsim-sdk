import assert from 'node:assert/strict';
import {updateSkimPose,bankedClearance as getSkimClearance,SKIM_CLEARANCE} from '../src/assists/skim-pose.js';
let passed=0;const rad=d=>d*Math.PI/180;
function test(name,fn){fn();passed++;console.log('PASS',name);}
const base=overrides=>({x:0,y:10,z:0,heading:0,bank:0,skimAssist:1,...overrides});
function settle(state,environment,seconds=2){for(let t=0;t<seconds;t+=.01)updateSkimPose(state,.01,environment);return state.visualBank;}
test('heading zero tilts right wing upward on positive east slope',()=>{const s=base();assert.ok(Math.abs(settle(s,{heightAt:x=>x*.3})-Math.atan(.3)*.7)<1e-6);});
test('heading ninety samples its right wing toward north with correct sign',()=>{const s=base({heading:Math.PI/2});assert.ok(Math.abs(settle(s,{heightAt:(x,z)=>z*.3})+Math.atan(.3)*.7)<1e-6);});
test('pose never changes physics state and flat ground preserves the entire manual turn',()=>{const s=base({bank:rad(30),heading:.7}),before={...s};assert.equal(settle(s,{heightAt:()=>0}),s.bank);const {visualBank,...after}=s;assert.deepEqual(after,before);});
test('high flight and inactive assist start with unchanged physics bank',()=>{for(const overrides of [{y:60,bank:.2},{skimAssist:0,bank:-.2}]){const s=base(overrides);assert.equal(settle(s,{heightAt:x=>x*.5}),s.bank);}});
test('terrain correction caps its target and yields to strong manual bank',()=>{const steep={heightAt:x=>x*10},level=base();assert.ok(settle(level,steep)<=rad(35)*.7+1e-8);const turning=base({bank:rad(55)});assert.equal(settle(turning,steep),turning.bank);});
test('correction eases in at .09 seconds and out at .18 without snapping',()=>{const s=base(),env={heightAt:x=>x*.3},target=Math.atan(.3)*.7;assert.ok(Math.abs(updateSkimPose(s,.09,env)-target*(1-Math.exp(-1)))<1e-8);settle(s,env);const before=s.visualBank;s.y=60;const after=updateSkimPose(s,.18,env);assert.ok(Math.abs(after-before*Math.exp(-1))<1e-7);});
test('outside-flight reset returns actual bank immediately',()=>{const s=base();settle(s,{heightAt:x=>x*.4});s.mode='foot';s.bank=.1;assert.equal(updateSkimPose(s,.01,{heightAt:x=>x*.4}),.1);});
test('level wings get nominal clearance while full bank gets wing-tip allowance',()=>{assert.equal(SKIM_CLEARANCE,6.5);assert.equal(getSkimClearance(base(),{heightAt:()=>0}),SKIM_CLEARANCE);const s=base({bank:rad(55),visualBank:rad(55)});assert.ok(Math.abs(getSkimClearance(s,{heightAt:()=>0})-(SKIM_CLEARANCE+7.2*Math.sin(rad(55))-2.5))<1e-10);});
test('slope-aligned wings stay low and extreme terrain clearance stays bounded',()=>{const aligned=base({visualBank:Math.atan(.5)});assert.equal(getSkimClearance(aligned,{heightAt:x=>x*.5}),SKIM_CLEARANCE);for(const bank of [-Math.PI,0,Math.PI]){const value=getSkimClearance(base({visualBank:bank}),{heightAt:x=>x*100});assert.ok(value>=SKIM_CLEARANCE&&value<=SKIM_CLEARANCE+4.5);}});
console.log(JSON.stringify({passed},null,2));
