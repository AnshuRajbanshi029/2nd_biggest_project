import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

console.log('%c[BikeViewer v42 – Jeep doors closed v2]', 'background:#22cc88;color:#fff;padding:4px 8px;font-weight:bold;border-radius:3px');

const app = document.querySelector('#app');
const loaderOverlay = document.querySelector('#loader');
const progressBar = document.querySelector('#progress');
const carTitle = document.querySelector('#carTitle');
const carDescription = document.querySelector('#carDescription');
const carControls = document.querySelector('#carControls');
const status = document.querySelector('#status');
const toggleRotateBtn = document.querySelector('#toggleRotate');

window.addEventListener('error', (event) => handleLoadError(event.error || new Error(event.message)));
window.addEventListener('unhandledrejection', (event) => handleLoadError(event.reason));

const cars = [
  {
    type: 'car',
    root: 'Body',
    title: 'Crimson Sprint',
    description: 'Gloss red rally paint, white race stripes, warm lights, and dark rubber tires.',
    base: '#d91f36',
    accent: '#f8fafc',
    secondary: '#111827',
    number: '01',
    metalness: 0.42,
    roughness: 0.28
  },
  {
    type: 'car',
    root: 'Body.001',
    title: 'Electric Track',
    description: 'Blue metallic finish with neon yellow accents and a tuned street-race look.',
    base: '#1266f1',
    accent: '#facc15',
    secondary: '#0f172a',
    number: '02',
    metalness: 0.5,
    roughness: 0.24
  },
  {
    type: 'car',
    root: 'Body.002',
    title: 'Lime Velocity',
    description: 'Bright green performance paint with orange graphics and glossy clear coat.',
    base: '#22c55e',
    accent: '#fb923c',
    secondary: '#052e16',
    number: '03',
    metalness: 0.58,
    roughness: 0.2
  },
  {
    type: 'bike',
    root: 'FZ16 2.003',
    title: 'Yamaha FZ16',
    description: 'Naked street bike. Both tires roll, the front wheel steers, and the whole bike leans into the turn.',
    targetSize: 2.6
  },
  {
    type: 'jeep',
    title: '4x4 Jeep',
    description: 'Rugged off-road 4x4. All four wheels roll, the front pair steers when you press A/D.',
    targetSize: 3.4
  }
];

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4a5b78);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3.4, 2.1, 4.6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.85;
controls.panSpeed = 0.7;
controls.enableZoom = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.9;
controls.target.set(0, 0.7, 0);
controls.minDistance = 1.8;
controls.maxDistance = 11;
controls.maxPolarAngle = Math.PI * 0.49;

let autoRotateResumeTimer = null;
const pauseAutoRotate = () => {
  controls.autoRotate = false;
  window.clearTimeout(autoRotateResumeTimer);
  autoRotateResumeTimer = window.setTimeout(() => { controls.autoRotate = true; }, 2500);
};
controls.addEventListener('start', pauseAutoRotate);

const zoomState = {
  target: camera.position.distanceTo(controls.target),
  sensitivity: 0.0012,
  lerp: 0.14,
  pinchPrev: 0
};

const _zoomDir = new THREE.Vector3();
function applySmoothZoom() {
  const current = camera.position.distanceTo(controls.target);
  const diff = zoomState.target - current;
  if (Math.abs(diff) < 0.0005) return;
  const next = current + diff * zoomState.lerp;
  _zoomDir.copy(camera.position).sub(controls.target).normalize().multiplyScalar(next);
  camera.position.copy(controls.target).add(_zoomDir);
}

function nudgeZoom(deltaY) {
  zoomState.target *= Math.exp(deltaY * zoomState.sensitivity);
  zoomState.target = THREE.MathUtils.clamp(zoomState.target, controls.minDistance, controls.maxDistance);
  pauseAutoRotate();
}

renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  nudgeZoom(event.deltaY);
}, { passive: false });

renderer.domElement.addEventListener('touchmove', (event) => {
  if (event.touches.length !== 2) return;
  const dx = event.touches[0].clientX - event.touches[1].clientX;
  const dy = event.touches[0].clientY - event.touches[1].clientY;
  const distance = Math.hypot(dx, dy);
  if (zoomState.pinchPrev) nudgeZoom((zoomState.pinchPrev - distance) * 4);
  zoomState.pinchPrev = distance;
}, { passive: true });
renderer.domElement.addEventListener('touchend', () => { zoomState.pinchPrev = 0; });

const hemiLight = new THREE.HemisphereLight(0xf3f6ff, 0x4a5b78, 3.6);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(3.2, 5.2, 3.8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 14;
keyLight.shadow.camera.left = -5;
keyLight.shadow.camera.right = 5;
keyLight.shadow.camera.top = 5;
keyLight.shadow.camera.bottom = -5;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xc7e2ff, 0.9);
rimLight.position.set(-4, 2.4, -3);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(4.5, 96),
  new THREE.MeshStandardMaterial({
    color: 0x394a66,
    roughness: 0.78,
    metalness: 0.05
  })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(8, 24, 0x9bb4d8, 0x6b7d9c);
grid.position.y = 0.005;
grid.material.opacity = 0.28;
grid.material.transparent = true;
scene.add(grid);

let modelRoot;
let bikeRoot;
let bikePivot;
let bikeContentRoot;
let bikeLeanAxis = null;
let jeepRoot = null;
let jeepPivot = null;
let carRoots = [];
let carWheels = [];
let steerStates = [];
let activeIndex = 0;
let wheelsSpinning = false;
const wheelSpeed = 7.5;
const BIKE_WHEEL_SPEED = 9.5;
const STEER_MAX = 0.5;
const STEER_RATE = 2.5;
const STEER_RETURN_RATE = 4.0;
const BIKE_STEER_MAX = 0.35;
const BIKE_LEAN_MAX = 0.45;
const drivingKeys = new Set();
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const STEER_AXIS = new THREE.Vector3(0, 1, 0);
const _steerQuat = new THREE.Quaternion();
const _spinQuat = new THREE.Quaternion();
const clock = new THREE.Clock();
const reusableBox = new THREE.Box3();
const reusableSize = new THREE.Vector3();
const reusableCenter = new THREE.Vector3();

window.addEventListener('keydown', (event) => {
  const key = event.key?.toLowerCase();
  if (key === 'a' || key === 'd') {
    drivingKeys.add(key);
    if (wheelsSpinning) pauseAutoRotate();
    event.preventDefault();
  }
});
window.addEventListener('keyup', (event) => {
  const key = event.key?.toLowerCase();
  if (key) drivingKeys.delete(key);
});
window.addEventListener('blur', () => drivingKeys.clear());

