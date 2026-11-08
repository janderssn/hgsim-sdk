import { CLOUD_FIELD, CLOUD_DENSITY_GLSL, bakeCloudShape, bakeCloudWeather, bakeCloudShadow } from './cloud-field.js';

/** Bounded WebGL2 budgets; these are work limits, not hardware FPS claims. */
export const AERIAL_QUALITY = Object.freeze({
  high: Object.freeze({ scale: 1 / 3, maxWidth: 640, maxHeight: 360, steps: 48, lightSteps: 3 }),
  medium: Object.freeze({ scale: 1 / 4, maxWidth: 480, maxHeight: 270, steps: 32, lightSteps: 2 }),
  low: Object.freeze({ scale: 1 / 6, maxWidth: 256, maxHeight: 144, steps: 16, lightSteps: 0 }),
});

const PI = Math.PI;
const BETA_R = [5.8e-6, 13.5e-6, 33.1e-6];
const BETA_M = 2.4e-5;
const SUN_COLOR = [1, .962, .88];
const DEFAULT_SUN = [.5904601, .6817721, .4319070];
/** Radiance palettes, applied before output grading and shared by sky/IBL. */
export const AERIAL_STYLES = Object.freeze({
  daylight: Object.freeze({
    rayTint: [1, 1, 1], mieTint: [1, 1, 1], multiple: [.085, .13, .19], ground: [.12, .135, .14],
    aerialTint: [1, 1, 1], cloudBase: [.18, .215, .25], cloudTop: [.17, .17, .17], cloudSunTint: [1, 1, 1], depthStrength: 1,
  }),
  'illustrated-alpine': Object.freeze({
    // A cool molecular spectrum against warm aerosol forward scattering:
    // turquoise windows, apricot banks and violet/slate atmospheric depth.
    rayTint: [.65, 1.20, 1.60], mieTint: [1.09, .95, .88], multiple: [.085, .16, .255], ground: [.14, .145, .17],
    aerialTint: [.74, .82, 1.15], cloudBase: [.13, .14, .225], cloudTop: [.17, .125, .14],
    cloudSunTint: [1.18, .90, 1.02], depthStrength: 5.5,
  }),
});
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const array = vector => Array.isArray(vector) || ArrayBuffer.isView(vector) ? vector : [vector.x, vector.y, vector.z];
const normalize = value => { const a = array(value), length = Math.hypot(...a); return a.map(x => x / (length || 1)); };
const colorChannels = value => value?.isColor ? [value.r, value.g, value.b] : Array.from(array(value));
const styleFor = name => AERIAL_STYLES[name] || AERIAL_STYLES.daylight;

// A curvature-aware approximation to the exponential atmosphere's slant column.
// Unlike 1/cos(theta), it remains finite at the horizon and below it.
const column = (mu, scaleHeight) => scaleHeight / Math.max(.009,
  .5 * (mu + Math.sqrt(mu * mu + 4 * scaleHeight / 6371000)));
const solarTransmittance = sun => {
  const ray = column(Math.max(.025, sun[1]), 8000), aerosol = column(Math.max(.025, sun[1]), 1200);
  return BETA_R.map(beta => Math.exp(-beta * ray - BETA_M * aerosol));
};

