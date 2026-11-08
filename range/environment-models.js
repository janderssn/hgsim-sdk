/**
 * Runtime adapter for the original Blender asset library. Asset coordinates are
 * baked into shared Y-up geometries once; placing an instance never alters them.
 * A small procedural fallback keeps the range usable while an asset is missing.
 */
export function createEnvironmentModels(THREE, library = null, { trees = true } = {}) {
  if (!library) return createFallback(THREE, { trees });
  library.updateMatrixWorld(true);
  const geometry = name => {
    const object = library.getObjectByName(name);
    if (!object?.isMesh) throw new Error(`Alpine asset is missing mesh ${name}`);
    return object.geometry.clone().applyMatrix4(object.matrixWorld);
  };
  const material = name => library.getObjectByName(name).material;
  const props = {};
  for (const name of ['BoulderA', 'BoulderB', 'Cairn', 'TrailSign', 'EquipmentCrate', 'Cabin']) {
    const object = library.getObjectByName(name);
    if (!object) throw new Error(`Alpine asset is missing prop ${name}`);
    props[name] = object;
  }
  return {
    source: 'blender', props,
    // The current forest has its own assets. A props-only library must not look
    // up, clone or allocate the obsolete spruce geometries and atlas materials.
    treeVariants: trees ? ['SpruceA', 'SpruceB', 'SpruceC'].map((name, index) => {
      const far = geometry(name + '_Far');
      const atlas = material(name + '_Far').map;
      if (atlas) {
        // glTF's image origin is top-left. Each card gets one full source view;
        // the instance attribute chooses its azimuth and species atlas cell.
        const position = far.attributes.position;
        const uv = new Float32Array(position.count * 2);
        for (let vertex = 0; vertex < position.count; vertex++) {
          uv[vertex * 2] = position.getX(vertex) / (46 / 3) + .5;
          uv[vertex * 2 + 1] = 1 - (position.getY(vertex) + .75) / 23;
        }
        far.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      }
      return {
        near: geometry(name + '_Near'), far, trunk: geometry(name + '_Trunk'),
        foliageMaterial: material(name + '_Near'), trunkMaterial: material(name + '_Trunk'),
        impostorMaterial: atlas ? createImpostorMaterial(THREE, atlas, index) : null,
        atlasRow: index, height: atlas ? 23 : 15,
      };
    }) : [],
  };
}

function createFallback(THREE, { trees = true } = {}) {
  const granite = new THREE.MeshStandardMaterial({ color: '#85877d', roughness: .92, flatShading: true });
  const wood = new THREE.MeshStandardMaterial({ color: '#796348', roughness: .92 });
  const dark = new THREE.MeshStandardMaterial({ color: '#35413e', roughness: .85 });
  const treeVariants = [];
  if (trees) {
    const needles = new THREE.MeshStandardMaterial({ color: '#355143', roughness: .95, vertexColors: true });
    const bark = new THREE.MeshStandardMaterial({ color: '#66503a', roughness: .98 });
    for (let seed = 0; seed < 3; seed++) treeVariants.push({
      near: spruceGeometry(THREE, seed, 5, 7, false),
      far: spruceGeometry(THREE, seed, 4, 6, true),
      trunk: new THREE.CylinderGeometry(.11, .24, 11.5 + seed * .35, 6).translate(0, (11.5 + seed * .35) / 2, 0),
      foliageMaterial: needles, trunkMaterial: bark,
    });
  }
  const props = {};
  const stone = (scale, offsetY = .5) => {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), granite);
    mesh.scale.set(...scale); mesh.position.y = offsetY;
    return mesh;
  };
  props.BoulderA = stone([1.8, 1.1, 1.25], .7);
  props.BoulderB = stone([1.35, .85, 1.6], .55);
  props.Cairn = new THREE.Group();
  [0, 1, 2, 3].forEach(index => {
    const scale = .7 - index * .15;
    props.Cairn.add(stone([scale, .17, scale * .8], .18 + index * .25));
  });
  props.TrailSign = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, 2.3, 6), wood);
  post.position.y = 1.15;
  props.TrailSign.add(post);
  for (const [y, x] of [[1.65, .12], [2.03, -.12]]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.25, .23, .1), wood);
    board.position.set(x, y, 0); props.TrailSign.add(board);
  }
  props.EquipmentCrate = new THREE.Mesh(new THREE.BoxGeometry(1.1, .7, .75).translate(0, .35, 0), wood);
  props.Cabin = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.6, 4.3), wood);
  walls.position.y = 1.3;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2, 4), dark);
  roof.position.y = 3.1; roof.rotation.y = Math.PI / 4;
  props.Cabin.add(walls, roof);
  return { source: 'fallback', treeVariants, props };
}

