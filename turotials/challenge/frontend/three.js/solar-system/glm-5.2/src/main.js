import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import './style.css'
import { BODIES, MOON } from './data.js'

const container = document.getElementById('scene')
const infoEl = document.getElementById('info')

// ---------------------------------------------------------------------------
// 场景 / 相机 / 渲染器
// ---------------------------------------------------------------------------
const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
)
camera.position.set(0, 70, 130)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
container.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.minDistance = 15
controls.maxDistance = 400
controls.target.set(0, 0, 0)

// ---------------------------------------------------------------------------
// 光照：太阳作为点光源 + 微弱环境光
// ---------------------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.22))
const sunLight = new THREE.PointLight(0xffffff, 2.2, 0, 0)
sunLight.position.set(0, 0, 0)
scene.add(sunLight)

// ---------------------------------------------------------------------------
// 星空背景
// ---------------------------------------------------------------------------
function addStarfield(count = 4000) {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const r = 1200 + Math.random() * 600
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.4,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  })
  scene.add(new THREE.Points(geo, mat))
}
addStarfield()

// ---------------------------------------------------------------------------
// 通用工厂：任何天体（太阳 / 行星 / 卫星）都由同一份逻辑构建
// 层级：parent -> pivot(公转) -> group(定位+倾角) -> mesh(自转)
// 子天体（如月球）挂到 group 上，可跟随公转但不被自转影响
// ---------------------------------------------------------------------------
const TICKABLE = [] // 所有需要逐帧更新的天体
const PICKABLE = [] // 所有可点击的网格

function makeOrbitRing(radius, parent = scene) {
  if (radius <= 0) return
  const segments = 160
  const points = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = new THREE.LineBasicMaterial({
    color: 0x4a5a8a,
    transparent: true,
    opacity: 0.45,
  })
  parent.add(new THREE.Line(geo, mat))
}

function makeBody(config, parent) {
  const pivot = new THREE.Object3D() // 绕父节点公转
  parent.add(pivot)

  const group = new THREE.Object3D() // 承载位置与自转轴倾角；子天体挂这里
  group.position.x = config.orbitRadius
  group.rotation.z = config.tilt
  pivot.add(group)

  const geometry = new THREE.SphereGeometry(config.radius, 48, 48)
  const material =
    config.type === 'star'
      ? new THREE.MeshBasicMaterial({ color: config.color })
      : new THREE.MeshStandardMaterial({
          color: config.color,
          roughness: 0.85,
          metalness: 0.05,
        })
  const mesh = new THREE.Mesh(geometry, material)
  group.add(mesh)

  mesh.userData = { config }

  const body = {
    config,
    pivot,
    group,
    mesh,
    orbitAngle: Math.random() * Math.PI * 2,
    spinAngle: 0,
  }
  TICKABLE.push(body)
  PICKABLE.push(mesh)
  return body
}

// ---------------------------------------------------------------------------
// 构建天体
// ---------------------------------------------------------------------------
const byKey = {}
for (const cfg of BODIES) {
  makeOrbitRing(cfg.orbitRadius)
  byKey[cfg.key] = makeBody(cfg, scene)
}

// 月球：挂到地球 group，沿地球局部坐标运行
makeOrbitRing(MOON.orbitRadius, byKey.earth.group)
byKey.moon = makeBody(MOON, byKey.earth.group)

// ---------------------------------------------------------------------------
// 点击拾取：显示天体名称与数据
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let downPos = null

function onPick(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(PICKABLE)
  if (hits.length > 0) {
    showInfo(hits[0].object.userData.config)
  } else {
    hideInfo()
  }
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  downPos = { x: e.clientX, y: e.clientY }
})
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downPos) return
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y)
  downPos = null
  if (moved > 5) return // 视为拖拽，忽略
  onPick(e)
})

function showInfo(cfg) {
  const hex = '#' + cfg.color.toString(16).padStart(6, '0')
  const tagText =
    cfg.type === 'star'
      ? '恒星'
      : cfg.type === 'satellite'
        ? '卫星'
        : '行星'
  const rows = [
    ['显示半径', cfg.radius.toFixed(2)],
    ['轨道半径', cfg.orbitRadius.toFixed(1)],
    ['公转周期', cfg.period ? `${cfg.period.toFixed(1)} s` : '—'],
    ['自转周期', cfg.spinPeriod ? `${cfg.spinPeriod.toFixed(1)} s` : '—'],
    ['轴倾角', `${((cfg.tilt * 180) / Math.PI).toFixed(1)}°`],
  ]
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join('')

  infoEl.innerHTML = `
    <h1><span class="swatch" style="background:${hex};color:${hex}"></span>${cfg.name}</h1>
    <span class="tag">${tagText}</span>
    <table>${rows}</table>
    <p class="fact">${cfg.fact}</p>`
  infoEl.classList.remove('hidden')
}

function hideInfo() {
  infoEl.classList.add('hidden')
}

// ---------------------------------------------------------------------------
// 窗口自适应
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ---------------------------------------------------------------------------
// 动画循环：唯一一套逻辑，遍历数据驱动所有天体
// ---------------------------------------------------------------------------
const clock = new THREE.Clock()

function animate() {
  const dt = clock.getDelta()
  for (const b of TICKABLE) {
    if (b.config.period > 0) {
      b.orbitAngle += ((Math.PI * 2) / b.config.period) * dt
      b.pivot.rotation.y = b.orbitAngle
    }
    if (b.config.spinPeriod > 0) {
      b.spinAngle += ((Math.PI * 2) / b.config.spinPeriod) * dt
      b.mesh.rotation.y = b.spinAngle
    }
  }
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
animate()