/** Single-scattering daylight in linear radiance, shared by the sky and IBL bake. */
export function sampleSkyRadiance(direction, sunDirection = DEFAULT_SUN,
  { sunDisk = true, sunColor = SUN_COLOR, style = 'daylight' } = {}) {
  const d = normalize(direction), s = normalize(sunDirection);
  const solarColor = colorChannels(sunColor), palette = styleFor(style);
  const mu = Math.max(-1, Math.min(1, dot(d, s)));
  const elevation = Math.max(-.035, d[1]);
  const rayColumn = column(elevation, 8000), mieColumn = column(elevation, 1200);
  const sunlight = solarTransmittance(s);
  const rayPhase = 3 / (16 * PI) * (1 + mu * mu);
  const g = .76;
  const miePhase = (1 - g * g) / (4 * PI * (1 + g * g - 2 * g * mu) ** 1.5);
  const disk = sunDisk ? smooth(Math.cos(.0051), Math.cos(.0044), mu) : 0;
  const belowHorizon = smooth(-.12, .035, d[1]);
  return BETA_R.map((beta, i) => {
    const tauR = beta * rayColumn, tauM = BETA_M * mieColumn;
    const sunTransmittance = sunlight[i];
    const scatter = (rayPhase * tauR * palette.rayTint[i] + miePhase * tauM * palette.mieTint[i])
      / Math.max(1e-6, tauR + tauM);
    const sky = (1 - Math.exp(-tauR - tauM)) * scatter * 20 * solarColor[i] * sunTransmittance;
    // A small higher-order diffuse term keeps the antisolar horizon and cloud
    // bases naturally open; the principal spectrum remains Rayleigh/Mie.
    const multiple = palette.multiple[i] * (1 - Math.exp(-tauR - tauM));
    const ground = palette.ground[i];
    return (ground * (1 - belowHorizon) + (sky + multiple) * belowHorizon)
      + disk * 160 * solarColor[i] * sunTransmittance;
  });
}

/** Exact integral of exp(-height/H) along a straight camera-to-surface segment. */
export function atmosphereTransmittance(distance, startHeight = 0, endHeight = startHeight, { style = 'daylight' } = {}) {
  const path = Math.max(0, distance);
  const integral = scaleHeight => {
    const start = Math.max(-300, startHeight), end = Math.max(-300, endHeight);
    const delta = (end - start) / scaleHeight;
    const average = Math.abs(delta) < .001 ? 1 - delta * .5 + delta * delta / 6
      : (1 - Math.exp(-delta)) / delta;
    return path * Math.exp(-start / scaleHeight) * average;
  };
  const density = 1 + (styleFor(style).depthStrength - 1) * smooth(700, 3000, path);
  const ray = integral(8000) * density, aerosol = integral(1200) * density;
  return BETA_R.map(beta => Math.exp(-beta * ray - BETA_M * aerosol));
}

export const AERIAL_SCATTERING_GLSL = /* glsl */`
  uniform vec3 aerialSunDirection, aerialCameraPosition, aerialSunTransmittance, aerialSunColor;
  uniform vec3 aerialRayTint, aerialMieTint, aerialMultipleScatter, aerialGroundRadiance, aerialInscatterTint;
  uniform float aerialDepthStrength;
  const vec3 AERIAL_BETA_R = vec3(5.8e-6, 13.5e-6, 33.1e-6);
  const float AERIAL_BETA_M = 2.4e-5;
  float aerialColumn(float mu, float scaleHeight) {
    return scaleHeight / max(0.009, 0.5 * (mu + sqrt(mu * mu + 4.0 * scaleHeight / 6371000.0)));
  }
  vec3 aerialSkyRadiance(vec3 direction, bool sunDisk) {
    vec3 d = normalize(direction);
    float mu = clamp(dot(d, aerialSunDirection), -1.0, 1.0);
    float elevation = max(-0.035, d.y);
    vec3 tauR = AERIAL_BETA_R * aerialColumn(elevation, 8000.0);
    float tauM = AERIAL_BETA_M * aerialColumn(elevation, 1200.0);
    float rayPhase = 0.0596831 * (1.0 + mu * mu);
    float g = 0.76;
    float miePhase = (1.0 - g * g) / (12.5663706 * pow(1.0 + g * g - 2.0 * g * mu, 1.5));
    vec3 scatter = (rayPhase * tauR * aerialRayTint + miePhase * tauM * aerialMieTint) / max(vec3(1e-6), tauR + tauM);
    vec3 sky = (1.0 - exp(-tauR - tauM)) * scatter * 20.0 * aerialSunColor * aerialSunTransmittance;
    sky += aerialMultipleScatter * (1.0 - exp(-tauR - tauM));
    sky = mix(aerialGroundRadiance, sky, smoothstep(-0.12, 0.035, d.y));
    if (sunDisk) sky += smoothstep(0.999986995, 0.99999032, mu) * 160.0 * aerialSunColor * aerialSunTransmittance;
    return sky;
  }
  float aerialPathIntegral(float startHeight, float endHeight, float distanceM, float scaleHeight) {
    float a = max(-300.0, startHeight), b = max(-300.0, endHeight);
    float delta = (b - a) / scaleHeight;
    float averageDensity = abs(delta) < 0.001 ? 1.0 - delta * 0.5 + delta * delta / 6.0
      : (1.0 - exp(-delta)) / delta;
    return distanceM * exp(-a / scaleHeight) * averageDensity;
  }
  void aerialSegment(vec3 worldPosition, out vec3 transmittance, out vec3 inscatter) {
    vec3 ray = worldPosition - aerialCameraPosition;
    float distanceM = length(ray);
    if (distanceM < 0.01) { transmittance = vec3(1.0); inscatter = vec3(0.0); return; }
    vec3 direction = ray / distanceM;
    float rayleigh = aerialPathIntegral(aerialCameraPosition.y, worldPosition.y, distanceM, 8000.0);
    float aerosol = aerialPathIntegral(aerialCameraPosition.y, worldPosition.y, distanceM, 1200.0);
    // Compress distant contrast into broad blue layers while preserving the
    // immediate flying corridor. Smooth optical scaling avoids a fog wall.
    float depthDensity = mix(1.0, aerialDepthStrength, smoothstep(700.0, 3000.0, distanceM));
    transmittance = exp((-AERIAL_BETA_R * rayleigh - AERIAL_BETA_M * aerosol) * depthDensity);
    // The local segment scatters toward the same sky radiance as the backdrop;
    // no second grey fog colour, display-space blend or fixed distance wall.
    inscatter = aerialSkyRadiance(direction, false) * aerialInscatterTint * (1.0 - transmittance);
  }
  vec3 aerialApply(vec3 color, vec3 worldPosition) {
    vec3 transmittance, inscatter;
    aerialSegment(worldPosition, transmittance, inscatter);
    return color * transmittance + inscatter;
  }
`;

