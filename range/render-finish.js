/**
 * HDR output and short-range contact occlusion. Depth comes from the beauty
 * render, so cutout foliage uses exactly the same alpha/atlas logic as colour.
 * There is no second geometry pass, material override, or temporal history.
 */
export function createRenderFinish(THREE, renderer, scene, camera) {
  const hdrAvailable = renderer.extensions.has('EXT_color_buffer_float');
  const size = new THREE.Vector2();
  const beauty = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    depthBuffer: true,
    stencilBuffer: false,
    samples: Math.min(4, renderer.capabilities.maxSamples || 0),
  });
  beauty.texture.name = 'Above HDR beauty';
  const occlusion = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
  occlusion.texture.name = 'Above half-resolution contact occlusion';

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;
  const reconstruct = `
    uniform sampler2D sceneDepth;
    uniform mat4 inverseProjection;
    uniform vec2 fullResolution;
    vec3 viewPosition(vec2 uv) {
      // Depth uses nearest filtering. Reconstruct at that texel's centre,
      // including when the half-resolution AO pass lands between two texels.
      // An unsnapped ray creates false self-occlusion bands on flat ground.
      vec2 sampleUv = (floor(uv * fullResolution) + 0.5) / fullResolution;
      float depth = texture2D(sceneDepth, sampleUv).x;
      vec4 p = inverseProjection * vec4(sampleUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
      return p.xyz / p.w;
    }
  `;
  const kernel = Array.from({ length: 12 }, (_, index) => {
    const z = .12 + .8 * (index + .5) / 12;
    const angle = index * 2.399963229728653;
    const radius = Math.sqrt(1 - z * z);
    // Stratify sample lengths: small crevices matter more than a wide halo.
    const length = .22 + .78 * ((index + .5) / 12) ** 1.4;
    return new THREE.Vector3(Math.cos(angle) * radius * length,
      Math.sin(angle) * radius * length, z * length);
  });
  const aoMaterial = new THREE.ShaderMaterial({
    name: 'Above contact occlusion',
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      sceneDepth: { value: beauty.depthTexture },
      inverseProjection: { value: camera.projectionMatrixInverse },
      projection: { value: camera.projectionMatrix },
      fullResolution: { value: size },
      samples: { value: kernel },
      sampleCount: { value: 12 },
    },
    vertexShader,
    fragmentShader: `
      varying vec2 vUv;
      uniform mat4 projection;
      uniform vec3 samples[12];
      uniform int sampleCount;
      ${reconstruct}
      void main() {
        float depth = texture2D(sceneDepth, vUv).x;
        vec3 p = viewPosition(vUv);
        if (depth > 0.999999 || -p.z > 180.0) {
          gl_FragColor = vec4(1.0); return;
        }
        // Choose the nearest derivative on either side of an edge rather than
        // mistaking the sky behind a sail or tree for its surface normal.
        vec2 texel = 1.0 / fullResolution;
        vec3 left = p - viewPosition(vUv - vec2(texel.x, 0.0));
        vec3 right = viewPosition(vUv + vec2(texel.x, 0.0)) - p;
        vec3 down = p - viewPosition(vUv - vec2(0.0, texel.y));
        vec3 up = viewPosition(vUv + vec2(0.0, texel.y)) - p;
        vec3 dx = abs(left.z) < abs(right.z) ? left : right;
        vec3 dy = abs(down.z) < abs(up.z) ? down : up;
        vec3 normal = normalize(cross(dx, dy));
        if (dot(normal, -p) < 0.0) normal = -normal;
        vec2 pixel = floor(vUv * fullResolution * 0.5);
        float angle = fract(dot(mod(pixel, 4.0), vec2(0.75487766, 0.56984029))) * 6.2831853;
        vec3 randomAxis = vec3(cos(angle), sin(angle), 0.27);
        vec3 tangent = normalize(randomAxis - normal * dot(randomAxis, normal));
        mat3 basis = mat3(tangent, cross(normal, tangent), normal);
        float obscurance = 0.0;
        const float radius = 1.6;
        for (int i = 0; i < 12; i++) {
          if (i >= sampleCount) break;
          // Spread the reduced medium kernel over the complete hemisphere,
          // rather than retaining only the smallest, most horizontal samples.
          int index = min(11, int(floor((float(i) + 0.5) * 12.0 / float(sampleCount))));
          vec3 candidate = p + basis * samples[index] * radius;
          vec4 clip = projection * vec4(candidate, 1.0);
          vec2 uv = clip.xy / clip.w * 0.5 + 0.5;
          if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) continue;
          vec3 surface = viewPosition(uv);
          float rangeWeight = 1.0 - smoothstep(radius * 0.4, radius * 1.4, abs(p.z - surface.z));
          obscurance += step(candidate.z + 0.045, surface.z) * rangeWeight;
        }
        float distanceFade = 1.0 - smoothstep(60.0, 180.0, -p.z);
        float ao = 1.0 - obscurance / float(sampleCount) * 0.58 * distanceFade;
        gl_FragColor = vec4(vec3(ao), 1.0);
      }
    `,
  });
  const outputMaterial = new THREE.ShaderMaterial({
    name: 'Above photographic output',
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
    dithering: true,
    uniforms: {
      sceneColor: { value: beauty.texture },
      sceneDepth: { value: beauty.depthTexture },
      contactOcclusion: { value: occlusion.texture },
      inverseProjection: { value: camera.projectionMatrixInverse },
      aoResolution: { value: new THREE.Vector2() },
      fullResolution: { value: size },
      crossResolve: { value: false },
    },
    vertexShader,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D sceneColor, contactOcclusion;
      uniform vec2 aoResolution;
      uniform bool crossResolve;
      ${reconstruct}
      #include <common>
      #include <dithering_pars_fragment>
      void main() {
        vec3 color = texture2D(sceneColor, vUv).rgb;
        float centerZ = viewPosition(vUv).z;
        float ao = 1.0;
        // AO is identically one past its 180 m fade. Aerial views and sky need
        // no bilateral texture fetches across most of the output framebuffer.
        if (-centerZ < 180.0) {
          float weightSum = 0.0, aoSum = 0.0;
          // Bilateral reconstruction removes half-resolution noise while
          // keeping sail wires and cutout tree silhouettes free of fringes.
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              if (crossResolve && x != 0 && y != 0) continue;
              vec2 uv = vUv + vec2(float(x), float(y)) / aoResolution;
              float difference = abs(viewPosition(uv).z - centerZ);
              float spatial = (x == 0 ? 2.0 : 1.0) * (y == 0 ? 2.0 : 1.0);
              float weight = spatial * exp(-difference * 3.0);
              aoSum += texture2D(contactOcclusion, uv).r * weight;
              weightSum += weight;
            }
          }
          ao = aoSum / max(weightSum, 0.0001);
        }
        gl_FragColor = vec4(color * ao, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <dithering_fragment>
      }
    `,
  });
  const quadScene = new THREE.Scene();
  const quadCamera = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), aoMaterial);
  quad.frustumCulled = false;
  quadScene.add(quad);
  let level = 'high', disposed = false, width = 0, height = 0, aoScale = 0;

  function resize() {
    renderer.getDrawingBufferSize(size);
    const w = Math.max(1, Math.floor(size.x)), h = Math.max(1, Math.floor(size.y));
    const scale = level === 'high' ? .5 : 1 / 3;
    if (width === w && height === h && aoScale === scale) return;
    width = w; height = h;
    aoScale = scale;
    beauty.setSize(w, h);
    const aoWidth = Math.ceil(w * scale), aoHeight = Math.ceil(h * scale);
    occlusion.setSize(aoWidth, aoHeight);
    outputMaterial.uniforms.aoResolution.value.set(aoWidth, aoHeight);
  }

  return {
    render({ resetInfo = true } = {}) {
      if (disposed) return;
      if (!hdrAvailable || level === 'low') {
        renderer.render(scene, camera);
        return;
      }
      resize();
      const target = renderer.getRenderTarget();
      const autoReset = renderer.info.autoReset;
      const xrEnabled = renderer.xr.enabled;
      renderer.info.autoReset = false;
      if (resetInfo) renderer.info.reset();
      renderer.xr.enabled = false;
      try {
        renderer.setRenderTarget(beauty);
        renderer.render(scene, camera);
        renderer.setRenderTarget(occlusion);
        quad.material = aoMaterial;
        renderer.render(quadScene, quadCamera);
        renderer.setRenderTarget(target);
        quad.material = outputMaterial;
        renderer.render(quadScene, quadCamera);
      } finally {
        renderer.setRenderTarget(target);
        renderer.info.autoReset = autoReset;
        renderer.xr.enabled = xrEnabled;
      }
    },
    setQuality(next) {
      if (!['high', 'medium', 'low'].includes(next)) return;
      level = next;
      aoMaterial.uniforms.sampleCount.value = next === 'high' ? 12 : 8;
      outputMaterial.uniforms.crossResolve.value = next !== 'high';
      const samples = Math.min(next === 'high' ? 4 : 2, renderer.capabilities.maxSamples || 0);
      if (next === 'low' || beauty.samples !== samples) beauty.dispose();
      if (next === 'low') occlusion.dispose();
      beauty.samples = samples;
    },
    resize,
    dispose() {
      if (disposed) return;
      disposed = true;
      beauty.dispose();
      occlusion.dispose();
      quad.geometry.dispose();
      aoMaterial.dispose();
      outputMaterial.dispose();
    },
  };
}
