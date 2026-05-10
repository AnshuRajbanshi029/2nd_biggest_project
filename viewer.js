import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
    title: '2007 Jeep Wrangler Rubicon',
    description: 'Imported Wrangler Rubicon model. All four wheels roll, and the front pair steers when you press A/D.',
    targetSize: 3.8
  },
  {
    type: 'formula',
    title: 'Formula 1 Generico',
    description: 'Open-wheel formula car imported into the showroom. Four tires roll, and the front pair steers when you press A/D.',
    targetSize: 3.6
  },
  {
    type: 'rickshaw',
    title: 'Bajaj Auto Rickshaw',
    description: 'Classic yellow three-wheeler tuk-tuk with full textured cabin and a custom brake-pedal assembly mounted on the handlebar.',
    targetSize: 3.0
  },
  {
    type: 'bmw',
    title: 'AC - BMW 1M',
    description: 'Sketchfab BMW 1M coupe with glossy black paint, transparent glass, textured interior, and four rolling/steering wheels.',
    targetSize: 3.7
  },
  {
    type: 'ferrari',
    title: '2020 Ferrari Roma',
    description: 'Elegant Ferrari Roma coupe with polished grey paint, transparent glass, detailed interior, badges, wheels, and brake calipers.',
    targetSize: 3.8
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
let formulaRoot = null;
let formulaPivot = null;
let rickshawRoot = null;
let rickshawPivot = null;
let bmwRoot = null;
let bmwPivot = null;
let ferrariRoot = null;
let ferrariPivot = null;
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
const formulaProgress = { loaded: 0, total: 0 };
const rickshawProgress = { loaded: 0, total: 0 };
const bmwProgress = { loaded: 0, total: 0 };
const ferrariProgress = { loaded: 0, total: 0 };
function updateProgress() {
  const total = (carsProgress.total || 0) + (bikeProgress.total || 0) + (jeepProgress.total || 0) + (formulaProgress.total || 0) + (rickshawProgress.total || 0) + (bmwProgress.total || 0) + (ferrariProgress.total || 0);
  if (!total) return;
  const loaded = (carsProgress.loaded || 0) + (bikeProgress.loaded || 0) + (jeepProgress.loaded || 0) + (formulaProgress.loaded || 0) + (rickshawProgress.loaded || 0) + (bmwProgress.loaded || 0) + (ferrariProgress.loaded || 0);
  progressBar.style.setProperty('--progress', `${Math.round((loaded / total) * 100)}%`);
}

const loadedStatusText = 'Loaded 3 cars + Yamaha FZ16 + Wrangler Rubicon + Formula 1 + Bajaj Rickshaw + BMW 1M + Ferrari Roma. Hold A/D to steer.';

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
  loadGlbAsThreeScene('./2007_jeep_wrangler_rubicon.glb?v=1', (event) => {
    if (!event.total) return;
    jeepProgress.loaded = event.loaded;
    jeepProgress.total = event.total;
    updateProgress();
  }),
  loadGlbAsThreeScene('./formula_1_generico_2.glb?v=1', (event) => {
    if (!event.total) return;
    formulaProgress.loaded = event.loaded;
    formulaProgress.total = event.total;
    updateProgress();
  }),
  loadGlbAsThreeScene('./rickshaw_with_brake.glb?v=74', (event) => {
    if (!event.total) return;
    rickshawProgress.loaded = event.loaded;
    rickshawProgress.total = event.total;
    updateProgress();
  }),
  loadGlbAsThreeScene('./ac_-_bmw_1m_free (1).glb?v=1', (event) => {
    if (!event.total) return;
    bmwProgress.loaded = event.loaded;
    bmwProgress.total = event.total;
    updateProgress();
  }),
  loadGlbAsThreeScene('./2020_ferrari_roma.glb?v=1', (event) => {
    if (!event.total) return;
    ferrariProgress.loaded = event.loaded;
    ferrariProgress.total = event.total;
    updateProgress();
  })
]).then(([carsGltf, bikeGltf, jeepGltf, formulaGltf, rickshawGltf, bmwGltf, ferrariGltf]) => {
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

    formulaRoot = formulaGltf.scene;
    formulaPivot = new THREE.Group();
    formulaPivot.add(formulaRoot);
    scene.add(formulaPivot);
    applyFormulaMaterials(formulaRoot);

    rickshawRoot = rickshawGltf.scene;
    rickshawPivot = new THREE.Group();
    rickshawPivot.add(rickshawRoot);
    scene.add(rickshawPivot);
    applyRickshawMaterials(rickshawRoot);

    bmwRoot = bmwGltf.scene;
    bmwPivot = new THREE.Group();
    bmwPivot.add(bmwRoot);
    scene.add(bmwPivot);
    applyBmwMaterials(bmwRoot);

    ferrariRoot = ferrariGltf.scene;
    ferrariPivot = new THREE.Group();
    ferrariPivot.add(ferrariRoot);
    scene.add(ferrariPivot);
    applyFerrariMaterials(ferrariRoot);

    // The rickshaw GLB has a chassis pan/skirt that hangs below the tyres
    // and asymmetric front-vs-rear axle heights, so a naive bbox.min.y rest
    // tilts the model. We measure the front and rear contact lines once and
    // cache (1) the tilt angle that levels them and (2) the world-Y line
    // that should sit on the floor afterwards.
    rickshawRoot.position.set(0, 0, 0);
    rickshawRoot.rotation.set(0, 0, 0);
    rickshawRoot.updateMatrixWorld(true);
    rickshawRoot.userData.seating = computeRickshawSeating(rickshawRoot);
    const __s = rickshawRoot.userData.seating;
    console.log('[showroom] rickshaw seat floor (world Y min):', +__s.seatY.toFixed(4),
      '  model height:', +__s.modelHeight.toFixed(4),
      __s.seatY > 0.05 || __s.seatY < -0.05
        ? '  ⚠ wheel plane not at ground — re-run fix_rickshaw_ground_plane.py'
        : '  ✓ wheels grounded');

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
      if (car.type === 'formula') {
        formulaPivot.visible = false;
        return formulaPivot;
      }
      if (car.type === 'rickshaw') {
        rickshawPivot.visible = false;
        return rickshawPivot;
      }
      if (car.type === 'bmw') {
        bmwPivot.visible = false;
        return bmwPivot;
      }
      if (car.type === 'ferrari') {
        ferrariPivot.visible = false;
        return ferrariPivot;
      }
      return null;
    });

    carWheels = carRoots.map((root, index) => {
      const car = cars[index];
      if (!root) return [];
      if (car.type === 'car') return collectCarWheels(root);
      if (car.type === 'bike') return collectBikeWheels(bikeContentRoot);
      if (car.type === 'jeep') return collectJeepWheels(jeepRoot);
      if (car.type === 'formula') return collectFormulaWheels(formulaRoot);
      if (car.type === 'rickshaw') return collectRickshawWheels(rickshawRoot);
      if (car.type === 'bmw') return collectBmwWheels(bmwRoot);
      if (car.type === 'ferrari') return collectFerrariWheels(ferrariRoot);
      return [];
    });

    steerStates = cars.map(() => ({ angle: 0, lean: 0 }));

    showCar(getInitialCarIndex());
    loaderOverlay.classList.add('is-hidden');
    status.textContent = loadedStatusText;

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
        : loadedStatusText;
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