cars.forEach((car, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = `${index + 1}. ${car.title}`;
  button.addEventListener('click', () => showCar(index));
  carControls.appendChild(button);
});

const carsProgress = { loaded: 0, total: 0 };
const bikeProgress = { loaded: 0, total: 0 };
const jeepProgress = { loaded: 0, total: 0 };
function updateProgress() {
  const total = (carsProgress.total || 0) + (bikeProgress.total || 0) + (jeepProgress.total || 0);
  if (!total) return;
  const loaded = (carsProgress.loaded || 0) + (bikeProgress.loaded || 0) + (jeepProgress.loaded || 0);
  progressBar.style.setProperty('--progress', `${Math.round((loaded / total) * 100)}%`);
}

Promise.all([
  loadGlbAsThreeScene('./free_racing_car_in_3_styles.glb', (event) => {
    if (!event.total) return;
    carsProgress.loaded = event.loaded;
    carsProgress.total = event.total;
    updateProgress();
  }),
  loadGlbAsThreeScene('./yamaha_motorcycle_fz_16.glb', (event) => {
    if (!event.total) return;
    bikeProgress.loaded = event.loaded;
    bikeProgress.total = event.total;
    updateProgress();
  }),
  loadGlbAsThreeScene('./4x4_jeep.glb?v=3', (event) => {
    if (!event.total) return;
    jeepProgress.loaded = event.loaded;
    jeepProgress.total = event.total;
    updateProgress();
  })
]).then(([carsGltf, bikeGltf, jeepGltf]) => {
  try {
    modelRoot = carsGltf.scene;
    scene.add(modelRoot);

    const titleObject = modelRoot.getObjectByName('Title');
    if (titleObject) titleObject.visible = false;

    bikeRoot = bikeGltf.scene;
    bikeContentRoot = bikeRoot.getObjectByName('FZ16 2.003') || bikeRoot;
    bikePivot = new THREE.Group();
    bikePivot.add(bikeRoot);
    scene.add(bikePivot);
    hideBikeNonBikeNodes(bikeRoot);
    applyBikeMaterials(bikeContentRoot);

    // Determine the world axis that aligns with the bike's forward (length) so
    // that lean rotates around the right axle. Done with the GLB's natural
    // transforms in place — this captures any Sketchfab Y-up correction etc.
    bikeContentRoot.updateMatrixWorld(true);
    const _bikeWorldBox = new THREE.Box3().setFromObject(bikeContentRoot);
    const _bikeWorldSize = new THREE.Vector3();
    _bikeWorldBox.getSize(_bikeWorldSize);
    const _bikeWorldAxes = [
      { vec: X_AXIS, size: _bikeWorldSize.x },
      { vec: Y_AXIS, size: _bikeWorldSize.y },
      { vec: Z_AXIS, size: _bikeWorldSize.z }
    ].sort((a, b) => b.size - a.size);
    bikeLeanAxis = _bikeWorldAxes[0].vec;
    console.log('[bike] lean axis (world):', bikeLeanAxis.toArray(), 'world size:', _bikeWorldSize.toArray());

    jeepRoot = jeepGltf.scene;
    jeepPivot = new THREE.Group();
    jeepPivot.add(jeepRoot);
    scene.add(jeepPivot);
    applyJeepMaterials(jeepRoot);

    carRoots = cars.map((car, index) => {
      if (car.type === 'car') {
        const root = modelRoot.getObjectByName(car.root);
        if (!root) throw new Error(`Missing car root: ${car.root}`);
        root.visible = false;
        applyMaterials(root, car, index);
        return root;
      }
      if (car.type === 'bike') {
        bikePivot.visible = false;
        return bikePivot;
      }
      if (car.type === 'jeep') {
        jeepPivot.visible = false;
        return jeepPivot;
      }
      return null;
    });

    carWheels = carRoots.map((root, index) => {
      const car = cars[index];
      if (!root) return [];
      if (car.type === 'car') return collectCarWheels(root);
      if (car.type === 'bike') return collectBikeWheels(bikeContentRoot);
      if (car.type === 'jeep') return collectJeepWheels(jeepRoot);
      return [];
    });

    steerStates = cars.map(() => ({ angle: 0, lean: 0 }));

    showCar(getInitialCarIndex());
    loaderOverlay.classList.add('is-hidden');
    status.textContent = 'Loaded 3 cars + Yamaha FZ16 + 4x4 Jeep. Hold A/D to steer (cars yaw, bike leans).';

    toggleRotateBtn.addEventListener('click', () => {
      wheelsSpinning = !wheelsSpinning;
      toggleRotateBtn.classList.toggle('is-on', wheelsSpinning);
      toggleRotateBtn.setAttribute('aria-pressed', String(wheelsSpinning));
      const labelEl = toggleRotateBtn.querySelector('.label');
      if (labelEl) labelEl.textContent = wheelsSpinning ? 'Stop tires' : 'Rotate tires';
      const car = cars[activeIndex];
      status.textContent = wheelsSpinning
        ? (car.type === 'bike'
            ? 'Tires rolling. Hold A/D to steer the front wheel and lean the bike.'
            : 'Wheels spinning. Hold A/D to steer the front wheels.')
        : 'Loaded 3 cars + Yamaha FZ16 + 4x4 Jeep. Hold A/D to steer (cars yaw, bike leans).';
      if (!wheelsSpinning) drivingKeys.clear();
    });
  } catch (error) {
    handleLoadError(error);
  }
}).catch(handleLoadError);

function collectCarWheels(root) {
  const wheels = [];

  let rearLeftEmptyQuat = null;
  let rearRightEmptyQuat = null;
  root.traverse((object) => {
    if (object.isMesh) return;
    const name = (object.name || '').toLowerCase();
    if (name.startsWith('rearleftwheel')) {
      rearLeftEmptyQuat = object.quaternion.clone();
    } else if (name.startsWith('rearrightwheel')) {
      rearRightEmptyQuat = object.quaternion.clone();
    }
  });

  root.traverse((object) => {
    if (!object.isMesh) return;
    const name = (object.name || '').toLowerCase();
    if (name.includes('wheel')) {
      object.quaternion.identity();
      const parent = object.parent;
      if (parent) {
        if (name.startsWith('frontleftwheel') && rearLeftEmptyQuat) {
          parent.quaternion.copy(rearLeftEmptyQuat);
        } else if (name.startsWith('frontrightwheel') && rearRightEmptyQuat) {
          parent.quaternion.copy(rearRightEmptyQuat);
        }
      }
      wheels.push({
        mesh: object,
        isFront: name.includes('front'),
        spin: 0,
        kind: 'car',
        // After the global A/D inversion (v33), positive steer.angle yaws the
        // car wheels left around world Y. Negate so D yaws right, matching
        // the bike + jeep.
        steerSign: -1
      });
    }
  });
  return wheels;
}

