// 太阳系天体统一数据表
// - radius:      显示半径（相对单位）
// - orbitRadius: 轨道半径（相对单位，0 表示位于中心不自转公转）
// - period:      公转周期（秒/圈，0 表示不公转）
// - spinPeriod:  自转周期（秒/圈）
// - tilt:        自转轴倾角（弧度）
// - color:       颜色
// 所有天体共享同一套动画逻辑，无需为每颗行星单独编写。

export const BODIES = [
  {
    name: '太阳',
    key: 'sun',
    type: 'star',
    radius: 8,
    orbitRadius: 0,
    period: 0,
    spinPeriod: 30,
    tilt: 0,
    color: 0xfdb813,
    fact: '太阳系的中心恒星，质量占太阳系总质量的 99.86%。',
  },
  {
    name: '水星',
    key: 'mercury',
    radius: 0.9,
    orbitRadius: 14,
    period: 6,
    spinPeriod: 12,
    tilt: 0.03,
    color: 0x8c7853,
    fact: '距太阳最近的行星，几乎没有大气，昼夜温差极大。',
  },
  {
    name: '金星',
    key: 'venus',
    radius: 1.5,
    orbitRadius: 20,
    period: 9,
    spinPeriod: 20,
    tilt: 3.1,
    color: 0xe8cda2,
    fact: '被浓密的二氧化碳云层包裹，表面温度高达 460°C。',
  },
  {
    name: '地球',
    key: 'earth',
    radius: 1.6,
    orbitRadius: 28,
    period: 12,
    spinPeriod: 4,
    tilt: 0.41,
    color: 0x2a6fb8,
    fact: '已知唯一存在生命的行星，拥有唯一的天然卫星——月球。',
  },
  {
    name: '火星',
    key: 'mars',
    radius: 1.1,
    orbitRadius: 38,
    period: 18,
    spinPeriod: 4.1,
    tilt: 0.44,
    color: 0xc1440e,
    fact: '红色星球，表面富含氧化铁，拥有太阳系最高山——奥林帕斯山。',
  },
  {
    name: '木星',
    key: 'jupiter',
    radius: 4.5,
    orbitRadius: 58,
    period: 34,
    spinPeriod: 1.6,
    tilt: 0.05,
    color: 0xd8a06a,
    fact: '太阳系最大的行星，气态巨行星，拥有标志性的大红斑风暴。',
  },
]

// 月球：沿地球局部坐标运行（运行时挂到地球的分组上）
export const MOON = {
  name: '月球',
  key: 'moon',
  type: 'satellite',
  radius: 0.43,
  orbitRadius: 3.2,
  period: 3,
  spinPeriod: 3,
  tilt: 0.09,
  color: 0xbbbbbb,
  fact: '地球唯一的天然卫星，被潮汐锁定，始终以同一面朝向地球。',
}