function collectRickshawWheels(root) {
  // The GLB has 3 axle pivots inside Sketchfab_model. Sketchfab_model carries
  // the Z-up→Y-up rotation that Blender bakes during export, which means the
  // pivots' parent has a non-identity world quaternion. To keep wheel spin
  // math trivial and wobble-free, we re-parent each pivot directly to
  // `rickshawRoot` (which has identity rotation throughout the lifetime of
  // the viewer). `Object3D.attach` preserves the world transform, so after
  // re-parenting:
  //   pivot.parent.worldQuaternion ≈ identity
  //   pivot.quaternion             ≈ identity (was identity in world too)
  // and we can simply spin around local +X to get a clean world +X roll.
  const wheelDefs = [
    { name: 'rickshaw_wheel_front',  isFront: true  },
    { name: 'rickshaw_wheel_rear_L', isFront: false },
    { name: 'rickshaw_wheel_rear_R', isFront: false },
  ];
  const wheels = [];
  const frontSteeringParts = ['Object_15.002', 'Object_17.002'];

  if (root.parent) root.parent.updateWorldMatrix(true, false);
  root.updateMatrixWorld(true);

  wheelDefs.forEach((def) => {
    const pivot = root.getObjectByName(def.name);
    if (!pivot) {
      console.warn('[showroom] rickshaw wheel pivot missing:', def.name);
      return;
    }
    let steeringGroup = null;
    if (def.isFront) {
      const steeringWorldPosition = new THREE.Vector3();
      const steeringWorldQuaternion = new THREE.Quaternion();
      const steeringWorldScale = new THREE.Vector3();
      pivot.getWorldPosition(steeringWorldPosition);
      pivot.getWorldQuaternion(steeringWorldQuaternion);
      pivot.getWorldScale(steeringWorldScale);

      steeringGroup = new THREE.Group();
      steeringGroup.name = 'rickshaw_front_steering_yaw';
      root.add(steeringGroup);
      steeringGroup.position.copy(steeringWorldPosition);
      steeringGroup.quaternion.copy(steeringWorldQuaternion);
      steeringGroup.scale.copy(steeringWorldScale);

      root.attach(steeringGroup);
      steeringGroup.updateWorldMatrix(true, false);
      steeringGroup.attach(pivot);

      frontSteeringParts.forEach((partName) => {
        const part = root.getObjectByName(partName);
        if (!part) {
          console.warn('[showroom] rickshaw front steering part missing:', partName);
          return;
        }
        steeringGroup.attach(part);
      });
    } else {
      root.attach(pivot);
    }
    pivot.updateWorldMatrix(true, false);

    wheels.push({
      mesh: pivot,
      steeringGroup,
      isFront: def.isFront,
      spin: 0,
      kind: 'rickshaw',
      axleVec: X_AXIS,
      steerVec: Y_AXIS,
      // Match the car/jeep convention: positive steer.angle turns the front
      // wheel to the driver's right.
      steerSign: -1,
    });
    console.log('[showroom] rickshaw pivot', def.name,
      'attached → quat:', pivot.quaternion.toArray().map((v) => +v.toFixed(4)),
      'pos:', pivot.position.toArray().map((v) => +v.toFixed(3)));
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
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const original = Array.isArray(object.material) ? object.material[0] : object.material;
    if (!original) return;

    const matName = (original.name || '').toLowerCase();
    const baseMap = original.userData?.baseColorTexture || original.map || null;
    const mrMap = original.userData?.metallicRoughnessTexture || null;

    if (matName === 'wrangluz' || matName === 'wrangluz2') {
      object.material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        map: baseMap,
        emissive: matName === 'wrangluz2' ? new THREE.Color(0x3b0904) : new THREE.Color(0x111111),
        emissiveMap: baseMap,
        emissiveIntensity: matName === 'wrangluz2' ? 0.45 : 0.18,
        metalness: 0.02,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        reflectivity: 0.9,
        envMapIntensity: 1.35,
        side: THREE.DoubleSide
      });
      object.castShadow = false;
      return;
    }

    if (matName === 'glass') {
      original.transparent = true;
      original.opacity = 0.35;
      original.depthWrite = false;
      original.side = THREE.DoubleSide;
      original.envMapIntensity = 1.2;
      return;
    }

    if (matName === 'cromo') {
      object.material = new THREE.MeshPhysicalMaterial({
        color: 0xd8dde3,
        map: baseMap,
        metalness: 0.35,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        reflectivity: 1,
        envMapIntensity: 1.8,
        side: THREE.DoubleSide
      });
      return;
    }

    original.metalnessMap = mrMap;
    original.roughnessMap = mrMap;
    original.side = THREE.DoubleSide;
    original.envMapIntensity = 0.8;
  });
}

