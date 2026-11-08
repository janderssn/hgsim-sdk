// Browser-only authoring stage; invoked by build-forest-assets.mjs.
import * as THREE from '../range/vendor/three.module.js';
import { GLTFLoader } from '../range/vendor/GLTFLoader.js';

const manifest = await (await fetch('/range/assets/forest/forest.json')).json();
const gltf = await new GLTFLoader().loadAsync('/range/assets/forest/' + manifest.geometry);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 1000);
const scene = new THREE.Scene();
const groups = manifest.variants.map(description => {
  const group = new THREE.Group();
  for (const name of ['LeavesNear', 'BarkNear']) {
    const source = gltf.scene.getObjectByName(description.id + '_' + name);
    if (!source) throw new Error('Missing source: ' + description.id + '_' + name);
    const mesh = new THREE.Mesh(source.geometry, source.material);
    mesh.userData.foliage = name.startsWith('Leaves');
    mesh.userData.sourceMaterial = source.material;
    group.add(mesh);
  }
  return group;
});

function createBakeMaterial(source, pass, foliage) {
  if (pass === 'albedo') return new THREE.MeshBasicMaterial({
    map: source.map, color: source.color, vertexColors: source.vertexColors,
    alphaTest: source.alphaTest, side: source.side, toneMapped: false,
  });
  const material = source.clone();
  material.toneMapped = false;
  material.onBeforeCompile = shader => {
    if (foliage) shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec3 treeLocalNormal = normalize(inverseTransformDirection(normal, viewMatrix));
      gl_FragColor = vec4(treeLocalNormal * .5 + .5, 1.0);
    `);
  };
  material.customProgramCacheKey = () => 'forest-authoring-normal-' + foliage;
  return material;
}

window.forestBaker = {
  bake(index, pass) {
    const description = manifest.variants[index];
    const { azimuths, elevations, cellSize, center, diameter } = description.impostor;
    const atlas = document.createElement('canvas');
    atlas.width = azimuths * cellSize; atlas.height = elevations.length * cellSize;
    const context = atlas.getContext('2d');
    renderer.setSize(cellSize, cellSize);
    renderer.outputColorSpace = pass === 'albedo' ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
    camera.left = -diameter / 2; camera.right = diameter / 2;
    camera.top = diameter / 2; camera.bottom = -diameter / 2;
    camera.updateProjectionMatrix();
    const group = groups[index]; scene.clear(); scene.add(group);
    for (const mesh of group.children) mesh.material = createBakeMaterial(mesh.userData.sourceMaterial, pass, mesh.userData.foliage);
    const target = new THREE.Vector3(...center);
    for (let elevation = 0; elevation < elevations.length; elevation++) {
      const phi = elevations[elevation] * Math.PI / 180;
      for (let azimuth = 0; azimuth < azimuths; azimuth++) {
        const theta = azimuth / azimuths * Math.PI * 2;
        const direction = new THREE.Vector3(Math.sin(theta) * Math.cos(phi), Math.sin(phi), Math.cos(theta) * Math.cos(phi));
        camera.position.copy(target).addScaledVector(direction, diameter * 2);
        const right = new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta));
        camera.up.crossVectors(direction, right).normalize();
        camera.lookAt(target); camera.updateMatrixWorld(true);
        renderer.render(scene, camera);
        // Elevation zero occupies texture row zero (bottom in WebGL UV space).
        context.drawImage(renderer.domElement, azimuth * cellSize, (elevations.length - 1 - elevation) * cellSize);
      }
    }
    for (const mesh of group.children) mesh.material.dispose();
    return atlas.toDataURL('image/png');
  },
  preview() {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 800;
    const context = canvas.getContext('2d'); context.fillStyle = '#cbd5ce'; context.fillRect(0, 0, canvas.width, canvas.height);
    renderer.setSize(400, 700); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
    scene.clear();
    const sky = new THREE.HemisphereLight(0xcbd9f2, 0x63684b, 2); scene.add(sky);
    const sun = new THREE.DirectionalLight(0xffeed5, 3); sun.position.set(-20, 40, 35); scene.add(sun);
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i], description = manifest.variants[i];
      for (const mesh of group.children) {
        mesh.material = mesh.userData.sourceMaterial;
        if (mesh.userData.foliage) {
          mesh.material.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', '')); };
          mesh.material.customProgramCacheKey = () => 'forest-authoring-rounded';
        }
      }
      scene.add(group);
      const h = 30, center = new THREE.Vector3(0, h / 2, 0);
      camera.left = -h * 400 / 700 / 2; camera.right = h * 400 / 700 / 2;
      camera.top = h/2; camera.bottom = -h/2; camera.up.set(0,1,0);
      camera.position.copy(center).add(new THREE.Vector3(24, 3, 70)); camera.lookAt(center); camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      context.drawImage(renderer.domElement, i * 400, 0);
      context.fillStyle = '#21332b'; context.font = '600 22px sans-serif'; context.fillText(description.name, i * 400 + 16, 744);
      context.font = '16px sans-serif'; const tris = description.triangles;
      context.fillText(`${description.height} m · ${tris.near.leaves + tris.near.bark} near / ${tris.mid.leaves + tris.mid.bark} mid triangles`, i * 400 + 16, 778);
      scene.remove(group);
    }
    return canvas.toDataURL('image/jpeg', .94);
  },
};

window.forestBaker.verify = async () => {
  const { loadForestAssets } = await import('../range/forest-models.js');
  const assets = await loadForestAssets(THREE, renderer);
  const variant = assets.treeVariants[0];
  scene.clear(); renderer.setSize(1000, 700);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.background = new THREE.Color('#b8cad5');
  scene.add(new THREE.HemisphereLight(0xcbd9f2, 0x63684b, 2));
  const sun = new THREE.DirectionalLight(0xffeed5, 3); sun.position.set(-25, 45, 30);
  sun.castShadow = true; sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera, { left:-55,right:55,top:55,bottom:-55,near:1,far:150 });
  sun.shadow.camera.updateProjectionMatrix(); scene.add(sun);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(110,110),new THREE.MeshStandardMaterial({color:0x728369,roughness:1}));
  plane.rotation.x=-Math.PI/2;plane.receiveShadow=true;scene.add(plane);
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.7), scale = new THREE.Vector3(1,1,1);
  for(const [geometry,material] of [[variant.near,variant.foliageMaterial],[variant.trunk,variant.trunkMaterial]]) {
    const mesh=new THREE.InstancedMesh(geometry,material,1);mesh.setMatrixAt(0,matrix.compose(new THREE.Vector3(-16,0,0),q,scale));mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;scene.add(mesh);
  }
  const card=new THREE.InstancedMesh(variant.far,variant.impostorMaterial,1);
  card.setMatrixAt(0,matrix.compose(new THREE.Vector3(16,0,0),q,scale));
  card.castShadow=true;card.receiveShadow=true;card.frustumCulled=false;
  card.customDepthMaterial=variant.impostorDepthMaterial;card.customDistanceMaterial=variant.impostorDistanceMaterial;scene.add(card);
  const view=new THREE.PerspectiveCamera(43,1000/700,.1,400);
  view.position.set(0,19,95);view.lookAt(0,12,0);
  renderer.render(scene,view);
  const perspective=renderer.domElement.toDataURL('image/jpeg',.95);
  view.position.set(0,95,.001);view.up.set(0,0,-1);view.lookAt(0,0,0);view.updateMatrixWorld(true);
  renderer.render(scene,view);
  const overhead=renderer.domElement.toDataURL('image/jpeg',.95);
  return {perspective,overhead,programs:renderer.info.programs.length,draws:renderer.info.render.calls};
};
