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
  ochre: pigment(0x94804a), straw: pigment(0xa59158), olive: pigment(0x737d49),
  sage: pigment(0x7c8755), fern: pigment(0x6d7a4c), russet: pigment(0x887055),
  umber: pigment(0x6b5c49), field: pigment(0x90915c),
});

/**
 * Pure, deterministic and independent of render quality. Returned color is
 * linear RGB; all scalar fields are 0..1. CPU cover and the baked colour atlas
 * share these pigment hues. The offline atlas adds bounded photographic sward
 * luminance, so botanical colour still follows the visible meadow communities.
 */
export function sampleGroundStyle(x, z, { moisture = .5, canopy = 0, path = 0 } = {}) {
  moisture = clamp(moisture); canopy = clamp(canopy); path = clamp(path);
  // Plant communities follow the valley, with a gentle shear along its side
  // shoulders. Small domain warps break their edges without the large soft
  // camouflage blobs produced by the former 100 m colour noise. Moisture
  // already includes the physical slope/rock masks from sampleTerrainEcology;
  // this adds no competing relief or lighting to that ecological source.
  const along = z + .28 * x * Math.tanh(x / 500);
  const warpX = x + (noise(x / 38 + 17, along / 43 - 9) - .5) * 12;
  const warpZ = along + (noise(x / 51 - 6, along / 37 + 13) - .5) * 10;
  const broad = noise(x / 180 + 19, z / 190 - 5);
  const community = noise(warpX / 23 - 11, warpZ / 32 + 4);
  const broken = noise((warpX * .82 + warpZ * .57) / 11 + 23,
    (warpZ * .82 - warpX * .57) / 16 - 17);
  const edge = noise(warpX / 6.5 + 3, warpZ / 9 - 15);
  const variation = clamp(community * .20 + broken * .35 + edge * .45);
  const patch = smooth(.25, .75, community * .64 + broken * .25 + edge * .11);
  // Broad climate only biases the composition slightly. Local communities
  // differ by species and senescence, rather than arbitrary light/dark stains.
  const dryness = clamp(.18 + (1 - moisture) * .64 + (.5 - patch) * .16
    + (broad - .5) * .06 - canopy * .18);
  const mown = 1 - smooth(95, 165, Math.hypot(x - MARK.x, z - MARK.z));
  const dry = blend(GROUND_PALETTE.ochre, GROUND_PALETTE.straw, smooth(.25, .76, broken) * .65);
  const lush = blend(GROUND_PALETTE.fern, GROUND_PALETTE.sage, smooth(.25, .77, patch));
  // Olive grass remains connected between the communities. Dry climate
  // permits local straw drifts, rather than replacing a whole moisture region
  // with a mustard island. Similar grass reflectances keep this a botanical
  // colour change rather than a false shadow/light pattern at flight height.
  const dryDrift = smooth(.37, .70, broken * .65 + community * .35);
  const senescence = smooth(.43, .75, dryness) * (.20 + .58 * dryDrift);
  let color = blend(lush, dry, senescence);
  const olive = smooth(.28, .51, dryness) * (1 - smooth(.59, .76, dryness));
  color = blend(color, GROUND_PALETTE.olive, .24 + olive * (.12 + .16 * (1 - broken)));
  // Bare shoulders are sparse, broken pockets in the drier communities.
  // Damp meadows and the protected target retain living cover; actual tracks
  // still use the explicit, precise path mask rather than this pigment noise.
  const wear = smooth(.59, .76, broken * .65 + edge * .35)
    * smooth(.48, .74, dryness) * .46 * (1 - mown * .90);
  const soil = blend(GROUND_PALETTE.russet, GROUND_PALETTE.umber, edge * .55 + canopy * .25);
  color = blend(color, soil, wear);
  // Restrained 6–30 m reflectance variation survives the scanned detail fade.
  // Mowing calms both hue and value at the target without painting a hard disk.
  const value = 1 + (variation - .5) * .16 * (1 - mown * .68);
  color = color.map(channel => channel * value);
  color = blend(color, GROUND_PALETTE.field, mown * .82);
  color = blend(color, GROUND_PALETTE.umber, path * .84);
  return { dryness, mown, patch, variation, wear, color };
}
