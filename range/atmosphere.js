import { terrainHeight, hash } from './world.js';

const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = (low, high, value) => {
  const t = clamp((value - low) / (high - low));
  return t * t * (3 - 2 * t);
};

/** Palette shared with the directional light and the ground's atmospheric fog. */
export const ALPINE_LIGHTING = Object.freeze({
  sunColor: 0xffe0b4,
  sunIntensity: 2.0,
  skyColor: 0xd4e3ec,
  groundColor: 0x7c8465,
  hemisphereIntensity: .22,
  fogColor: 0xb5c9d4,
  fogDensity: .00013,
  exposure: .95,
});

// A small repeating cloud painting is baked once on the CPU. The sky samples it
// once per pixel instead of ray marching or evaluating fractal noise on the GPU.
function cloudTexture(THREE) {
  const width = 512, height = 256;
  const pixels = new Uint8Array(width * height * 4);
  const sample = (x, y, period) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const value = (dx, dy) => hash(((ix + dx) % period + period) % period, iy + dy + 71);
    const a = value(0, 0) * (1 - u) + value(1, 0) * u;
    const b = value(0, 1) * (1 - u) + value(1, 1) * u;
    return a * (1 - v) + b * v;
  };
  // Individual cumulus banks leave large windows of blue between them. Each
  // bank has a flat lower shelf and several uneven, rounded upper billows.
  const banks = [
    [.08, .61, .065], [.24, .645, .075], [.43, .59, .052],
    [.59, .64, .08], [.88, .605, .085], [.98, .70, .065],
  ];
  const lobes = [];
  banks.forEach(([u, v, width], bank) => {
    lobes.push([u, v - .012, width, .013]);
    for (let i = 0; i < 7; i++) {
      lobes.push([
        u + (i / 6 - .5) * width * 1.65,
        v + hash(i + 27, bank + 13) * .025,
        width * (.26 + hash(i + 8, bank + 32) * .15),
        .013 + hash(i + 19, bank + 44) * .014,
      ]);
    }
  });
  for (let y = 0; y < height; y++) {
    const v = y / (height - 1);
    for (let x = 0; x < width; x++) {
      const u = x / width;
      let mass = 0;
      for (const [cx, cy, rx, ry] of lobes) {
        let dx = Math.abs(u - cx);
        dx = Math.min(dx, 1 - dx);
        const radius = (dx / rx) ** 2 + ((v - cy) / ry) ** 2;
        if (radius < 5) mass = Math.max(mass, Math.exp(-radius * 1.4));
      }
      const wisps = sample(u * 36 - 3, v * 72 + 8, 36);
      const density = smooth(.10, .58, mass + (wisps - .5) * .13)
        * smooth(.52, .56, v);
      const shade = clamp(.78 + (v - .6) * 2.3 + wisps * .13);
      const offset = (y * width + x) * 4;
      pixels[offset] = Math.round(density * 255);
      pixels[offset + 1] = Math.round(shade * 255);
      pixels[offset + 2] = 0;
      pixels[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createSky(THREE, sunDirection) {
  const clouds = cloudTexture(THREE);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    uniforms: {
      clouds: { value: clouds },
      sunDirection: { value: sunDirection },
      zenith: { value: new THREE.Color(0x4e84ad) },
      horizon: { value: new THREE.Color(0xc8d9df) },
      sunset: { value: new THREE.Color(0xf9d5a4) },
      cloudShadow: { value: new THREE.Color(0xb1c3cf) },
      cloudLight: { value: new THREE.Color(0xfff5e4) },
    },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D clouds;
      uniform vec3 sunDirection, zenith, horizon, sunset, cloudShadow, cloudLight;
      varying vec3 vDirection;
      void main() {
        vec3 direction = normalize(vDirection);
        float elevation = max(direction.y, 0.0);
        float towardSun = max(dot(direction, sunDirection), 0.0);
        vec3 color = mix(horizon, zenith, pow(clamp((elevation + .015) * 2.1, 0.0, 1.0), .46));
        color = mix(color, sunset, pow(towardSun, 7.0) * .18);
        color += sunset * pow(towardSun, 60.0) * .17;
        float sun = smoothstep(.9993, .99986, towardSun);
        color = mix(color, vec3(1.0, .94, .79), sun);
        vec2 uv = vec2(atan(direction.z, direction.x) / 6.2831853 + .5,
          asin(clamp(direction.y, -1.0, 1.0)) / 3.1415927 + .5);
        vec2 cloud = texture2D(clouds, uv).rg;
        vec3 cloudColor = mix(cloudShadow, cloudLight, cloud.g);
        cloudColor = mix(cloudColor, sunset, pow(towardSun, 5.0) * .12);
        color = mix(color, cloudColor, cloud.r * .94);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(8000, 32, 16), material);
  sky.name = 'AlpineSky';
  sky.renderOrder = -100;
  sky.frustumCulled = false;
  return { sky, clouds };
}

const HEIGHTFIELD_URL = new URL('./assets/terrain/sierra-heightfield.bin', import.meta.url);

/** Decode the bundled real elevation field without browser or GIS dependencies. */
export function parseAlpineHeightfield(input) {
  const bytes = ArrayBuffer.isView(input)
    ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
    : new Uint8Array(input);
  if (bytes.byteLength < 12 || new TextDecoder().decode(bytes.subarray(0, 4)) !== 'HGS1') {
    throw new Error('Invalid Alpine elevation asset.');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerLength = view.getUint32(4, true);
  if (headerLength > 65536 || headerLength + 8 > bytes.byteLength) throw new Error('Invalid elevation header.');
  const metadata = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + headerLength)));
  const { width, height, minimum, maximum, bounds } = metadata;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2
    || width > 2049 || height > 2049 || !Number.isFinite(minimum) || !Number.isFinite(maximum)
    || maximum <= minimum || !bounds || !['minX', 'minZ', 'width', 'depth'].every(key => Number.isFinite(bounds[key]))
    || bounds.width <= 0 || bounds.depth <= 0) throw new Error('Invalid elevation dimensions.');
  const count = width * height;
  const start = 8 + headerLength;
  if (bytes.byteLength !== start + count * 6) throw new Error('Truncated elevation asset.');
  const heights = new Float32Array(count);
  for (let i = 0; i < count; i++) heights[i] = minimum + view.getUint16(start + i * 2, true) / 65535 * (maximum - minimum);
  return {
    width, height, heights, metadata,
    terrainBounds: { ...bounds },
    normalBytes: bytes.slice(start + count * 2),
  };
}

