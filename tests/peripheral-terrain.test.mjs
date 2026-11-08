import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../range/vendor/three.module.js';
import { terrainHeight, establishedTerrainHeight, slopeAt, FLIGHT_Y, ROCK_TOP, CLIFF, LAUNCH, DECK_BACK, DECK_LIP, deckY, rockTop, physicalGroundHeight } from '../range/world.js';
import { buildScenery } from '../range/scenery.js';

// Frozen before the peripheral-relief change: approach corners, launch/field,
// and three rings around the established thermal (including its 250 m edge).
const establishedHeights = [
  [-400, -1500, 260.2784189583373],
  [-400, -700, 205.60893215926927],
  [-400, -560, 184.2743474905989],
  [-400, -100, 6.157069289370726],
  [-400, 0, 7.269058153860798],
  [-400, 330, 2.0675041094981865],
  [-400, 650, 8.585125658681209],
  [-250, -1500, 269.70797189023233],
  [-250, -700, 201.8916097323503],
  [-250, -560, 184.7901215003031],
  [-250, -100, 3.173251334337989],
  [-250, 0, 3.077526532269305],
  [-250, 330, 1.851177542253914],
  [-250, 650, 7.312950106034549],
  [0, -1500, 263.7897510506729],
  [0, -700, 201.09094556066117],
  [0, -560, 182.35987226232416],
  [0, -100, -0.9281407054645021],
  [0, 0, -1.4],
  [0, 330, 5.039547039201231],
  [0, 650, 7.961406372260774],
  [250, -1500, 262.5279741808971],
  [250, -700, 198.60628160022839],
  [250, -560, 174.55410016109542],
  [250, -100, 4.264652616934505],
  [250, 0, 6.543646963441001],
  [250, 330, 4.222532004093089],
  [250, 650, 0.6378964184913938],
  [400, -1500, 259.46588515452],
  [400, -700, 205.12540072198607],
  [400, -560, 183.82391735680713],
  [400, -100, 5.97457978759164],
  [400, 0, 7.45679510815411],
  [400, 330, 3.0590868523286727],
  [400, 650, 1.3016491234419054],
  [430, 330, 3.7851632461523463],
  [430, 330, 3.7851632461523463],
  [430, 330, 3.7851632461523463],
  [430, 330, 3.7851632461523463],
  [430, 330, 3.7851632461523463],
  [430, 330, 3.7851632461523463],
  [430, 330, 3.7851632461523463],
  [430, 330, 3.7851632461523463],
  [590, 330, 6.547792657617292],
  [543.1370849898476, 443.1370849898476, 6.136145884283674],
  [430, 490, 2.843065435045257],
  [316.8629150101524, 443.1370849898476, 5.374338079114985],
  [270, 330, 4.380078106295152],
  [316.8629150101524, 216.8629150101524, 4.204438429454192],
  [429.99999999999994, 170, 5.497485223140507],
  [543.1370849898476, 216.86291501015236, 6.4007764857257134],
  [680, 330, 8.65500760478431],
  [606.776695296637, 506.77669529663683, 5.860793403679142],
  [430, 580, 1.4220479886529698],
  [253.22330470336314, 506.7766952966369, 4.0365720583723235],
  [180, 330.00000000000006, 3.9010697123086344],
  [253.22330470336308, 153.22330470336314, 2.9225610442885133],
  [429.99999999999994, 80, 5.536784867150988],
  [606.7766952966368, 153.22330470336308, 6.866974997846049],
];

test('the base profile and unaffected approach/thermal heights remain exact', () => {
  for (const [x, z, height] of establishedHeights) {
    assert.equal(establishedTerrainHeight(x, z), height, `base profile changed at ${x}, ${z}`);
    // The intentional launch shoulder is a physical addition to that profile.
    const launchShoulder = x > -200 && x < 220 && z > -1000 && z < -505;
    if (!launchShoulder) assert.equal(terrainHeight(x, z), height, `protected height changed at ${x}, ${z}`);
  }
});

