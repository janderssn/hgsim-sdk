// Original cloth finishing and bone-following equipment for the existing rig.
// Authored positions, skin weights, bone names and attachment metadata stay intact.
import { addPilotEquipment } from './pilot-detail.js';
const finished = new WeakMap();

function texture(THREE, width, height, sample, color = false) {
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgb = sample(x, y);
      const at = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        pixels[at + channel] = Math.round(Math.max(0, Math.min(255, rgb[channel])));
      }
      pixels[at + 3] = 255;
    }
  }
  const map = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = 4;
  if (color) map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  return map;
}

function makeTextiles(THREE) {
  const weave = (x, y) => Math.sin(x * Math.PI / 2) * Math.cos(y * Math.PI / 2);
  const cloth = texture(THREE, 128, 128, (x, y) => {
    const value = 249 + weave(x, y) * 3;
    return [value, value, value - 1];
  }, true);
  cloth.repeat.set(16, 16);

  const normal = texture(THREE, 128, 128, (x, y) => [
    128 + Math.sin(x * Math.PI / 2) * 24,
    128 + Math.sin(y * Math.PI / 2) * 24,
    252,
  ]);
  normal.repeat.set(48, 24);
  const roughness = texture(THREE, 128, 128, (x, y) => {
    const value = 243 + weave(x, y) * 8;
    return [value, value, value];
  });
  roughness.repeat.copy(normal.repeat);

  // One map spans the complete wing. Diagonal stitched panel joins follow its
  // swept planform; the existing raised battens remain the structural detail.
  const sail = texture(THREE, 1024, 512, (x, y) => {
    const span = (x / 1023 - .5) * 9.125;
    const chord = y / 511 * 3.6 - 1.1;
    const panel = (span + Math.sign(span) * chord * .13) / .56;
    const join = Math.abs(panel - Math.round(panel));
    const stitch = Math.sin((chord + span * .13) * 250) > .1;
    let value = 248 + weave(x, y) * 2;
    if (join < .016) value -= 30;
    else if (join < .042 && stitch) value -= 22;
    // A quiet variation between cloth panels reads as taut sewn fabric instead
    // of a uniformly coloured plastic surface.
    value += Math.sin(Math.floor(panel) * 2.4) * 2;
    return [value, value, value - 2];
  }, true);

  const brushed = texture(THREE, 128, 128, (x, y) => [
    128 + Math.sin(x * 1.7) * 8,
    128 + Math.sin(y * Math.PI) * 2,
    254,
  ]);
  brushed.repeat.set(5, 30);
  return { cloth, normal, roughness, sail, brushed };
}

function addUVs(THREE, mesh, sail, pilot) {
  const geometry = mesh.geometry;
  if (geometry.getAttribute('uv')) return;
  const position = geometry.getAttribute('position');
  if (!position) return;
  const values = new Float32Array(position.count * 2);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const axes = ['x', 'y', 'z'].sort((a, b) => (box.max[b] - box.min[b]) - (box.max[a] - box.min[a]));
  const get = (axis, index) => position.getComponent(index, { x: 0, y: 1, z: 2 }[axis]);
  for (let i = 0; i < position.count; i++) {
    if (sail) {
      values[i * 2] = position.getX(i) / 9.125 + .5;
      values[i * 2 + 1] = (position.getZ(i) + 1.1) / 3.6;
    } else if (pilot) {
      values[i * 2] = position.getX(i) * 2 + .5;
      values[i * 2 + 1] = position.getY(i) * 1.5;
    } else {
      for (let component = 0; component < 2; component++) {
        const axis = axes[component];
        values[i * 2 + component] = (get(axis, i) - box.min[axis]) / Math.max(.001, box.max[axis] - box.min[axis]);
      }
    }
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(values, 2));
}

/** Macro cloth structure is evaluated before skinning, so stitched pigment
 * stays attached to the jacket while the existing rig bends underneath it. */