/** A failed decorative asset leaves the flyable numerical world operational. */
export async function loadAlpineHeightfield(url = HEIGHTFIELD_URL.href) {
  try {
    const response = await fetch(String(url));
    if (!response.ok) throw new Error(`Elevation request returned ${response.status}.`);
    return parseAlpineHeightfield(await response.arrayBuffer());
  } catch (error) {
    console.warn('Alpine elevation unavailable; using the flight world only:', error.message);
    return null;
  }
}

/** Bilinear sampling preserves the measured DEM instead of inventing new ridges. */
export function sampleAlpineHeight(terrain, x, z) {
  const bounds = terrain.terrainBounds;
  const u = clamp((x - bounds.minX) / bounds.width) * (terrain.width - 1);
  const v = clamp((z - bounds.minZ) / bounds.depth) * (terrain.height - 1);
  const x0 = Math.min(terrain.width - 2, Math.floor(u));
  const z0 = Math.min(terrain.height - 2, Math.floor(v));
  const fx = u - x0, fz = v - z0, data = terrain.heights;
  const a = data[z0 * terrain.width + x0] * (1 - fx) + data[z0 * terrain.width + x0 + 1] * fx;
  const b = data[(z0 + 1) * terrain.width + x0] * (1 - fx) + data[(z0 + 1) * terrain.width + x0 + 1] * fx;
  return a * (1 - fz) + b * fz;
}

