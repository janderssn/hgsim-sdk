/**
 * hgsim: a hang-glider simulation SDK. Plain ES modules with no dependencies.
 *
 * Conventions, everywhere: SI units (metres, seconds, kilograms, radians; speeds in m/s) unless a name says otherwise (`kmh`,
 * `Deg`); x east, y up, z north; a heading of 0 faces +z (north) and grows clockwise seen from above; a wind vector { x, z } is
 * where the air goes. Configs are frozen plain objects (defineConfig); state objects are plain data, safe to copy and record.
 */
import type { GliderConfig, LaunchConfig, LandingRules, AirConfig, ClassicConfig, WalkerConfig, SiteConfig } from './configs.js';
export type { GliderConfig, LaunchConfig, LandingRules, AirConfig, ClassicConfig, WalkerConfig, SiteConfig } from './configs.js';

/** The SDK's version (semver). */
export const VERSION: string;

/* ---------------------------------------------------------------- configs */

/** The defaults with a patch applied, frozen. Unknown keys and values of the wrong kind throw a TypeError naming the key. */
export function defineConfig<T extends object>(defaults: T, patch?: DeepPartial<NoInfer<T>> | null, name?: string): Readonly<T>;
/** The keys of config whose values differ from defaults, with their values. */
export function overridesOf<T extends object>(config: T, defaults: T): DeepPartial<T>;
export type DeepPartial<T> = { [K in keyof T]?: T[K] extends readonly number[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K] };

export const GLIDER_DEFAULTS: GliderConfig;
export const LAUNCH_DEFAULTS: LaunchConfig;
export const LANDING_RULES: LandingRules;
export const AIR_DEFAULTS: AirConfig;
export const CLASSIC_DEFAULTS: ClassicConfig;

/* ---------------------------------------------------------------- the world */

export interface Vec2 { x: number; z: number }
export interface Vec3 { x: number; y: number; z: number }

/* ---------------------------------------------------------------- vehicles */

/**
 * Where to draw a vehicle: its reference point (the feet of a walker, the hang point of a hang glider) and its orientation. q is
 * the orientation ([x, y, z, w], three.js order, world frame); heading (clockwise from +z), pitch (+ nose up) and roll (+ right side
 * down) are the same to read. applyPose(pose, object3d) draws it.
 */
export interface Pose { x: number; y: number; z: number; heading: number; pitch: number; roll: number; q: [number, number, number, number] | number[] }

/** The events every vehicle shares (docs/vehicles.md). */
export interface VehicleEventMap {
  airborne: { type: 'airborne' };
  touchdown: { type: 'touchdown'; impact: number };
  crash: { type: 'crash'; kind: string; impact: number; hit?: unknown };
}

/** What every vehicle is (docs/vehicles.md): a game holds one and swaps it. */
export interface Vehicle<Input = object, Events extends VehicleEventMap = VehicleEventMap> {
  readonly kind: string;
  readonly phase: string;
  readonly airborne: boolean;
  step(dt: number, input?: Input): this;
  pose(out?: Partial<Pose>): Pose;
  velocity(out?: Partial<Vec3>): Vec3;
  on<K extends keyof Events>(type: K, listener: (event: Events[K]) => void): () => void;
  on(listener: (event: Events[keyof Events]) => void): () => void;
  once<K extends keyof Events>(type: K, listener: (event: Events[K]) => void): () => void;
  once(listener: (event: Events[keyof Events]) => void): () => void;
  state(): object;
}

export function makePose(at?: { x?: number; y?: number; z?: number; heading?: number; pitch?: number; roll?: number }, out?: Partial<Pose>): Pose;
export function poseFromQuaternion(at: { x?: number; y?: number; z?: number }, q: number[], out?: Partial<Pose>): Pose;
export function quaternionFrom(heading?: number, pitch?: number, roll?: number, out?: number[]): [number, number, number, number];
export function anglesOf(q: number[], out?: object): { heading: number; pitch: number; roll: number };
/** The pose t of the way from a to b: positions straight, orientation along the shortest arc. */
export function lerpPose(a: Pose, b: Pose, t: number, out?: Partial<Pose>): Pose;
/** The last tick's pose, to draw between ticks: push(pose) before each tick, at(alpha, current) to draw. */
export function createPoseTrack(): { push(pose: Pose): void; at(alpha: number, current: Pose, out?: Partial<Pose>): Pose; clear(): void };
/** Sets a three.js object (anything with position.set and quaternion.set) to a pose. */
export function applyPose<T extends { position: { set(x: number, y: number, z: number): unknown }; quaternion: { set(x: number, y: number, z: number, w: number): unknown } }>(pose: Pose, object: T): T;

