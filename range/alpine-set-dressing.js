/** Original illustrated-alpine prop kit and composed, non-colliding story sites. */
import { batchStaticMeshes } from './static-batch.js';
import { createAlpineRouteMap } from './alpine-route-map.js';
import { ALPINE_SITES, alpineSiteExclusionAt } from './alpine-sites.js';
export { ALPINE_SITES, alpineSiteExclusionAt, sampleAlpineSiteGround } from './alpine-sites.js';
const hash = (x, z = 0) => { let n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

const PALETTE = Object.freeze({ timber: '#8f6543', endgrain: '#c49362', darkWood: '#4e4539',
  ivory: '#e5d2a5', plaster: '#cfbb96', teal: '#366c6b', burgundy: '#824a43', rust: '#b86c3e',
  stone: '#878b77', slate: '#606762', slateLight: '#737973', slateBlue: '#596566', moss: '#788254', brass: '#c89851', iron: '#484b46', window: '#6f9298', bark: '#534738', endwood: '#b4946a' });

/** Original brush atlas: long fibres and broad scraped paint, without photo noise. */
function brushTexture(THREE) {
  const size = 256, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const knotX = .31 + Math.sin(v * 5.1) * .025;
    const knot = Math.exp(-((u-knotX)**2 * 180 + (v-.44)**2 * 70));
    const grainPhase = u * 130 + Math.sin(v*8 + u*5) * 1.2 + knot * 14;
    let grain = .66 + Math.sin(grainPhase) * .13 + Math.sin(grainPhase*2.7) * .055
      + Math.sin(u * 17 + Math.sin(v * 6) * .7) * .16 + Math.sin(u * 41 + v * 3) * .07;
    grain -= knot * (.12 + Math.sin(Math.hypot((u-knotX)*9,(v-.44)*3)*42)*.10);
    const split = Math.abs(u - .67 - Math.sin(v*11)*.005);
    if (split<.003 && v>.10 && v<.85) grain -= .35;
    for (let fibre = 0; fibre < 37; fibre++) {
      const centre = (fibre + .2 + hash(fibre, 47) * .65) / 37
        + Math.sin(v * (2 + hash(fibre, 53) * 4) + fibre) * .006;
      const distance = Math.abs(u - centre);
      if (distance < .006) grain -= (.006 - distance) / .006 * (.06 + hash(fibre, 59) * .09);
    }
    const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
    const chip = Math.max(0, 1 - edge / (2.5 + 4.5 * (.5 + .5 * Math.sin(x * .21 + y * .13))))
      * (.3 + .7 * (.5 + .5 * Math.sin(x * .83 + y * .34)));
    const scratch = Math.max(0, 1 - Math.abs(u - .19 - Math.sin(v * 3) * .018) / .011) * .17;
    const i = (y * size + x) * 4;
    pixels[i] = Math.round(Math.max(0, Math.min(1, grain)) * 255);
    pixels[i + 1] = Math.round(Math.min(1, chip + scratch) * 255);
    pixels[i + 2] = Math.round((.82 + Math.sin(v * 180) * Math.sin(u * 180) * .08 + Math.sin(v*13+u*3)*.07) * 255); pixels[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.name = 'Original hand-painted timber fibres and worn pigment';
  texture.colorSpace = THREE.NoColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true; return texture;
}

/** Small physical bevels catch daylight along worn timber and painted corners. */
function bevelledBox(THREE, sx, sy, sz) {
  const half = [sx / 2, sy / 2, sz / 2], bevel = Math.min(.035, Math.min(sx, sy, sz) * .16);
  if (Math.min(sx, sy, sz) < .075) return new THREE.BoxGeometry(sx, sy, sz);
  const inner = half.map(value => value - bevel), positions = [], uvs = [], indices = [];
  function face(points) {
    const a = new THREE.Vector3(...points[0]), b = new THREE.Vector3(...points[1]), c = new THREE.Vector3(...points[2]);
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    const centre = points.reduce((sum, point) => sum.add(new THREE.Vector3(...point)), new THREE.Vector3());
    if (normal.dot(centre) < 0) points.reverse();
    const start = positions.length / 3; positions.push(...points.flat());
    for (let i = 0; i < points.length; i++) uvs.push(i === 1 || i === 2 ? 1 : 0, i > 1 ? 1 : 0);
    for (let i = 1; i < points.length - 1; i++) indices.push(start, start + i, start + i + 1);
  }
  for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
    const a = (axis + 1) % 3, b = (axis + 2) % 3;
    face([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => { const p = [0, 0, 0]; p[axis] = sign * half[axis]; p[a] = u * inner[a]; p[b] = v * inner[b]; return p; }));
  }
  for (let free = 0; free < 3; free++) for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
    const a = (free + 1) % 3, b = (free + 2) % 3;
    face([[-1, 0], [-1, 1], [1, 1], [1, 0]].map(([end, edge]) => { const p = [0, 0, 0]; p[free] = end * inner[free]; p[a] = sa * (edge ? inner[a] : half[a]); p[b] = sb * (edge ? half[b] : inner[b]); return p; }));
  }
  for (const sxn of [-1, 1]) for (const syn of [-1, 1]) for (const szn of [-1, 1]) {
    const signs = [sxn, syn, szn];
    face([0, 1, 2].map(axis => half.map((value, i) => signs[i] * (i === axis ? value : inner[i]))));
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

/**
 * A small original kit, deliberately authored in composed clusters. groundHeight
 * is the caller's physical source. No mesh is added to the collision world.
 */
export function createAlpineSetDressing(THREE, scene, {
  groundHeight = () => 0, ecologyAt = () => ({}), quality = 'high', atmosphere = null,
} = {}) {
  if (typeof groundHeight !== 'function') throw new TypeError('groundHeight must be a function');
  const group = new THREE.Group(); group.name = 'AlpineStorySites'; scene.add(group);
  const opaque = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .91 });
  opaque.name = 'Illustrated weathered timber and mineral paint';
  const metal = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .69, metalness: .30 });
  metal.name = 'Oxidised alpine hardware';
  const windows = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .22, metalness: .18,
    emissive: '#53432e', emissiveIntensity: .025 });
  windows.name = 'Recessed refuge glazing and reflected alpine sky';
  windows.onBeforeCompile = shader => {
    shader.vertexShader = `varying vec2 vPaneUv; varying vec3 vPaneWorld, vPaneNormal;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vPaneUv = uv;
      vPaneWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      vPaneNormal = normalize(mat3(modelMatrix) * normal);
    `);
    shader.fragmentShader = `varying vec2 vPaneUv; varying vec3 vPaneWorld, vPaneNormal;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 paneView = normalize(cameraPosition - vPaneWorld);
      vec3 paneReflection = reflect(-paneView, normalize(vPaneNormal));
      float paneFresnel = .20 + .60 * pow(1.0 - abs(dot(paneView, normalize(vPaneNormal))), 4.0);
      float paneRecess = smoothstep(.02, .14, vPaneUv.x) * smoothstep(.02, .14, 1.0-vPaneUv.x)
        * smoothstep(.02, .12, vPaneUv.y) * smoothstep(.02, .12, 1.0-vPaneUv.y);
      float curtain = (1.0-smoothstep(.12,.23,vPaneUv.x)) + smoothstep(.78,.90,vPaneUv.x);
      vec3 paneRoom = mix(vec3(.035,.043,.038), vec3(.27,.22,.14), curtain*.68);
      paneRoom *= .44 + .56 * paneRecess;
      // Opaque glazing avoids sorted transparency while retaining a dark recessed
      // interior and view-dependent blue sky reflection; mullions are geometry.
      vec3 paneSky = mix(vec3(.19,.25,.23),vec3(.20,.36,.46),smoothstep(-.2,.8,paneReflection.y));
      float paneStreak = .94 + .06 * sin(vPaneUv.x*91.0 + sin(vPaneUv.y*13.0));
      diffuseColor.rgb = mix(paneRoom, paneSky, paneFresnel) * paneStreak;
    `);
  };
  windows.customProgramCacheKey = () => 'alpine-recessed-glazing-v1';
  const cloth = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .95, side: THREE.DoubleSide });
  cloth.name = 'Faded awning canvas';
  const wind = { value: 0 }, clock = { value: 0 };
  cloth.onBeforeCompile = shader => {
    shader.uniforms.siteWind = wind; shader.uniforms.siteTime = clock;
    shader.vertexShader = `uniform float siteWind; uniform float siteTime;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float siteTip = clamp(uv.y, 0.0, 1.0);
      transformed.y += sin(position.x * 1.8 + siteTime * 1.6) * siteWind * siteTip * 0.055;
    `);
  };
  cloth.customProgramCacheKey = () => 'illustrated-alpine-cloth-v1';
  const materials = [opaque, metal, windows, cloth];
  const brush = brushTexture(THREE);
  opaque.bumpMap = brush; opaque.bumpScale = .055;
  const routeMap = createAlpineRouteMap(THREE, groundHeight, ALPINE_SITES);
  opaque.userData.routeMap = routeMap;
  for (const material of [opaque, metal, cloth]) {
    const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      shader.uniforms.alpineBrush = { value: brush };
      shader.uniforms.alpineRouteMap = { value: routeMap };
      shader.vertexShader = `attribute float storyFinish; varying float vStoryFinish; varying vec2 vStoryUv;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vStoryFinish = storyFinish; vStoryUv = uv;
      `);
      shader.fragmentShader = `uniform sampler2D alpineBrush; uniform sampler2D alpineRouteMap; varying float vStoryFinish; varying vec2 vStoryUv;\n${shader.fragmentShader}`;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        vec4 storyBrush = texture2D(alpineBrush, vStoryUv);
        float storyWood = 1.0 - step(0.5, vStoryFinish);
        float storyPaint = step(0.5, vStoryFinish) * (1.0 - step(1.5, vStoryFinish));
        float storyCloth = step(2.5, vStoryFinish) * (1.0 - step(3.5, vStoryFinish));
        float storyMap = step(3.5, vStoryFinish) * (1.0-step(4.5,vStoryFinish));
        float storyBark = step(4.5,vStoryFinish) * (1.0-step(5.5,vStoryFinish));
        float storyEndgrain = step(5.5,vStoryFinish) * (1.0-step(6.5,vStoryFinish));
        float storyFibre = storyWood * 0.90 + storyPaint * 0.78 + storyCloth * 0.55;
        diffuseColor.rgb *= mix(1.0, 0.30 + storyBrush.r * 0.85, storyFibre);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.49, 0.36, 0.22), storyBrush.g * storyPaint * 0.75);
        diffuseColor.rgb += vec3(0.045, 0.034, 0.022) * storyBrush.g * storyWood;
        float storyEndWear = pow(abs(vStoryUv.y - 0.5) * 2.0, 5.0);
        float storyFlake = smoothstep(0.28, 0.60, storyBrush.g) * (0.5 + 0.5 * sin(vStoryUv.y * 61.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.44, 0.31, 0.19),
          (storyEndWear * 0.22 + storyFlake * 0.55) * storyPaint);
        diffuseColor.rgb *= mix(1.0, storyBrush.b * 0.32 + 0.70, storyCloth);
        float barkFurrow = pow(.5+.5*sin(vStoryUv.x*76.0+sin(vStoryUv.y*17.0)*.7),7.0);
        diffuseColor.rgb *= 1.0-storyBark*(.12+barkFurrow*.42);
        vec2 growthPoint=(vStoryUv-.5)*vec2(1.0,1.09);
        float growthRadius=length(growthPoint);
        float growthPhase=growthRadius*116.0+sin(vStoryUv.y*18.0)*.6;
        float growthFilter=1.0-smoothstep(.7,2.2,fwidth(growthPhase));
        float growthRing=(.5+.5*sin(growthPhase))*growthFilter;
        diffuseColor.rgb *= 1.0-storyEndgrain*(.07+growthRing*.23);
        diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(alpineRouteMap, vStoryUv).rgb, storyMap);
      `);
    };
    const brushedCompile = material.onBeforeCompile;
    if (material === opaque) material.onBeforeCompile = (shader, renderer) => {
      brushedCompile(shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
        #ifdef USE_BUMPMAP
          normal = perturbNormalArb(-vViewPosition, normal,
            dHdxy_fwd() * (1.0 - step(1.5, vStoryFinish)), faceDirection);
        #endif
      `);
    };
    material.customProgramCacheKey = () => `${previousKey()}|original-alpine-brush-v4`;
    material.userData.originalBrush = brush;
  }
  if (atmosphere?.installMaterial) materials.forEach(material => atmosphere.installMaterial(material));
  const sourceGeometries = new Set(), outputGeometries = new Set(), placements = [], siteGroups = [];
  const colours = new Map(Object.entries(PALETTE).map(([key, value]) => [key, new THREE.Color(value)]));
  const up = new THREE.Vector3(0, 1, 0);
  let partSeed = 0;

  function finish(geometry, colour, seed = partSeed++) {
    const base = colours.get(colour) || new THREE.Color(colour);
    const position = geometry.attributes.position, normal = geometry.attributes.normal;
    const tint = new Float32Array(position.count * 3);
    const isSlate = ['slate', 'slateLight', 'slateBlue'].includes(colour);
    for (let i = 0; i < position.count; i++) {
      const face = (normal ? .92 + .08 * Math.max(0, normal.getY(i)) : 1)
        * (isSlate ? .94 + hash(seed, 943) * .09 : .83 + hash(seed, 943) * .29);
      const weather = .92 + .12 * hash(Math.round(position.getX(i) * 19) + seed, Math.round(position.getZ(i) * 23) + seed * 3);
      tint[i * 3] = base.r * face * weather; tint[i * 3 + 1] = base.g * face * weather; tint[i * 3 + 2] = base.b * face * weather;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(tint, 3));
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(position.count * 2), 2));
    const finishKind = colour === 'bark' ? 5 : colour === 'endwood' ? 6 : ['timber', 'endgrain', 'darkWood'].includes(colour) ? 0 : ['stone', 'moss', 'slate', 'slateLight', 'slateBlue'].includes(colour) ? 2 : 1;
    geometry.setAttribute('storyFinish', new THREE.BufferAttribute(new Float32Array(position.count).fill(finishKind), 1));
    if (finishKind === 0 || finishKind === 1) {
      geometry.computeBoundingBox();
      const minimum = geometry.boundingBox.min.toArray(), maximum = geometry.boundingBox.max.toArray();
      const span = maximum.map((value, axis) => Math.max(.001, value - minimum[axis]));
      const long = span.indexOf(Math.max(...span)), uv = geometry.attributes.uv;
      for (let i = 0; i < position.count; i++) {
        const p = [position.getX(i), position.getY(i), position.getZ(i)];
        const n = [Math.abs(normal.getX(i)), Math.abs(normal.getY(i)), Math.abs(normal.getZ(i))];
        const face = n.indexOf(Math.max(...n));
        const cross = [0, 1, 2].find(axis => axis !== long && axis !== face) ?? (long + 1) % 3;
        uv.setXY(i, (p[cross] - minimum[cross]) / span[cross], (p[long] - minimum[long]) / span[long]);
      }
    }
    sourceGeometries.add(geometry); return geometry;
  }
  function mesh(ctx, geometry, colour, material = opaque) {
    const authoredUv = material === cloth || material === windows ? geometry.attributes.uv?.clone() : null;
    const object = new THREE.Mesh(finish(geometry, colour), material);
    if (material === cloth) object.geometry.attributes.storyFinish.array.fill(3);
    if (authoredUv) object.geometry.setAttribute('uv', authoredUv);
    object.castShadow = object.receiveShadow = true; ctx.root.add(object); ctx.parts.push(object); return object;
  }
  function box(ctx, x, y, z, sx, sy, sz, colour = 'timber', material = opaque, angles = null) {
    const object = mesh(ctx, bevelledBox(THREE, sx, sy, sz), colour, material);
    object.position.set(x, y, z); if (angles) object.rotation.set(...angles); return object;
  }
  function beam(ctx, a, b, width = .12, colour = 'timber', material = opaque, square = true) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), delta = bv.clone().sub(av);
    const geometry = square ? bevelledBox(THREE, width, delta.length(), width)
      : new THREE.CylinderGeometry(width * .5, width * .58, delta.length(), 7);
    const object = mesh(ctx, geometry, colour, material); object.position.copy(av).addScaledVector(delta, .5);
    object.quaternion.setFromUnitVectors(up, delta.normalize()); return object;
  }
  function polygon(ctx, points, colour, material = opaque, uvs = null) {
    const geometry = new THREE.BufferGeometry(), positions = points.flat(), indices = [];
    for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices);
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs || points.flatMap((_, i) => [i % 2, i > 1 ? 1 : 0]), 2));
    geometry.computeVertexNormals(); return mesh(ctx, geometry, colour, material);
  }
  function localGround(ctx, x, z) {
    const c = Math.cos(ctx.yaw), s = Math.sin(ctx.yaw);
    return groundHeight(ctx.x + c * x + s * z, ctx.z - s * x + c * z) - ctx.y;
  }
  function feetLevel(ctx, points, rise) { return Math.max(...points.map(([x, z]) => localGround(ctx, x, z))) + rise; }
  function support(ctx, x, z, top, width = .14, colour = 'darkWood') {
    const foot = localGround(ctx, x, z) - .07;
    box(ctx, x, (top + foot) / 2, z, width, Math.max(.08, top - foot), width, colour);
  }
  function makeSite(site, yaw, build) {
    const root = new THREE.Group(), y = groundHeight(site.x, site.z);
    root.position.set(site.x, y, site.z); root.rotation.y = yaw; group.add(root);
    const ctx = { root, parts: [], x: site.x, y, z: site.z, yaw, site };
    build(ctx); root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    placements.push({ id: site.id, x: site.x, y, z: site.z, yaw, bounds });
    const output = new THREE.Group(); output.name = `AlpineSite:${site.id}`;
    for (const batch of batchStaticMeshes(THREE, ctx.parts, { name: `AlpineStory:${site.id}` })) {
      batch.userData.decorative = true; output.add(batch); outputGeometries.add(batch.geometry);
    }
    group.remove(root); group.add(output); siteGroups.push({ group: output, site, bounds });
  }
  function bench(ctx, x, z, yaw = 0, length = 4.3) {
    const cos = Math.cos(yaw), sin = Math.sin(yaw), at = (a, b) => [x + cos * a + sin * b, z - sin * a + cos * b];
    const corners = [[-length * .37, -.24], [length * .37, -.24], [-length * .37, .24], [length * .37, .24]].map(([a, b]) => at(a, b));
    const seat = feetLevel(ctx, corners, .79);
    for (const [fx, fz] of corners) support(ctx, fx, fz, seat, .15);
    for (const offset of [-.19, .19]) { const [px, pz] = at(0, offset); box(ctx, px, seat, pz, length, .15, .32, 'endgrain', opaque, [0, yaw, 0]); }
    for (const end of [-1, 1]) { const [px, pz] = at(end * length * .37, .26); box(ctx, px, seat + .47, pz, .12, 1.04, .13, 'darkWood', opaque, [0, yaw, -.08]); }
    for (const row of [.38, .70]) { const [px, pz] = at(0, .31); box(ctx, px, seat + row, pz, length * .95, .20, .11, 'timber', opaque, [0, yaw, 0]); }
    for (const end of [-1,1]) {
      const [ax,az]=at(end*length*.37,-.24),[bx,bz]=at(end*length*.37,.24);
      beam(ctx,[ax,seat-.14,az],[bx,seat-.57,bz],.09,'timber');
      for (const offset of [-.19,.19]) {
        const [px,pz]=at(end*length*.37,offset);
        const bolt=mesh(ctx,new THREE.SphereGeometry(.026,5,3),'iron',metal);bolt.position.set(px,seat+.078,pz);
      }
    }
    return seat + .1;
  }
  function rope(ctx, points, radius = .035, colour = 'ivory', closed = false) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)), closed);
    return mesh(ctx, new THREE.TubeGeometry(curve, Math.max(12, points.length * 3), radius, 5, closed), colour);
  }
  function ropeCoil(ctx, x, y, z, scale = 1) {
    const points = [];
    for (let i = 0; i <= 90; i++) {
      const angle = i / 90 * Math.PI * 10, r = scale * (.17 + i / 90 * .24);
      points.push([x + Math.cos(angle) * r, y + .035 + Math.sin(angle * .7) * .01, z + Math.sin(angle) * r]);
    }
    rope(ctx, points, .035 * scale, 'ivory');
    rope(ctx, [[x+.25*scale,y+.035,z],[x+.42*scale,y+.02,z-.36*scale],[x+.47*scale,y-.26*scale,z-.5*scale],
      [x+.43*scale,y-.58*scale,z-.48*scale],[x+.32*scale,y-.64*scale,z-.49*scale]], .035*scale, 'ivory');
  }
  function bag(ctx, x, y, z, length, colour, yaw = 0) {
    const positions = [], indices = [], uvs = [], sides = 16, rows = 13;
    const at = (a,b,c) => [x + Math.cos(yaw)*a + Math.sin(yaw)*c, y+b, z-Math.sin(yaw)*a+Math.cos(yaw)*c];
    function body(row, angle) {
      const t = row / (rows-1), cap = Math.pow(Math.sin(t*Math.PI), .23);
      const crease = 1 + Math.sin(t*31+angle*3)*.045 + Math.sin(angle*7+t*13)*.026;
      return [(t-.5)*length, .31 + Math.cos(angle)*.30*cap*crease, Math.sin(angle)*.40*cap*crease];
    }
    for(let row=0;row<rows;row++)for(let side=0;side<=sides;side++) {
      positions.push(...body(row,side/sides*Math.PI*2));uvs.push(side/sides,row/(rows-1));
    }
    for(let row=0;row<rows-1;row++)for(let side=0;side<sides;side++) {
      const a=row*(sides+1)+side,b=a+1,c=a+sides+1,d=c+1;indices.push(a,c,b,b,c,d);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const object=mesh(ctx,geometry,colour);object.position.set(x,y,z);object.rotation.y=yaw;object.geometry.attributes.storyFinish.array.fill(3);
    for(const end of [-.27,.27]) {
      // Webbing follows the bag instead of enclosing it in a solid dark block.
      const p=[],uv=[],idx=[];
      for(let i=0;i<=20;i++)for(const side of [-1,1]) {
        const angle=i/20*Math.PI*2;
        p.push(...at(end*length+side*.058,.31+Math.cos(angle)*.306,Math.sin(angle)*.405));uv.push((side+1)/2,i/20);
      }
      for(let i=0;i<20;i++){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}
      const strap=new THREE.BufferGeometry();strap.setAttribute('position',new THREE.Float32BufferAttribute(p,3));strap.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));strap.setIndex(idx);strap.computeVertexNormals();mesh(ctx,strap,'darkWood');
      const b=at(end*length,.63,-.10);
      box(ctx,...b,.19,.045,.16,'brass',metal,[0,yaw,0]);
      const c=at(end*length,.656,-.10);box(ctx,...c,.11,.025,.09,colour,opaque,[0,yaw,0]);
    }
    rope(ctx,[-.44,-.2,.1,.39].map(t=>at(t*length,.615,.005)),.013,'ivory');
    rope(ctx,[at(-.35,.53,-.32),at(-.28,.83,-.31),at(.28,.83,-.31),at(.35,.53,-.32)],.037,'darkWood');
    // Pale sewn patches and a luggage tag are visible at ordinary walking distance.
    const tag=at(-length*.35,.48,-.30);box(ctx,...tag,.25,.14,.022,'ivory',opaque,[0,yaw,-.1]);
    return object;
  }
  function crate(ctx, x, z, scale = 1, colour = 'rust', raised = 0) {
    const y=localGround(ctx,x,z)+raised,w=1.1*scale,h=.84*scale,d=w*.78;
    box(ctx,x,y+h/2,z,w,h,d,colour);
    // The separate lid, metal corners, recessed handle and clasps give a travel trunk its construction.
    box(ctx,x,y+h*.81,z,w*1.015,.045*scale,d*1.02,'darkWood');
    box(ctx,x,y+h*.925,z,w*1.025,h*.19,d*1.025,colour);
    for(const end of [-1,1]) {
      for(const side of [-1,1]) {
        box(ctx,x+side*w*.46,y+h*.48,z+end*d*.49,.09*scale,h*.91,.045*scale,'ivory',metal);
        for(const height of [.08,.7,.93]) {
          const rivet=mesh(ctx,new THREE.SphereGeometry(.022*scale,5,3),'iron',metal);rivet.position.set(x+side*w*.46,y+h*height,z+end*d*.52);
        }
      }
      box(ctx,x,y+h*.55,z+end*d*.515,w*.38,.16*scale,.026*scale,'darkWood');
      rope(ctx,[[x-w*.16,y+h*.55,z+end*d*.54],[x-w*.13,y+h*.45,z+end*d*.62],[x+w*.13,y+h*.45,z+end*d*.62],[x+w*.16,y+h*.55,z+end*d*.54]],.025*scale,'iron');
      for(const side of [-1,1]) {
        box(ctx,x+side*w*.29,y+h*.79,z+end*d*.53,.09*scale,.20*scale,.035*scale,'brass',metal);
        box(ctx,x+side*w*.29,y+h*.81,z+end*d*.55,.045*scale,.06*scale,.025*scale,'iron',metal);
      }
    }
    return y+h;
  }
  function roof(ctx, x, y, z, width, depth, rise, colour = 'slate') {
    const half = width / 2, eave = .5;
    for (const side of [-1, 1]) {
      polygon(ctx, [[x, y + rise, z - depth / 2 - eave], [x + side * (half + eave), y - .12, z - depth / 2 - eave],
        [x + side * (half + eave), y - .12, z + depth / 2 + eave], [x, y + rise, z + depth / 2 + eave]], colour);
      for (let row = 0; row < 10; row++) for (let column = 0; column < Math.ceil(depth / .38); column++) {
        const t0 = row / 10, t1 = (row + 1.16 + hash(row, column) * .05) / 10;
        const tileWidth = (depth + eave * 2) / Math.ceil(depth / .38);
        const z0 = z - depth / 2 - eave + column * tileWidth;
        const z1 = z0 + (depth + eave * 2) / Math.ceil(depth / .38) * (.89 + hash(row+17,column+side)*.09);
        const height = t => y + rise * (1 - t) - .12 * t + .035 + hash(row, column + side * 39) * .025;
        const tone = hash(row * 17 + column, side + 5) < .045 && row < 4 ? 'moss' : hash(row + 5, column) < .14 ? 'slateLight' : hash(row, column + side) < .28 ? 'slateBlue' : colour;
        const points = [[x + side * t0 * (half + eave), height(t0), z0], [x + side * t1 * (half + eave), height(t1), z0],
          [x + side * t1 * (half + eave), height(t1), z1], [x + side * t0 * (half + eave), height(t0), z1]];
        if (side > 0) points.reverse(); polygon(ctx, points, tone);
        const edgeX=x+side*t1*(half+eave),edgeY=height(t1);
        polygon(ctx,[[edgeX,edgeY,z0],[edgeX,edgeY-.075,z0],[edgeX,edgeY-.075,z1],[edgeX,edgeY,z1]],'darkWood');
      }
    }
    for (const side of [-1,1]) {
      box(ctx,x+side*(half+.43),y-.20,z,.17,.23,depth+1.03,'darkWood');
      box(ctx,x+side*(half+.49),y-.13,z,.12,.19,depth+1.12,'timber');
      const rafters=Math.ceil(depth/.68);
      for(let i=0;i<=rafters;i++) {
        const rz=z-depth/2-.35+i*(depth+.7)/rafters;
        beam(ctx,[x+side*(half-.5),y+.14,rz],[x+side*(half+.52),y-.20,rz],.105,'darkWood');
      }
    }
    beam(ctx, [x, y + rise + .07, z - depth / 2 - .57], [x, y + rise + .07, z + depth / 2 + .57], .15, 'endgrain');
    for (const front of [-1, 1]) for (const side of [-1, 1]) {
      beam(ctx, [x, y + rise, z + front * (depth / 2 + .52)], [x + side * (half + eave), y - .12, z + front * (depth / 2 + .52)], .18, 'endgrain');
    }
  }
  function mapBoard(ctx, x, z, scale = 1) {
    const top = feetLevel(ctx, [[x - 1.65 * scale, z], [x + 1.65 * scale, z]], 3.3 * scale);
    for (const side of [-1, 1]) support(ctx, x + side * 1.65 * scale, z + .1, top, .22 * scale, 'timber');
    box(ctx, x, top - 1.30 * scale, z, 3.30 * scale, 2.20 * scale, .16 * scale, 'darkWood');
    box(ctx, x, top - 1.31 * scale, z - .095 * scale, 3.02 * scale, 1.91 * scale, .035 * scale, 'ivory');
    const map = polygon(ctx, [[x - 1.49 * scale, top - 2.25 * scale, z - .13 * scale],
      [x - 1.49 * scale, top - .36 * scale, z - .13 * scale],
      [x + 1.49 * scale, top - .36 * scale, z - .13 * scale],
      [x + 1.49 * scale, top - 2.25 * scale, z - .13 * scale]], 'ivory', opaque, [1,0,1,1,0,1,0,0]);
    map.geometry.attributes.storyFinish.array.fill(4);
    const mapPositions = map.geometry.attributes.position, mapUv = map.geometry.attributes.uv;
    for (let i = 0; i < mapPositions.count; i++) mapUv.setXY(i,
      1 - (mapPositions.getX(i) - (x - 1.49 * scale)) / (2.98 * scale),
      (mapPositions.getY(i) - (top - 2.25 * scale)) / (1.89 * scale));
    for (const side of [-1, 1]) for (const height of [-.36, -2.23]) {
      const bolt=mesh(ctx,new THREE.SphereGeometry(.035 * scale,6,4),'iron',metal);
      bolt.position.set(x+side*1.43*scale,top+height*scale,z-.15*scale);
    }
    for (const side of [-1, 1]) box(ctx, x + side * 1.58 * scale, top - 1.25 * scale, z - .13 * scale, .10 * scale, 2.18 * scale, .10 * scale, 'endgrain');
    roof(ctx, x, top, z, 3.9 * scale, .60 * scale, .48 * scale);
    return top;
  }
  function picnic(ctx, x, z) {
    const feet = [[x - 1.3, z - 1], [x + 1.3, z - 1], [x - 1.3, z + 1], [x + 1.3, z + 1]];
    const table = feetLevel(ctx, feet, .87);
    for (const [fx, fz] of feet) support(ctx, fx, fz, table, .16);
    for (const offset of [-.38, 0, .38]) box(ctx, x, table, z + offset, 3.5, .13, .34, 'endgrain');
    for (const side of [-1, 1]) {
      box(ctx, x, table - .40, z + side * 1.13, 3.7, .14, .44, 'timber');
      beam(ctx, [x - 1.4, table - .38, z - 1.4], [x - 1.4, table - .38, z + 1.4], .17);
      beam(ctx, [x + 1.4, table - .38, z - 1.4], [x + 1.4, table - .38, z + 1.4], .17);
    }
  }
  function barrel(ctx, x, z, colour = 'teal') {
    const y = localGround(ctx, x, z), object = mesh(ctx, new THREE.CylinderGeometry(.47, .42, 1.18, 12), colour);
    object.position.set(x, y + .59, z);
    for (const height of [.19, .89, 1.14]) {
      const hoop = mesh(ctx, new THREE.CylinderGeometry(.477, .477, .075, 12, 1, true), 'iron', metal);
      hoop.position.set(x, y + height, z);
    }
  }
  function fence(ctx, points, colour = 'timber') {
    for (const [x, z] of points) { const y = localGround(ctx, x, z); support(ctx, x, z, y + 1.22, .16, colour); }
    for (let i = 1; i < points.length; i++) for (const height of [.45, .96]) {
      const [ax, az] = points[i - 1], [bx, bz] = points[i];
      beam(ctx, [ax, localGround(ctx, ax, az) + height, az], [bx, localGround(ctx, bx, bz) + height, bz], .12, colour);
    }
  }
  function bunting(ctx, a, b, count = 7) {
    beam(ctx, a, b, .025, 'darkWood', opaque, false);
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * .18;
      const z = a[2] + (b[2] - a[2]) * t;
      polygon(ctx, [[x - .19, y, z], [x + .19, y, z], [x, y - .49, z + .03]], ['ivory', 'burgundy', 'teal'][i % 3], cloth);
    }
  }

  function recessedWindow(ctx, x, y, z, width, height, side = false) {
    const at = (u,v,d) => side ? [x+d,y+v,z+u] : [x+u,y+v,z-d];
    const solid = (u,v,d,w,h,t,colour,material=opaque) => {
      const p=at(u,v,d);return box(ctx,...p,side?t:w,h,side?w:t,colour,material);
    };
    solid(0,0,.025,width+.27,height+.28,.10,'darkWood');
    for(const edge of [-1,1]) {
      solid(edge*(width/2+.035),0,.18,.12,height+.30,.29,'timber');
      solid(0,edge*(height/2+.03),.18,width+.34,.14,.29,'timber');
    }
    // Four inset panes sit a full 20cm behind their outer surrounds.
    for(const column of [-1,1]) for(const row of [-1,1]) {
      const geometry=new THREE.PlaneGeometry(width/2-.055,height/2-.055);
      const pane=mesh(ctx,geometry,'window',windows);pane.position.set(...at(column*width/4,row*height/4,.115));
      pane.rotation.y=side?Math.PI/2:Math.PI;
    }
    solid(0,0,.205,.075,height,.105,'ivory');
    solid(0,0,.205,width,.07,.105,'ivory');
    solid(0,-height/2-.12,.23,width+.48,.13,.48,'endgrain');
    // Projecting sill and angled rain cap make wall/glass shadow separation visible.
    solid(0,height/2+.15,.24,width+.46,.09,.40,'endgrain');
    for(const edge of [-1,1]) {
      solid(edge*(width/2+.19),-height/2-.27,.15,.085,.28,.22,'darkWood');
    }
  }
  function logStack(ctx,x,z) {
    const base=localGround(ctx,x,z);
    for(let row=0;row<3;row++) for(let column=0;column<4-row;column++) {
      const px=x+(column-(3-row)/2)*.37, py=base+.20+row*.32;
      const radius=.16+hash(row,column)*.025,length=1.05+hash(column,row)*.20;
      const log=mesh(ctx,new THREE.CylinderGeometry(radius*.90,radius,length,9),'bark');
      log.position.set(px,py,z);log.rotation.x=Math.PI/2;
      for(const end of [-1,1]) {
        const cut=mesh(ctx,new THREE.CircleGeometry(radius*.88,9),'endwood');cut.position.set(px,py,z+end*(length/2+.002));
        if(end<0)cut.rotation.y=Math.PI;
        // Split ends have a real narrow dark crack and pale ring.
        const split=box(ctx,px,py,z+end*(length/2+.004),radius*1.28,.012,.009,'darkWood');split.rotation.z=.4+hash(column,row);
      }
    }
  }
  function lantern(ctx,x,y,z) {
    box(ctx,x,y,z,.30,.43,.27,'darkWood');
    for(const side of [-1,1]) box(ctx,x+side*.125,y,z,.028,.49,.31,'iron',metal);
    box(ctx,x,y,z-.15,.19,.31,.015,'window',windows);
    const cap=mesh(ctx,new THREE.ConeGeometry(.25,.16,4),'iron',metal);cap.position.set(x,y+.30,z);cap.rotation.y=Math.PI/4;
    box(ctx,x,y-.25,z,.37,.06,.34,'iron',metal);
    rope(ctx,[[x-.08,y+.38,z],[x-.07,y+.52,z],[x+.07,y+.52,z],[x+.08,y+.38,z]],.016,'iron');
  }

  function refuge(ctx) {
    const floor = feetLevel(ctx, [[-4.5, -3], [4.5, -3], [-4.5, 3], [4.5, 3]], .28);
    for (const x of [-4.2, 0, 4.2]) for (const z of [-2.7, 2.7]) {
      const foot = localGround(ctx, x, z) - .1;
      box(ctx, x, (foot + floor) / 2, z, .63, Math.max(.2, floor - foot), .63, 'stone');
    }
    // Rubble foundation follows the hillside under each stone course. The house
    // has a solid retaining base instead of four-metre exposed support pillars.
    for (const side of [-1, 1]) for (const axis of ['x', 'z']) {
      const along = axis === 'x' ? 9 : 6, count = Math.ceil(along / .80), width = along / count;
      for (let column = 0; column < count; column++) {
        const run = -along / 2 + (column + .5) * width;
        const px = axis === 'x' ? run : side * 4.43, pz = axis === 'x' ? side * 2.94 : run;
        const foot = localGround(ctx, px, pz) - .10;
        if (floor - foot < .10) continue;
        box(ctx, px, (floor + foot) / 2, pz, axis === 'x' ? width : .36,
          floor - foot, axis === 'x' ? .36 : width, 'slateBlue');
        for (let row = 0, top = floor - .10; top > foot; row++, top -= .40) {
          const blockHeight = Math.min(.38, top - foot + .04), py = top - blockHeight / 2;
          const offset = (hash(column + row * 7, side) - .5) * .04;
          const stone = box(ctx, px + (axis === 'z' ? side * .06 : offset), py,
            pz + (axis === 'x' ? side * .06 : offset), axis === 'x' ? width - .025 : .43,
            blockHeight, axis === 'x' ? .43 : width - .025,
            hash(column, row + side) < .24 ? 'slateLight' : hash(row, column) < .16 ? 'moss' : 'stone');
          stone.rotation.y = (hash(row + 13, column) - .5) * .08;
        }
      }
    }
    box(ctx, 0, floor, 0, 9.15, .24, 6.15, 'darkWood');
    box(ctx, 0, floor + 1.68, 0, 9, 3.30, 6, 'plaster');
    for (let i = 0; i < 18; i++) {
      const x = -4.25 + i * .5;
      box(ctx, x, floor + 1.75, -3.035, .45, 3.15, .10, i % 4 ? 'burgundy' : 'timber');
      box(ctx, x, floor + 1.75, 3.035, .45, 3.15, .10, i % 5 ? 'timber' : 'burgundy');
    }
    for (const x of [-4.55, 4.55]) for (let i = 0; i < 12; i++) {
      box(ctx, x, floor + 1.75, -2.75 + i * .5, .10, 3.15, .45, i % 4 ? 'timber' : 'burgundy');
    }
    for (const x of [-4.5, 4.5]) for (const z of [-3.08, 3.08]) box(ctx, x, floor + 1.72, z, .22, 3.42, .24, 'endgrain');
    for(const z of [-3.14,3.14]) for(const h of [.24,3.22]) box(ctx,0,floor+h,z,9.25,.16,.16,h<1?'darkWood':'timber');
    for(const x of [-4.64,4.64]) for(const h of [.24,3.22]) box(ctx,x,floor+h,0,.16,.16,6.24,h<1?'darkWood':'timber');

    for (const z of [-3.07, 3.07]) {
      const points = [[-4.5, floor + 3.32, z], [0, floor + 5.45, z], [4.5, floor + 3.32, z]];
      if (z > 0) points.reverse(); polygon(ctx, points, 'burgundy');
      for (const x of [-2.7, 0, 2.7]) beam(ctx, [x, floor + 3.31, z - .05], [x * .03, floor + 5.37, z - .05], .12, 'endgrain');
    }
    roof(ctx, 0, floor + 3.40, 0, 9, 6, 2.18, 'slate');
    const chimneyTop = floor + 6.25;
    box(ctx, 2.60, floor + 4.96, 1.35, .91, 2.53, .90, 'stone');
    for (let row = 0; row < 7; row++) {
      box(ctx, 2.60, floor + 3.80 + row * .34, 1.35, .94, .045, .93, 'ivory');
      box(ctx, 2.42 + (row % 2) * .30, floor + 3.97 + row * .34, .88, .035, .29, .025, 'ivory');
    }
    box(ctx, 2.60, chimneyTop, 1.35, 1.13, .18, 1.13, 'darkWood');
    box(ctx, 1.68, floor + 1.28, -3.12, 1.22, 2.50, .15, 'teal');
    for (const x of [1.00, 2.36]) box(ctx, x, floor + 1.3, -3.23, .12, 2.66, .12, 'endgrain');
    box(ctx, 1.68, floor + 2.65, -3.22, 1.48, .12, .12, 'endgrain');
    box(ctx, 2.10, floor + 1.25, -3.25, .08, .20, .06, 'brass', metal);
    for(const height of [.65,1.81]) {
      box(ctx,1.68,floor+height,-3.23,.96,.94,.08,'darkWood');
      box(ctx,1.68,floor+height,-3.29,.82,.79,.055,'teal');
    }
    for(const height of [.29,1.27,2.27]) box(ctx,1.14,floor+height,-3.33,.22,.065,.035,'iron',metal);
    beam(ctx,[2.08,floor+1.16,-3.37],[2.08,floor+1.36,-3.37],.038,'brass',metal,false);
    lantern(ctx,2.93,floor+2.29,-3.34);
    beam(ctx,[2.93,floor+2.68,-3.13],[2.93,floor+2.68,-3.43],.045,'iron',metal,false);
    logStack(ctx,5.15,1.3);

    for (const x of [-2.50, -.50]) {
      recessedWindow(ctx,x,floor+1.96,-3.12,1.27,1.34);
      for(const side of [-1,1]) {
        for(let slat=0;slat<7;slat++)box(ctx,x+side*.94,floor+1.33+slat*.21,-3.18,.30,.15,.055,'teal',opaque,[-.15,side*.10,0]);
        for(const hinge of [-.45,.45])box(ctx,x+side*.94,floor+1.96+hinge,-3.22,.27,.04,.025,'iron',metal);
      }
      box(ctx, x, floor + 1.05, -3.38, 1.64, .32, .42, 'burgundy');
      for (let flower = 0; flower < 6; flower++) {
        const px = x - .68 + flower * .26;
        const py=floor+1.30+hash(flower,7)*.13;
        for(let leaf=0;leaf<3;leaf++) {
          const angle=leaf*2.4+flower, tip=[px+Math.cos(angle)*.19,py+.13,-3.42+Math.sin(angle)*.15];
          polygon(ctx,[[px,py-.12,-3.42],[tip[0]-.055,tip[1],tip[2]], [tip[0],tip[1]+.035,tip[2]+.05],[tip[0]+.055,tip[1],tip[2]]],'moss',cloth);
        }
        const bloom=mesh(ctx,new THREE.IcosahedronGeometry(.065,1),flower%3?'ivory':'rust');bloom.position.set(px,py+.16,-3.42);
      }
    }
    for (const z of [-1.55, 1.25]) recessedWindow(ctx,4.60,floor+1.93,z,1.47,1.37,true);
    for (let step = 0; step < 3; step++) box(ctx, 1.68, floor - .05 - step * .18, -3.55 - step * .42, 2.06, .22, .70, 'stone');
    // A faded striped canopy and a front valance form a readable field-side silhouette.
    for (let stripe = 0; stripe < 8; stripe++) {
      const x0 = -4.25 + stripe * .82, x1 = x0 + .83;
      const points=[],uv=[];
      for(let segment=0;segment<=8;segment++) {
        const t=segment/8, sag=Math.sin(t*Math.PI)*.20, ripple=Math.sin(t*13+stripe*.8)*.014;
        const yy=floor+3.05-.40*t-sag+ripple,zz=-3.22-3.06*t;
        points.push([x0,yy,zz],[x1,yy+Math.sin(stripe*.6)*.025,zz]);uv.push(0,t,1,t);
      }
      const awning=new THREE.BufferGeometry();awning.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
      awning.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));const indices=[];
      for(let segment=0;segment<8;segment++){const a=segment*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
      awning.setIndex(indices);awning.computeVertexNormals();mesh(ctx,awning,stripe%4?'ivory':'burgundy',cloth);
      polygon(ctx, [[x0, floor + 2.65, -6.28], [x0 + .15, floor + 2.38, -6.30],
        [x1 - .15, floor + 2.38, -6.30], [x1, floor + 2.65, -6.28]], stripe % 4 ? 'ivory' : 'burgundy', cloth);
    }
    for (const x of [-4.12, 2.12]) {
      support(ctx, x, -6.16, floor + 2.75, .13, 'endgrain');
      beam(ctx, [x, floor + 2.64, -6.16], [x, floor + 3.0, -3.2], .085, 'darkWood');
    }
    picnic(ctx, -1.5, -8.6); barrel(ctx, 5.9, -1.6, 'teal'); barrel(ctx, 6.1, -.5, 'rust');
    bench(ctx, 7.2, 3.0, -.1, 3.9); mapBoard(ctx, -7.6, -3.0, .75);
    crate(ctx, -5.5, 1.9, .85, 'rust'); crate(ctx, -5.4, 1.9, .70, 'ivory', .72);
    const rack = feetLevel(ctx, [[-7, 3.5], [-3, 3.5]], .40);
    box(ctx, -5.1, rack, 3.5, 4.4, .13, 1.15, 'darkWood');
    for (const x of [-6.7, -3.5]) support(ctx, x, 3.5, rack, .18);
    bag(ctx, -5.1, rack + .08, 3.5, 4.0, 'teal', .02);
    fence(ctx, [[-12, -9], [-12.5, -5], [-12.5, 0], [-12, 5], [-8, 7], [-3, 7]]);
    fence(ctx, [[7, -10], [11, -8], [12, -3], [12, 2], [10, 6]]);
    bunting(ctx, [-4.5, floor + 3.3, -3.4], [2.2, floor + 2.8, -6.2], 9);
  }

  // Align the long bench to the actual rock contour; its feet then stay short
  // instead of turning the staging area into a second timber trestle.
  makeSite(ALPINE_SITES[0], ALPINE_SITES[0].yaw, ctx => {
    const seat = bench(ctx, 0, 0, 0, 5.4);
    bag(ctx, -.3, seat + .05, -.12, 4.7, 'teal', .025);
    bag(ctx, .3, seat + .60, -.04, 3.9, 'brass', -.06);
    ropeCoil(ctx, -1.85, seat + .075, -.34, .9);
    crate(ctx, -4.0, -.45, 1.05, 'rust'); crate(ctx, -4.0, -.45, .86, 'ivory', .88);
    mapBoard(ctx, 0, 2.2, 1.05);
    const small = bench(ctx, 4.7, 3.7, -.35, 2.7); bag(ctx, 4.7, small + .05, 3.7, 2.5, 'burgundy', -.35);
    const marker = localGround(ctx, -4.7, 4.2);
    support(ctx, -4.7, 4.2, marker + 2.6, .13, 'darkWood');
    polygon(ctx, [[-5.25, marker + 2.52, 4.11], [-4.7, marker + 3.27, 4.11], [-4.15, marker + 2.52, 4.11]], 'rust', cloth);
    for (const side of [-1, 1]) fence(ctx, [[side * 6.0, 4.4], [side * 7.0, 7.5], [side * 5.5, 10.2]]);
    bunting(ctx, [-5.6, marker + 3.3, 3.9], [6.6, localGround(ctx, 6.6, 3.9) + 2.8, 3.9], 10);
  });
  makeSite(ALPINE_SITES[1], ALPINE_SITES[1].yaw, refuge);
  makeSite(ALPINE_SITES[2], ALPINE_SITES[2].yaw, ctx => {
    fence(ctx, [[-9, -1], [-5.5, -.5], [-2.8, 0]]);
    fence(ctx, [[2.8, .2], [6.2, .9], [9.2, 2.0]]);
    mapBoard(ctx, -4.3, 3.0, .65);
    const y = feetLevel(ctx, [[-2.8, 0], [2.8, 0]], 1.3);
    support(ctx, -2.8, 0, y, .20); support(ctx, 2.8, .2, y + .08, .20);
    beam(ctx, [-2.8, y - .33, 0], [2.8, y - .25, .2], .10, 'burgundy');
    box(ctx, -.7, y - .32, -.08, 1.15, .30, .10, 'ivory');
  });
  makeSite(ALPINE_SITES[3], ALPINE_SITES[3].yaw, ctx => {
    bench(ctx, -1.8, 1.5, -.15, 3.9); mapBoard(ctx, 2.8, 2.5, .73);
    crate(ctx, -4.2, 2.2, .62, 'teal');
    fence(ctx, [[-5.2, 5.1], [-1.5, 5.7], [2.5, 5.5]]);
    for (const side of [-1, 1]) {
      const x = side * 3.4, z = -4.2, y = localGround(ctx, x, z);
      box(ctx, x, y + .45, z, .17, .95, .17, 'darkWood');
      box(ctx, x, y + .68, z - .1, .26, .12, .04, 'ivory');
      box(ctx, x, y + .52, z - .1, .26, .10, .04, 'rust');
    }
  });

  // Repeated trail-edge stones share geometry and a single compact draw.
  const stoneShape = new THREE.IcosahedronGeometry(1, 0);
  const stonePoints = stoneShape.attributes.position;
  for (let i = 0; i < stonePoints.count; i++) {
    const x = stonePoints.getX(i), y = stonePoints.getY(i), z = stonePoints.getZ(i);
    const fracture = hash(Math.round(x * 17), Math.round(z * 19 + y * 23));
    stonePoints.setXYZ(i, x * (1.06 + fracture * .21), y * .63 + (fracture - .5) * .13, z * (.74 + fracture * .19));
  }
  stoneShape.computeVertexNormals();
  const stoneGeometry = finish(stoneShape, 'stone', 403);
  const stoneColour = stoneGeometry.attributes.color, lichen = new THREE.Color('#8e945a');
  for (let i = 0; i < stonePoints.count; i++) {
    const patch = Math.max(0, stoneShape.attributes.normal.getY(i)) * hash(Math.round(stonePoints.getX(i) * 13), Math.round(stonePoints.getZ(i) * 13));
    if (patch > .28) {
      stoneColour.setXYZ(i, stoneColour.getX(i) * .55 + lichen.r * .45, stoneColour.getY(i) * .55 + lichen.g * .45, stoneColour.getZ(i) * .55 + lichen.b * .45);
    }
  }
  const stonePlacements = [];
  for (const [index, site] of ALPINE_SITES.entries()) for (let i = 0; i < 18; i++) {
    const cluster = Math.floor(i / 6);
    const angle = cluster * 2.15 + index + (hash(i, index + 7) - .5) * .55, radius = .72 + hash(i, 31 + index) * .24;
    const x = site.x + Math.cos(angle) * site.radiusX * radius;
    const z = site.z + Math.sin(angle) * site.radiusZ * radius;
    if (Math.hypot(x, z) < 153 || (z > -590 && z < 100 && Math.abs(x) < 90)) continue;
    if ((ecologyAt(x, z).path || 0) > .8) continue;
    stonePlacements.push({ x, z, y: groundHeight(x, z), size: .31 + hash(i, index + 67) * .58, yaw: hash(i, index + 101) * 6.28 });
  }
  const stones = new THREE.InstancedMesh(stoneGeometry, opaque, stonePlacements.length);
  stones.name = 'AlpineStory:lichen trail stones'; stones.castShadow = stones.receiveShadow = true;
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  for (const [index, stone] of stonePlacements.entries()) {
    rotation.setFromAxisAngle(up, stone.yaw); position.set(stone.x, stone.y + stone.size * .24, stone.z);
    matrix.compose(position, rotation, scale.set(stone.size * 1.3, stone.size * .64, stone.size)); stones.setMatrixAt(index, matrix);
  }
  stones.computeBoundingBox(); stones.computeBoundingSphere(); group.add(stones);
  // Original temporary kit geometry is owned here; batches have independent copies.
  for (const geometry of sourceGeometries) if (geometry !== stoneGeometry) geometry.dispose();
  outputGeometries.add(stoneGeometry);
  let level = 'high', camera = new THREE.Vector3(0, 240, -560), disposed = false;
  function refresh() {
    const range = level === 'low' ? 650 : level === 'medium' ? 1100 : 1800;
    for (const site of siteGroups) site.group.visible = site.bounds.distanceToPoint(camera) < range;
    stones.visible = level !== 'low';
    group.traverse(object => { if (object.isMesh) object.castShadow = level !== 'low'; });
  }
  function setQuality(next) {
    if (!['low', 'medium', 'high'].includes(next) || next === level) return false;
    level = next; refresh(); return true;
  }
  setQuality(quality); refresh();
  const stats = { sites: siteGroups.length, mergedDraws: siteGroups.reduce((sum, site) => sum + site.group.children.length, 0),
    instancedDraws: 1, stones: stonePlacements.length, triangles: 0 };
  // IcosahedronGeometry may be non-indexed; count its submitted instances explicitly.
  stats.triangles = siteGroups.reduce((sum, site) => sum + site.group.children.reduce((count, mesh) => count + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0), 0)
    + stonePlacements.length * (stoneGeometry.index?.count ?? stoneGeometry.attributes.position.count) / 3;
  group.userData.alpineSetDressing = stats;
  return { group, sites: ALPINE_SITES, placements, stats, exclusionAt: alpineSiteExclusionAt, setQuality,
    update(cameraPosition, elapsed = 0, weather = 0) {
      if (disposed) return;
      if (cameraPosition) camera.copy(cameraPosition);
      clock.value = elapsed;
      const strength = typeof weather === 'number' ? weather : Math.hypot(weather?.x || 0, weather?.z || 0) / 8;
      wind.value = level === 'low' ? 0 : Math.min(1.4, Math.max(0, strength)); refresh();
    },
    dispose() {
      if (disposed) return; disposed = true; scene.remove(group);
      stones.dispose();
      outputGeometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); brush.dispose(); routeMap.dispose();
    },
  };
}