function hideBikeNonBikeNodes(root) {
  // Sketchfab scene includes lights (Areas, Points) and a stray Cube — hide non-bike meshes.
  root.traverse((object) => {
    if (!object.isMesh) return;
    const name = object.name || '';
    if (!name.startsWith('FZ16')) object.visible = false;
  });
}

function applyBikeMaterials(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (object.material) object.material.envMapIntensity = 0.85;
  });
}

function applyJeepMaterials(root) {
  // The GLB ships with proper baseColorTexture for Wheel / Body / Optics and
  // pure-black baseColorFactor for Glass — that's already what we want. Don't
  // tint or remetallise it; just enable shadows and a calm reflection level.
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const mat = object.material;
    if (!mat) return;
    mat.envMapIntensity = 0.6;
  });
}

// The 4x4 Jeep ships as 4 separate "Tire*_Wheel_0" meshes, plus a body-mounted
// "Body1_Wheel_0" decorative strip. We pick the four with tire-like proportions
// (axle-thin disc) sitting near the ground, build a pivot per tire, recenter
// the geometry into local space and parent the mesh under the pivot so we can
// spin it freely.
function collectJeepWheels(jeepContent) {
  const tireMeshes = [];
  jeepContent.traverse((object) => {
    if (!object.isMesh || !object.geometry) return;
    if ((object.material?.name || '').toLowerCase() !== 'wheel') return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    const bb = object.geometry.boundingBox;
    const sx = bb.max.x - bb.min.x;
    const sy = bb.max.y - bb.min.y;
    const sz = bb.max.z - bb.min.z;
    const cy = (bb.min.y + bb.max.y) / 2;
    const sorted = [sx, sy, sz].slice().sort((a, b) => a - b);
    // Real tire: smallest extent (axle) clearly thinner than the disc, and the
    // two big extents are similar in size (round disc). Mounted on the body
    // ("Body1_Wheel_0") this would be a thin flat strip up high.
    const isTire = sorted[0] < 0.65 * sorted[2]
      && sorted[1] / sorted[2] > 0.7
      && cy < 0.6 * (bb.max.y - bb.min.y + 12); // i.e. low to the ground
    if (isTire) tireMeshes.push(object);
  });

  if (tireMeshes.length !== 4) {
    console.warn('[jeep] expected 4 tires, found', tireMeshes.length, tireMeshes.map((m) => m.name));
    return [];
  }

  const wheels = tireMeshes.map((mesh) => {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    const cx = (bb.min.x + bb.max.x) / 2;
    const cy = (bb.min.y + bb.max.y) / 2;
    const cz = (bb.min.z + bb.max.z) / 2;

    const pivot = new THREE.Group();
    pivot.name = `JeepWheel_${mesh.name}`;
    pivot.position.set(cx, cy, cz);

    const parent = mesh.parent;
    parent.add(pivot);
    // Recenter geometry so rotating the pivot rotates the tire around its axle.
    mesh.geometry.translate(-cx, -cy, -cz);
    mesh.geometry.computeBoundingBox();
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    pivot.add(mesh);

    return {
      mesh: pivot,
      isFront: cz < 0,    // front tires sit at negative Z in this model
      spin: 0,
      kind: 'jeep',
      // Axle along world X, steering yaw around world Y.
      axleVec: X_AXIS,
      steerVec: Y_AXIS,
      // Negate steer angle so D yaws front wheels right (matching bike).
      steerSign: -1
    };
  });
  console.log('[jeep] wheels:', wheels.map((w) => ({
    name: w.mesh.name, isFront: w.isFront, pos: w.mesh.position.toArray().map((n) => +n.toFixed(2))
  })));
  return wheels;
}

