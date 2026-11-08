/**
 * The world a glider flies in: the ground, the wind, and the air's own rise and fall (thermals, ridge lift and any lift sources
 * you add). Plain functions underneath, so a world can be a heightmap, a procedural landscape or a flat field.
 *
 *   const world = createWorld({
 *     terrain: (x, z) => 0,                 // ground height, m
 *     wind: { x: 0, z: -4 },                // where the air goes, m/s: a vector, a live object such as createWind(), or (x, y, z) => ({ x, z })
 *     thermals: [{ x: 0, z: 300, radius: 150, strength: 3 }],
 *     lift: [(x, y, z, air) => 0],          // extra rising (+) or sinking (-) air, m/s, added to the rest
 *   });
 *   world.airAt(x, y, z)   // { lift, thermalLift, ridgeLift, extraLift, windX, windZ, groundHeight, aboveGround }
 *
 * Frame: x east, y up, z north. Wind {x, z} is the direction the air travels toward.
 */
import { defineConfig } from './config.js';
import { clamp, finite, smoothstep } from './math.js';

export const AIR_DEFAULTS = Object.freeze({
  // Thermals: Gaussian columns, capped at maxThermalLift, fading between thermalFadeStart and thermalCeiling (m above sea level)
  // and weak in the first metres above the ground.
  maxThermalLift: 7,
  thermalFadeStart: 3900,
  thermalCeiling: 4400,
  // Ridge lift is the wind following the slope: its uphill part times the sine of the slope, sampled gradientSample m either
  // side. Near the ground the wind is slower (full speed from ridgeShearHeight up, falling as (height / ridgeShearHeight)^ridgeShearExp
  // below), so a slope that holds a wing at ridge height will not hold it a few metres off the ground. It decays with height
  // over ridgeDecayHeight. Behind a slope the air sinks, at leeSink of the windward lift.
  gradientSample: 48,
  ridgeDecayHeight: 350,
  ridgeShearHeight: 80,
  ridgeShearExp: 0.5,
  leeSink: 0.5,
  maxRidgeLift: 7,
});

const flat = () => 0;

/**
 * options: terrain(x, z), surface(x, z) (the top of whatever stands on the ground, such as trees, for the glider's clearance;
 * defaults to the terrain), wind, thermals [{ x, z, radius, strength }], lift [(x, y, z, sample) => m/s], air (AIR_DEFAULTS
 * overrides). Setting thermalCeiling alone keeps the fade 500 m below it.
 */
export function createWorld({ terrain = flat, surface = null, wind = null, thermals = [], lift = [], air = {} } = {}) {
  if (typeof terrain !== 'function') throw new TypeError('createWorld: terrain must be a function (x, z) => height');
  if (surface !== null && typeof surface !== 'function') throw new TypeError('createWorld: surface must be a function (x, z) => height');
  if (wind !== null && typeof wind !== 'function' && typeof wind !== 'object') throw new TypeError('createWorld: wind must be { x, z }, a wind object or (x, y, z) => ({ x, z })');
  if (!Array.isArray(thermals)) throw new TypeError('createWorld: thermals must be an array');
  if (!Array.isArray(lift) || !lift.every(f => typeof f === 'function')) throw new TypeError('createWorld: lift must be an array of functions');
  const ceiling = finite(air.thermalCeiling, AIR_DEFAULTS.thermalCeiling);
  const fadeStart = Math.min(ceiling - 1, finite(air.thermalFadeStart, Math.min(AIR_DEFAULTS.thermalFadeStart, ceiling - 500)));
  const config = defineConfig(AIR_DEFAULTS, { ...air, thermalFadeStart: fadeStart }, 'air');
  const heightAt = (x, z) => finite(terrain(x, z));
  const windAt = typeof wind === 'function' ? (x, y, z) => wind(x, y, z) || { x: 0, z: 0 } : () => wind || { x: 0, z: 0 };

  const world = {
    config, thermals, lift,
    /** Ground height at (x, z). */
    heightAt,
    /** Height of the top of the ground or whatever stands on it at (x, z): what the glider must clear. */
    surfaceAt: surface ? (x, z) => Math.max(heightAt(x, z), finite(surface(x, z), heightAt(x, z))) : heightAt,
    /** The wind at a point, { x, z } in m/s (where the air goes). */
    windAt,
    /** The air at a point: its rise (lift, m/s, + up) and what it is made of, the wind and the ground below. */
    airAt(x, y, z) {
      const w = windAt(x, y, z), windX = finite(w.x), windZ = finite(w.z);
      const groundHeight = heightAt(x, z), aboveGround = Math.max(0, y - groundHeight);
      let thermalLift = 0;
      for (const thermal of thermals) {
        if (!Number.isFinite(thermal.x) || !Number.isFinite(thermal.z)) continue;
        const radius = Math.max(20, finite(thermal.radius, 180)), strength = clamp(finite(thermal.strength), 0, config.maxThermalLift);
        const dx = x - thermal.x, dz = z - thermal.z;
        thermalLift += strength * Math.exp(-(dx * dx + dz * dz) / (2 * radius * radius));
      }
      thermalLift = Math.min(config.maxThermalLift, thermalLift)
        * (1 - smoothstep(config.thermalFadeStart, config.thermalCeiling, y))
        * (0.12 + 0.88 * smoothstep(15, 180, aboveGround));
      let ridgeLift = 0;
      if (windX !== 0 || windZ !== 0) {
        const d = config.gradientSample;
        const gradientX = (heightAt(x + d, z) - heightAt(x - d, z)) / (2 * d), gradientZ = (heightAt(x, z + d) - heightAt(x, z - d)) / (2 * d);
        // Wind is the direction the air travels toward, so uphill flow is positive.
        const slopeFlow = (windX * gradientX + windZ * gradientZ) / Math.sqrt(1 + gradientX * gradientX + gradientZ * gradientZ);
        const shear = Math.pow(clamp(aboveGround / config.ridgeShearHeight, .02, 1), config.ridgeShearExp);
        ridgeLift = clamp(slopeFlow > 0 ? slopeFlow : slopeFlow * config.leeSink, -config.maxRidgeLift, config.maxRidgeLift)
          * shear * Math.exp(-aboveGround / config.ridgeDecayHeight);
      }
      const sample = { thermalLift, ridgeLift, extraLift: 0, lift: thermalLift + ridgeLift, windX, windZ, groundHeight, aboveGround };
      if (lift.length) { for (const source of lift) sample.extraLift += finite(source(x, y, z, sample)); sample.lift += sample.extraLift; }
      return sample;
    },
  };
  return world;
}
