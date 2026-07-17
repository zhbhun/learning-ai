import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

// 所有天体共享同一种数据结构；动画与建模逻辑不会因行星而复制。
const CELESTIAL_BODIES = [
  {
    id: 'sun',
    name: '太阳',
    englishName: 'SUN',
    relativeRadius: 4.6,
    orbitRadius: 0,
    orbitPeriodDays: 0,
    rotationPeriodHours: 609.1,
    axialTilt: 7.25,
    radiusKm: 696340,
    distanceLabel: '系统中心',
    colors: ['#ff8a22', '#ffd06a', '#fff3bd'],
    textureStyle: 'star',
    description: '太阳系的恒星，凭借炽热核心释放的能量照亮并维系整个行星系统。',
  },
  {
    id: 'mercury',
    name: '水星',
    englishName: 'MERCURY',
    relativeRadius: 0.56,
    orbitRadius: 8.2,
    orbitPeriodDays: 88,
    rotationPeriodHours: 1407.6,
    axialTilt: 0.03,
    radiusKm: 2440,
    distanceLabel: '0.39 AU',
    colors: ['#625c57', '#a79d91', '#d7c9b8'],
    textureStyle: 'rocky',
    description: '距离太阳最近、运行最快的行星。它昼夜温差极大，表面遍布古老撞击坑。',
  },
  {
    id: 'venus',
    name: '金星',
    englishName: 'VENUS',
    relativeRadius: 0.92,
    orbitRadius: 11.4,
    orbitPeriodDays: 224.7,
    rotationPeriodHours: -5832.5,
    axialTilt: 177.4,
    radiusKm: 6052,
    distanceLabel: '0.72 AU',
    colors: ['#9b5e28', '#dda34c', '#ffe09b'],
    textureStyle: 'cloudy',
    description: '被浓厚云层包裹的炽热世界，也是太阳系中自转方向与多数行星相反的行星。',
  },
  {
    id: 'earth',
    name: '地球',
    englishName: 'EARTH',
    relativeRadius: 1,
    orbitRadius: 15.2,
    orbitPeriodDays: 365.25,
    rotationPeriodHours: 23.93,
    axialTilt: 23.44,
    radiusKm: 6371,
    distanceLabel: '1.00 AU',
    colors: ['#123f74', '#2d8dc5', '#d9f2ff'],
    textureStyle: 'earth',
    description: '一颗拥有液态海洋与活跃生命圈的岩石行星，月球沿其局部坐标轨道运行。',
  },
  {
    id: 'moon',
    parentId: 'earth',
    name: '月球',
    englishName: 'MOON',
    relativeRadius: 0.28,
    orbitRadius: 2.05,
    orbitPeriodDays: 27.32,
    rotationPeriodHours: 655.7,
    axialTilt: 6.68,
    radiusKm: 1737,
    distanceLabel: '38.44 万 km',
    colors: ['#5f6267', '#a8aaad', '#e0dfdb'],
    textureStyle: 'rocky',
    description: '地球唯一的天然卫星，自转周期与公转周期同步，因此总以同一面朝向地球。',
  },
  {
    id: 'mars',
    name: '火星',
    englishName: 'MARS',
    relativeRadius: 0.72,
    orbitRadius: 19.8,
    orbitPeriodDays: 687,
    rotationPeriodHours: 24.62,
    axialTilt: 25.19,
    radiusKm: 3390,
    distanceLabel: '1.52 AU',
    colors: ['#6e2719', '#b34a27', '#e28754'],
    textureStyle: 'rocky',
    description: '富含氧化铁的红色行星，拥有巨型火山、峡谷，以及两颗形状不规则的小卫星。',
  },
  {
    id: 'jupiter',
    name: '木星',
    englishName: 'JUPITER',
    relativeRadius: 2.75,
    orbitRadius: 27.5,
    orbitPeriodDays: 4332.6,
    rotationPeriodHours: 9.93,
    axialTilt: 3.13,
    radiusKm: 69911,
    distanceLabel: '5.20 AU',
    colors: ['#805b45', '#d5a878', '#f0d2a8'],
    textureStyle: 'gas',
    description: '太阳系最大的行星。高速自转塑造出明暗相间的云带与持续数百年的巨大风暴。',
  },
];