function collectBikeWheels(bikeContent) {
  // Gather every indexed mesh in the bike — we may pull wheel parts out of any of them.
  const allMeshes = [];
  bikeContent.traverse((object) => {
    if (object.isMesh && object.geometry?.index) allMeshes.push(object);
  });

  const rubberMesh = allMeshes.find((m) => m.material?.name === 'Rubber');
  if (!rubberMesh) {
    console.warn('[bike] Rubber mesh not found');
    return [];
  }

  if (!rubberMesh.geometry.boundingBox) rubberMesh.geometry.computeBoundingBox();
  const bb = rubberMesh.geometry.boundingBox;
  // Smallest mesh extent = axle direction. Middle = vertical (steer). Largest = forward.
  const axisExtents = [
    { name: 'x', size: bb.max.x - bb.min.x, vec: X_AXIS },
    { name: 'y', size: bb.max.y - bb.min.y, vec: Y_AXIS },
    { name: 'z', size: bb.max.z - bb.min.z, vec: Z_AXIS }
  ].sort((a, b) => a.size - b.size);
  const axleInfo = axisExtents[0];
  const steerInfo = axisExtents[1];
  const forwardInfo = axisExtents[2];
  const forwardKey = `c${forwardInfo.name}`;
  const steerKey = `c${steerInfo.name}`;
  const axleKey = `c${axleInfo.name}`;
  const axleSizeKey = `size${axleInfo.name.toUpperCase()}`;
  const forwardSizeKey = `size${forwardInfo.name.toUpperCase()}`;
  const steerSizeKey = `size${steerInfo.name.toUpperCase()}`;
  console.log(`[bike] axes — axle:${axleInfo.name} steer:${steerInfo.name} forward:${forwardInfo.name}`);

  // Step 1: find the 2 tire components in the rubber mesh (axis-agnostic disc test).
  const rubberComps = findConnectedComponents(rubberMesh.geometry);
  const tireCandidates = rubberComps.filter((c) => {
    if (c.verts.length < 64) return false;
    const sorted = [c.sizeX, c.sizeY, c.sizeZ].sort((a, b) => a - b);
    if (sorted[2] < 0.05 * forwardInfo.size) return false;
    return (sorted[0] / sorted[2]) < 0.5 && (sorted[1] / sorted[2]) > 0.6;
  });
  tireCandidates.sort((a, b) => {
    const aS = [a.sizeX, a.sizeY, a.sizeZ].sort((x, y) => y - x);
    const bS = [b.sizeX, b.sizeY, b.sizeZ].sort((x, y) => y - x);
    return (bS[0] * bS[1]) - (aS[0] * aS[1]);
  });
  const tires = tireCandidates.slice(0, 2);
  if (tires.length < 2) {
    console.warn('[bike] Could not isolate 2 tires (found', tires.length, 'candidates)');
    return [];
  }
  // Front first along the bike's forward axis.
  tires.sort((a, b) => b[forwardKey] - a[forwardKey]);

  // Step 2: build a pivot Group per wheel at the tire's axle, drop the tire mesh inside.
  const wheels = tires.map((tireComp, i) => {
    const sortedSize = [tireComp.sizeX, tireComp.sizeY, tireComp.sizeZ].sort((a, b) => a - b);
    const tireRadius = sortedSize[2] / 2; // largest extent ≈ disc diameter

    const pivot = new THREE.Group();
    pivot.position.set(tireComp.cx, tireComp.cy, tireComp.cz);
    pivot.name = i === 0 ? 'BikeWheel_Front' : 'BikeWheel_Rear';
    rubberMesh.parent.add(pivot);

    const tirePart = extractComponentToPivotedMesh(rubberMesh, tireComp, tireComp.cx, tireComp.cy, tireComp.cz);
    pivot.add(tirePart);

    return {
      mesh: pivot,
      tireComp,
      tireRadius,
      isFront: i === 0,
      spin: 0,
      kind: 'bike',
      axleVec: axleInfo.vec,
      steerVec: steerInfo.vec,
      partsCount: 1
    };
  });
  removeFacesByVerts(rubberMesh, tires.map((c) => c.vertSet));

  // Step 3: scan every other mesh for components that live inside a wheel disc
  // (rim, spokes, brake disc, hub). Match by 2D distance in the wheel-face plane
  // (forward × steer axes — the plane perpendicular to the axle).
  const otherMeshes = allMeshes.filter((m) => m !== rubberMesh);
  for (const mesh of otherMeshes) {
    const comps = findConnectedComponents(mesh.geometry);
    const matched = [];

    for (const comp of comps) {
      // Skip orphan triangles (nv=3) but keep quad-shaped accents (nv=4 spoke
      // strips) — the FZ16 rim has 5 thin rectangular spoke ribs per wheel.
      if (comp.verts.length < 4) continue;
      // Low-vertex (<16) OFF-CENTRE components: only reject if they sit
      // OUTSIDE the on-axle band (where caliper bolts live, dY≈43). Wheel
      // sidewall decals are paper-thin (axle≈0) but lie at dY≈14, so
      // they must pass.
      if (comp.verts.length < 16) {
        const dFwdK = comp[forwardKey] - tires[0][forwardKey];
        const dStrK = comp[steerKey] - tires[0][steerKey];
        const distNearF = Math.hypot(dFwdK, dStrK);
        const dFwdR = comp[forwardKey] - tires[1][forwardKey];
        const dStrR = comp[steerKey] - tires[1][steerKey];
        const distNearR = Math.hypot(dFwdR, dStrR);
        const minD = Math.min(distNearF, distNearR);
        const dY = Math.abs(comp[axleKey]);
        if (minD > 30 && dY > 25 && comp[axleSizeKey] < 20) continue;
      }
      // Disqualify components much bigger than a wheel (chassis, frame).
      const compMaxSize = Math.max(comp.sizeX, comp.sizeY, comp.sizeZ);

      let bestWheel = -1;
      let bestDist = Infinity;
      for (let w = 0; w < wheels.length; w += 1) {
        const wheel = wheels[w];
        const t = wheel.tireComp;
        const dFwd = comp[forwardKey] - t[forwardKey];
        const dStr = comp[steerKey] - t[steerKey];
        const dist = Math.hypot(dFwd, dStr);
        if (dist > wheel.tireRadius * 0.95) continue;
        if (compMaxSize > wheel.tireRadius * 2.4) continue;
        // Reject the axle SHAFT itself: a thin cylinder concentric with the
        // hub but spanning beyond the tyre's sidewall, bolted to the fork.
        if (comp[axleSizeKey] > t[axleSizeKey] * 1.05) continue;
        // Reject parts that sit on the SIDE of the wheel along the axle (fork
        // legs, swingarm pivots, axle nut covers, brake-caliper bolts) — real
        // wheel parts (rim, disc, hub, spokes) live within the tyre's axial
        // band.
        const dAxle = Math.abs(comp[axleKey] - t[axleKey]);
        if (dAxle > t[axleSizeKey] * 0.55) continue;
        // Disc-containment: the component's bbox in the wheel plane should fit
        // inside the tire's disc. Mudguards / fairings that wrap above the wheel
        // pass the dist test but their bbox extends beyond the tire radius.
        const inPlaneHalf = 0.5 * Math.max(comp[forwardSizeKey], comp[steerSizeKey]);
        if (dist + inPlaneHalf > wheel.tireRadius * 1.1) continue;
        if (dist < bestDist) {
          bestWheel = w;
          bestDist = dist;
        }
      }

      if (bestWheel >= 0) matched.push({ comp, wheelIdx: bestWheel });
    }

    if (matched.length === 0) continue;

    for (const { comp, wheelIdx } of matched) {
      const wheel = wheels[wheelIdx];
      const t = wheel.tireComp;
      const partMesh = extractComponentToPivotedMesh(mesh, comp, t.cx, t.cy, t.cz);
      partMesh.name = `${wheel.mesh.name}_${mesh.material?.name || mesh.name || 'part'}`;
      wheel.mesh.add(partMesh);
      wheel.partsCount += 1;
    }
    removeFacesByVerts(mesh, matched.map((m) => m.comp.vertSet));
  }

  // Step 4: every remaining component in the rubber mesh (i.e. tire-tread
  // blocks, valve stems, sidewall rubber accents) belongs to whichever
  // wheel its bbox-centre is closest to in the wheel plane. The two main
  // tire bodies have already been extracted, so what's left here is tread.
  const leftoverRubber = findConnectedComponents(rubberMesh.geometry);
  const treadMatched = [];
  for (const comp of leftoverRubber) {
    if (comp.verts.length < 3) continue;
    let bestWheel = -1;
    let bestDist = Infinity;
    for (let w = 0; w < wheels.length; w += 1) {
      const wheel = wheels[w];
      const t = wheel.tireComp;
      const dFwd = comp[forwardKey] - t[forwardKey];
      const dStr = comp[steerKey] - t[steerKey];
      const dist = Math.hypot(dFwd, dStr);
      // A tread block sits just outside or right at the tyre surface, so
      // allow up to 1.05 × tireRadius (treads are slightly proud of the
      // body). It also has to be within the tyre's axial band.
      if (dist > wheel.tireRadius * 1.05) continue;
      const dAxle = Math.abs(comp[axleKey] - t[axleKey]);
      if (dAxle > t[axleSizeKey] * 0.6) continue;
      if (dist < bestDist) {
        bestWheel = w;
        bestDist = dist;
      }
    }
    if (bestWheel >= 0) treadMatched.push({ comp, wheelIdx: bestWheel });
  }
  for (const { comp, wheelIdx } of treadMatched) {
    const wheel = wheels[wheelIdx];
    const t = wheel.tireComp;
    const partMesh = extractComponentToPivotedMesh(rubberMesh, comp, t.cx, t.cy, t.cz);
    partMesh.name = `${wheel.mesh.name}_tread`;
    wheel.mesh.add(partMesh);
    wheel.partsCount += 1;
  }
  removeFacesByVerts(rubberMesh, treadMatched.map((m) => m.comp.vertSet));
  console.log(`[bike] tread-block pass: ${treadMatched.length} components moved into wheel pivots`);

  for (const w of wheels) {
    console.log(`[bike] ${w.mesh.name} children (${w.mesh.children.length}):`,
      w.mesh.children.map((c) => {
        const g = c.geometry;
        if (!g) return c.name;
        g.computeBoundingBox();
        const s = new THREE.Vector3();
        g.boundingBox.getSize(s);
        return `${c.name} ext=${s.x.toFixed(0)}x${s.y.toFixed(0)}x${s.z.toFixed(0)}`;
      }));
  }
  console.log('[bike] Wheel pivots:', wheels.map((w) => ({
    name: w.mesh.name, isFront: w.isFront, parts: w.partsCount,
    pivotPos: w.mesh.position.toArray().map((n) => +n.toFixed(1)),
    radius: +w.tireRadius.toFixed(1)
  })));
  return wheels;
}

