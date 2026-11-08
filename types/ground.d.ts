/**
 * hgsim/ground: vehicles on the ground, on the same world, clock, poses and events as the air vehicles in hgsim.
 */
import type { World, Vehicle, VehicleEventMap } from './index.js';
import type { WalkerConfig } from './configs.js';
export type { WalkerConfig } from './configs.js';


export interface WalkerInput {
  /** -1 back .. +1 ahead: a gentle stick walks, full stick runs. */
  forward?: number;
  /** -1 left .. +1 right. */
  turn?: number;
  /** A heading to turn toward, instead of turn. */
  face?: number;
  strafe?: number;
  sprint?: boolean;
  jump?: boolean;
}
export type WalkerPhase = 'stand' | 'walk' | 'run' | 'sprint' | 'slide' | 'fall' | 'down';
export interface WalkerEventMap extends VehicleEventMap {
  airborne: { type: 'airborne'; reason: 'ledge' | 'jump' };
  touchdown: { type: 'touchdown'; impact: number; water: boolean };
  crash: { type: 'crash'; kind: 'fall'; impact: number; water: boolean };
  blocked: { type: 'blocked'; by: 'water' | 'solid' | 'slope' | 'drop' | 'bounds' };
}
export interface WalkerState {
  x: number; y: number; z: number; heading: number; vx: number; vy: number; vz: number;
  onGround: boolean; phase: WalkerPhase; stride: number; blocked: WalkerEventMap['blocked']['by'] | null; downFor: number; material: string;
  /** The position that triggered blocked. Older snapshots may omit it. */
  blockedAt?: { x: number; z: number } | null;
}
export interface Walker extends Vehicle<WalkerInput, WalkerEventMap> {
  readonly kind: 'walker';
  readonly world: World;
  readonly config: WalkerConfig;
  readonly phase: WalkerPhase;
  readonly blocked: WalkerEventMap['blocked']['by'] | null;
  /** The drawn stride's phase, 0..1 per two steps. */
  readonly stride: number;
  readonly speed: number;
  place(where?: { x?: number; y?: number; z?: number; heading?: number }): this;
  state(): WalkerState;
  restore(state: WalkerState): this;
}
export const WALKER_DEFAULTS: WalkerConfig;
export const WALKER_EVENTS: readonly (keyof WalkerEventMap)[];
export function createWalker(options: { world: World; at?: { x?: number; y?: number; z?: number; heading?: number }; config?: Partial<WalkerConfig> }): Walker;