const canvas = document.querySelector('#space');
const loading = document.querySelector('#loading');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#03050b');
scene.fog = new THREE.FogExp2('#03050b', 0.0065);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 300);
const defaultCameraPosition = new THREE.Vector3(0, 24, 45);
const defaultTarget = new THREE.Vector3(2, 0, 0);
camera.position.copy(defaultCameraPosition);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = true;
controls.minDistance = 7;
controls.maxDistance = 92;
controls.maxPolarAngle = Math.PI * 0.92;
controls.target.copy(defaultTarget);

const systemRoot = new THREE.Group();
scene.add(systemRoot);

scene.add(new THREE.HemisphereLight('#9bbdff', '#17100c', 0.42));
const sunlight = new THREE.PointLight('#fff0d0', 1700, 115, 1.45);
systemRoot.add(sunlight);

function seededRandom(seedText) {
  let seed = [...seedText].reduce((sum, char) => sum + char.charCodeAt(0), 0) || 1;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function createPlanetTexture(body) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 512;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext('2d');
  const random = seededRandom(body.id);
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, body.colors[1]);
  gradient.addColorStop(0.5, body.colors[0]);
  gradient.addColorStop(1, body.colors[1]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 256);

  if (body.textureStyle === 'gas' || body.textureStyle === 'cloudy') {
    const bands = body.textureStyle === 'gas' ? 22 : 34;
    for (let index = 0; index < bands; index += 1) {
      const y = (index / bands) * 256 + random() * 5;
      context.globalAlpha = 0.14 + random() * 0.24;
      context.fillStyle = body.colors[index % body.colors.length];
      context.fillRect(0, y, 512, 3 + random() * 10);
    }
    if (body.textureStyle === 'gas') {
      context.globalAlpha = 0.7;
      context.fillStyle = '#a84f35';
      context.beginPath();
      context.ellipse(362, 166, 34, 13, -0.1, 0, Math.PI * 2);
      context.fill();
    }
  } else if (body.textureStyle === 'earth') {
    context.globalAlpha = 0.9;
    for (let index = 0; index < 34; index += 1) {
      context.fillStyle = index % 3 === 0 ? '#a8bd79' : '#4d8c65';
      context.beginPath();
      context.ellipse(
        random() * 512,
        30 + random() * 196,
        10 + random() * 34,
        5 + random() * 22,
        random() * Math.PI,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    context.globalAlpha = 0.38;
    context.strokeStyle = '#ffffff';
    context.lineWidth = 4;
    for (let index = 0; index < 16; index += 1) {
      const y = random() * 256;
      context.beginPath();
      context.moveTo(random() * 120, y);
      context.bezierCurveTo(180, y - 18, 330, y + 20, 512, y - 6);
      context.stroke();
    }
  } else {
    const speckleCount = body.textureStyle === 'star' ? 560 : 180;
    for (let index = 0; index < speckleCount; index += 1) {
      context.globalAlpha = 0.08 + random() * 0.34;
      context.fillStyle = body.colors[Math.floor(random() * body.colors.length)];
      const size = body.textureStyle === 'star' ? 1 + random() * 7 : 1 + random() * 5;
      context.beginPath();
      context.arc(random() * 512, random() * 256, size, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function createGlowTexture() {
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 256;
  glowCanvas.height = 256;
  const context = glowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 124);
  gradient.addColorStop(0, 'rgba(255, 244, 191, 1)');
  gradient.addColorStop(0.16, 'rgba(255, 166, 54, .8)');
  gradient.addColorStop(0.5, 'rgba(255, 92, 20, .18)');
  gradient.addColorStop(1, 'rgba(255, 80, 10, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(glowCanvas);
}

function createOrbit(radius, isMoon = false) {
  const points = [];
  const segments = 160;
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: isMoon ? '#58769c' : '#34506d',
    transparent: true,
    opacity: isMoon ? 0.34 : 0.26,
  });
  return new THREE.LineLoop(geometry, material);
}

function createSelectionMarker(radius) {
  const group = new THREE.Group();
  const geometry = new THREE.TorusGeometry(radius * 1.45, Math.max(0.015, radius * 0.018), 8, 96);
  const material = new THREE.MeshBasicMaterial({ color: '#73d8ff', transparent: true, opacity: 0.85 });
  const horizontal = new THREE.Mesh(geometry, material);
  horizontal.rotation.x = Math.PI / 2;
  const vertical = new THREE.Mesh(geometry, material.clone());
  vertical.rotation.y = Math.PI / 2;
  group.add(horizontal, vertical);
  group.visible = false;
  return group;
}

const bodyRecords = [];
const bodyMeshes = [];
const anchors = new Map();

function buildBody(body, order) {
  const parentAnchor = body.parentId ? anchors.get(body.parentId) : systemRoot;
  if (!parentAnchor) throw new Error(`Missing parent body: ${body.parentId}`);

  const orbitPivot = body.orbitRadius > 0 ? new THREE.Group() : null;
  const anchor = new THREE.Group();
  if (orbitPivot) {
    parentAnchor.add(createOrbit(body.orbitRadius, Boolean(body.parentId)));
    parentAnchor.add(orbitPivot);
    orbitPivot.add(anchor);
    orbitPivot.rotation.y = order * 1.18 + 0.35;
    anchor.position.x = body.orbitRadius;
  } else {
    parentAnchor.add(anchor);
  }

  const tiltedAxis = new THREE.Group();
  tiltedAxis.rotation.z = THREE.MathUtils.degToRad(body.axialTilt);
  anchor.add(tiltedAxis);

  const geometry = new THREE.SphereGeometry(body.relativeRadius, 56, 32);
  const texture = createPlanetTexture(body);
  const material = body.id === 'sun'
    ? new THREE.MeshBasicMaterial({ map: texture, color: '#fff0bd' })
    : new THREE.MeshStandardMaterial({
        map: texture,
        roughness: body.textureStyle === 'earth' ? 0.72 : 0.9,
        metalness: 0,
      });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.body = body;
  tiltedAxis.add(mesh);
  bodyMeshes.push(mesh);

  const marker = createSelectionMarker(body.relativeRadius);
  anchor.add(marker);

  if (body.id === 'sun') {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createGlowTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    glow.scale.set(16, 16, 1);
    anchor.add(glow);
  }

  anchors.set(body.id, anchor);
  bodyRecords.push({ body, orbitPivot, anchor, mesh, marker });
}

CELESTIAL_BODIES.forEach(buildBody);

function createStarField() {
  const count = 2200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  const random = seededRandom('solaris-stars');
  for (let index = 0; index < count; index += 1) {
    const radius = 58 + random() * 105;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    color.set(random() > 0.8 ? '#9fc6ff' : '#ffffff');
    const intensity = 0.42 + random() * 0.58;
    colors[index * 3] = color.r * intensity;
    colors[index * 3 + 1] = color.g * intensity;
    colors[index * 3 + 2] = color.b * intensity;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.18,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    vertexColors: true,
    depthWrite: false,
  });
  scene.add(new THREE.Points(geometry, material));
}

createStarField();

const infoPanel = document.querySelector('#info-panel');
const panelFields = {
  index: document.querySelector('#panel-index'),
  icon: document.querySelector('#planet-icon'),
  name: document.querySelector('#planet-name'),
  englishName: document.querySelector('#planet-en-name'),
  description: document.querySelector('#planet-description'),
  radius: document.querySelector('#planet-radius'),
  distance: document.querySelector('#planet-distance'),
  orbitPeriod: document.querySelector('#planet-orbit-period'),
  rotationPeriod: document.querySelector('#planet-rotation-period'),
};

let selectedRecord = null;

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: digits }).format(value);
}