function extractComponentToPivotedMesh(originalMesh, component, pivotX, pivotY, pivotZ) {
  const positions = originalMesh.geometry.attributes.position.array;
  const indices = originalMesh.geometry.index.array;
  const normals = originalMesh.geometry.attributes.normal?.array || null;
  const uvs = originalMesh.geometry.attributes.uv?.array || null;
  const triCount = indices.length / 3;

  const newPositions = [];
  const newNormals = normals ? [] : null;
  const newUvs = uvs ? [] : null;
  const newIndices = [];
  const remap = new Map();

  for (let t = 0; t < triCount; t += 1) {
    const a = indices[t * 3];
    const b = indices[t * 3 + 1];
    const c = indices[t * 3 + 2];
    if (!component.vertSet.has(a) && !component.vertSet.has(b) && !component.vertSet.has(c)) continue;
    const tri = [a, b, c];
    for (let k = 0; k < 3; k += 1) {
      const v = tri[k];
      let nv = remap.get(v);
      if (nv === undefined) {
        nv = newPositions.length / 3;
        remap.set(v, nv);
        newPositions.push(
          positions[v * 3] - pivotX,
          positions[v * 3 + 1] - pivotY,
          positions[v * 3 + 2] - pivotZ
        );
        if (newNormals) newNormals.push(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]);
        if (newUvs) newUvs.push(uvs[v * 2], uvs[v * 2 + 1]);
      }
      newIndices.push(nv);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPositions), 3));
  if (newNormals) geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(newNormals), 3));
  if (newUvs) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(newUvs), 2));
  geometry.setIndex(newIndices);
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  const mesh = new THREE.Mesh(geometry, originalMesh.material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function findConnectedComponents(geometry) {
  const positions = geometry.attributes.position.array;
  const indices = geometry.index.array;
  const vertCount = positions.length / 3;
  const triCount = indices.length / 3;

  const parent = new Int32Array(vertCount);
  for (let i = 0; i < vertCount; i += 1) parent[i] = i;
  const find = (x) => {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    let cur = x;
    while (parent[cur] !== root) {
      const next = parent[cur];
      parent[cur] = root;
      cur = next;
    }
    return root;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (let t = 0; t < triCount; t += 1) {
    const a = indices[t * 3];
    const b = indices[t * 3 + 1];
    const c = indices[t * 3 + 2];
    union(a, b);
    union(b, c);
  }

  const groups = new Map();
  for (let i = 0; i < vertCount; i += 1) {
    const r = find(i);
    let list = groups.get(r);
    if (!list) {
      list = [];
      groups.set(r, list);
    }
    list.push(i);
  }

  const components = [];
  for (const verts of groups.values()) {
    let xmin = Infinity, xmax = -Infinity;
    let ymin = Infinity, ymax = -Infinity;
    let zmin = Infinity, zmax = -Infinity;
    for (let i = 0; i < verts.length; i += 1) {
      const v = verts[i];
      const x = positions[v * 3];
      const y = positions[v * 3 + 1];
      const z = positions[v * 3 + 2];
      if (x < xmin) xmin = x;
      if (x > xmax) xmax = x;
      if (y < ymin) ymin = y;
      if (y > ymax) ymax = y;
      if (z < zmin) zmin = z;
      if (z > zmax) zmax = z;
    }
    components.push({
      verts,
      vertSet: new Set(verts),
      cx: (xmin + xmax) / 2,
      cy: (ymin + ymax) / 2,
      cz: (zmin + zmax) / 2,
      sizeX: xmax - xmin,
      sizeY: ymax - ymin,
      sizeZ: zmax - zmin
    });
  }
  return components;
}
function removeFacesByVerts(originalMesh, vertSetsToRemove) {
  const indices = originalMesh.geometry.index.array;
  const triCount = indices.length / 3;
  const keep = [];
  for (let t = 0; t < triCount; t += 1) {
    const a = indices[t * 3];
    const b = indices[t * 3 + 1];
    const c = indices[t * 3 + 2];
    let drop = false;
    for (let s = 0; s < vertSetsToRemove.length; s += 1) {
      const set = vertSetsToRemove[s];
      if (set.has(a) || set.has(b) || set.has(c)) {
        drop = true;
        break;
      }
    }
    if (!drop) keep.push(a, b, c);
  }
  const ArrayCtor = keep.length > 65535 ? Uint32Array : Uint16Array;
  originalMesh.geometry.setIndex(new THREE.BufferAttribute(new ArrayCtor(keep), 1));
}

function applyMaterials(root, car, index) {
  const lightEmissive = new THREE.Color(index === 1 ? '#a3e6ff' : '#ffe2a0');

  root.traverse((object) => {
    if (!object.isMesh) return;

    object.castShadow = true;
    object.receiveShadow = true;

    const original = Array.isArray(object.material) ? object.material[0] : object.material;
    const baseMap = original?.userData?.baseColorTexture || null;
    const mrMap = original?.userData?.metallicRoughnessTexture || null;
    const key = `${object.name} ${original?.name || ''}`.toLowerCase();

    if (key.includes('light')) {
      object.material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        map: baseMap,
        emissive: lightEmissive,
        emissiveMap: baseMap,
        emissiveIntensity: 1.6,
        metalness: 0,
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.2
      });
      object.castShadow = false;
    } else if (key.includes('outline')) {
      object.material = new THREE.MeshPhysicalMaterial({
        color: 0x05070d,
        metalness: 0,
        roughness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        ior: 1.45,
        reflectivity: 0.85,
        envMapIntensity: 1.4
      });
    } else if (key.includes('wheel')) {
      object.material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        map: baseMap,
        metalnessMap: mrMap,
        roughnessMap: mrMap,
        metalness: 1,
        roughness: 1,
        clearcoat: 0.25,
        clearcoatRoughness: 0.4,
        envMapIntensity: 0.75
      });
    } else {
      object.material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(car.base),
        map: baseMap,
        metalnessMap: mrMap,
        roughnessMap: mrMap,
        metalness: 0.45,
        roughness: 0.6,
        clearcoat: 0.45,
        clearcoatRoughness: 0.18,
        sheen: 0.2,
        sheenColor: new THREE.Color(car.accent),
        envMapIntensity: 0.7
      });
    }
  });
}