/** on(type, f), on(f) for all, once(...), emit(type, detail): the events of every vehicle. */
export function createEmitter<T extends string>(types: readonly T[], owner?: string): {
  readonly types: readonly T[];
  on(type: T | ((event: { type: T }) => void), listener?: (event: { type: T; [key: string]: unknown }) => void): () => void;
  once(type: T | ((event: { type: T }) => void), listener?: (event: { type: T; [key: string]: unknown }) => void): () => void;
  emit(type: T, detail?: object): { type: T; [key: string]: unknown };
};

/* ---------------------------------------------------------------- the walker */

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
  blocked: { type: 'blocked'; by: 'water' | 'solid' | 'slope' | 'bounds' };
}
export interface WalkerState {
  x: number; y: number; z: number; heading: number; vx: number; vy: number; vz: number;
  onGround: boolean; phase: WalkerPhase; stride: number; blocked: WalkerEventMap['blocked']['by'] | null; downFor: number; material: string;
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

/* ---------------------------------------------------------------- sites */

export const SITE_DEFAULTS: SiteConfig;
/** A launch site read from the world: the run's fall and where its ground ends (a drop, water, a solid thing, the map's edge). */
export function terrainSite(world: World, at?: { x?: number; z?: number; heading?: number } & Partial<SiteConfig>): RoundSite & { ground(x: number, z: number): number };
/** The wind: a vector, a live object such as createWind(), or a function of position. */
export type WindSource = Vec2 | Wind | ((x: number, y: number, z: number) => Vec2);
export interface Thermal { x: number; z: number; radius?: number; strength: number }
/** Extra rising (+) or sinking (-) air, m/s, at a point; sample is the air there so far. */
export type LiftSource = (x: number, y: number, z: number, sample: AirSample) => number;

export interface AirSample {
  /** All the air's rise, m/s (+ up). */
  lift: number; thermalLift: number; ridgeLift: number; extraLift: number;
  windX: number; windZ: number; groundHeight: number; aboveGround: number;
}

/** What the ground is made of, as vehicles meet it (see MATERIALS). */
export interface Material {
  readonly name: string;
  /** The friction coefficient a foot or a tyre gets. */
  readonly grip: number;
  /** A wheel's rolling resistance coefficient. */
  readonly rolling: number;
  /** A ski's or a track's sliding friction. */
  readonly glide: number;
  /** 0 firm .. 1 deep. */
  readonly softness: number;
}
export type MaterialName = 'grass' | 'dirt' | 'gravel' | 'rock' | 'road' | 'wood' | 'sand' | 'mud' | 'snow' | 'ice';
export const MATERIALS: Readonly<Record<MaterialName, Material>>;

export interface WorldOptions {
  /** Ground height at (x, z), m. Default flat at 0. */
  terrain?: (x: number, z: number) => number;
  /** The top of whatever stands on the ground (trees), for clearance. Default the terrain. */
  surface?: ((x: number, z: number) => number) | null;
  /** Something to stand on above the terrain (a ramp's deck, a bridge): its height at (x, z), or null. */
  platform?: ((x: number, z: number) => number | null) | null;
  /** What the ground is made of: a MATERIALS name, or a material of your own (missing values from grass). Default grass. */
  material?: ((x: number, z: number) => MaterialName | string | Partial<Material>) | null;
  /** The water's surface height at (x, z), or null where there is none. */
  water?: ((x: number, z: number) => number | null) | null;
  /** The solid thing at a point (anything truthy names it: 'hut', a building object), or null. */
  solid?: ((x: number, y: number, z: number) => unknown) | null;
  /** Whether (x, z) is on the map, margin metres in from its edge. Default: everywhere. */
  bounds?: ((x: number, z: number, margin: number) => boolean) | null;
  wind?: WindSource | null;
  thermals?: Thermal[];
  lift?: LiftSource[];
  air?: Partial<AirConfig>;
}

export interface World {
  readonly config: AirConfig;
  readonly thermals: Thermal[];
  readonly lift: LiftSource[];
  heightAt(x: number, z: number): number;
  surfaceAt(x: number, z: number): number;
  /** Where feet, skis and wheels stand: the terrain, or a platform above it. */
  groundAt(x: number, z: number): number;
  /** The ground's slope, rise per metre. */
  slopeAt(x: number, z: number, d?: number): number;
  normalAt(x: number, z: number, d?: number, out?: Vec3): Vec3;
  materialAt(x: number, z: number): Material;
  waterAt(x: number, z: number): number | null;
  solidAt(x: number, y: number, z: number): unknown;
  inBounds(x: number, z: number, margin?: number): boolean;
  windAt(x: number, y: number, z: number): Vec2;
  airAt(x: number, y: number, z: number): AirSample;
}

export function createWorld(options?: WorldOptions): World;

/* ---------------------------------------------------------------- flight */

/** What the pilot does, each tick. Every field is optional and defaults to 0 / false. */
export interface FlightInput {
  /** Weight shift, -1 (left) .. +1 (right). */
  roll?: number;
  /** The bar, -1 (pulled in: dive) .. +1 (pushed out: slow, flare). */
  pitch?: number;
  /** The pilot sitting up (drag, for a slow landing). */
  stand?: boolean;
  /** Low over ground that can be landed on (a hands-off final settles onto it). */
  field?: boolean;
  landable?: boolean;
}

/**
 * A flight state: plain data, read freely. glider.reset(structuredClone(glider.state)) restores one exactly, which is how to
 * snapshot and roll back a flight. Models may add fields of their own.
 */
export interface FlightState {
  x: number; y: number; z: number;
  heading: number; bank: number; bankRate: number; visualBank: number;
  pitch: number; pitchRate: number;
  airspeed: number; groundSpeed: number; verticalSpeed: number;
  pathAngle: number; pathRate: number;
  /** The bar's position, -1 (in) .. +1 (out). */
  bar: number;
  alpha: number; alphaTarget: number; loadFactor: number; sinkRate: number;
  lift: number; thermalLift: number; ridgeLift: number; windX: number; windZ: number;
  stallWarning: boolean; stalled: boolean; stallRatio: number; stallSpeed: number;
  /** The pilot upright for the landing, 0 (prone) .. 1. */
  upright: number;
  /** How fast the ground comes up to the feet, m/s (+ closing). */
  groundClosing: number;
  /** The bar pushed out past trim, 0 .. 1: the flare. */
  flare: number;
  flarePressed: boolean; flareFeet: number; flareRatio: number; flareBalloon: number;
  headingRate: number;
  [field: string]: unknown;
}

/** Speeds, sink and glide for a config. */
export interface Performance {
  stallSpeed(bank?: number): number;
  /** Trim airspeed for a bar position (-1 in .. +1 out). */
  trimSpeed(bar?: number, bank?: number): number;
  /** Still-air sink, m/s, positive down. */
  sink(airspeed: number, bank?: number): number;
  glideAngle(airspeed: number, bank?: number): number;
  glideRatio(airspeed: number, bank?: number): number;
  steadySpeed?(alpha: number): number;
  pitchResponse?(alpha: number, bar?: number): number;
  liftCoefficient?(alpha: number): number;
  dragCoefficient?(alpha: number, sigma?: number): number;
}

/** A flight model: forceModel, classicModel, or your own object of the same shape. */
export interface FlightModel<C extends object = object, S extends object = FlightState> {
  readonly name: string;
  readonly defaults: C;
  createState(init: Partial<S>, config: C): S;
  step(state: S, input: FlightInput, dt: number, world: World, config: C, skim?: SkimOptions | null): S;
  performance?(config: C): Performance;
  scrape?(state: S, contact: Contact, ground: number, rules: LandingRules, config: C): boolean;
}

export const forceModel: FlightModel<GliderConfig, FlightState>;
export const classicModel: FlightModel<ClassicConfig, FlightState>;
export function performance(config?: GliderConfig): Performance;
export function createFlightState(overrides?: Partial<FlightState>, config?: GliderConfig): FlightState;
/** Advances a flight state by dt seconds; mutates and returns it. */
export function stepFlight(state: FlightState, input: FlightInput, dt: number, world: World, config?: GliderConfig, assist?: SkimOptions | null): FlightState;

/* ---------------------------------------------------------------- presets */

/** Each trait 0 (forgiving) .. 1 (demanding), up to 1.2. */
export interface Character { difficulty?: number; roll?: number; stall?: number; pitch?: number; flare?: number }
export const TRAITS: readonly ['roll', 'stall', 'pitch', 'flare'];

/** Ballpark performance: kg, km/h, glide ratio. */
export interface WingPerformance { mass: number; stall: number; trim: number; top: number; glide: number; aspectRatio?: number; oswald?: number }

export interface WingDefinition extends WingPerformance {
  id: string; name: string; era?: string; class?: string; description?: string;
  difficulty?: number;
  character?: Omit<Character, 'difficulty'>;
  /** The build, for the launch: the wing alone (kg), span (m), dihedral and carryAlpha (degrees). */
  wing?: { mass?: number; span?: number; dihedral?: number; carryAlpha?: number };
  /** An old sail that luffs when dived: from (degrees of angle of attack), loss (0..1), tuck (degrees). */
  luff?: { from?: number; loss?: number; tuck?: number } | null;
  handling?: Partial<GliderConfig>;
  launch?: Partial<LaunchConfig>;
  vg?: { default?: number; loose: VGSide; tight: VGSide } | null;
  reference?: object | null;
}
export interface VGSide extends Omit<Character, 'difficulty'> { trim?: number; top?: number; glide?: number; difficulty?: number }

export interface Preset {
  readonly id: string; readonly name: string; readonly era?: string; readonly class?: string; readonly description?: string;
  readonly difficulty: number;
  readonly character: Readonly<Omit<Character, 'difficulty'>>;
  readonly targets: Readonly<WingPerformance & { vg: { loose: VGSide; tight: VGSide } | null }>;
  readonly luff: Readonly<{ from?: number; loss?: number; tuck?: number }> | null;
  readonly reference: object | null;
  /** Force-model overrides (over GLIDER_DEFAULTS). */
  readonly config: Readonly<Partial<GliderConfig>>;
  /** LAUNCH_DEFAULTS overrides. */
  readonly launch: Readonly<Partial<LaunchConfig>>;
  readonly vg: Readonly<{ default: number; loose: Partial<GliderConfig>; tight: Partial<GliderConfig> }> | null;
}

export type PresetId = 'rogallo-1975' | 'cable-1979' | 'vintage-1985' | 'performance-1992' | 'alpha-235' | 'falcon-170' | 'intermediate' | 'sport-2' | 'u2-160' | 't2c-144';
export const PRESETS: Readonly<Record<PresetId, Preset>> & Readonly<Record<string, Preset>>;
/** The preset with this id; an unknown id throws a TypeError listing the known ones. */
export function getPreset(id: PresetId | string): Preset;
export function defineWing(definition: WingDefinition): Preset;
export function wingConfig(performance: WingPerformance): Partial<GliderConfig>;
export function handlingFor(character?: number | Character): { config: Partial<GliderConfig> };
/** A preset's sail at a VG setting, 0 (loose) .. 1 (tight). */
export function vgConfig(preset: Preset, setting?: number): Partial<GliderConfig>;

/* ---------------------------------------------------------------- polars */

export interface PolarPoint { airspeed: number; sink: number; glideRatio: number }
export interface Polar {
  points: PolarPoint[];
  stallSpeed: number; trimSpeed: number; topSpeed: number; trimSink: number;
  minSink: PolarPoint; bestGlide: PolarPoint;
  /** The airspeed for the flattest path over the ground in this headwind (m/s) through air sinking at sink (m/s). */
  speedToFly(air?: { headwind?: number; sink?: number }): { airspeed: number; glideRatio: number | null };
}
export interface PitchStability {
  curves: { bar: number; points: { alpha: number; rate: number; airspeed: number }[]; trim: { alpha: number; airspeed: number } | null }[];
  stiffness: number; lowAlphaRecovery: number;
}
export function polarOf(performance: Performance, options?: { step?: number; maxSpeed?: number }): Polar;
export function pitchStabilityOf(performance: Performance, options?: { bars?: number[]; fromAlpha?: number; toAlpha?: number; step?: number }): PitchStability | null;

/* ---------------------------------------------------------------- the glider */

export interface SkimOptions { clearance?: number | ((state: FlightState) => number) }

export interface GliderOptions<C extends object = GliderConfig> {
  world?: World;
  model?: FlightModel<C, any>;
  /** A preset, by id or as the object (force model only). */
  preset?: PresetId | string | Preset | null;
  /** Overrides of the model's defaults, or of the preset. */
  config?: Partial<C>;
  /** The starting flight state. */
  at?: Partial<FlightState>;
  /** The terrain-skimming assist. */
  skim?: boolean | { clearance?: number | ((state: FlightState, world: World) => number) };
  rules?: DeepPartial<LandingRules>;
}

/** A touchdown, as glider.contact() measures it. */
export interface Contact {
  /** Into the ground, along its normal, m/s. */
  verticalSpeed: number;
  groundSpeed: number; slope: number; bank: number; heading: number; airspeed: number;
  wind: Vec2; x: number; z: number; ground?: number;
  flare: { pressed: boolean; feet?: number; ratio?: number; balloon?: number };
  settled?: boolean;
  hit?: unknown;
}

export type Judgement = 'soft' | 'firm' | 'rough' | 'crash';
export interface LandingScore {
  judged: Judgement; points: number; stars: 0 | 1 | 2 | 3; notes: string[]; noStep: boolean;
  headwind: number; tailwind: number; windSpeed: number;
  /** From the mark, m, or null without one. */
  distance: number | null;
  ring: 'bullseye' | 'inner' | 'outer' | 'pad' | null;
}
export interface Target { x: number; z: number; radius?: number }

export interface FlareZone {
  zones: { airspeed: number; low: number | null; high: number | null }[];
  /** The feet heights from which a held flare lands softly at this airspeed, or null where none does. */
  at(airspeed: number): { low: number; high: number } | null;
}

/** Where a launch happens: the run's slope and edge, and what the feet stand on. */
export interface LaunchSite {
  /** The ground's fall per metre ahead (positive downhill). */
  fall(x: number, z: number, heading: number): number;
  /** Metres left to where the ground ends. */
  edgeAhead(x: number, z: number, heading: number): number;
  ground?(x: number, z: number): number;
}

export type LaunchPhase = 'pickup' | 'balance' | 'run';
export type LaunchFailure = 'wingdrop' | 'turned' | 'stumbled';

export interface LaunchState {
  phase: LaunchPhase; t: number; groundSpeed: number; airspeed: number; distance: number;
  /** The share of the weight the wing carries. */
  lift: number;
  roll: number; yaw: number; nose: number; go: boolean; cliff: boolean; jumped: boolean;
  lifted: boolean; liftDistance: number | null;
  airborne: boolean; reason: 'flying' | 'edge' | null; failed: LaunchFailure | null; barHold: number;
  flight: FlightState;
  [field: string]: unknown;
}

export interface LaunchPose {
  height: number; pitch: number; roll: number; yaw: number; shift: number; lean: number;
  run: number; lift: number; carry: number; grip: number; plant: number; shoulders: number; pathAngle: number;
}

/** A manual launch's controls. */
export interface LaunchControls { balance?: number; nose?: number; push?: number; go?: boolean; jump?: boolean }

export interface Launch {
  readonly state: LaunchState;
  readonly manual: boolean;
  readonly phase: LaunchPhase;
  readonly airborne: boolean;
  readonly reason: 'flying' | 'edge' | null;
  readonly failed: LaunchFailure | null;
  readonly barHold: number;
  step(dt: number, controls?: LaunchControls, conditions?: { headwind?: number; crosswind?: number; airLift?: number; slope?: number; edgeAhead?: number }): Launch;
  pose(stride?: number): LaunchPose;
  /** A failed launch as a rigid body, from the state it went wrong in. */
  tumble(options?: { stride?: number; ground?: (x: number, z: number) => number }): Tumble;
}

export interface Glider<C extends object = GliderConfig> {
  readonly world: World;
  readonly model: FlightModel<C, any>;
  readonly state: FlightState;
  readonly config: Readonly<C>;
  readonly preset: Preset | null;
  /** What differs from the preset (or the model's defaults). */
  readonly overrides: DeepPartial<C>;
  readonly rules: LandingRules;
  readonly performance: Performance | null;
  readonly hasVG: boolean;
  readonly vg: number;
  readonly launchConfig: LaunchConfig;
  readonly reference: object | null;