function selectBody(body) {
  if (selectedRecord) selectedRecord.marker.visible = false;
  selectedRecord = bodyRecords.find((record) => record.body.id === body.id);
  selectedRecord.marker.visible = true;

  const visibleIndex = CELESTIAL_BODIES.filter((item) => item.id !== 'moon').findIndex((item) => item.id === body.id);
  panelFields.index.textContent = body.id === 'moon' ? '03·A' : String(Math.max(0, visibleIndex) + 1).padStart(2, '0');
  panelFields.icon.style.background = body.colors[1];
  panelFields.icon.style.boxShadow = `0 0 22px ${body.colors[1]}88`;
  panelFields.name.textContent = body.name;
  panelFields.englishName.textContent = body.englishName;
  panelFields.description.textContent = body.description;
  panelFields.radius.textContent = body.id === 'sun'
    ? `${formatNumber(body.radiusKm, 0)} km`
    : `${formatNumber(body.radiusKm / 6371)}× 地球`;
  panelFields.distance.textContent = body.distanceLabel;
  panelFields.orbitPeriod.textContent = body.orbitPeriodDays
    ? `${formatNumber(body.orbitPeriodDays)} 天`
    : '—';
  panelFields.rotationPeriod.textContent = `${formatNumber(Math.abs(body.rotationPeriodHours))} 小时${body.rotationPeriodHours < 0 ? ' · 逆行' : ''}`;
  infoPanel.setAttribute('aria-hidden', 'false');
  infoPanel.classList.add('is-visible');
}

