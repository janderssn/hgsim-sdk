/**
 * hgsim/three: Three.js presentation for hgsim. Visual only: nothing here touches the flight. Each function takes the THREE
 * namespace as its first argument, so hgsim never imports three itself.
 */
type Three = any;   // (the three namespace: hgsim does not depend on its types)
type Point3 = { x: number; y: number; z: number };

export interface PilotRigInput {
  /** -1..1, + pulled in (the opposite of the flight state's bar). */
  bar?: number; shift?: number;
  /** 0 prone .. 1 upright. */
  upright?: number;
  run?: number; speed?: number; lift?: number; carry?: number; grip?: number; lean?: number; shoulders?: number;
  standRoll?: number; standYaw?: number; level?: number; ground?: number; tilt?: number; plant?: number;
  crashed?: number; swing?: number; quick?: boolean; handGap?: number;
}
export interface PilotRig {
  update(dt: number, input: PilotRigInput, snap?: boolean): void;
  readonly feetPoint: Point3;
  readonly footContacts: readonly Point3[];
  readonly barContacts: readonly Point3[];
  readonly lowest: number; readonly step: number; readonly upright: number; readonly hands: [number, number, number];
}
/** Poses the skinned pilot of hang-glider.glb every frame. */
export function createPilotRig(THREE: Three, pilot: object): PilotRig | null;
/** Sail flutter with speed and at the stall, on the wing's material. */
export function addSailFlutter(wing: object): { update(dt: number, state?: { speed?: number; stall?: number }): void } | null;
/** Adds clip-on tires to the pilot frame using the rig's base-bar points. */
export function attachBasebarWheels(THREE: Three, pilot: object, barContacts: PilotRig['barContacts']): {
  centers: Point3[]; radius: number; halfWidth: number; treads: { rotateX(angle: number): unknown }[];
};

export interface LandingCuesFrame {
  flying: boolean; x: number; z: number; ground: number; feet: number; speedRatio: number; bar: number; sink: number; landable: boolean;
  speed?: number; dropToImpact?: number | null;
  /** Where this wing flares softly at this airspeed (glider.flareZone().at(airspeed)); undefined for the default wing's zone. */
  zone?: { low: number; high: number } | null;
}
/** The shadow, the height gauge with the flare zone, and the FLARE prompt. */
export function createLandingCues(THREE: Three, scene: object, options?: { onFlareCue?: () => void }): { update(frame: LandingCuesFrame, dt: number): unknown; [key: string]: unknown };