function computeRickshawSeating(root) {
  // The rickshaw GLB was re-exported from Blender with its wheel plane
  // already levelled at Z = 0 (see fix_rickshaw_ground_plane.py). Seating
  // here is therefore trivial: the overall world-Y minimum IS the tyre
  // contact line. We still do a quick sanity sweep so the console reveals
  // whether the exported GLB is the "fixed" one (min ≈ 0) or a stale copy
  // (min significantly non-zero).
  root.updateMatrixWorld(true);
  const tempV = new THREE.Vector3();
  let minY = Infinity;
  let maxY = -Infinity;

  root.traverse((object) => {
    if (!object.isMesh || !object.geometry) return;
    const pos = object.geometry.attributes.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i += 1) {
      tempV.fromBufferAttribute(pos, i).applyMatrix4(object.matrixWorld);
      if (tempV.y < minY) minY = tempV.y;
      if (tempV.y > maxY) maxY = tempV.y;
    }
  });

  return { seatY: minY, modelHeight: maxY - minY };
}

function applyRickshawMaterials(root) {
  // The Bajaj rickshaw GLB ships with full Sketchfab PBR textures (yellow body
  // panels, black roof, blue cabin upholstery, tire treads) plus the
  // hand-built brake pipe / pedal materials we authored in Blender. We only
  // need to enable shadows + give the standard materials a sensible env-map
  // intensity so the showroom lighting reflects nicely off the painted body.
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    if (!material) return;
    const materialName = (material.name || '').toLowerCase();
    const objectName = (object.name || '').toLowerCase();

    if (materialName.includes('glass') || objectName.startsWith('object_23')) {
      const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xbfd8ff,
        transparent: true,
        opacity: 0.22,
        transmission: 0.65,
        thickness: 0.035,
        ior: 1.45,
        roughness: 0.04,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        reflectivity: 0.9,
        envMapIntensity: 1.8,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      glassMaterial.name = `${material.name || object.name}_realistic_transparent`;
      object.material = glassMaterial;
      object.castShadow = false;
      return;
    }

    material.side = THREE.DoubleSide;
    material.envMapIntensity = 1.0;
  });
}

function applyBmwMaterials(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;

    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    if (!material) return;

    const materialName = (material.name || '').toLowerCase();
    const objectName = (object.name || '').toLowerCase();
    const key = `${materialName} ${objectName}`;

    material.side = THREE.DoubleSide;
    material.envMapIntensity = 1.15;

    if (key.includes('livrea')) {
      object.material = new THREE.MeshPhysicalMaterial({
        name: `${material.name || object.name}_clean_clearcoat`,
        color: material.color?.clone() || new THREE.Color(0x080a0a),
        metalness: 0.05,
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        reflectivity: 0.9,
        envMapIntensity: 2.1,
        side: THREE.DoubleSide
      });
      return;
    }

    if (key.includes('vetri') || key.includes('glass')) {
      material.transparent = true;
      material.opacity = key.includes('nero') ? 0.42 : 0.28;
      material.depthWrite = false;
      material.metalness = 0;
      material.roughness = 0.03;
      material.envMapIntensity = 2.0;
      return;
    }

    if (key.includes('mirror')) {
      material.metalness = 0.15;
      material.roughness = 0.02;
      material.envMapIntensity = 2.4;
      return;
    }

    if (key.includes('fanali') || key.includes('fari') || key.includes('faro') || key.includes('light')) {
      const emissiveColor = key.includes('posteriori') || key.includes('rear') || key.includes('brake')
        ? 0xff2818
        : 0xdbeafe;
      material.emissive = new THREE.Color(emissiveColor);
      material.emissiveIntensity = key.includes('posteriori') || key.includes('rear') || key.includes('brake') ? 0.45 : 0.22;
      material.roughness = Math.min(material.roughness ?? 0.2, 0.18);
      material.envMapIntensity = 1.7;
      object.castShadow = false;
      return;
    }

    if (key.includes('rim') || key.includes('cromato') || key.includes('metal')) {
      material.metalness = Math.max(material.metalness ?? 0, 0.25);
      material.roughness = Math.min(material.roughness ?? 0.25, 0.28);
      material.envMapIntensity = 1.8;
    }
  });
}

