import { HDRLoader } from './vendor/HDRLoader.js';

const HDR_URL = new URL('./assets/lighting/sunflowers_puresky_4k.hdr', import.meta.url);

const readValue = (THREE, texture) => texture.type === THREE.HalfFloatType
  ? THREE.DataUtils.fromHalfFloat : value => value;

/** Keep solar radiance when reducing the sky; an sRGB/canvas resize would lose it. */
export function downsampleRadiance(THREE, source, maximumWidth = 1024) {
  if (source.type !== THREE.HalfFloatType && source.type !== THREE.FloatType) {
    throw new TypeError('HDR lighting requires floating-point linear radiance.');
  }
  const maximum = Number.isFinite(maximumWidth) && maximumWidth >= 1
    ? Math.min(1024, Math.floor(maximumWidth)) : 1024;
  const image = source.image;
  const width = Math.min(image.width, 2 ** Math.floor(Math.log2(maximum)));
  if (width === image.width) return source;
  const height = Math.max(1, Math.round(image.height * width / image.width));
  const pixels = new Float32Array(width * height * 4);
  const read = readValue(THREE, source);
  const scaleX = image.width / width, scaleY = image.height / height;

  for (let y = 0; y < height; y++) {
    const top = y * scaleY, bottom = (y + 1) * scaleY;
    for (let x = 0; x < width; x++) {
      const left = x * scaleX, right = (x + 1) * scaleX;
      const output = (y * width + x) * 4;
      let weight = 0;
      for (let row = Math.floor(top); row < Math.ceil(bottom); row++) {
        const rowWeight = Math.min(bottom, row + 1) - Math.max(top, row);
        for (let column = Math.floor(left); column < Math.ceil(right); column++) {
          const area = rowWeight * (Math.min(right, column + 1) - Math.max(left, column));
          const input = (row * image.width + column) * 4;
          for (let channel = 0; channel < 3; channel++) {
            pixels[output + channel] += read(image.data[input + channel]) * area;
          }
          weight += area;
        }
      }
      for (let channel = 0; channel < 3; channel++) pixels[output + channel] /= weight;
      pixels[output + 3] = 1;
    }
  }

  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat, THREE.FloatType);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.flipY = source.flipY;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** Estimate a matching directional key from the bright solar region above the horizon. */
export function estimateSun(THREE, texture) {
  const { width, height, data } = texture.image;
  const read = readValue(THREE, texture);
  const luminance = index => .2126 * read(data[index]) + .7152 * read(data[index + 1]) + .0722 * read(data[index + 2]);
  let peak = 0;
  for (let row = 0; row < height / 2; row++) {
    for (let column = 0; column < width; column++) peak = Math.max(peak, luminance((row * width + column) * 4));
  }

  const direction = new THREE.Vector3();
  const color = new THREE.Color(0, 0, 0);
  for (let row = 0; row < height / 2; row++) {
    const elevation = (.5 - (row + .5) / height) * Math.PI;
    const horizontal = Math.cos(elevation);
    for (let column = 0; column < width; column++) {
      const index = (row * width + column) * 4;
      const value = luminance(index);
      if (value <= 0 || value < peak * .2) continue;
      const azimuth = ((column + .5) / width - .5) * Math.PI * 2;
      const weight = value * horizontal;
      direction.x += horizontal * Math.cos(azimuth) * weight;
      direction.y += Math.sin(elevation) * weight;
      direction.z += horizontal * Math.sin(azimuth) * weight;
      color.r += read(data[index]) * horizontal;
      color.g += read(data[index + 1]) * horizontal;
      color.b += read(data[index + 2]) * horizontal;
    }
  }
  if (direction.lengthSq() === 0) direction.set(0, 1, 0);
  direction.normalize();
  const maximum = Math.max(color.r, color.g, color.b);
  if (maximum > 0) color.multiplyScalar(1 / maximum);
  else color.setRGB(1, 1, 1);
  return { sunDirection: direction.toArray(), sunColor: color.getHex(THREE.SRGBColorSpace) };
}