function skirtHeight(terrain, x, z) {
  const boundary = Math.max(Math.abs(x), Math.abs(z));
  const transition = smooth(1580, 2300, boundary);
  // A hidden inset protects the square playable corners between sampled vertices.
  // It tapers at the world's visual edge, avoiding a visible drop at the seam.
  const inset = 2 + 14 * (1 - smooth(1450, 1600, boundary));
  const inner = terrainHeight(x, z) - inset;
  return inner * (1 - transition) + sampleAlpineHeight(terrain, x, z) * transition;
}

function patchGeometry(THREE, terrain, bounds, resolution) {
  const positions = [], normals = [], colors = [], uvs = [], indices = [];
  const vertices = new Map();
  const edgeResolution = 64;
  const stride = edgeResolution / resolution;
  const heightAt = (x, z) => skirtHeight(terrain, x, z);
  function vertex(gx, gz) {
    const key = `${gx},${gz}`;
    if (vertices.has(key)) return vertices.get(key);
    const x = bounds.minX + gx / edgeResolution * bounds.width;
    const z = bounds.minZ + gz / edgeResolution * bounds.depth;
    const y = heightAt(x, z);
    const derivativeStep = 10;
    const dx = (heightAt(x + derivativeStep, z) - heightAt(x - derivativeStep, z)) / (2 * derivativeStep);
    const dz = (heightAt(x, z + derivativeStep) - heightAt(x, z - derivativeStep)) / (2 * derivativeStep);
    const length = Math.sqrt(dx * dx + 1 + dz * dz);
    const index = positions.length / 3;
    positions.push(x, y, z);
    normals.push(-dx / length, 1 / length, -dz / length);
    colors.push(1, 1, 1);
    uvs.push((x - terrain.terrainBounds.minX) / terrain.terrainBounds.width,
      (z - terrain.terrainBounds.minZ) / terrain.terrainBounds.depth);
    vertices.set(key, index);
    return index;
  }
  for (let z = 0; z < edgeResolution; z += stride) {
    for (let x = 0; x < edgeResolution; x += stride) {
      const boundary = x === 0 || z === 0 || x + stride === edgeResolution || z + stride === edgeResolution;
      if (stride === 1 || !boundary) {
        const a = vertex(x, z), b = vertex(x + stride, z);
        const c = vertex(x, z + stride), d = vertex(x + stride, z + stride);
        indices.push(a, c, b, b, c, d);
        continue;
      }
      // Every LOD shares the same fine boundary samples. Fans stitch coarse
      // interiors to those samples, avoiding cracks or artificial skirt cliffs.
      const polygon = [vertex(x, z)];
      if (x === 0) for (let i = 1; i < stride; i++) polygon.push(vertex(x, z + i));
      polygon.push(vertex(x, z + stride));
      if (z + stride === edgeResolution) for (let i = 1; i < stride; i++) polygon.push(vertex(x + i, z + stride));
      polygon.push(vertex(x + stride, z + stride));
      if (x + stride === edgeResolution) for (let i = stride - 1; i > 0; i--) polygon.push(vertex(x + stride, z + i));
      polygon.push(vertex(x + stride, z));
      if (z === 0) for (let i = stride - 1; i > 0; i--) polygon.push(vertex(x + i, z));
      const center = vertex(x + stride / 2, z + stride / 2);
      for (let i = 0; i < polygon.length; i++) indices.push(center, polygon[i], polygon[(i + 1) % polygon.length]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createMountains(THREE, terrain, externalMaterial) {
  const group = new THREE.Group();
  group.name = 'AlpineBackdrop';
  group.userData.decorative = true;
  const material = externalMaterial || new THREE.MeshStandardMaterial({ color: 0x9d9f93, roughness: 1 });
  const patches = [];
  const geometries = new Set();
  let quality = 'high';
  if (terrain) {
    const bounds = terrain.terrainBounds;
    const patchCount = 7;
    for (let row = 0; row < patchCount; row++) {
      for (let column = 0; column < patchCount; column++) {
        const patch = {
          minX: bounds.minX + column / patchCount * bounds.width,
          minZ: bounds.minZ + row / patchCount * bounds.depth,
          width: bounds.width / patchCount,
          depth: bounds.depth / patchCount,
        };
        // The centre is already drawn by the authoritative flight-world terrain.
        if (patch.minX >= -1450 && patch.minZ >= -1450
          && patch.minX + patch.width <= 1450 && patch.minZ + patch.depth <= 1450) continue;
        const mesh = new THREE.Mesh(undefined, material);
        mesh.name = `AlpinePatch-${column}-${row}`;
        mesh.receiveShadow = false;
        mesh.matrixAutoUpdate = false;
        mesh.userData.terrainPatch = true;
        group.add(mesh);
        patches.push({ bounds: patch, mesh, cache: new Map(), resolution: null });
      }
    }
  }
  function update(cameraPosition) {
    const near = quality === 'high' ? 3600 : quality === 'medium' ? 3000 : 2600;
    const middle = quality === 'low' ? 4500 : 6500;
    for (const patch of patches) {
      const b = patch.bounds;
      const dx = Math.max(b.minX - cameraPosition.x, 0, cameraPosition.x - b.minX - b.width);
      const dz = Math.max(b.minZ - cameraPosition.z, 0, cameraPosition.z - b.minZ - b.depth);
      const distance = Math.hypot(dx, dz);
      // Shared borders let each patch adapt independently, with a little
      // hysteresis to keep an orbiting chase camera from reallocating geometry.
      const margin = patch.resolution === 64 ? 180 : 0;
      const resolution = distance < near + margin ? 64 : distance < middle + (patch.resolution === 32 ? 180 : 0) ? 32 : 16;
      if (resolution === patch.resolution) continue;
      if (!patch.cache.has(resolution)) {
        const geometry = patchGeometry(THREE, terrain, b, resolution);
        patch.cache.set(resolution, geometry);
        geometries.add(geometry);
      }
      patch.mesh.geometry = patch.cache.get(resolution);
      patch.resolution = resolution;
    }
  }
  update({ x: 0, z: 0 });
  return {
    group, update,
    setQuality(level) { if (['high', 'medium', 'low'].includes(level)) quality = level; },
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      if (!externalMaterial) material.dispose();
    },
  };
}

/**
 * Data-driven geological backdrop, separate from the numerical flight world.
 * The measured USGS elevations are chunked for culling and geometry LOD. Only
 * the optional sky follows the camera; no backdrop surface participates in flight.
 */
export function createAtmosphere(THREE, scene, { sunDirection, sky: includeSky = true, terrain = null, material } = {}) {
  const direction = new THREE.Vector3(.59047, .68207, .43144);
  if (sunDirection) direction.copy(sunDirection);
  direction.normalize();
  const { sky, clouds } = includeSky ? createSky(THREE, direction) : {};
  const mountains = createMountains(THREE, terrain, material);
  let terrainNormal = null;
  if (terrain) {
    terrainNormal = new THREE.DataTexture(terrain.normalBytes, terrain.width, terrain.height, THREE.RGBAFormat);
    terrainNormal.wrapS = terrainNormal.wrapT = THREE.ClampToEdgeWrapping;
    terrainNormal.minFilter = THREE.LinearMipmapLinearFilter;
    terrainNormal.magFilter = THREE.LinearFilter;
    terrainNormal.generateMipmaps = true;
    terrainNormal.colorSpace = THREE.NoColorSpace;
    terrainNormal.flipY = false;
    terrainNormal.needsUpdate = true;
  }
  if (sky) scene.add(sky);
  scene.add(mountains.group);
  return {
    lighting: ALPINE_LIGHTING,
    terrainNormal,
    terrainBounds: terrain?.terrainBounds || null,
    setQuality: mountains.setQuality,
    update(cameraPosition) { sky?.position.copy(cameraPosition); mountains.update(cameraPosition); },
    dispose() {
      if (sky) scene.remove(sky);
      scene.remove(mountains.group);
      sky?.geometry.dispose();
      sky?.material.dispose();
      clouds?.dispose();
      mountains.dispose();
      terrainNormal?.dispose();
    },
  };
}