function createPaintTexture(car) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, lighten(car.base, 0.22));
  gradient.addColorStop(0.48, car.base);
  gradient.addColorStop(1, darken(car.base, 0.28));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 32; i += 1) {
    ctx.fillRect(i * 18, 0, 2, 512);
  }

  ctx.globalAlpha = 1;
  ctx.translate(256, 256);
  ctx.rotate(-Math.PI / 8);
  ctx.fillStyle = car.secondary;
  roundRect(ctx, -360, -48, 720, 96, 20);
  ctx.fill();
  ctx.fillStyle = car.accent;
  roundRect(ctx, -360, -26, 720, 28, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 112px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 12;
  ctx.strokeStyle = car.secondary;
  ctx.strokeText(car.number, 0, 22);
  ctx.fillText(car.number, 0, 22);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 42);
  ctx.fillRect(0, 470, 512, 42);
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}

function showCar(index) {
  if (!modelRoot || !carRoots.length) return;

  activeIndex = index;
  carRoots.forEach((root, rootIndex) => {
    if (root) root.visible = rootIndex === index;
  });

  const car = cars[index];
  const selected = carRoots[index];
  const targetSize = car.targetSize || 3.2;

  if (car.type === 'car') {
    modelRoot.visible = true;
    if (bikePivot) bikePivot.visible = false;
    if (jeepPivot) jeepPivot.visible = false;

    modelRoot.position.set(0, 0, 0);
    modelRoot.scale.setScalar(1);
    modelRoot.updateMatrixWorld(true);

    reusableBox.setFromObject(selected);
    reusableBox.getSize(reusableSize);
    reusableBox.getCenter(reusableCenter);

    const maxAxis = Math.max(reusableSize.x, reusableSize.y, reusableSize.z) || 1;
    const scale = targetSize / maxAxis;
    modelRoot.scale.setScalar(scale);
    modelRoot.position.set(
      -reusableCenter.x * scale,
      -reusableBox.min.y * scale + 0.05,
      -reusableCenter.z * scale
    );
  } else if (car.type === 'jeep') {
    if (modelRoot) modelRoot.visible = false;
    if (bikePivot) bikePivot.visible = false;
    jeepPivot.visible = true;

    jeepPivot.position.set(0, 0, 0);
    jeepPivot.scale.setScalar(1);
    jeepPivot.quaternion.identity();
    jeepRoot.position.set(0, 0, 0);
    jeepRoot.quaternion.identity();
    jeepRoot.updateMatrixWorld(true);

    reusableBox.setFromObject(jeepRoot);
    reusableBox.getSize(reusableSize);
    reusableBox.getCenter(reusableCenter);

    const maxAxis = Math.max(reusableSize.x, reusableSize.y, reusableSize.z) || 1;
    const scale = targetSize / maxAxis;
    jeepPivot.scale.setScalar(scale);
    jeepPivot.position.set(
      -reusableCenter.x * scale,
      -reusableBox.min.y * scale + 0.05,
      -reusableCenter.z * scale
    );
    if (steerStates[index]) steerStates[index].angle = 0;
  } else if (car.type === 'bike') {
    if (modelRoot) modelRoot.visible = false;
    if (jeepPivot) jeepPivot.visible = false;
    bikePivot.visible = true;

    // Reset transforms before measuring so we get the bike's natural bbox.
    bikePivot.position.set(0, 0, 0);
    bikePivot.scale.setScalar(1);
    bikePivot.quaternion.identity();
    bikeRoot.position.set(0, 0, 0);
    bikeRoot.quaternion.identity();
    bikeRoot.updateMatrixWorld(true);

    reusableBox.setFromObject(bikeContentRoot);
    reusableBox.getSize(reusableSize);
    reusableBox.getCenter(reusableCenter);

    const maxAxis = Math.max(reusableSize.x, reusableSize.y, reusableSize.z) || 1;
    const scale = targetSize / maxAxis;
    bikePivot.scale.setScalar(scale);
    // Pivot sits on the floor along the bike's length so leaning rotates around tire contact.
    bikePivot.position.set(0, 0.05, 0);
    bikeRoot.position.set(
      -reusableCenter.x,
      -reusableBox.min.y,
      -reusableCenter.z
    );
    // Reset lean so re-selecting bike doesn't keep the previous tilt.
    if (steerStates[index]) {
      steerStates[index].angle = 0;
      steerStates[index].lean = 0;
    }
  }

  carTitle.textContent = car.title;
  carDescription.textContent = car.description;
  [...carControls.children].forEach((button, buttonIndex) => {
    button.classList.toggle('is-active', buttonIndex === index);
  });

  const url = new URL(window.location.href);
  url.searchParams.set('car', String(index + 1));
  window.history.replaceState({}, '', url);
}

async function loadGlbAsThreeScene(url, onProgress) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`GLB request failed: ${response.status}`);

    const buffer = await response.arrayBuffer();
    onProgress({ loaded: buffer.byteLength, total: buffer.byteLength });

    return await parseGlb(buffer);
  } finally {
    window.clearTimeout(timeout);
  }
}