export const AERIAL_CLOUD_SHADOW_GLSL = /* glsl */`
  uniform sampler2D aerialCloudShadow;
  uniform vec2 aerialWindOffset;
  float aerialCloudVisibility(vec3 worldPosition) {
    vec2 ground = worldPosition.xz - aerialSunDirection.xz * worldPosition.y / max(0.08, aerialSunDirection.y);
    float occlusion = texture2D(aerialCloudShadow, (ground - aerialWindOffset) / ${CLOUD_FIELD.period.toFixed(1)}).r;
    // Keep diffuse skylight alive under a cloud: only the directional beam is
    // occluded. Thin rims transition continuously to a dense 82% shadow core.
    return 1.0 - occlusion * 0.82;
  }
`;

const VERTEX_WORLD = /* glsl */`
  vec4 aerialWorld = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
    aerialWorld = batchingMatrix * aerialWorld;
  #endif
  #ifdef USE_INSTANCING
    aerialWorld = instanceMatrix * aerialWorld;
  #endif
  vAerialWorldPosition = (modelMatrix * aerialWorld).xyz;
`;

/**
 * One sun, sky, aerial medium and cloud-shadow field. Call render(renderer,
 * camera) once before the normal scene render. Clouds occupy only a bounded
 * low-resolution background pass; ordinary geometry supplies exact occlusion.
 */
