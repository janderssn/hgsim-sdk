import { hash, rockRing } from './world.js';

const sectorCount = seed => 11 + Math.abs(Math.round(seed)) % 3;
const SUBDIVISIONS = [0, .035, .12, .5, .88, .965];
const LEVELS = [0, .025, .06, .105, .155, .21, .21, .285, .375, .375, .48, .60, .60, .73, .86, 1];

/** Planar fracture blocks retain a conservative shell around the physical rock. */
export function graniteSection(rock, k, seed = 0, ledge = 0) {
  const ring = rockRing(rock, k), points = [];
  const sectors = sectorCount(seed);
  const phase = hash(seed, 197) * .45;
  const shoulder = Math.min(1, k / .16);
  const amplitude = .10 + shoulder * .23;
  const cornerRadius = corner => 1.04 + hash(corner, seed + 211) * amplitude;
  for (let sector = 0; sector < sectors; sector++) {
    const first = phase + sector / sectors * Math.PI * 2;
    const second = phase + (sector + 1) / sectors * Math.PI * 2;
    const radiusA = cornerRadius(sector);
    const radiusB = cornerRadius((sector + 1) % sectors);
    for (const fraction of SUBDIVISIONS) {
      const joint = Math.max(0, 1 - Math.min(fraction, 1 - fraction) / .12) * .045;
      const block = (hash(sector + Math.floor(k * 8) * 31, seed + 223) - .5) * .025;
      // Independent outward fracture masses break the common flared profile.
      // Their depth and height vary per face; only the inner envelope is fixed.
      const buttressHeight = .24 + hash(sector, seed + 227) * .48;
      const buttressWidth = .18 + hash(sector, seed + 229) * .2;
      const shoulderBlock = Math.max(0, 1 - Math.abs(k - buttressHeight) / buttressWidth);
      const outward = Math.sin(Math.PI * k) * (.10 + hash(sector, seed + 233) * .1)
        + shoulderBlock * (.06 + hash(sector, seed + 237) * .14);
      const factor = 1 - joint + block + ledge + outward;
      const nx = (Math.cos(first) * radiusA * (1 - fraction) + Math.cos(second) * radiusB * fraction) * factor;
      const nz = (Math.sin(first) * radiusA * (1 - fraction) + Math.sin(second) * radiusB * fraction) * factor;
      const tilt = Math.sin(first * 2 + seed) * .35 * Math.min(1, k * 8);
      points.push({ x: rock.cx + nx * ring.rx, y: ring.y + tilt,
        z: rock.cz + nz * ring.rz, joint: fraction < .04 || fraction > .96, nx, nz });
    }
  }
  return points;
}

/**
 * Broken granite ledges, long vertical joints, and a chipped rim. Numerical
 * collision remains world.js; every wall section encloses its 0.88 inset.
 */
export function createGraniteCliffGeometry(THREE, rock, seed = 0) {
  const positions = [], colours = [], indices = [], groups = [];
  const gray = new THREE.Color('#a0a49d'), lichen = new THREE.Color('#8d947d');
  const levels = LEVELS.map(k => k === 0 || k === 1 ? k
    : k + (hash(Math.round(k * 1000), seed + 241) - .5) * Math.min(.045, k * .5));
  const sections = levels.map((k, index) => graniteSection(rock, k, seed,
    index > 0 && k === levels[index - 1] ? -.018 : .018));
  const sides = sections[0].length;
  for (const [row, section] of sections.entries()) {
    for (const point of section) {
      positions.push(point.x, point.y, point.z);
      const shade = .82 + hash(row * sides + positions.length, seed + 239) * .22;
      const colour = gray.clone().lerp(lichen, row < 2 ? .28 : .07).multiplyScalar(shade);
      colours.push(colour.r, colour.g, colour.b);
    }
  }
  function triangle(a, b, c, dark = false) {
    groups.push(dark ? 1 : 0);
    indices.push(a, b, c);
  }
  for (let row = 0; row < sections.length - 1; row++) {
    for (let side = 0; side < sides; side++) {
      const next = (side + 1) % sides;
      const a = row * sides + side, b = row * sides + next;
      const c = (row + 1) * sides + side, d = (row + 1) * sides + next;
      const dark = sections[row][side].joint || levels[row] === levels[row + 1];
      triangle(a, b, c, dark); triangle(b, d, c, dark);
    }
  }

  // The usable top remains flat at the authored launch height. Only the rim is
  // chipped, avoiding artificial steps under the pilot or control frame.
  const inner = positions.length / 3;
  for (const point of sections[0]) {
    const length = Math.hypot(point.nx, point.nz);
    const ring = rockRing(rock, 0);
    positions.push(rock.cx + point.nx / length * ring.rx * .89, rock.top - .4,
      rock.cz + point.nz / length * ring.rz * .89);
    colours.push(.46, .49, .38);
  }
  const centre = positions.length / 3;
  positions.push(rock.cx, rock.top - .4, rock.cz); colours.push(.46, .49, .38);
  for (let side = 0; side < sides; side++) {
    const next = (side + 1) % sides;
    triangle(centre, inner + next, inner + side);
    triangle(inner + side, inner + next, side);
    triangle(inner + next, next, side);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  const ordered = [[], []];
  for (let triangle = 0; triangle < groups.length; triangle++) {
    ordered[groups[triangle]].push(...indices.slice(triangle * 3, triangle * 3 + 3));
  }
  geometry.setIndex([...ordered[0], ...ordered[1]]);
  const flat = geometry.toNonIndexed();
  flat.computeVertexNormals();
  // Material-sorted streams keep the entire cliff to two draws.
  flat.addGroup(0, ordered[0].length, 0);
  flat.addGroup(ordered[0].length, ordered[1].length, 1);
  geometry.dispose();
  flat.computeBoundingBox(); flat.computeBoundingSphere();
  return flat;
}