function applyFerrariMaterials(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;

    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    if (!material) return;

    const materialName = (material.name || '').toLowerCase();
    const objectName = (object.name || '').toLowerCase();
    const key = `${materialName} ${objectName}`;

    material.side = THREE.DoubleSide;
    material.envMapIntensity = 1.15;

    if (key.includes('badge')) {
      material.color = new THREE.Color(0xd6d8dc);
      material.metalness = 0.08;
      material.roughness = 0.42;
      material.envMapIntensity = 0.55;
      material.emissive = new THREE.Color(0x18191b);
      material.emissiveIntensity = 0.16;
      object.castShadow = false;
      object.receiveShadow = false;
      return;
    }

    if (key.includes('manufacturerplate')) {
      material.metalness = 0.02;
      material.roughness = 0.5;
      material.envMapIntensity = 0.45;
      object.castShadow = false;
      return;
    }

    if (key.includes('paint')) {
      object.material = new THREE.MeshPhysicalMaterial({
        name: `${material.name || object.name}_showroom_clearcoat`,
        color: material.color?.clone() || new THREE.Color(0x4b5050),
        metalness: 0.12,
        roughness: 0.16,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        reflectivity: 0.95,
        envMapIntensity: 2.2,
        side: THREE.DoubleSide
      });
      return;
    }

    if (key.includes('window') || key.includes('glass')) {
      material.transparent = true;
      material.opacity = key.includes('red_glass') ? 0.38 : 0.3;
      material.depthWrite = false;
      material.metalness = 0;
      material.roughness = 0.02;
      material.envMapIntensity = 2.0;
      return;
    }

    if (key.includes('light')) {
      material.emissive = new THREE.Color(0xe8f3ff);
      material.emissiveIntensity = 0.2;
      material.roughness = Math.min(material.roughness ?? 0.2, 0.18);
      material.envMapIntensity = 1.7;
      object.castShadow = false;
      return;
    }

    if (key.includes('calliper')) {
      material.roughness = 0.3;
      material.envMapIntensity = 1.3;
      return;
    }

    if (key.includes('wheel') || key.includes('chrome')) {
      material.metalness = Math.max(material.metalness ?? 0, 0.25);
      material.roughness = Math.min(material.roughness ?? 0.4, 0.35);
      material.envMapIntensity = 1.45;
    }
  });
}

function applyFormulaMaterials(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    if (!material) return;
    material.side = THREE.DoubleSide;
    material.envMapIntensity = 1.0;
    material.roughness = Math.min(material.roughness ?? 0.45, 0.48);
    if ((material.name || '').toLowerCase() === 'material_1') {
      material.metalness = 0.18;
      material.roughness = 0.34;
    }
  });
}

function collectFormulaWheels(formulaContent) {
  const indexedMeshes = [];
  formulaContent.traverse((object) => {
    if (object.isMesh && object.geometry?.index) indexedMeshes.push(object);
  });

  const candidates = [];
  const componentCache = new Map();
  indexedMeshes.forEach((mesh) => {
    const materialName = (mesh.material?.name || '').toLowerCase();
    if (materialName !== 'material_3' && materialName !== 'material_4') return;
    const comps = findConnectedComponents(mesh.geometry);
    componentCache.set(mesh, comps);
    if (materialName !== 'material_4') return;
    comps.forEach((comp) => {
      if (comp.verts.length < 700) return;
      const sorted = [comp.sizeX, comp.sizeY, comp.sizeZ].sort((a, b) => a - b);
      const isDisc = sorted[0] / sorted[2] > 0.3
        && sorted[0] / sorted[2] < 0.72
        && sorted[1] / sorted[2] > 0.85
        && sorted[2] > 0.2;
      if (!isDisc) return;
      candidates.push({ mesh, comp, radius: sorted[2] / 2 });
    });
  });

  candidates.sort((a, b) => b.comp.verts.length - a.comp.verts.length);
  const tireCandidates = candidates.slice(0, 4);
  if (tireCandidates.length !== 4) {
    console.warn('[formula] expected 4 tires, found', tireCandidates.length);
    return [];
  }

  const splitX = tireCandidates.reduce((sum, item) => sum + item.comp.cx, 0) / tireCandidates.length;
  const componentsByMesh = new Map();
  const wheels = tireCandidates.map(({ mesh, comp, radius }) => {
    const meshComponents = componentsByMesh.get(mesh) || [];
    meshComponents.push(comp.vertSet);
    componentsByMesh.set(mesh, meshComponents);

    const pivot = new THREE.Group();
    // The Formula GLB's authored X axis is opposite the visible nose direction
    // after its Sketchfab root matrix is applied in the showroom.
    const isFront = comp.cx < splitX;
    pivot.name = `FormulaWheel_${isFront ? 'Front' : 'Rear'}_${comp.cy > 0 ? 'Left' : 'Right'}`;
    pivot.position.set(comp.cx, comp.cy, comp.cz);
    mesh.parent.add(pivot);

    const tireMesh = extractComponentToPivotedMesh(mesh, comp, comp.cx, comp.cy, comp.cz);
    tireMesh.name = `${pivot.name}_tire`;
    pivot.add(tireMesh);

    return {
      mesh: pivot,
      tireComp: comp,
      isFront,
      spin: 0,
      kind: 'formula',
      axleVec: Y_AXIS,
      steerVec: Z_AXIS,
      steerSign: -1,
      radius,
      axleHalfWidth: comp.sizeY * 0.5,
      partsCount: 1
    };
  });

  // The Formula GLB stores each tire as many separate pieces: rubber shell,
  // sidewall lettering, rim, spokes, hub, brake details. Move every component
  // that sits inside a wheel disc into that wheel's pivot so it all spins as
  // one wheel instead of only the black rubber rotating.
  indexedMeshes.forEach((mesh) => {
    const materialName = (mesh.material?.name || '').toLowerCase();
    if (materialName !== 'material_3' && materialName !== 'material_4') return;
    const comps = componentCache.get(mesh) || [];
    const matched = [];

    comps.forEach((comp) => {
      if (wheels.some((wheel) => wheel.tireComp === comp)) return;
      if (comp.verts.length < 3) return;

      let bestWheel = null;
      let bestScore = Infinity;
      wheels.forEach((wheel) => {
        const tire = wheel.tireComp;
        const discDistance = Math.hypot(comp.cx - tire.cx, comp.cz - tire.cz);
        const inPlaneHalf = 0.5 * Math.max(comp.sizeX, comp.sizeZ);
        const axleDistance = Math.abs(comp.cy - tire.cy);
        const compMax = Math.max(comp.sizeX, comp.sizeY, comp.sizeZ);

        if (discDistance > wheel.radius * 1.35) return;
        if (discDistance + inPlaneHalf > wheel.radius * 1.7) return;
        if (axleDistance > wheel.axleHalfWidth * 1.6 + 0.03) return;
        if (compMax > wheel.radius * 2.8) return;

        const score = discDistance + axleDistance * 0.35;
        if (score < bestScore) {
          bestWheel = wheel;
          bestScore = score;
        }
      });

      if (bestWheel) matched.push({ comp, wheel: bestWheel });
    });

    matched.forEach(({ comp, wheel }) => {
      const tire = wheel.tireComp;
      const part = extractComponentToPivotedMesh(mesh, comp, tire.cx, tire.cy, tire.cz);
      part.name = `${wheel.mesh.name}_${mesh.material?.name || mesh.name || 'part'}`;
      wheel.mesh.add(part);
      wheel.partsCount += 1;
      const meshComponents = componentsByMesh.get(mesh) || [];
      meshComponents.push(comp.vertSet);
      componentsByMesh.set(mesh, meshComponents);
    });
  });

  componentsByMesh.forEach((components, mesh) => removeFacesByVerts(mesh, components));

  console.log('[formula] wheels:', wheels.map((w) => ({
    name: w.mesh.name,
    isFront: w.isFront,
    parts: w.partsCount,
    pos: w.mesh.position.toArray().map((n) => +n.toFixed(3))
  })));
  return wheels;
}