async function parseGlb(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const magic = view.getUint32(0, true);
  if (magic !== 0x46546c67) throw new Error('Invalid GLB header');

  let offset = 12;
  let json = null;
  let binary = null;

  while (offset < arrayBuffer.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    const chunk = arrayBuffer.slice(chunkStart, chunkEnd);

    if (chunkType === 0x4e4f534a) {
      json = JSON.parse(new TextDecoder().decode(chunk));
    } else if (chunkType === 0x004e4942) {
      binary = chunk;
    }

    offset = chunkEnd;
  }

  if (!json || !binary) throw new Error('GLB is missing JSON or BIN data');

  const images = await Promise.all((json.images || []).map((image) => loadGlbImage(image, json, binary)));
  const textures = (json.textures || []).map((textureDef) => images[textureDef.source] || null);

  const nodes = json.nodes.map((node) => buildNode(json, binary, node, textures));

  json.nodes.forEach((node, nodeIndex) => {
    if (!node.children) return;
    node.children.forEach((childIndex) => {
      nodes[nodeIndex].add(nodes[childIndex]);
    });
  });

  const scene = new THREE.Group();
  const sceneDefinition = json.scenes[json.scene || 0] || json.scenes[0];
  sceneDefinition.nodes.forEach((nodeIndex) => scene.add(nodes[nodeIndex]));
  return { scene };
}

async function loadGlbImage(image, json, binary) {
  if (image.bufferView === undefined) return null;
  const bufferView = json.bufferViews[image.bufferView];
  const start = bufferView.byteOffset || 0;
  const bytes = new Uint8Array(binary, start, bufferView.byteLength);
  const blob = new Blob([bytes], { type: image.mimeType || 'image/png' });
  // Decode WITHOUT a vertical flip — glTF stores UVs with origin at the
  // top-left, and `texture.flipY = false` is what tells Three.js to sample
  // them that way. Doing both (decode-flip + flipY=false) double-flips and
  // ends up sampling the texture upside-down (dark interior atlas regions
  // bleeding onto the Jeep's red body panels).
  const bitmap = await createImageBitmap(blob);
  const texture = new THREE.CanvasTexture(bitmap);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function buildNode(json, binary, node, textures) {
  let object = new THREE.Group();

  if (node.mesh !== undefined) {
    const meshDefinition = json.meshes[node.mesh];
    const meshes = meshDefinition.primitives.map((primitive) => buildPrimitive(json, binary, primitive, textures));

    if (meshes.length === 1) {
      object = meshes[0];
    } else {
      meshes.forEach((mesh) => object.add(mesh));
    }
  }

  object.name = node.name || '';

  if (node.matrix) {
    const matrix = new THREE.Matrix4().fromArray(node.matrix);
    matrix.decompose(object.position, object.quaternion, object.scale);
  } else {
    if (node.translation) object.position.fromArray(node.translation);
    if (node.rotation) object.quaternion.fromArray(node.rotation);
    if (node.scale) object.scale.fromArray(node.scale);
  }

  return object;
}

function buildPrimitive(json, binary, primitive, textures) {
  const geometry = new THREE.BufferGeometry();
  const position = readAccessor(json, binary, primitive.attributes.POSITION);

  geometry.setAttribute('position', new THREE.BufferAttribute(position.array, position.itemSize));

  if (primitive.attributes.NORMAL !== undefined) {
    const normal = readAccessor(json, binary, primitive.attributes.NORMAL);
    geometry.setAttribute('normal', new THREE.BufferAttribute(normal.array, normal.itemSize));
  }

  if (primitive.attributes.TEXCOORD_0 !== undefined) {
    const uv = readAccessor(json, binary, primitive.attributes.TEXCOORD_0);
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv.array, uv.itemSize));
  }

  if (primitive.indices !== undefined) {
    const index = readAccessor(json, binary, primitive.indices);
    geometry.setIndex(new THREE.BufferAttribute(index.array, 1));
  }

  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  const materialDefinition = json.materials?.[primitive.material];
  const pbr = materialDefinition?.pbrMetallicRoughness || {};
  const baseColorTexture = pbr.baseColorTexture ? textures[pbr.baseColorTexture.index] : null;
  const metallicRoughnessTexture = pbr.metallicRoughnessTexture ? textures[pbr.metallicRoughnessTexture.index] : null;
  const baseColorFactor = pbr.baseColorFactor ? new THREE.Color().fromArray(pbr.baseColorFactor) : new THREE.Color(0xffffff);

  const material = new THREE.MeshStandardMaterial({
    color: baseColorFactor,
    map: baseColorTexture,
    metalnessMap: metallicRoughnessTexture,
    roughnessMap: metallicRoughnessTexture,
    metalness: pbr.metallicFactor !== undefined ? pbr.metallicFactor : 1,
    roughness: pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : 1
  });
  material.name = materialDefinition?.name || '';
  material.userData.baseColorTexture = baseColorTexture;
  material.userData.metallicRoughnessTexture = metallicRoughnessTexture;

  return new THREE.Mesh(geometry, material);
}

function readAccessor(json, binary, accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  const bufferView = json.bufferViews[accessor.bufferView];
  const itemSize = getItemSize(accessor.type);
  const ArrayType = getArrayType(accessor.componentType);
  const componentSize = ArrayType.BYTES_PER_ELEMENT;
  const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  const stride = bufferView.byteStride || itemSize * componentSize;
  const count = accessor.count;
  const packedStride = itemSize * componentSize;

  if (stride === packedStride && byteOffset % componentSize === 0) {
    const source = new ArrayType(binary, byteOffset, count * itemSize);
    return {
      array: source.slice ? source.slice() : new ArrayType(source),
      itemSize
    };
  }

  const output = new ArrayType(count * itemSize);
  const dataView = new DataView(binary);

  for (let i = 0; i < count; i += 1) {
    for (let j = 0; j < itemSize; j += 1) {
      output[i * itemSize + j] = readComponent(dataView, byteOffset + i * stride + j * componentSize, accessor.componentType);
    }
  }

  return { array: output, itemSize };
}

function getItemSize(type) {
  if (type === 'SCALAR') return 1;
  if (type === 'VEC2') return 2;
  if (type === 'VEC3') return 3;
  if (type === 'VEC4') return 4;
  if (type === 'MAT4') return 16;
  throw new Error(`Unsupported accessor type: ${type}`);
}