/**
 * Integrate linear HDR radiance into a diffuse light probe. Surface irradiance
 * is then evaluated with nine SH coefficients, without sampling a PMREM for
 * each rough terrain fragment. Solar radiance is retained just as in the IBL.
 */
export function integrateIrradiance(THREE, texture) {
  if (texture.type !== THREE.HalfFloatType && texture.type !== THREE.FloatType) {
    throw new TypeError('HDR lighting requires floating-point linear radiance.');
  }
  const { width, height, data } = texture.image;
  const read = readValue(THREE, texture);
  const sh = new THREE.SphericalHarmonics3();
  const basis = new Array(9);
  const direction = new THREE.Vector3();
  const cosAzimuth = new Float64Array(width);
  const sinAzimuth = new Float64Array(width);
  for (let column = 0; column < width; column++) {
    const azimuth = ((column + .5) / width - .5) * Math.PI * 2;
    cosAzimuth[column] = Math.cos(azimuth);
    sinAzimuth[column] = Math.sin(azimuth);
  }

  let totalWeight = 0;
  for (let row = 0; row < height; row++) {
    const v = texture.flipY ? 1 - (row + .5) / height : (row + .5) / height;
    const elevation = (v - .5) * Math.PI;
    const horizontal = Math.cos(elevation);
    const vertical = Math.sin(elevation);
    // Equirectangular texels cover less solid angle toward either pole.
    totalWeight += horizontal * width;
    for (let column = 0; column < width; column++) {
      direction.set(horizontal * cosAzimuth[column], vertical, horizontal * sinAzimuth[column]);
      THREE.SphericalHarmonics3.getBasisAt(direction, basis);
      const index = (row * width + column) * 4;
      const r = read(data[index]), g = read(data[index + 1]), b = read(data[index + 2]);
      for (let band = 0; band < 9; band++) {
        const weight = basis[band] * horizontal;
        const coefficient = sh.coefficients[band];
        coefficient.x += r * weight;
        coefficient.y += g * weight;
        coefficient.z += b * weight;
      }
    }
  }
  sh.scale(4 * Math.PI / totalWeight);
  return new THREE.LightProbe(sh);
}

/** The visible scattering sky supplies diffuse and specular lighting too. */
export function createSkyLighting(THREE, renderer, aerial) {
  const radiance = aerial.generateRadiance(THREE, 256, 128, { sunDisk: false });
  const lightProbe = integrateIrradiance(THREE, radiance);
  const generator = new THREE.PMREMGenerator(renderer);
  let target;
  try { target = generator.fromEquirectangular(radiance); }
  finally { generator.dispose(); radiance.dispose(); }
  return { lightProbe, environment: target.texture,
    dispose() { target.dispose(); } };
}

/**
 * Coherent photographic lighting and sky from one CC0 HDR panorama. The 4k
 * background is reduced in linear radiance to at most 1k for a bounded 256-pixel
 * PMREM cubemap and a diffuse SH light probe. backgroundUrl, if provided,
 * selects that shared source too. The caller adds the probe to the scene and
 * assigns the PMREM to materials that need environment reflections.
 */
export async function loadHDRLighting(THREE, renderer, { url = HDR_URL.href, backgroundUrl = null, environmentWidth = 1024 } = {}) {
  const background = await new HDRLoader().loadAsync(String(backgroundUrl ?? url));
  background.mapping = THREE.EquirectangularReflectionMapping;
  let generator, target, radiance, sun, lightProbe;
  try {
    radiance = downsampleRadiance(THREE, background, Math.max(64, environmentWidth));
    sun = estimateSun(THREE, radiance);
    lightProbe = integrateIrradiance(THREE, radiance);
    generator = new THREE.PMREMGenerator(renderer);
    target = generator.fromEquirectangular(radiance);
  } catch (error) {
    background.dispose();
    throw error;
  } finally {
    generator?.dispose();
    if (radiance && radiance !== background) radiance.dispose();
  }

  let disposed = false;
  return {
    environment: target.texture,
    background,
    lightProbe,
    environmentWidth: radiance.image.width,
    ...sun,
    dispose() {
      if (disposed) return;
      disposed = true;
      target.dispose();
      background.dispose();
    },
  };
}