function spruceGeometry(THREE, seed, tiers, sides, far) {
  const positions = [], colors = [], indices = [];
  for (let tier = 0; tier < tiers; tier++) {
    const t = tier / (tiers - 1), base = 1.3 + t * (8.8 + seed * .35);
    const radius = 3 * (1 - t) + .55, height = 3.4 * (1 - t) + 2.3;
    const first = positions.length / 3;
    for (let ring = 0; ring < (far ? 1 : 2); ring++) {
      for (let side = 0; side < sides; side++) {
        const angle = side / sides * Math.PI * 2 + tier * 1.37 + seed;
        const variation = .9 + .17 * Math.sin(side * 4.1 + tier * 7 + seed);
        const radial = radius * variation * (ring ? .39 : 1);
        positions.push(Math.cos(angle) * radial, base + (ring ? height * .55 : (side % 2 ? -.22 : .14)), Math.sin(angle) * radial);
        const shade = .78 + .22 * Math.sin(angle + 1.4) + ring * .12;
        colors.push(shade * .72, shade, shade * .8);
      }
    }
    const tip = positions.length / 3;
    positions.push(.13, base + height, -.1); colors.push(.9, 1, .84);
    for (let side = 0; side < sides; side++) {
      const next = (side + 1) % sides;
      if (far) indices.push(first + side, tip, first + next);
      else indices.push(first + side, first + sides + side, first + next,
        first + next, first + sides + side, first + sides + next,
        first + sides + side, tip, first + sides + next);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

/** Four baked azimuths retain real branch/needle silhouettes at forest distance. */
function createImpostorMaterial(THREE, atlas, row) {
  const material = new THREE.MeshBasicMaterial({
    map: atlas, color: 0xffffff, alphaTest: .34, side: THREE.DoubleSide,
    transparent: false, depthWrite: true, fog: true, toneMapped: true,
  });
  material.name = 'AlpineSpruceImpostor';
  material.alphaToCoverage = true;
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float impostorView;\nvarying float vImpostorView;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvImpostorView = impostorView;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vImpostorView;')
      .replace('#include <map_fragment>', `
        vec2 cellUv = clamp(vMapUv, vec2(.002), vec2(.998));
        vec2 atlasUv = (cellUv + vec2(vImpostorView, ${row.toFixed(1)})) / vec2(4.0, 3.0);
        vec4 foliageSample = texture2D(map, atlasUv);
        // The atlas was baked under neutral studio light. Keep its branch
        // structure while lifting dense distant stands out of crushed black.
        foliageSample.rgb = mix(foliageSample.rgb, sqrt(max(foliageSample.rgb, vec3(0.0))) * .52, .35);
        float foliageLuminance = dot(foliageSample.rgb, vec3(.2126, .7152, .0722));
        foliageSample.rgb = mix(foliageSample.rgb, vec3(foliageLuminance), .16);
        // Match neutral studio-baked foliage to the fixed daytime HDR probe.
        foliageSample.rgb *= 1.6;
        diffuseColor *= foliageSample;
      `);
  };
  material.customProgramCacheKey = () => 'alpine-spruce-atlas-row-v3-' + row;
  return material;
}