function getArrayType(componentType) {
  if (componentType === 5120) return Int8Array;
  if (componentType === 5121) return Uint8Array;
  if (componentType === 5122) return Int16Array;
  if (componentType === 5123) return Uint16Array;
  if (componentType === 5125) return Uint32Array;
  if (componentType === 5126) return Float32Array;
  throw new Error(`Unsupported component type: ${componentType}`);
}

function readComponent(dataView, byteOffset, componentType) {
  if (componentType === 5120) return dataView.getInt8(byteOffset);
  if (componentType === 5121) return dataView.getUint8(byteOffset);
  if (componentType === 5122) return dataView.getInt16(byteOffset, true);
  if (componentType === 5123) return dataView.getUint16(byteOffset, true);
  if (componentType === 5125) return dataView.getUint32(byteOffset, true);
  if (componentType === 5126) return dataView.getFloat32(byteOffset, true);
  throw new Error(`Unsupported component type: ${componentType}`);
}

function handleLoadError(error) {
  console.error(error);
  const message = error?.name === 'AbortError' ? 'GLB load timed out after 10 seconds.' : error?.message || 'Unknown viewer error';
  loaderOverlay.querySelector('strong').textContent = 'Preview error';
  loaderOverlay.querySelector('p').textContent = message;
  carTitle.textContent = 'Could not load preview';
  carDescription.textContent = message;
  status.textContent = 'Refresh the page after saving, or restart the local server if needed.';
}

function getInitialCarIndex() {
  const value = Number(new URLSearchParams(window.location.search).get('car'));
  if (Number.isInteger(value) && value >= 1 && value <= cars.length) return value - 1;
  return 0;
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  if (wheelsSpinning && carWheels[activeIndex]) {
    updateWheels(delta);
  }

  applySmoothZoom();
  controls.update();
  renderer.render(scene, camera);
}

function updateWheels(delta) {
  let steerInput = 0;
  if (drivingKeys.has('a')) steerInput -= 1;
  if (drivingKeys.has('d')) steerInput += 1;

  const car = cars[activeIndex];
  const steer = steerStates[activeIndex];

  if (car.type === 'bike') {
    updateBikePhysics(steer, steerInput, delta);
    return;
  }

  if (steerInput !== 0) {
    steer.angle = THREE.MathUtils.clamp(
      steer.angle + steerInput * STEER_RATE * delta,
      -STEER_MAX,
      STEER_MAX
    );
  } else if (steer.angle > 0) {
    steer.angle = Math.max(0, steer.angle - STEER_RETURN_RATE * delta);
  } else if (steer.angle < 0) {
    steer.angle = Math.min(0, steer.angle + STEER_RETURN_RATE * delta);
  }

  const TWO_PI = Math.PI * 2;
  const spinStep = wheelSpeed * delta;
  carWheels[activeIndex].forEach((wheel) => {
    wheel.spin = (wheel.spin + spinStep) % TWO_PI;
    const axleVec = wheel.axleVec || X_AXIS;
    const steerVec = wheel.steerVec || STEER_AXIS;
    const steerSign = wheel.steerSign || 1;
    if (wheel.isFront) {
      _steerQuat.setFromAxisAngle(steerVec, steerSign * steer.angle);
      _spinQuat.setFromAxisAngle(axleVec, wheel.spin);
      wheel.mesh.quaternion.copy(_steerQuat).multiply(_spinQuat);
    } else {
      wheel.mesh.quaternion.setFromAxisAngle(axleVec, wheel.spin);
    }
  });
}

// Bike-specific physics:
// - Both tires roll around their own axle (the tire mesh's local Z, since we
//   centred each extracted tire at its axle with axle along Z).
// - Only the FRONT tire steers. Steering is around the vertical (local Y) axis;
//   we ignore the small fork-rake tilt since this is a static viewer.
// - The whole bike LEANS into the turn — that's the key motorcycle behaviour
//   that's different from a car (a car yaws around its own vertical axis,
//   a bike rolls around its forward axis). Lean angle tracks steer direction
//   with smooth easing so it doesn't snap when keys are tapped.
function updateBikePhysics(steer, steerInput, delta) {
  if (steerInput !== 0) {
    steer.angle = THREE.MathUtils.clamp(
      steer.angle + steerInput * STEER_RATE * delta,
      -BIKE_STEER_MAX,
      BIKE_STEER_MAX
    );
  } else if (steer.angle > 0) {
    steer.angle = Math.max(0, steer.angle - STEER_RETURN_RATE * delta);
  } else if (steer.angle < 0) {
    steer.angle = Math.min(0, steer.angle + STEER_RETURN_RATE * delta);
  }

  const targetLean = steer.angle * (BIKE_LEAN_MAX / BIKE_STEER_MAX);
  const leanLerp = 1 - Math.exp(-5 * delta);
  steer.lean = THREE.MathUtils.lerp(steer.lean, targetLean, leanLerp);

  if (bikePivot && bikeLeanAxis) bikePivot.quaternion.setFromAxisAngle(bikeLeanAxis, steer.lean);

  const TWO_PI = Math.PI * 2;
  const spinStep = BIKE_WHEEL_SPEED * delta;
  carWheels[activeIndex].forEach((wheel) => {
    wheel.spin = (wheel.spin + spinStep) % TWO_PI;
    const axleVec = wheel.axleVec || Y_AXIS;
    const steerVec = wheel.steerVec || Z_AXIS;
    if (wheel.isFront) {
      // Negate the steer angle so the wheel turns the same way the bike leans.
      // The model's middle-extent axis (steerVec) points down in its local
      // frame, so a positive steer.angle would yaw the wheel against the lean.
      _steerQuat.setFromAxisAngle(steerVec, -steer.angle);
      _spinQuat.setFromAxisAngle(axleVec, wheel.spin);
      wheel.mesh.quaternion.copy(_steerQuat).multiply(_spinQuat);
    } else {
      wheel.mesh.quaternion.setFromAxisAngle(axleVec, wheel.spin);
    }
  });
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function lighten(color, amount) {
  return shiftColor(color, amount);
}

function darken(color, amount) {
  return shiftColor(color, -amount);
}

function shiftColor(color, amount) {
  const source = new THREE.Color(color);
  source.r = THREE.MathUtils.clamp(source.r + amount, 0, 1);
  source.g = THREE.MathUtils.clamp(source.g + amount, 0, 1);
  source.b = THREE.MathUtils.clamp(source.b + amount, 0, 1);
  return `#${source.getHexString()}`;
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') showCar((activeIndex + 1) % cars.length);
  if (event.key === 'ArrowLeft') showCar((activeIndex + cars.length - 1) % cars.length);
});

animate();
