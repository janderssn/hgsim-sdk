/** One world-space pigment/patch source for painted terrain and botanical dressing. */
import { noise, MARK } from './world.js';

const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, value) => {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const linear = value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
const pigment = hex => Object.freeze([linear((hex >> 16 & 255) / 255),
  linear((hex >> 8 & 255) / 255), linear((hex & 255) / 255)]);
const blend = (a, b, t) => a.map((value, i) => mix(value, b[i], t));

/** Matte albedos in linear RGB; afternoon light and the grade supply lighting. */
export const GROUND_PALETTE = Object.freeze({
  ochre: pigment(0x9f8244), straw: pigment(0xb49d59), olive: pigment(0x657343),
  sage: pigment(0x819571), fern: pigment(0x526c54), russet: pigment(0x866047),
  umber: pigment(0x655345), field: pigment(0x90915c),
});

/**
 * Pure, deterministic and independent of render quality. Returned color is
 * linear RGB; all scalar fields are 0..1. CPU cover and the baked colour atlas
 * use this exact source, so botanical pigment follows visible meadow patches.
 */
export function sampleGroundStyle(x, z, { moisture = .5, canopy = 0, path = 0 } = {}) {
  moisture = clamp(moisture); canopy = clamp(canopy); path = clamp(path);
  const warpX = x + (noise(x / 270 + 17, z / 310 - 9) - .5) * 145;
  const warpZ = z + (noise(x / 330 - 6, z / 250 + 13) - .5) * 105;
  const broad = noise(warpX / 155 + 19, warpZ / 140 - 5);
  const middle = noise(warpX / 47 - 11, warpZ / 61 + 4);
  const variation = noise(warpX / 18 + 3, warpZ / 24 - 15);
  const patch = clamp((broad * .42 + middle * .58 - .5) * 1.65 + .5);
  const dryness = clamp(.22 + (1 - moisture) * .67 + (broad - .5) * .68
    + (middle - .5) * .32 - canopy * .24);
  const mown = 1 - smooth(95, 165, Math.hypot(x - MARK.x, z - MARK.z));
  const dry = blend(GROUND_PALETTE.ochre, GROUND_PALETTE.straw, smooth(.24, .80, patch));
  const lush = blend(GROUND_PALETTE.fern, GROUND_PALETTE.sage, smooth(.20, .78, patch));
  let color = blend(lush, dry, smooth(.32, .74, dryness));
  color = blend(color, GROUND_PALETTE.olive, .33 * (1 - smooth(.30, .59, middle)));
  // Broad russet interruptions soften the lawn and read as worn late-summer
  // soil shoulders. They are pigment, not baked shadow or false terrain relief.
  const wear = smooth(.50, .64, variation * .62 + broad * .38) * .50 * (1 - mown * .65);
  const soil = blend(GROUND_PALETTE.russet, GROUND_PALETTE.umber, smooth(.48, .75, variation));
  color = blend(color, soil, wear);
  color = blend(color, GROUND_PALETTE.field, mown * .65);
  color = color.map(value => value * (.87 + variation * .22));
  color = blend(color, GROUND_PALETTE.umber, path * .84);
  return { dryness, mown, patch, variation, wear, color };
}