test('the launch ledges join the ridge without moving their authored structures', () => {
  assert.equal(FLIGHT_Y, 242.35987226232416);
  assert.equal(ROCK_TOP, 242.78987226232417);
  assert.equal(CLIFF.top, 244.85841241828535);
  assert.equal(CLIFF.ground, 244.45841241828535);
  assert.equal(CLIFF.y, 246.75841241828536);
  assert.equal(deckY(LAUNCH.z + DECK_BACK), 245.58987226232418);
  assert.equal(deckY(LAUNCH.z + DECK_LIP), 239.42987226232418);
  const rampShoulder = physicalGroundHeight(0, -595), cliffShoulder = physicalGroundHeight(CLIFF.x, CLIFF.cz);
  assert.ok(rampShoulder - establishedTerrainHeight(0, -595) > 40);
  assert.ok(cliffShoulder - establishedTerrainHeight(CLIFF.x, CLIFF.cz) > 40);
  assert.ok(rockTop(0, -578) - terrainHeight(0, -578) > 50, 'the coarse fill does not bury the exact granite face');
  assert.ok(rockTop(CLIFF.x, CLIFF.z) - terrainHeight(CLIFF.x, CLIFF.z) > 50);
  assert.ok(terrainHeight(0, -700) > 225, 'the ledges must connect to a substantial rear shoulder');
  const lip = LAUNCH.z + DECK_LIP - .1;
  assert.ok(deckY(lip) - terrainHeight(0, lip) > 30, 'the launch lip still clears the slope');
  for (const x of [-180, -100, 0, 100, 180]) for (const z of [-500, -300, 0, 300, 650]) {
    assert.equal(terrainHeight(x, z), establishedTerrainHeight(x, z), 'the field and forward approach remain exact');
  }
});

test('asymmetric valley shoulders and southern rim provide finite physical relief', () => {
  const west = terrainHeight(-1400, 0), east = terrainHeight(1400, 0);
  assert.ok(west > 250 && west < 330);
  assert.ok(east > 350 && east < 430);
  assert.ok(east - west > 60, 'the valley walls must not form a symmetric bowl');
  const south = terrainHeight(0, 1500);
  assert.ok(south > 130 && south < 170);
  let steepest = 0;
  for (let x = -1500; x <= 1500; x += 67) for (let z = -1400; z <= 1500; z += 73) {
    const height = terrainHeight(x, z), slope = slopeAt(x, z);
    assert.ok(Number.isFinite(height) && Number.isFinite(slope) && slope >= 0);
    steepest = Math.max(steepest, slope);
  }
  assert.ok(steepest > .6, 'the shoulders need readable rock-facing slopes');
});

// Interpolate the actual full-detail plane's triangles, rather than comparing
// only the sampled vertices with the function from which they were generated.
function drawnHeight(geometry, x, z) {
  const { width, widthSegments: segments } = geometry.parameters;
  const size = width / segments;
  const column = Math.min(segments - 1, Math.floor((x + width / 2) / size));
  const row = Math.min(segments - 1, Math.floor((z + width / 2) / size));
  const positions = geometry.attributes.position;
  const a = row * (segments + 1) + column, b = a + segments + 1, c = b + 1, d = a + 1;
  const u = (x - positions.getX(a)) / (positions.getX(d) - positions.getX(a));
  const v = (z - positions.getZ(a)) / (positions.getZ(b) - positions.getZ(a));
  return u + v <= 1
    ? positions.getY(a) + (positions.getY(d) - positions.getY(a)) * u + (positions.getY(b) - positions.getY(a)) * v
    : positions.getY(c) + (positions.getY(b) - positions.getY(c)) * (1 - u) + (positions.getY(d) - positions.getY(c)) * (1 - v);
}

test('the full 240-grid drawing stays within one metre of physical slopes and the launch shoulder', () => {
  const scene = new THREE.Scene();
  const scenery = buildScenery(THREE, scene);
  const terrain = scene.children.find(object => object.geometry?.type === 'PlaneGeometry');
  assert.ok(terrain);
  const geometry = terrain.geometry;
  assert.equal(geometry.parameters.widthSegments, 240);
  let sampled = 0;
  const check = (x, z) => {
    const difference = Math.abs(drawnHeight(geometry, x, z) - terrainHeight(x, z));
    assert.ok(difference < 1, `ground drawing is ${difference.toFixed(3)} m off at ${x}, ${z}`);
    sampled++;
  };
  for (let x = -1587; x < 1590; x += 31.7) for (let z = -1583; z < 1590; z += 29.3) check(x, z);
  for (let x = -195; x < 215; x += 7) for (let z = -990; z < -505; z += 9) check(x, z);
  assert.ok(sampled > 13000);
  for (const level of ['low', 'medium', 'high']) {
    scenery.setQuality(level);
    assert.equal(terrain.geometry, geometry, 'quality must not simplify collision-bearing ground');
  }
  const resources = new Set();
  scene.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    if (object.material) for (const material of [object.material].flat()) resources.add(material);
  });
  for (const resource of resources) resource.dispose();
  scenery.forestShadowMap?.dispose();
});