  /** Advances the flight by dt seconds (finite, >= 0; a RangeError otherwise). */
  step(dt: number, input?: FlightInput): FlightState;
  /** Changes config values in flight; tune() restores the preset or defaults. */
  tune(patch?: Partial<C> | null): this;
  usePreset(preset: PresetId | string | Preset | null): this;
  setVG(value: number): this;
  polar(options?: { step?: number; maxSpeed?: number }): Polar | null;
  pitchStability(options?: { bars?: number[]; fromAlpha?: number; toAlpha?: number; step?: number }): PitchStability | null;
  flareZone(): FlareZone | null;
  /** Starts over with a fresh flight state; a full copy of a state restores it exactly. */
  reset(init?: Partial<FlightState>): this;
  place(where?: { x?: number; y?: number; z?: number; heading?: number }): this;
  air(): AirSample;
  height(): number;
  contact(options?: { tolerance?: number }): Contact | null;
  /** Judges and scores a touchdown; throws if the glider is not on the ground and no contact is given. */
  land(target?: Target | null, contact?: Contact | null): LandingScore;
  scrape(contact?: Contact | null): boolean;
  launch(options?: { site?: LaunchSite; manual?: boolean; config?: Partial<LaunchConfig> }): Launch;
}

export function createGlider<C extends object = GliderConfig>(options?: GliderOptions<C>): Glider<C>;

/* ---------------------------------------------------------------- rounds */

export type RoundPhase = 'ready' | 'launch' | 'flight' | 'tumble' | 'landed' | 'crashed';

export interface RoundEventMap {
  launch: { type: 'launch' };
  airborne: { type: 'airborne'; launch: Launch; dropped: boolean };
  failed: { type: 'failed'; reason: LaunchFailure; launch: Launch };
  scrape: { type: 'scrape'; contact: Contact };
  /** kind: 'terrain' (judged a crash), 'solid' (flown into one: hit names it), 'water', or 'launch' (reason says how). impact: m/s. */
  crash: { type: 'crash'; kind: 'terrain' | 'solid' | 'water' | 'launch'; impact: number; hit: unknown; reason?: LaunchFailure; contact?: Contact };
  touchdown: { type: 'touchdown'; result: LandingScore; contact: Contact; impact: number };
}
export type RoundEvent = RoundEventMap[keyof RoundEventMap];
export const ROUND_EVENTS: readonly (keyof RoundEventMap)[];

/** The round's input each tick: the flight's, and the launch's (roll is the balance on a launch). */
export interface RoundInput extends FlightInput { nose?: number; push?: number; go?: boolean; jump?: boolean; stride?: number }

export interface RoundSite extends LaunchSite { start: { x: number; z: number; heading?: number } }

export interface Takeoff { t: number; dropped: boolean; cliff: boolean; jumped: boolean; proneAt: number | null; ownStance: boolean; bar: TakeoffBar }
export interface TakeoffBar { inherited: number; waiting: boolean; handed: boolean; holdBar: number; dropped: boolean; cliff: boolean; realistic: boolean }

export interface RoundOptions {
  glider: Glider<any>;
  /** The launch is the pilot's own (balance, nose, go, jump); false flies it for them. Default true. */
  realistic?: boolean;
  launch?: Partial<LaunchConfig>;
  target?: Target | null;
  ground?: ((x: number, z: number) => number) | null;
  solid?: ((at: { x: number; y: number; z: number }) => unknown) | null;
  landable?: ((x: number, z: number) => boolean) | null;
  bodyPose?: ((state: FlightState) => { x: number; y: number; z: number; pitch: number; heading: number; roll: number }) | null;
}

/** The hang glider as a vehicle: a round. */
export interface Round extends Omit<Vehicle<RoundInput, RoundEventMap>, 'on' | 'once'> {
  readonly kind: 'hang-glider';
  readonly airborne: boolean;
  pose(out?: Partial<Pose>): Pose;
  velocity(out?: Partial<Vec3>): Vec3;
  readonly glider: Glider<any>;
  readonly phase: RoundPhase;
  readonly t: number;
  readonly site: RoundSite | null;
  /** The launch run while launching, else null. */
  readonly run: Launch | null;
  readonly takeoff: Takeoff | null;
  stand: boolean;
  readonly tumble: Tumble | null;
  readonly wreck: Tumble | null;
  readonly result: LandingScore | null;
  readonly contact: Contact | null;
  readonly scrapes: number;
  readonly distanceFlown: number;
  readonly maxSpeed: number;
  on<K extends keyof RoundEventMap>(type: K, listener: (event: RoundEventMap[K]) => void): () => void;
  on(listener: (event: RoundEvent) => void): () => void;
  once<K extends keyof RoundEventMap>(type: K, listener: (event: RoundEventMap[K]) => void): () => void;
  once(listener: (event: RoundEvent) => void): () => void;
  /** Stands the pilot at a launch site, or one of SITES as it is. */
  standAt(site: RoundSite | Site): this;
  startAt(init: Partial<FlightState>): this;
  launch(): this;
  step(dt: number, input?: RoundInput): this;
  /** The round as plain data, to record and draw again. */
  state(): object;
}

export function createRound(options: RoundOptions): Round;
/** A hang glider for a game in one call: createGlider's options and createRound's together. */
export function createHangGlider(options?: GliderOptions & Omit<RoundOptions, 'glider'>): Round;
export function createTakeoffBar(options?: { heldPitch?: number; holdBar?: number; dropped?: boolean; cliff?: boolean; realistic?: boolean }): TakeoffBar;
export function takeoffPitch(bar: TakeoffBar, input: number | undefined, info?: { age?: number; airspeed?: number }): number;

/* ---------------------------------------------------------------- the loop */

export interface SimulationLoop {
  /** Call once per drawn frame with the frame's timestamp (ms); runs the ticks due and then render(delta, alpha). */
  frame(timestampMilliseconds: number): { delta: number; alpha: number; steps: number };
  reset(timestampMilliseconds?: number): void;
}
export function createSimulationLoop(options: {
  step: (dt: number) => void;
  render?: (delta: number, alpha: number) => void;
  /** Default 1/60. */
  stepSeconds?: number;
  /** Default 0.25. */
  maxFrameSeconds?: number;
}): SimulationLoop;

/* ---------------------------------------------------------------- launch, landing, tumble */

export function windOnRun(wind: Vec2, heading: number): { headwind: number; crosswind: number };
export function runProfile(air: { headwind?: number; crosswind?: number; airLift?: number }, distance: number, slope?: number, config?: GliderConfig, launch?: LaunchConfig): LaunchState;

export function judgeTouchdown(touchdown: { verticalSpeed?: number; groundSpeed?: number; slope?: number; bank?: number; tailwind?: number }, rules?: LandingRules): Judgement;
export function scoreLanding(touchdown: Partial<Contact>, target?: Target | null, rules?: LandingRules): LandingScore;
export function measureFlareZone(makeGlider: (init: Partial<FlightState>) => Glider<any>, performance: Performance, options?: {
  speeds?: number[]; heights?: { from: number; to: number; step: number }; footHeight?: number; start?: number; barFor?: (airspeed: number) => number;
}): FlareZone;
export const ZONE_LOW: number;
export const ZONE_HIGH: number;
export function pullOutHeights(dive: { speed: number; sink: number }): { push: number; free: number };
export function dropToImpact(path: { x: number; feetY: number; z: number; vx: number; vy: number; vz: number; terrainHeight: (x: number, z: number) => number; seconds?: number; step?: number }): number | null;

/** A crash as a rigid body: step it with stepTumble until done. */
export interface Tumble {
  t: number; x: number; y: number; z: number;
  /** Orientation quaternion [x, y, z, w]. */
  q: number[];
  v: number[]; impact: number; done: boolean; speed0: number;
  [field: string]: unknown;
}
export function createTumble(start: {
  x: number; y: number; z: number; pitch?: number; heading?: number; roll?: number; speed?: number; vy?: number;
  velocity?: number[] | null; rollRate?: number; yawRate?: number; ground: (x: number, z: number) => number; wind?: Vec2;
}): Tumble;
export function stepTumble(tumble: Tumble, dt: number): Tumble;

/* ---------------------------------------------------------------- wind and recording */

export interface Wind {
  x: number; z: number; speed: number; direction: number;
  /** The compass heading it blows from (radians). */
  readonly from: number;
  readonly meanSpeed: number; readonly meanDirection: number; readonly dayTime: number;
  update(dt: number): this;
  set(mean: { speed?: number; direction?: number; x?: number; z?: number }): this;
  [field: string]: unknown;
}
export function createWind(options?: { x?: number; z?: number; speed?: number; direction?: number; variability?: number; gusts?: number; drift?: number; seed?: number }): Wind;
export function describeWind(wind: { speed: number; from: number }): string;
export function compassName(angle: number): string;
export function directionFromBearing(bearingDegrees: number): number;
export function bearingFromDirection(direction: number): number;

export const FLIGHT_FIELDS: readonly string[];
export const SAMPLE_PERIOD: number;
export interface FlightRecorder {
  readonly active: boolean;
  begin(info?: object): void;
  sample(t: number, values: Record<string, number>): void;
  mark(): 'flight' | 'late' | null;
  end(summary?: object): void;
  clear(): void;
  [method: string]: unknown;
}
export function createFlightRecorder(options?: { storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null; send?: ((flight: object) => unknown) | null; now?: () => number }): FlightRecorder;

export function bankedClearance(state: FlightState, world: World): number;

/* ---------------------------------------------------------------- scenarios */

export type ScenarioKind = 'launch' | 'flight' | 'landing';
export interface Scenario {
  readonly id: string; readonly kind: ScenarioKind; readonly name: string; readonly look?: string;
  readonly site?: string; readonly seconds: number;
  readonly wind: number | { head?: number; cross?: number; gusts?: number };
  readonly [field: string]: unknown;
}
export interface Site {
  readonly name: string; readonly label: string;
  readonly terrain: (x: number, z: number) => number;
  readonly start: { x: number; z: number; heading?: number };
  readonly site: (LaunchSite & { ground?: (x: number, z: number) => number }) | null;
  readonly mark?: Vec2; readonly finalHeading?: number;
}
export const SCENARIOS: readonly Scenario[];
export const SITES: Readonly<Record<'field' | 'ramp' | 'cliff' | 'slope', Site>>;
/** The scenario with this id (or the object itself); an unknown id throws, listing the known ones. */
export function getScenario(id: string | Scenario): Scenario;
export function scenarioWind(id: string | Scenario): { head: number; cross: number; gusts: number };

export interface ScenarioSample {
  t: number; phase: 'launch' | 'flight' | 'tumble';
  x: number; y: number; z: number; airspeed: number; verticalSpeed: number; feet: number;
  controls: RoundInput;
  [field: string]: unknown;
}
export interface ScenarioResult {
  scenario: string; kind: ScenarioKind; preset: string | null; vg: number;
  /** How it ended: a landing's judgement, 'flying', 'wingdrop', 'crash', 'no launch', 'done', ... */
  outcome: string;
  at: number;
  landing: LandingScore | null;
  touchdown: Contact | null;
  /** The numbers this kind of scenario is judged by (km/h, degrees, metres, seconds), named with their units. */
  metrics: Record<string, number | string | boolean | string[] | null>;
  samples: ScenarioSample[];
}
export interface ScenarioOptions {
  preset?: PresetId | string | Preset;
  vg?: number | null;
  config?: Partial<GliderConfig> | null;
  launch?: Partial<LaunchConfig>;
  /** 'script' (default): the scripted pilot flies it; 'you': your controls in step(). */
  pilot?: 'script' | 'you';
  wind?: number | { head?: number; cross?: number; gusts?: number } | null;
}
export interface ScenarioRun {
  readonly scenario: Scenario; readonly glider: Glider; readonly world: World; readonly wind: Wind; readonly site: Site; readonly round: Round;
  readonly launch: Launch | null;
  readonly wreck: Tumble | null;
  readonly phase: 'launch' | 'flight' | 'tumble' | 'done';
  readonly t: number; readonly done: boolean; readonly result: ScenarioResult | null;
  readonly samples: ScenarioSample[];
  step(dt: number, controls?: RoundInput): this;
}
export interface ScenarioFlight {
  readonly scenario: Scenario; readonly samples: ScenarioSample[];
  readonly t: number; readonly done: boolean; readonly result: ScenarioResult | null;
  start(host?: { standAt?(place: Site): void; startAt?(state: Partial<FlightState>): void } | null): this;
  input(controls?: RoundInput): RoundInput;
  record(dt: number): boolean;
}
export function startScenario(id: string | Scenario, options?: ScenarioOptions): ScenarioRun;
export function runScenario(id: string | Scenario, options?: Omit<ScenarioOptions, 'pilot'>): ScenarioResult;
export function flyScenario(id: string | Scenario, options: { round: Round; pilot?: 'script' | 'you'; place?: Site | null }): ScenarioFlight;

export type LaunchPilot = (t: number, launch: LaunchState, info: { stallSpeed: number }) => LaunchControls;
export function launchPilot(options?: { skill?: number; noseAt?: number; runNose?: number; flyAt?: number; goAt?: number; push?: boolean }): LaunchPilot;
export function landingPilot(options?: { approach?: string; flareAt?: string | number; style?: string }): (t: number, state: FlightState, ctx: object) => FlightInput;
