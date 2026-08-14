import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

/* =============================================================================
 * 1. 数据表：统一配置每颗天体的相对半径、轨道半径、周期
 *    - radius        : 相对地球的显示半径（无单位，场景缩放）
 *    - orbitRadius   : 距中心（太阳）的轨道半径（场景单位）
 *    - period        : 公转周期（地球年）
 *    - rotationPeriod: 自转周期（地球日；负值 = 逆向自转）
 *    - moons         : 子天体（挂载到父天体局部坐标系，例如地球—月球）
 *    所有动画都由同一套循环驱动，不为任何天体复制独立动画逻辑。
 * ========================================================================== */
const BODIES = [
  {
    key: 'sun',
    name: '太阳',
    nameEn: 'Sun',
    radius: 3.4,
    orbitRadius: 0,
    period: 0,
    rotationPeriod: 27,
    color: 0xffcc44,
    isStar: true,
    info: '太阳系的中心恒星，质量约占太阳系总质量的 99.86%，是地球生命能量的来源。',
  },
  {
    key: 'mercury',
    name: '水星',
    nameEn: 'Mercury',
    radius: 0.38,
    orbitRadius: 6.5,
    period: 0.24,
    rotationPeriod: 58.6,
    color: 0x9c9c9c,
    info: '距离太阳最近的行星，几乎没有大气层，昼夜温差极大。',
  },
  {
    key: 'venus',
    name: '金星',
    nameEn: 'Venus',
    radius: 0.95,
    orbitRadius: 9.5,
    period: 0.62,
    rotationPeriod: -243,
    color: 0xe6c68a,
    info: '太阳系中最热的行星，表面温度约 460°C，自转方向与公转相反。',
  },
  {
    key: 'earth',
    name: '地球',
    nameEn: 'Earth',
    radius: 1.0,
    orbitRadius: 13.5,
    period: 1.0,
    rotationPeriod: 1,
    color: 0x2a7de1,
    info: '我们的家园，目前已知唯一存在生命的行星。',
    moons: [
      {
        key: 'moon',
        name: '月球',
        nameEn: 'Moon',
        radius: 0.27,
        orbitRadius: 2.2,
        period: 0.0748,
        rotationPeriod: 27.3,
        color: 0xcfcfcf,
        info: '地球唯一的天然卫星，被潮汐锁定，始终以同一面朝向地球。',
      },
    ],
  },
  {
    key: 'mars',
    name: '火星',
    nameEn: 'Mars',
    radius: 0.53,
    orbitRadius: 18,
    period: 1.88,
    rotationPeriod: 1.03,
    color: 0xd14b25,
    info: '红色行星，表面富含氧化铁，拥有太阳系最高的火山——奥林帕斯山。',
  },
  {
    key: 'jupiter',
    name: '木星',
    nameEn: 'Jupiter',
    radius: 2.6,
    orbitRadius: 26,
    period: 11.86,
    rotationPeriod: 0.41,
    color: 0xd8b48a,
    info: '太阳系中最大的行星，是一颗气态巨行星，拥有著名的风暴“大红斑”。',
  },
];

// 时间尺度：让公转/自转速度可视化
const EARTH_ORBIT_SECONDS = 24; // 地球公转一圈 = 24 秒
const EARTH_DAY_SECONDS = 2; // 地球自转一圈 = 2 秒

/* =============================================================================
 * 2. 场景 / 相机 / 渲染器
 * ========================================================================== */
const canvas = document.getElementById('scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01030a);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  3000
);
camera.position.set(0, 34, 58);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// OrbitControls：旋转 / 缩放 / 平移
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 400;
controls.target.set(0, 0, 0);

// 光照：环境光 + 太阳位置的点光源
// decay=0 关闭距离衰减，保证内/外行星被均匀照亮（不因轨道半径变大而变暗）
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

// 星空背景
function addStarfield(count = 5000) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 400 + Math.random() * 600;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.1,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(geo, mat));
}
addStarfield();

/* =============================================================================
 * 3. 轨道线
 * ========================================================================== */
function addOrbitLine(radius, color) {
  const segments = 160;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.3,
  });
  scene.add(new THREE.LineLoop(geo, mat));
}

/* =============================================================================
 * 4. 统一构建天体（太阳、行星、卫星共用同一函数）
 *    层级结构：
 *      revolvePivot  (绕中心公转：旋转此对象)
 *        └─ group    (平移到轨道半径，不参与自转)
 *             ├─ mesh (仅自转)
 *             └─ 子天体的 revolvePivot ……（如月球挂在地球 group 上 → 地球局部坐标）
 * ========================================================================== */
