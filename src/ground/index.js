/**
 * hgsim/ground: moving on the ground, beside the air vehicles in hgsim. Ground vehicles share the world (World.groundAt, materialAt,
 * waterAt, solidAt, inBounds), the clock, poses and events with the hang glider, and the same contract (docs/vehicles.md).
 *
 *   import { createWalker } from 'hgsim/ground';
 *   const walker = createWalker({ world, at: { x, z, heading } });
 */
export { createWalker, WALKER_DEFAULTS, WALKER_EVENTS } from './walker.js';