function collectBmwWheels(bmwContent) {
  const wheelGroups = [];
  bmwContent.traverse((object) => {
    if (object.isMesh) return;
    if (/^WHEEL_(LF|RF|LR|RR)$/i.test(object.name || '')) wheelGroups.push(object);
  });

  if (wheelGroups.length !== 4) {
    console.warn('[bmw] expected 4 wheel groups, found', wheelGroups.length, wheelGroups.map((g) => g.name));
    return [];
  }

  const splitZ = wheelGroups.reduce((sum, group) => sum + group.position.z, 0) / wheelGroups.length;
  const wheels = wheelGroups.map((group) => ({
    mesh: group,
    isFront: group.position.z > splitZ,
    spin: 0,
    kind: 'bmw',
    axleVec: X_AXIS,
    steerVec: Y_AXIS,
    steerSign: -1,
    baseQuat: group.quaternion.clone()
  }));

  console.log('[bmw] wheels:', wheels.map((w) => ({
    name: w.mesh.name,
    isFront: w.isFront,
    pos: w.mesh.position.toArray().map((n) => +n.toFixed(2))
  })));
  return wheels;
}

function collectFerrariWheels(ferrariContent) {
  const combinedWheel = ferrariContent.getObjectByName('Combined3DWheel_3DWheel_Front_L Instance1_Src4');
  if (!combinedWheel) {
    console.warn('[ferrari] combined wheel hierarchy missing');
    return [];
  }

  ferrariContent.updateMatrixWorld(true);
  const wheelMeshes = [];
  const box = new THREE.Box3();
  const center = new THREE.Vector3();

  combinedWheel.traverse((object) => {
    if (!object.isMesh || !object.geometry) return;
    box.setFromObject(object);
    if (box.isEmpty()) return;
    box.getCenter(center);
    wheelMeshes.push({ object, center: center.clone(), box: box.clone() });
  });

  if (wheelMeshes.length < 4) {
    console.warn('[ferrari] not enough wheel meshes to create pivots:', wheelMeshes.length);
    return [];
  }

  const splitX = wheelMeshes.reduce((sum, item) => sum + item.center.x, 0) / wheelMeshes.length;
  const splitZ = wheelMeshes.reduce((sum, item) => sum + item.center.z, 0) / wheelMeshes.length;
  const clusters = new Map([
    ['FL', []],
    ['FR', []],
    ['RL', []],
    ['RR', []]
  ]);

  wheelMeshes.forEach((item) => {
    const front = item.center.z > splitZ;
    const left = item.center.x > splitX;
    clusters.get(`${front ? 'F' : 'R'}${left ? 'L' : 'R'}`).push(item);
  });

  const parent = combinedWheel.parent || ferrariContent;
  const wheels = [];
  const tempCenter = new THREE.Vector3();
  const parentLocal = new THREE.Vector3();

  clusters.forEach((items, key) => {
    if (!items.length) return;

    const clusterBox = new THREE.Box3();
    items.forEach((item) => clusterBox.union(item.box));
    clusterBox.getCenter(tempCenter);

    const pivot = new THREE.Group();
    pivot.name = `FerrariWheel_${key}`;
    parent.add(pivot);
    parentLocal.copy(tempCenter);
    parent.worldToLocal(parentLocal);
    pivot.position.copy(parentLocal);
    pivot.updateMatrixWorld(true);

    items.forEach(({ object }) => {
      pivot.attach(object);
    });

    wheels.push({
      mesh: pivot,
      isFront: key.startsWith('F'),
      spin: 0,
      kind: 'ferrari',
      axleVec: X_AXIS,
      steerVec: Y_AXIS,
      steerSign: -1,
      baseQuat: pivot.quaternion.clone(),
      partsCount: items.length
    });
  });

  console.log('[ferrari] wheels:', wheels.map((w) => ({
    name: w.mesh.name,
    isFront: w.isFront,
    parts: w.partsCount,
    pos: w.mesh.position.toArray().map((n) => +n.toFixed(3))
  })));
  return wheels;
}

