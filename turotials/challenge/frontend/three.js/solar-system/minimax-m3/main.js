import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================
//  Data table — single source of truth for every celestial body.
//  radius / orbitRadius are visual units; periods are seconds
//  for one full revolution. The same data drives both the 3D
//  scene and the info panel.
// ============================================================
const TAU = Math.PI * 2;

const BODIES = [
  {
    name: 'Sun',
    radius: 6,
    color: 0xffcc33,
    emissive: 0xffa020,
    isStar: true,
    rotationPeriod: 8,
    stats: {
      类型: '恒星 (G2V)',
      直径: '1,392,700 km',
      质量: '1.989 × 10³⁰ kg',
      表面温度: '~5,500 °C',
    },
    description: '太阳是位于太阳系中心的恒星，几乎是一个理想的热等离子球体，其能量来自核心的氢聚变反应。',
  },
  {
    name: 'Mercury',
    radius: 0.6,
    color: 0xa89888,
    orbitRadius: 12,
    orbitPeriod: 6,
    rotationPeriod: 20,
    stats: {
      类型: '类地行星',
      直径: '4,879 km',
      '轨道半径': '0.39 AU',
      '公转周期': '88 天',
      '自转周期': '58.6 天',
      卫星: '0',
    },
    description: '水星是离太阳最近、太阳系中最小的行星，表面布满陨石坑，昼夜温差极大。',
  },
  {
    name: 'Venus',
    radius: 0.95,
    color: 0xe6c479,
    orbitRadius: 17,
    orbitPeriod: 9,
    rotationPeriod: 60,
    stats: {
      类型: '类地行星',
      直径: '12,104 km',
      '轨道半径': '0.72 AU',
      '公转周期': '225 天',
      '自转周期': '243 天 (逆向)',
      卫星: '0',
    },
    description: '金星是太阳系中最热的行星，浓密的二氧化碳大气产生强烈的温室效应。',
  },
  {
    name: 'Earth',
    radius: 1.05,
    color: 0x2a78d6,
    orbitRadius: 22,
    orbitPeriod: 12,
    rotationPeriod: 4,
    moons: [
      { name: 'Moon', radius: 0.3, color: 0xc8c8c8, orbitRadius: 2.4, orbitPeriod: 2.5 },
    ],
    stats: {
      类型: '类地行星',
      直径: '12,742 km',
      '轨道半径': '1.00 AU',
      '公转周期': '365.25 天',
      '自转周期': '24 小时',
      卫星: '1 (月球)',
    },
    description: '地球是已知唯一存在生命的天体，表面 71% 被液态水覆盖，并拥有一颗天然卫星——月球。',
  },
  {
    name: 'Mars',
    radius: 0.75,
    color: 0xc75a3a,
    orbitRadius: 28,
    orbitPeriod: 16,
    rotationPeriod: 4.5,
    stats: {
      类型: '类地行星',
      直径: '6,779 km',
      '轨道半径': '1.52 AU',
      '公转周期': '687 天',
      '自转周期': '24.6 小时',
      卫星: '2 (火卫一、火卫二)',
    },
    description: '火星表面的氧化铁赋予它标志性的红色外观，拥有太阳系最高的山与最深的峡谷。',
  },
  {
    name: 'Jupiter',
    radius: 3.0,
    color: 0xd2a679,
    orbitRadius: 40,
    orbitPeriod: 30,
    rotationPeriod: 2,
    stats: {
      类型: '气态巨行星',
      直径: '139,820 km',
      '轨道半径': '5.20 AU',
      '公转周期': '11.86 年',
      '自转周期': '9.9 小时',
      卫星: '95+ 已确认',
    },
    description: '木星是太阳系中最大的行星，质量超过其他所有行星之和，大红斑是持续数百年的巨型反气旋风暴。',
  },
];

const MOON_INFO = {
  stats: {
    类型: '天然卫星',
    直径: '3,474 km',
    '轨道半径': '384,400 km',
    '公转周期': '27.3 天',
  },
  description: '月球是地球唯一的天然卫星，也是太阳系中第五大的卫星，表面布满了陨石坑与月海。',
};

// ============================================================
//  Renderer / Scene / Camera
// ============================================================
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060d);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  5000,
);
camera.position.set(0, 45, 90);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 400;
controls.target.set(0, 0, 0);

// ============================================================
//  Lighting
// ============================================================
scene.add(new THREE.AmbientLight(0xffffff, 0.12));
const sunLight = new THREE.PointLight(0xffffff, 3.0, 0, 0);
scene.add(sunLight);