const animated = []; // { pivot, mesh, revolveSpeed, rotSpeed }
const clickables = []; // { mesh, body }

function buildBody(cfg, parent) {
  // 公转轴心
  const pivot = new THREE.Object3D();
  parent.add(pivot);

  // 平移到轨道半径（不随自转旋转，保证子天体局部坐标稳定）
  const group = new THREE.Object3D();
  group.position.x = cfg.orbitRadius;
  pivot.add(group);

  // 球体网格
  const geo = new THREE.SphereGeometry(Math.max(0.05, cfg.radius), 48, 48);
  let mat;
  if (cfg.isStar) {
    mat = new THREE.MeshBasicMaterial({ color: cfg.color });
  } else {
    mat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      roughness: 0.85,
      metalness: 0.05,
    });
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.body = cfg;
  group.add(mesh);
  clickables.push({ mesh, body: cfg });

  // 太阳：作为光源，并加一层柔和光晕
  if (cfg.isStar) {
    const light = new THREE.PointLight(0xffffff, 2.5, 0, 0);
    group.add(light);

    const glowMat = new THREE.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(cfg.radius * 1.25, 32, 32), glowMat));
  }

  // 角速度（rad/s），由统一公式从数据表派生
  const revolveSpeed = cfg.period
    ? (Math.PI * 2) / (cfg.period * EARTH_ORBIT_SECONDS)
    : 0;
  const rotSpeed = cfg.rotationPeriod
    ? (Math.PI * 2) / (cfg.rotationPeriod * EARTH_DAY_SECONDS)
    : 0;

  animated.push({ pivot, mesh, revolveSpeed, rotSpeed });

  // 行星轨道线（卫星也会得到围绕父天体的轨道线）
  if (cfg.orbitRadius > 0) {
    addOrbitLine(cfg.orbitRadius, cfg.color);
  }

  // 递归构建子天体（月球挂在父天体 group 上 → 父天体局部坐标系）
  if (Array.isArray(cfg.moons)) {
    for (const moonCfg of cfg.moons) {
      buildBody(moonCfg, group);
    }
  }

  return { pivot, group, mesh };
}

for (const cfg of BODIES) {
  buildBody(cfg, scene);
}

/* =============================================================================
 * 5. 点击拾取：显示名称与数据
 * ========================================================================== */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const infoPanel = document.getElementById('info-panel');
const infoName = document.getElementById('info-name');
const infoNameEn = document.getElementById('info-name-en');
const infoData = document.getElementById('info-data');
const infoDesc = document.getElementById('info-desc');
document.getElementById('info-close').addEventListener('click', () =>
  infoPanel.classList.add('hidden')
);

function showInfo(body) {
  const rows = [
    ['相对半径', body.radius],
    ['轨道半径', body.orbitRadius > 0 ? body.orbitRadius : '—'],
    ['公转周期', body.period ? `${body.period} 地球年` : '—'],
    ['自转周期', body.rotationPeriod ? `${Math.abs(body.rotationPeriod)} 地球日` : '—'],
    ['自转方向', body.rotationPeriod < 0 ? '逆向' : '正向'],
  ];
  infoData.innerHTML = rows
    .map(
      ([k, v]) =>
        `<tr><td>${k}</td><td>${v}</td></tr>`
    )
    .join('');
  infoName.textContent = body.name;
  infoNameEn.textContent = body.nameEn;
  infoDesc.textContent = body.info;
  infoPanel.classList.remove('hidden');
}

// 区分“点击”与“拖拽”：按下后位移很小才算点击
let downPos = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  downPos = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const dx = e.clientX - downPos.x;
  const dy = e.clientY - downPos.y;
  downPos = null;
  if (dx * dx + dy * dy > 25) return; // 拖拽，忽略

  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const meshes = clickables.map((c) => c.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length > 0) {
    const body = hits[0].object.userData.body;
    showInfo(body);
  }
});

/* =============================================================================
 * 6. 窗口自适应：更新相机与渲染器
 * ========================================================================== */
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
});

/* =============================================================================
 * 7. 统一动画循环（唯一一套动画逻辑）
 * ========================================================================== */
const clock = new THREE.Clock();

function animate() {
  const dt = clock.getDelta(); // 基于真实时间，速度稳定不受帧率影响

  // 所有天体（太阳、行星、月球）共用同一套更新规则
  for (const a of animated) {
    if (a.revolveSpeed) a.pivot.rotation.y += a.revolveSpeed * dt;
    if (a.rotSpeed) a.mesh.rotation.y += a.rotSpeed * dt;
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