function collectJeepWheels(jeepContent) {
  const wranglerWheels = collectWranglerWheelGroups(jeepContent);
  if (wranglerWheels.length === 4) return wranglerWheels;

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

function collectWranglerWheelGroups(jeepContent) {
  const wheelGroups = [];
  jeepContent.traverse((object) => {
    if (object.isMesh) return;
    if (/^wrangwheel\d+$/i.test(object.name || '')) wheelGroups.push(object);
  });

  if (wheelGroups.length !== 4) return [];

  const wheelData = wheelGroups.map((group) => {
    const box = getGroupLocalBox(group);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return { group, center };
  });
  const rearZ = wheelData.reduce((sum, item) => sum + item.center.z, 0) / wheelData.length;

  const wheels = wheelData.map(({ group, center }) => {
    const pivot = new THREE.Group();
    pivot.name = `JeepWheel_${group.name}`;
    pivot.position.copy(center);

    const children = [...group.children];
    group.add(pivot);
    for (const child of children) {
      child.traverse((object) => {
        if (!object.isMesh || !object.geometry) return;
        object.geometry.translate(-center.x, -center.y, -center.z);
        object.geometry.computeBoundingBox();
        object.geometry.computeBoundingSphere();
      });
      pivot.add(child);
    }

    return {
      mesh: pivot,
      // In this Wrangler GLB, the front axle sits on the positive side of the
      // wheel-group local Z split after the Sketchfab root transform is applied.
      isFront: center.z > rearZ,
      spin: 0,
      kind: 'jeep',
      axleVec: X_AXIS,
      steerVec: Y_AXIS,
      steerSign: -1
    };
  });

  console.log('[wrangler] wheels:', wheels.map((w) => ({
    name: w.mesh.name,
    isFront: w.isFront,
    pos: w.mesh.position.toArray().map((n) => +n.toFixed(2))
  })));
  return wheels;
}

function getGroupLocalBox(group) {
  const box = new THREE.Box3();
  const localMatrix = new THREE.Matrix4();

  group.updateMatrixWorld(true);
  const inverseGroupWorld = new THREE.Matrix4().copy(group.matrixWorld).invert();
  group.traverse((object) => {
    if (!object.isMesh || !object.geometry) return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    localMatrix.multiplyMatrices(inverseGroupWorld, object.matrixWorld);
    box.union(object.geometry.boundingBox.clone().applyMatrix4(localMatrix));
  });

  return box;
}

function setVisibleBoxFromObject(targetBox, root) {
  targetBox.makeEmpty();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (object.visible === false || !object.isMesh || !object.geometry) return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    targetBox.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  if (targetBox.isEmpty()) targetBox.setFromObject(root);
  return targetBox;
}

function collectBikeWheels(bikeContent, options = {}) {
  const tireMaterialName = options.tireMaterialName || 'Rubber';
  const logPrefix = options.logPrefix || 'bike';
  const frontSortDirection = options.frontSortDirection || 'desc';
  const skipWheelPartMaterialNames = options.skipWheelPartMaterialNames || [];
  const shouldSkipWheelPart = options.shouldSkipWheelPart || null;
  const bikeSteerSign = options.bikeSteerSign || -1;
  // Gather every indexed mesh in the bike — we may pull wheel parts out of any of them.
  const allMeshes = [];
  bikeContent.traverse((object) => {
    if (object.visible !== false && object.isMesh && object.geometry?.index) allMeshes.push(object);
  });

  const rubberMesh = allMeshes.find((m) => m.material?.name === tireMaterialName);
  if (!rubberMesh) {
    console.warn(`[${logPrefix}] tire mesh not found:`, tireMaterialName);
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
  console.log(`[${logPrefix}] axes - axle:${axleInfo.name} steer:${steerInfo.name} forward:${forwardInfo.name}`);

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
    console.warn(`[${logPrefix}] Could not isolate 2 tires (found`, tires.length, 'candidates)');
    return [];
  }
  // Front first along the bike's forward axis. Some GLBs are authored with
  // their forward coordinate reversed, so callers can flip this per asset.
  tires.sort((a, b) => (
    frontSortDirection === 'asc'
      ? a[forwardKey] - b[forwardKey]
      : b[forwardKey] - a[forwardKey]
  ));

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
      bikeSteerSign,
      partsCount: 1
    };
  });
  removeFacesByVerts(rubberMesh, tires.map((c) => c.vertSet));

  // Step 3: scan every other mesh for components that live inside a wheel disc
  // (rim, spokes, brake disc, hub). Match by 2D distance in the wheel-face plane
  // (forward × steer axes — the plane perpendicular to the axle).
  const otherMeshes = allMeshes.filter((m) => m !== rubberMesh);
  for (const mesh of otherMeshes) {
    const meshMaterialName = (mesh.material?.name || '').toLowerCase();
    if (skipWheelPartMaterialNames.some((name) => meshMaterialName.includes(name))) continue;
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
        if (shouldSkipWheelPart?.({ materialName: meshMaterialName, comp, wheel, tire: t, forwardKey, steerKey, axleKey })) continue;
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
  console.log(`[${logPrefix}] tread-block pass: ${treadMatched.length} components moved into wheel pivots`);

  for (const w of wheels) {
      console.log(`[${logPrefix}] ${w.mesh.name} children (${w.mesh.children.length}):`,
        w.mesh.children.map((c) => {
          const g = c.geometry;
          if (!g) return c.name;
          g.computeBoundingBox();
          const s = new THREE.Vector3();
          g.boundingBox.getSize(s);
          return `${c.name} ext=${s.x.toFixed(0)}x${s.y.toFixed(0)}x${s.z.toFixed(0)}`;
        }));
    }
  console.log(`[${logPrefix}] Wheel pivots:`, wheels.map((w) => ({
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
    if (formulaPivot) formulaPivot.visible = false;
    if (rickshawPivot) rickshawPivot.visible = false;
    if (bmwPivot) bmwPivot.visible = false;
    if (ferrariPivot) ferrariPivot.visible = false;

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
    if (formulaPivot) formulaPivot.visible = false;
    if (rickshawPivot) rickshawPivot.visible = false;
    if (bmwPivot) bmwPivot.visible = false;
    if (ferrariPivot) ferrariPivot.visible = false;
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
    if (formulaPivot) formulaPivot.visible = false;
    if (rickshawPivot) rickshawPivot.visible = false;
    if (bmwPivot) bmwPivot.visible = false;
    if (ferrariPivot) ferrariPivot.visible = false;
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
  } else if (car.type === 'formula') {
    if (modelRoot) modelRoot.visible = false;
    if (bikePivot) bikePivot.visible = false;
    if (jeepPivot) jeepPivot.visible = false;
    if (rickshawPivot) rickshawPivot.visible = false;
    if (bmwPivot) bmwPivot.visible = false;
    if (ferrariPivot) ferrariPivot.visible = false;
    formulaPivot.visible = true;

    formulaPivot.position.set(0, 0, 0);
    formulaPivot.scale.setScalar(1);
    formulaPivot.quaternion.identity();
    formulaRoot.position.set(0, 0, 0);
    // The Formula GLB already ships with a Sketchfab root matrix that converts
    // its OBJ-style axes into the viewer's Y-up space. Adding another X-axis
    // correction rolls it onto its side.
    formulaRoot.rotation.set(0, 0, 0);
    formulaRoot.updateMatrixWorld(true);

    reusableBox.setFromObject(formulaRoot);
    reusableBox.getSize(reusableSize);
    reusableBox.getCenter(reusableCenter);

    const maxAxis = Math.max(reusableSize.x, reusableSize.y, reusableSize.z) || 1;
    const scale = targetSize / maxAxis;
    formulaPivot.scale.setScalar(scale);
    formulaPivot.position.set(
      -reusableCenter.x * scale,
      -reusableBox.min.y * scale + 0.05,
      -reusableCenter.z * scale
    );
    if (steerStates[index]) steerStates[index].angle = 0;
  } else if (car.type === 'rickshaw') {
    if (modelRoot) modelRoot.visible = false;
    if (bikePivot) bikePivot.visible = false;
    if (jeepPivot) jeepPivot.visible = false;
    if (formulaPivot) formulaPivot.visible = false;
    if (bmwPivot) bmwPivot.visible = false;
    if (ferrariPivot) ferrariPivot.visible = false;
    rickshawPivot.visible = true;

    // The GLB was pre-levelled in Blender (fix_rickshaw_ground_plane.py), so
    // we no longer need any runtime tilt. Just centre horizontally and seat
    // the world bbox on the grid.
    rickshawRoot.position.set(0, 0, 0);
    rickshawRoot.rotation.set(0, 0, 0);
    rickshawPivot.position.set(0, 0, 0);
    rickshawPivot.scale.setScalar(1);
    rickshawPivot.quaternion.identity();
    rickshawRoot.updateMatrixWorld(true);
    rickshawPivot.updateMatrixWorld(true);

    reusableBox.setFromObject(rickshawRoot);
    reusableBox.getSize(reusableSize);
    reusableBox.getCenter(reusableCenter);

    const maxAxis = Math.max(reusableSize.x, reusableSize.y, reusableSize.z) || 1;
    const scale = targetSize / maxAxis;
    rickshawPivot.scale.setScalar(scale);
    rickshawPivot.position.set(
      -reusableCenter.x * scale,
      -reusableBox.min.y * scale,
      -reusableCenter.z * scale
    );
    if (steerStates[index]) steerStates[index].angle = 0;
  } else if (car.type === 'bmw') {
    if (modelRoot) modelRoot.visible = false;
    if (bikePivot) bikePivot.visible = false;
    if (jeepPivot) jeepPivot.visible = false;
    if (formulaPivot) formulaPivot.visible = false;
    if (rickshawPivot) rickshawPivot.visible = false;
    if (ferrariPivot) ferrariPivot.visible = false;
    bmwPivot.visible = true;

    bmwPivot.position.set(0, 0, 0);
    bmwPivot.scale.setScalar(1);
    bmwPivot.quaternion.identity();
    bmwRoot.position.set(0, 0, 0);
    bmwRoot.rotation.set(0, 0, 0);
    bmwRoot.updateMatrixWorld(true);
    bmwPivot.updateMatrixWorld(true);

    reusableBox.setFromObject(bmwRoot);
    reusableBox.getSize(reusableSize);
    reusableBox.getCenter(reusableCenter);

    const maxAxis = Math.max(reusableSize.x, reusableSize.y, reusableSize.z) || 1;
    const scale = targetSize / maxAxis;
    bmwPivot.scale.setScalar(scale);
    bmwPivot.position.set(
      -reusableCenter.x * scale,
      -reusableBox.min.y * scale + 0.05,
      -reusableCenter.z * scale
    );
    if (steerStates[index]) steerStates[index].angle = 0;
  } else if (car.type === 'ferrari') {
    if (modelRoot) modelRoot.visible = false;
    if (bikePivot) bikePivot.visible = false;
    if (jeepPivot) jeepPivot.visible = false;
    if (formulaPivot) formulaPivot.visible = false;
    if (rickshawPivot) rickshawPivot.visible = false;
    if (bmwPivot) bmwPivot.visible = false;
    ferrariPivot.visible = true;

    ferrariPivot.position.set(0, 0, 0);
    ferrariPivot.scale.setScalar(1);
    ferrariPivot.quaternion.identity();
    ferrariRoot.position.set(0, 0, 0);
    ferrariRoot.rotation.set(0, 0, 0);
    ferrariRoot.updateMatrixWorld(true);
    ferrariPivot.updateMatrixWorld(true);

    reusableBox.setFromObject(ferrariRoot);
    reusableBox.getSize(reusableSize);
    reusableBox.getCenter(reusableCenter);

    const maxAxis = Math.max(reusableSize.x, reusableSize.y, reusableSize.z) || 1;
    const scale = targetSize / maxAxis;
    ferrariPivot.scale.setScalar(scale);
    ferrariPivot.position.set(
      -reusableCenter.x * scale,
      -reusableBox.min.y * scale + 0.05,
      -reusableCenter.z * scale
    );
    if (steerStates[index]) steerStates[index].angle = 0;
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
  const timeout = window.setTimeout(() => controller.abort(), 20000);

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
  // them that way.
  const bitmap = await createImageBitmap(blob);
  const texture = new THREE.CanvasTexture(bitmap);
  texture.colorSpace = THREE.NoColorSpace;
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

function cloneTextureForMap(texture, colorSpace = THREE.NoColorSpace) {
  if (!texture) return null;
  const clone = texture.clone();
  clone.colorSpace = colorSpace;
  clone.needsUpdate = true;
  return clone;
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
  const baseColorTexture = pbr.baseColorTexture ? cloneTextureForMap(textures[pbr.baseColorTexture.index], THREE.SRGBColorSpace) : null;
  const metallicRoughnessTexture = pbr.metallicRoughnessTexture ? cloneTextureForMap(textures[pbr.metallicRoughnessTexture.index]) : null;
  const normalTexture = materialDefinition?.normalTexture ? cloneTextureForMap(textures[materialDefinition.normalTexture.index]) : null;
  const emissiveTexture = materialDefinition?.emissiveTexture ? cloneTextureForMap(textures[materialDefinition.emissiveTexture.index], THREE.SRGBColorSpace) : null;
  const baseColorFactor = pbr.baseColorFactor || [1, 1, 1, 1];
  const baseColor = new THREE.Color(baseColorFactor[0], baseColorFactor[1], baseColorFactor[2]);
  const alphaMode = materialDefinition?.alphaMode || 'OPAQUE';
  const transparent = alphaMode === 'BLEND' || baseColorFactor[3] < 1;
  const emissiveFactor = materialDefinition?.emissiveFactor || [0, 0, 0];

  const material = new THREE.MeshStandardMaterial({
    color: baseColor,
    map: baseColorTexture,
    metalnessMap: metallicRoughnessTexture,
    roughnessMap: metallicRoughnessTexture,
    normalMap: normalTexture,
    emissiveMap: emissiveTexture,
    emissive: new THREE.Color(emissiveFactor[0], emissiveFactor[1], emissiveFactor[2]),
    metalness: pbr.metallicFactor !== undefined ? pbr.metallicFactor : 1,
    roughness: pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : 1,
    opacity: baseColorFactor[3] ?? 1,
    transparent,
    depthWrite: !transparent,
    alphaTest: alphaMode === 'MASK' ? materialDefinition.alphaCutoff ?? 0.5 : 0,
    side: materialDefinition?.doubleSided ? THREE.DoubleSide : THREE.FrontSide
  });
  if (materialDefinition?.normalTexture?.scale !== undefined) {
    material.normalScale.setScalar(materialDefinition.normalTexture.scale);
  }
  material.name = materialDefinition?.name || '';
  material.userData.baseColorTexture = baseColorTexture;
  material.userData.metallicRoughnessTexture = metallicRoughnessTexture;
  material.userData.normalTexture = normalTexture;
  material.userData.materialDefinition = materialDefinition || null;

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
    updateBikePhysics(steer, steerInput, delta, car.type);
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
    const steerSign = wheel.steerSign || 1;

    if (wheel.kind === 'rickshaw') {
      // Pivot was re-parented to rickshawRoot (identity world rotation), so
      // local +X = world +X and local +Y = world +Y. Pure local quaternion
      // composition gives a clean roll + steer with zero parent compensation.
      _spinQuat.setFromAxisAngle(X_AXIS, wheel.spin);
      if (wheel.isFront) {
        _steerQuat.setFromAxisAngle(Y_AXIS, steerSign * steer.angle);
        if (wheel.steeringGroup) wheel.steeringGroup.quaternion.copy(_steerQuat);
        wheel.mesh.quaternion.copy(_spinQuat);
      } else {
        wheel.mesh.quaternion.copy(_spinQuat);
      }
      return;
    }

    const axleVec = wheel.axleVec || X_AXIS;
    const steerVec = wheel.steerVec || STEER_AXIS;
    const baseQuat = wheel.baseQuat || null;
    if (wheel.isFront) {
      _steerQuat.setFromAxisAngle(steerVec, steerSign * steer.angle);
      _spinQuat.setFromAxisAngle(axleVec, wheel.spin);
      if (baseQuat) {
        wheel.mesh.quaternion.copy(baseQuat).multiply(_steerQuat).multiply(_spinQuat);
      } else {
        wheel.mesh.quaternion.copy(_steerQuat).multiply(_spinQuat);
      }
    } else {
      _spinQuat.setFromAxisAngle(axleVec, wheel.spin);
      if (baseQuat) {
        wheel.mesh.quaternion.copy(baseQuat).multiply(_spinQuat);
      } else {
        wheel.mesh.quaternion.copy(_spinQuat);
      }
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
function updateBikePhysics(steer, steerInput, delta, bikeType = 'bike') {
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

  const activePivot = bikePivot;
  const activeLeanAxis = bikeLeanAxis;
  if (activePivot && activeLeanAxis) {
    activePivot.quaternion.setFromAxisAngle(activeLeanAxis, steer.lean);
  }

  const TWO_PI = Math.PI * 2;
  const spinStep = BIKE_WHEEL_SPEED * delta;
  carWheels[activeIndex].forEach((wheel) => {
    wheel.spin = (wheel.spin + spinStep) % TWO_PI;
    const axleVec = wheel.axleVec || Y_AXIS;
    const steerVec = wheel.steerVec || Z_AXIS;
    if (wheel.isFront) {
      _steerQuat.setFromAxisAngle(steerVec, (wheel.bikeSteerSign || -1) * steer.angle);
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
  return '#' + source.getHexString();
}

window.addEventListener('resize', resize);
animate();