// ============================================================
//  Background starfield (procedural points on a sphere)
// ============================================================
(function createStarfield() {
  const N = 5000;
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 1800 + Math.random() * 600;
    const theta = Math.random() * TAU;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    const c = 0.6 + Math.random() * 0.4;
    colors[i * 3]     = c;
    colors[i * 3 + 1] = c;
    colors[i * 3 + 2] = c * (0.85 + Math.random() * 0.15);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.5,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
  });
  scene.add(new THREE.Points(geom, mat));
})();

// ============================================================
//  Procedural textures — keeps the project fully self-contained
// ============================================================
function makeTexture(draw, size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const TEXTURES = {
  sun: makeTexture((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, '#fff8d0');
    g.addColorStop(0.35, '#ffcc33');
    g.addColorStop(0.75, '#ff8a00');
    g.addColorStop(1, '#cc4400');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 280; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const r = Math.random() * 24 + 3;
      ctx.fillStyle = `rgba(255, ${150 + Math.random() * 80}, 0, ${Math.random() * 0.35})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const r = Math.random() * 40 + 10;
      ctx.fillStyle = `rgba(255, 240, 180, ${Math.random() * 0.2})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  }),

  mercury: makeTexture((ctx, s) => {
    ctx.fillStyle = '#a89888';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const r = Math.random() * 14 + 1;
      const k = Math.random();
      ctx.fillStyle =
        k < 0.45 ? `rgba(60,50,45,${Math.random() * 0.55})`
        : k < 0.75 ? `rgba(190,175,160,${Math.random() * 0.4})`
        : `rgba(120,110,100,${Math.random() * 0.4})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  }),

  venus: makeTexture((ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#f3dca0');
    g.addColorStop(0.5, '#e6c479');
    g.addColorStop(1, '#c89a55');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      const y = Math.random() * s;
      ctx.fillStyle = `rgba(255, 230, 180, ${Math.random() * 0.3})`;
      ctx.fillRect(0, y, s, Math.random() * 8 + 2);
    }
  }),

  earth: makeTexture((ctx, s) => {
    ctx.fillStyle = '#1a4878';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const w = Math.random() * 100 + 30;
      const h = Math.random() * 60 + 15;
      ctx.fillStyle = `rgba(${50 + Math.random() * 30}, ${110 + Math.random() * 60}, ${50 + Math.random() * 30}, ${0.7 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(0, 0, s, 28);
    ctx.fillRect(0, s - 28, s, 28);
  }),

  mars: makeTexture((ctx, s) => {
    ctx.fillStyle = '#c75a3a';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const w = Math.random() * 60 + 15;
      const h = Math.random() * 40 + 10;
      ctx.fillStyle = `rgba(${100 + Math.random() * 40}, ${40 + Math.random() * 30}, ${20 + Math.random() * 20}, ${Math.random() * 0.6})`;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,240,240,0.75)';
    ctx.fillRect(0, 0, s, 18);
    ctx.fillRect(0, s - 18, s, 18);
  }),

  jupiter: makeTexture((ctx, s) => {
    const bands = ['#d8b890', '#b89060', '#e8c898', '#a87048', '#d8a878', '#c89868', '#e8c098'];
    const bandH = s / bands.length;
    bands.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, i * bandH, s, bandH);
    });
    for (let i = 0; i < 50; i++) {
      const y = Math.random() * s;
      ctx.fillStyle = `rgba(255, 230, 200, ${Math.random() * 0.2})`;
      ctx.fillRect(0, y, s, Math.random() * 4 + 1);
    }
    const gsx = s * 0.7, gsy = s * 0.6;
    const g = ctx.createRadialGradient(gsx, gsy, 2, gsx, gsy, 50);
    g.addColorStop(0, 'rgba(180, 60, 30, 0.95)');
    g.addColorStop(0.6, 'rgba(160, 50, 30, 0.7)');
    g.addColorStop(1, 'rgba(160, 50, 30, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(gsx, gsy, 50, 25, 0, 0, TAU); ctx.fill();
  }),

  moon: makeTexture((ctx, s) => {
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 280; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const r = Math.random() * 10 + 1;
      const k = Math.random();
      ctx.fillStyle =
        k < 0.6 ? `rgba(80,80,80,${Math.random() * 0.6})`
        : `rgba(220,220,220,${Math.random() * 0.4})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  }, 256),

  sunGlow: makeTexture((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0,   'rgba(255, 220, 140, 0.55)');
    g.addColorStop(0.4, 'rgba(255, 170,  60, 0.20)');
    g.addColorStop(1,   'rgba(255, 120,   0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }, 256),
};

// ============================================================
//  Build every body from the data table — single generic loop.
//  Two animation tables are populated as a side-effect:
//    orbitAnims — pivots whose rotation.y = (t / period) * TAU
//    spinAnims  — meshes whose rotation.y = (t / period) * TAU
//  The animation loop iterates over these tables once per frame,
//  so there is no per-planet animation code anywhere.
// ============================================================
const orbitAnims = [];
const spinAnims = [];
const raycastTargets = [];

function addOrbitRing(radius) {
  const ringGeom = new THREE.RingGeometry(radius - 0.04, radius + 0.04, 192);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x446688,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
}

function addBody(body) {
  const tex = TEXTURES[body.name.toLowerCase()];
  const material = new THREE.MeshStandardMaterial({
    map: tex || null,
    color: body.color,
    roughness: body.isStar ? 0.4 : 0.85,
    metalness: body.isStar ? 0 : 0.05,
    emissive: body.isStar ? body.emissive : 0x000000,
    emissiveIntensity: body.isStar ? 0.7 : 0,
  });
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(body.radius, 64, 32),
    material,
  );
  mesh.userData.body = body;
  raycastTargets.push(mesh);

  // Sun glow sprite (added before the planet sphere so it renders behind)
  if (body.isStar) {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TEXTURES.sunGlow,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }));
    glow.scale.set(28, 28, 1);
    scene.add(glow);
  }

  // Planets get an orbit pivot at the origin
  if (!body.isStar && body.orbitRadius != null) {
    const pivot = new THREE.Group();
    pivot.add(mesh);
    mesh.position.set(body.orbitRadius, 0, 0);
    scene.add(pivot);
    orbitAnims.push({ pivot, period: body.orbitPeriod });
    body._pivot = pivot;
    addOrbitRing(body.orbitRadius);
  } else {
    scene.add(mesh);
  }

  // Self-rotation
  if (body.rotationPeriod) {
    spinAnims.push({ mesh, period: body.rotationPeriod });
  }

  // Moons — orbit in the planet's local frame (parented to planet mesh)
  (body.moons || []).forEach(moon => {
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(moon.radius, 32, 16),
      new THREE.MeshStandardMaterial({
        map: TEXTURES.moon,
        color: moon.color,
        roughness: 0.95,
        metalness: 0,
      }),
    );
    moonMesh.userData.body = {
      ...MOON_INFO,
      name: moon.name,
      parentName: body.name,
    };
    raycastTargets.push(moonMesh);

    const moonPivot = new THREE.Group();
    moonPivot.add(moonMesh);
    moonMesh.position.set(moon.orbitRadius, 0, 0);
    mesh.add(moonPivot);                 // rides along with the planet
    orbitAnims.push({ pivot: moonPivot, period: moon.orbitPeriod });
  });
}

BODIES.forEach(addBody);

// ============================================================
//  Click → show info panel (drag vs click is disambiguated
//  by pointer-travel distance so OrbitControls stays smooth)
// ============================================================
const infoPanel  = document.getElementById('info-panel');
const infoName   = document.getElementById('info-name');
const infoStats  = document.getElementById('info-stats');
const infoDesc   = document.getElementById('info-desc');
const infoClose  = document.getElementById('info-close');

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let pointerDown = null;

canvas.addEventListener('pointerdown', (e) => {
  pointerDown = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointerup', (e) => {
  if (!pointerDown) return;
  const moved = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y);
  pointerDown = null;
  if (moved > 6) return;                 // it was a drag, not a click

  ndc.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(raycastTargets, false);
  if (hits.length > 0) showInfo(hits[0].object.userData.body);
  else                 hideInfo();
});

function showInfo(body) {
  if (!body) return;
  const title = body.parentName ? `${body.name} · ${body.parentName} 的卫星` : body.name;
  infoName.textContent = title;
  infoStats.innerHTML = '';
  Object.entries(body.stats || {}).forEach(([k, v]) => {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    infoStats.appendChild(dt);
    infoStats.appendChild(dd);
  });
  infoDesc.textContent = body.description || '';
  infoPanel.classList.add('visible');
  infoPanel.setAttribute('aria-hidden', 'false');
}

function hideInfo() {
  infoPanel.classList.remove('visible');
  infoPanel.setAttribute('aria-hidden', 'true');
}

infoClose.addEventListener('click', hideInfo);

// ============================================================
//  Reset view button
// ============================================================
document.getElementById('reset-view').addEventListener('click', () => {
  camera.position.set(0, 45, 90);
  controls.target.set(0, 0, 0);
  controls.update();
});

// ============================================================
//  Window resize — keep camera aspect and renderer in sync
// ============================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
//  Animation — ONE generic loop, no per-planet logic.
// ============================================================
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();
  for (let i = 0; i < orbitAnims.length; i++) {
    const { pivot, period } = orbitAnims[i];
    pivot.rotation.y = (t / period) * TAU;
  }
  for (let i = 0; i < spinAnims.length; i++) {
    const { mesh, period } = spinAnims[i];
    mesh.rotation.y = (t / period) * TAU;
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();