function installAircraftCloth(material, name) {
  const jacket = name.includes('teal shell');
  const sail = name.includes('ivory dacron') || name.includes('under red inner cloth') || name.includes('signal royal blue');
  if (!jacket && !sail) return;
  material.onBeforeCompile = shader => {
    shader.vertexShader = `varying vec3 vAircraftRestPosition;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vAircraftRestPosition = position;
    `);
    if (!shader.fragmentShader) return;
    shader.fragmentShader = `varying vec3 vAircraftRestPosition;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      vec3 clothPoint = vAircraftRestPosition;
      ${jacket ? `
      float jacketPanel = smoothstep(-.025, .08, clothPoint.y);
      vec3 fieldCloth = mix(vec3(.135, .170, .092), vec3(.43, .115, .038), jacketPanel);
      float sleeveFold = sin(clothPoint.y * 66.0 + sin(clothPoint.x * 24.0) * 1.4);
      float elbowFold = sin(clothPoint.y * 39.0 - clothPoint.x * 17.0);
      fieldCloth *= .93 + sleeveFold * .045 + elbowFold * .035;
      float jacketHem = 1.0 - smoothstep(.004, .012, abs(clothPoint.y - .115));
      float podSeam = 1.0 - smoothstep(.003, .008, abs(abs(clothPoint.x) - .115));
      fieldCloth *= 1.0 - jacketHem * .20 - podSeam * (1.0 - jacketPanel) * .12;
      diffuseColor.rgb *= fieldCloth;
      ` : `
      float span = abs(clothPoint.x) / 4.5625;
      float ivoryFlash = smoothstep(.65, .665, span) * (1.0 - smoothstep(.77, .785, span));
      ${name.includes('ivory dacron') ? 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.73,.66,.49), ivoryFlash * .93);' : ''}
      float panelTension = sin(clothPoint.x * 10.8 + clothPoint.z * 1.2);
      diffuseColor.rgb *= .97 + panelTension * .025;
      `}
    `);
    if (sail) shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_pars_fragment>', `
      #include <lights_physical_pars_fragment>
      // A thin Dacron sheet passes a small amount of the already shadowed sun.
      // This belongs to the real direct-light loop, never an emissive glow.
      void RE_Direct_Sail(const in IncidentLight light, const in vec3 geometryPosition,
        const in vec3 geometryNormal, const in vec3 geometryViewDir,
        const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material,
        inout ReflectedLight reflectedLight) {
        RE_Direct_Physical(light, geometryPosition, geometryNormal, geometryViewDir,
          geometryClearcoatNormal, material, reflectedLight);
        float throughCloth = pow(max(0.0, dot(geometryViewDir, -light.direction)), 2.0);
        float grazing = 1.0 - abs(dot(geometryNormal, light.direction));
        reflectedLight.directDiffuse += light.color * material.diffuseColor * RECIPROCAL_PI
          * (throughCloth * .32 + grazing * .07);
      }
      #undef RE_Direct
      #define RE_Direct RE_Direct_Sail
    `);
  };
  material.customProgramCacheKey = () => `aircraft-cloth-v2-${jacket ? 'jacket' : name}`;
}

/**
 * Apply the alpine concept's ivory/orange sail, teal pod and metal finishes.
 * Call before addSailFlutter(): ordinary PBR maps leave its shader hook free.
 * The returned handles are useful when disposing the complete scene.
 */
export function finishGlider(THREE, scene) {
  if (finished.has(scene)) return finished.get(scene);
  const maps = makeTextiles(THREE);
  const equipment = addPilotEquipment(THREE, scene);
  const materials = new Map();
  const surfaces = [];

  scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const sail = !!mesh.userData.isSail;
    const originals = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const pilot = originals.some(material => material.name.startsWith('Pilot /'));
    addUVs(THREE, mesh, sail, pilot);
    const replacements = originals.map(original => {
      if (materials.has(original)) return materials.get(original);
      const material = original.clone();
      const name = original.name.toLowerCase();
      material.emissive?.set(0x000000);
      material.envMapIntensity = .85;
      const textile = name.includes('sail /') || name.includes('teal shell') || name.includes('reinforced panels');
      if (textile) {
        material.map = name.includes('sail /') ? maps.sail : maps.cloth;
        material.normalMap = maps.normal;
        material.normalScale.set(.10, .10);
        material.roughnessMap = maps.roughness;
        material.roughness = .86;
        material.metalness = 0;
      }

      if (name.includes('ivory dacron')) {
        material.color.set('#df8b32');
        material.emissive.set('#6a5b3d');
        material.emissiveIntensity = .035;
      } else if (name.includes('under red inner cloth')) {
        material.color.set('#d8c9a9');
        material.emissive.set('#76533b');
        material.emissiveIntensity = .025;
      } else if (name.includes('signal royal blue')) {
        material.color.set('#ce672d');
        material.roughness = .73;
      } else if (name.includes('stripe signal red')) {
        material.color.set('#c86120');
      } else if (name.includes('batten pockets')) {
        material.color.set('#8d846d');
        material.roughness = .87;
      } else if (name.includes('teal shell')) {
        material.color.set('#ffffff');
        material.roughness = .74;
      } else if (name.includes('reinforced panels')) {
        material.color.set('#343c2b');
      } else if (name.includes('webbing and boots')) {
        material.color.set('#242d2d');
        material.roughness = .85;
      } else if (name.includes('white helmet')) {
        material.color.set('#eee9dc');
        material.roughness = .26;
        material.metalness = .08;
      } else if (name.includes('graphite visor')) {
        material.color.set('#182d33');
        material.metalness = .62;
        material.roughness = .13;
        material.envMapIntensity = 1.2;
      } else if (name.includes('anodised aluminium')) {
        material.color.set('#b2b7b6');
        material.metalness = .68;
        material.roughness = .29;
        material.normalMap = maps.brushed;
        material.normalScale.set(.08, .08);
      } else if (name.includes('black fittings')) {
        material.color.set('#202729');
        material.roughness = .42;
        material.metalness = .12;
      } else if (name.includes('stainless wire')) {
        material.color.set('#a0a9a8');
        material.metalness = .74;
        material.roughness = .24;
      }
      installAircraftCloth(material, name);
      material.needsUpdate = true;
      materials.set(original, material);
      return material;
    });
    mesh.material = Array.isArray(mesh.material) ? replacements : replacements[0];
    surfaces.push({ mesh, maps: replacements.map(material => ({
      normal: material.normalMap,
      roughness: material.roughnessMap,
    })) });
  });

  function setQuality(level) {
    if (level !== 'high' && level !== 'medium' && level !== 'low') return false;
    let changed = false;
    function update(material, original) {
      const normal = level === 'low' ? null : original.normal;
      const roughness = level === 'high' ? original.roughness : null;
      if (material.normalMap === normal && material.roughnessMap === roughness) return;
      material.normalMap = normal;
      material.roughnessMap = roughness;
      material.needsUpdate = true;
      changed = true;
    }
    for (const { mesh, maps: originals } of surfaces) {
      // Flutter installs material clones after finishing. Resolve each live
      // material here so quality changes retain its animation shader hook.
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material, index) => update(material, originals[index]));
      } else update(mesh.material, originals[0]);
    }
    return changed;
  }

  equipment.materials.forEach(material => material.dispose());
  const result = { scene, geometries: equipment.geometries, materials: [...materials.values()], textures: Object.values(maps), setQuality };
  finished.set(scene, result);
  return result;
}