export function createAerialAtmosphere(THREE, { sunDirection = DEFAULT_SUN, sunColor = SUN_COLOR, style = 'daylight', quality = 'high',
  cloudOffset = [CLOUD_FIELD.offsetX, CLOUD_FIELD.offsetZ], shapeSize = 64, weatherSize = 128, shadowSize = 128 } = {}) {
  const direction = new THREE.Vector3(...normalize(sunDirection));
  const solarColor = colorChannels(sunColor), palette = styleFor(style);
  const shape = bakeCloudShape(shapeSize), weather = bakeCloudWeather(weatherSize);
  const shadow = bakeCloudShadow(shape, weather, direction, shadowSize);
  const shapeTexture = new THREE.Data3DTexture(shape.data, shape.size, shape.size, shape.size);
  shapeTexture.format = THREE.RGFormat;
  shapeTexture.type = THREE.UnsignedByteType;
  shapeTexture.unpackAlignment = 1;
  shapeTexture.wrapS = shapeTexture.wrapT = shapeTexture.wrapR = THREE.RepeatWrapping;
  shapeTexture.minFilter = shapeTexture.magFilter = THREE.LinearFilter;
  shapeTexture.generateMipmaps = false;
  shapeTexture.needsUpdate = true;

  const texture2D = field => {
    const texture = new THREE.DataTexture(field.data, field.size, field.size, THREE.RedFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    return texture;
  };
  const weatherTexture = texture2D(weather), shadowTexture = texture2D(shadow);
  const clearClouds = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
  clearClouds.needsUpdate = true;
  const uniforms = {
    aerialSunDirection: { value: direction },
    aerialSunColor: { value: new THREE.Vector3(...solarColor) },
    aerialSunTransmittance: { value: new THREE.Vector3(...solarTransmittance(direction.toArray())) },
    aerialRayTint: { value: new THREE.Vector3(...palette.rayTint) },
    aerialMieTint: { value: new THREE.Vector3(...palette.mieTint) },
    aerialMultipleScatter: { value: new THREE.Vector3(...palette.multiple) },
    aerialGroundRadiance: { value: new THREE.Vector3(...palette.ground) },
    aerialInscatterTint: { value: new THREE.Vector3(...palette.aerialTint) },
    aerialDepthStrength: { value: palette.depthStrength },
    aerialCameraPosition: { value: new THREE.Vector3() },
    aerialWindOffset: { value: new THREE.Vector2(cloudOffset[0], cloudOffset[1]) },
    aerialCloudShadow: { value: shadowTexture },
  };
  const resolution = new THREE.Vector2(1, 1);
  const cloudTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false });
  cloudTarget.texture.name = 'Above bounded volumetric cloud radiance + transmittance';
  const cloudMaterial = new THREE.ShaderMaterial({
    name: 'Above world-space cumulus integral',
    glslVersion: THREE.GLSL3,
    depthWrite: false, depthTest: false, toneMapped: false,
    uniforms: { ...uniforms,
      // The artistic compression belongs to distant land layers. Cloud banks
      // retain the base high-altitude medium so peach rims survive the view.
      aerialDepthStrength: { value: 1 },
      aerialCloudShape: { value: shapeTexture }, aerialCloudWeather: { value: weatherTexture },
      inverseProjection: { value: new THREE.Matrix4() }, inverseView: { value: new THREE.Matrix4() },
      aerialCloudSteps: { value: 48 }, aerialCloudLightSteps: { value: 3 },
      aerialCloudEncodeScale: { value: 1 },
      aerialCloudBaseRadiance: { value: new THREE.Vector3(...palette.cloudBase) },
      aerialCloudTopRadiance: { value: new THREE.Vector3(...palette.cloudTop) },
      aerialCloudSunTint: { value: new THREE.Vector3(...palette.cloudSunTint) },
    },
    vertexShader: `out vec2 vCloudUv;
      void main() { vCloudUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      in vec2 vCloudUv;
      out vec4 cloudOutput;
      uniform mat4 inverseProjection, inverseView;
      uniform float aerialCloudSteps, aerialCloudLightSteps, aerialCloudEncodeScale;
      uniform vec3 aerialCloudBaseRadiance, aerialCloudTopRadiance, aerialCloudSunTint;
      ${AERIAL_SCATTERING_GLSL}
      ${CLOUD_DENSITY_GLSL}
      uniform sampler2D aerialCloudShadow;
      float cloudSunVisibility(vec3 p) {
        if (aerialCloudLightSteps < 0.5) {
          vec2 ground = p.xz - aerialSunDirection.xz * p.y / max(0.08, aerialSunDirection.y);
          float columnShade = texture(aerialCloudShadow, (ground - aerialWindOffset) / ${CLOUD_FIELD.period.toFixed(1)}).r;
          return 1.0 - columnShade * 0.8;
        }
        float opticalDepth = 0.0;
        for (int light = 0; light < 3; light++) {
          if (float(light) >= aerialCloudLightSteps) break;
          float stride = 150.0 + float(light) * 220.0;
          p += aerialSunDirection * stride;
          opticalDepth += aerialCloudDensity(p) * stride * ${CLOUD_FIELD.extinction};
        }
        return exp(-opticalDepth);
      }
      void main() {
        vec4 viewRay = inverseProjection * vec4(vCloudUv * 2.0 - 1.0, 1.0, 1.0);
        vec3 direction = normalize(mat3(inverseView) * (viewRay.xyz / viewRay.w));
        cloudOutput = vec4(0.0, 0.0, 0.0, 1.0);
        if (direction.y < 0.008) return;
        float entry = max(0.0, (${CLOUD_FIELD.bottom.toFixed(1)} - aerialCameraPosition.y) / direction.y);
        float exit = min(32000.0, (${CLOUD_FIELD.top.toFixed(1)} - aerialCameraPosition.y) / direction.y);
        if (exit <= entry) return;
        float stepLength = (exit - entry) / aerialCloudSteps;
        float distanceM = entry + stepLength * 0.5;
        float transmittance = 1.0, meanDistance = 0.0, weightSum = 0.0;
        vec3 radiance = vec3(0.0);
        float mu = dot(direction, aerialSunDirection);
        float phase = 0.82 * (1.0 - 0.62 * 0.62) / pow(1.0 + 0.62 * 0.62 - 1.24 * mu, 1.5)
          + 0.18 * (1.0 - 0.2 * 0.2) / pow(1.0 + 0.2 * 0.2 + 0.4 * mu, 1.5);
        vec3 skyAmbient = aerialSkyRadiance(vec3(0.0, 1.0, 0.0), false) * 0.30;
        for (int sampleIndex = 0; sampleIndex < 48; sampleIndex++) {
          if (float(sampleIndex) >= aerialCloudSteps || distanceM > exit || transmittance < 0.015) break;
          vec3 p = aerialCameraPosition + direction * distanceM;
          float density = aerialCloudDensity(p);
          if (density > 0.001) {
            float sunVisibility = cloudSunVisibility(p);
            float heightInCloud = clamp((p.y - ${CLOUD_FIELD.bottom.toFixed(1)}) / ${(CLOUD_FIELD.top - CLOUD_FIELD.bottom).toFixed(1)}, 0.0, 1.0);
            vec3 ambient = mix(aerialCloudBaseRadiance, skyAmbient + aerialCloudTopRadiance, sqrt(heightInCloud));
            // Keep lit edges in a useful HDR range: over-bright white banks erase
            // the peach key/slate underside distinction after tone mapping.
            float powder = 1.0 - exp(-density * 5.0);
            vec3 sunlight = aerialSunColor * aerialCloudSunTint
              * (sunVisibility * (0.72 + phase * 0.12) * (0.78 + powder * 0.22) + 0.08);
            float stepTransmittance = exp(-density * stepLength * ${CLOUD_FIELD.extinction});
            float weight = transmittance * (1.0 - stepTransmittance);
            radiance += (ambient + sunlight) * weight;
            meanDistance += distanceM * weight;
            weightSum += weight;
            transmittance *= stepTransmittance;
          }
          // Longer empty-space strides preserve detail at occupied samples.
          distanceM += stepLength * (density < 0.001 ? 1.35 : 1.0);
        }
        if (weightSum > 0.0001) {
          vec3 cloudPosition = aerialCameraPosition + direction * meanDistance / weightSum;
          radiance = aerialApply(radiance / weightSum, cloudPosition) * weightSum;
          float distanceFade = 1.0 - smoothstep(22000.0, 32000.0, meanDistance / weightSum);
          radiance *= distanceFade;
          transmittance = 1.0 - weightSum * distanceFade;
        }
        cloudOutput = vec4(radiance * aerialCloudEncodeScale, transmittance);
      }
    `,
  });
  const cloudScene = new THREE.Scene(), cloudCamera = new THREE.Camera();
  const cloudQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), cloudMaterial);
  cloudQuad.frustumCulled = false;
  cloudScene.add(cloudQuad);
  const skyMaterial = new THREE.ShaderMaterial({
    name: 'Above coherent single-scattering daylight', side: THREE.BackSide,
    depthWrite: false, fog: false, toneMapped: true,
    uniforms: { ...uniforms, cloudRadiance: { value: clearClouds }, skyResolution: { value: resolution }, cloudDecodeScale: { value: 1 } },
    vertexShader: `varying vec3 vSkyDirection;
      void main() { vSkyDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec3 vSkyDirection;
      uniform sampler2D cloudRadiance;
      uniform vec2 skyResolution;
      uniform float cloudDecodeScale;
      ${AERIAL_SCATTERING_GLSL}
      void main() {
        vec3 direction = normalize(vSkyDirection);
        vec3 sky = aerialSkyRadiance(direction, true);
        vec4 cloud = texture2D(cloudRadiance, gl_FragCoord.xy / skyResolution);
        gl_FragColor = vec4(sky * cloud.a + cloud.rgb * cloudDecodeScale, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), skyMaterial);
  sky.name = 'CoherentAlpineSky';
  sky.renderOrder = -100;
  sky.frustumCulled = false;
  let level = AERIAL_QUALITY[quality] ? quality : 'high', disposed = false;
  const installed = new WeakSet();

  /** Safe to call after another onBeforeCompile patch; hooks compose once. */
  function installMaterial(material) {
    if (!material || installed.has(material)) return material;
    if (Array.isArray(material)) { material.forEach(installMaterial); return material; }
    // ShaderMaterial owns its vertex/output contract; use shared GLSL directly.
    if (material.isShaderMaterial || material.isRawShaderMaterial) return material;
    installed.add(material);
    const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey;
    const key = previousKey.call(material);
    const receivesDirectLight = material.isMeshStandardMaterial || material.isMeshPhysicalMaterial
      || material.isMeshLambertMaterial || material.isMeshPhongMaterial;
    material.onBeforeCompile = function (shader, renderer) {
      previous.call(this, shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      // A cloned prop can inherit this callback through another shader patch
      // (ground-cover adds its wind/streaming wrapper that way). Its material
      // identity is new, but the previous callback has already installed the
      // complete aerial program. Detect the generated shader, not only the
      // material object; retain the current shared uniforms in either case.
      if (shader.vertexShader.includes('varying vec3 vAerialTransmittance;')) return;
      const varyings = 'varying vec3 vAerialWorldPosition;\nvarying vec3 vAerialTransmittance;\nvarying vec3 vAerialInscatter;';
      // Extinction varies smoothly across a leaf, tree card or terrain triangle.
      // Evaluate the spectral segment once per vertex, rather than repeating
      // slant-column exponentials for every overlapping cutout fragment.
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${varyings}\n${AERIAL_SCATTERING_GLSL}`)
        .replace('#include <project_vertex>', `#include <project_vertex>\n${VERTEX_WORLD}\naerialSegment(vAerialWorldPosition, vAerialTransmittance, vAerialInscatter);`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${varyings}\nuniform vec3 aerialSunDirection;\n${AERIAL_CLOUD_SHADOW_GLSL}`)
        .replace('#include <fog_fragment>', '')
        .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = gl_FragColor.rgb * vAerialTransmittance + vAerialInscatter;\n#include <tonemapping_fragment>');
      if (receivesDirectLight) shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>
        float aerialBeamVisibility = aerialCloudVisibility(vAerialWorldPosition);
        reflectedLight.directDiffuse *= aerialBeamVisibility;
        reflectedLight.directSpecular *= aerialBeamVisibility;
      `);
    };
    material.customProgramCacheKey = () => `${key}|above-aerial-daylight-vertex-v2`;
    material.needsUpdate = true;
    return material;
  }

  function update(cameraOrPosition, seconds = 0) {
    if (disposed) return;
    const position = cameraOrPosition.position || cameraOrPosition;
    uniforms.aerialCameraPosition.value.copy(position);
    sky.position.copy(position);
    if (cameraOrPosition.far) sky.scale.setScalar(cameraOrPosition.far * .92);
    uniforms.aerialWindOffset.value.set(cloudOffset[0] + CLOUD_FIELD.windX * seconds,
      cloudOffset[1] + CLOUD_FIELD.windZ * seconds);
  }

  const shared = { uniforms, installMaterial, scatteringGLSL: AERIAL_SCATTERING_GLSL,
    cloudShadowGLSL: AERIAL_CLOUD_SHADOW_GLSL };
  return {
    sky, shared, uniforms, installMaterial,
    get quality() { return level; },
    get budget() { return AERIAL_QUALITY[level]; },
    sampleSkyRadiance: (ray, options) => sampleSkyRadiance(ray, direction, { sunColor: solarColor, style, ...options }),
    generateRadiance(THREEForTexture = THREE, width = 256, height = 128, { sunDisk = false } = {}) {
      const pixels = new Float32Array(width * height * 4);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        // Equirectangular lookup uses asin(y)/pi+.5: texture row 0 is nadir.
        const latitude = ((y + .5) / height - .5) * PI;
        const longitude = ((x + .5) / width - .5) * 2 * PI;
        const radiance = sampleSkyRadiance([Math.cos(latitude) * Math.cos(longitude),
          Math.sin(latitude), Math.cos(latitude) * Math.sin(longitude)], direction, { sunDisk, sunColor: solarColor, style });
        const offset = (y * width + x) * 4;
        pixels.set(radiance, offset); pixels[offset + 3] = 1;
      }
      const texture = new THREEForTexture.DataTexture(pixels, width, height, THREEForTexture.RGBAFormat, THREEForTexture.FloatType);
      texture.name = 'Above coherent daylight linear IBL';
      texture.mapping = THREEForTexture.EquirectangularReflectionMapping;
      texture.colorSpace = THREEForTexture.NoColorSpace;
      texture.wrapS = THREEForTexture.RepeatWrapping;
      texture.minFilter = texture.magFilter = THREEForTexture.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      return texture;
    },
    setQuality(next) { if (AERIAL_QUALITY[next]) level = next; },
    update,
    render(renderer, camera, seconds = 0) {
      if (disposed) return;
      update(camera, seconds);
      renderer.getDrawingBufferSize(resolution);
      const budget = AERIAL_QUALITY[level];
      if (!budget.steps) {
        skyMaterial.uniforms.cloudRadiance.value = clearClouds;
        return;
      }
      // RGBA8 fallback stores linear radiance divided by four. Cloud/shadow
      // coherence does not depend on float-colour-render-target support.
      const floatTarget = renderer.extensions.has('EXT_color_buffer_float');
      const targetType = floatTarget ? THREE.HalfFloatType : THREE.UnsignedByteType;
      if (cloudTarget.texture.type !== targetType) {
        cloudTarget.dispose();
        cloudTarget.texture.type = targetType;
      }
      cloudMaterial.uniforms.aerialCloudEncodeScale.value = floatTarget ? 1 : .25;
      skyMaterial.uniforms.cloudDecodeScale.value = floatTarget ? 1 : 4;
      const scale = Math.min(budget.scale, budget.maxWidth / resolution.x, budget.maxHeight / resolution.y);
      const width = Math.max(1, Math.ceil(resolution.x * scale)), height = Math.max(1, Math.ceil(resolution.y * scale));
      if (cloudTarget.width !== width || cloudTarget.height !== height) cloudTarget.setSize(width, height);
      cloudMaterial.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
      camera.updateMatrixWorld();
      cloudMaterial.uniforms.inverseView.value.copy(camera.matrixWorld);
      cloudMaterial.uniforms.aerialCloudSteps.value = budget.steps;
      cloudMaterial.uniforms.aerialCloudLightSteps.value = budget.lightSteps;
      const target = renderer.getRenderTarget(), xrEnabled = renderer.xr.enabled;
      const autoReset = renderer.info.autoReset;
      renderer.xr.enabled = false;
      renderer.info.autoReset = false;
      try {
        renderer.setRenderTarget(cloudTarget);
        renderer.render(cloudScene, cloudCamera);
      } finally {
        renderer.setRenderTarget(target);
        renderer.xr.enabled = xrEnabled;
        renderer.info.autoReset = autoReset;
      }
      skyMaterial.uniforms.cloudRadiance.value = cloudTarget.texture;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      sky.removeFromParent();
      sky.geometry.dispose(); skyMaterial.dispose(); cloudQuad.geometry.dispose(); cloudMaterial.dispose();
      shapeTexture.dispose(); weatherTexture.dispose(); shadowTexture.dispose(); clearClouds.dispose(); cloudTarget.dispose();
    },
  };
}