function clearSelection() {
  if (selectedRecord) selectedRecord.marker.visible = false;
  selectedRecord = null;
  infoPanel.classList.remove('is-visible');
  infoPanel.setAttribute('aria-hidden', 'true');
}

document.querySelector('#close-info').addEventListener('click', clearSelection);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerStart = null;

canvas.addEventListener('pointerdown', (event) => {
  pointerStart = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener('pointerup', (event) => {
  if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(bodyMeshes, false);
  if (intersections.length) selectBody(intersections[0].object.userData.body);
  else clearSelection();
});

canvas.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  canvas.classList.toggle('is-hovering-body', raycaster.intersectObjects(bodyMeshes, false).length > 0);
});

const speedInput = document.querySelector('#speed');
const speedValue = document.querySelector('#speed-value');
let simulationSpeed = Number(speedInput.value);
let isRunning = true;

speedInput.addEventListener('input', () => {
  simulationSpeed = Number(speedInput.value);
  speedValue.value = `${simulationSpeed} 天/秒`;
  speedValue.textContent = `${simulationSpeed} 天/秒`;
});

const toggleButton = document.querySelector('#toggle-animation');
const toggleLabel = document.querySelector('#toggle-label');
toggleButton.addEventListener('click', () => {
  isRunning = !isRunning;
  toggleButton.classList.toggle('is-paused', !isRunning);
  toggleLabel.textContent = isRunning ? '暂停' : '继续';
});

document.querySelector('#reset-view').addEventListener('click', () => {
  camera.position.copy(defaultCameraPosition);
  controls.target.copy(defaultTarget);
  controls.update();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const deltaSeconds = Math.min(clock.getDelta(), 0.05);
  if (isRunning) {
    const simulatedDays = deltaSeconds * simulationSpeed;
    bodyRecords.forEach(({ body, orbitPivot, mesh, marker }) => {
      if (orbitPivot && body.orbitPeriodDays > 0) {
        orbitPivot.rotation.y += (Math.PI * 2 * simulatedDays) / body.orbitPeriodDays;
      }
      if (body.rotationPeriodHours !== 0) {
        mesh.rotation.y += (Math.PI * 2 * simulatedDays * 24) / body.rotationPeriodHours;
      }
      if (marker.visible) marker.rotation.y -= deltaSeconds * 0.55;
    });
  }
  controls.update();
  renderer.render(scene, camera);
}

animate();

requestAnimationFrame(() => {
  loading.classList.add('is-hidden');
  window.setTimeout(() => loading.remove(), 700);
});
