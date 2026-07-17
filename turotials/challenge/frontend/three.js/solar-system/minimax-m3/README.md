# Solar System · Three.js

一个用 Three.js 实现的可交互太阳系页面。

## 特性

- 太阳 + 水星、金星、地球、火星、木星
- 每颗行星围绕太阳公转并自转
- 地球有一颗沿地球局部坐标运行的月球
- **数据表驱动** — `main.js` 顶部的 `BODIES` 数组是唯一的配置源
- **单一动画循环** — 没有任何「为每颗行星写一份动画」的代码
- `OrbitControls`：左键旋转、滚轮缩放、右键平移
- 点击行星弹出名称与数据面板
- 窗口尺寸变化时自动更新相机与渲染器
- 全部纹理使用 `CanvasTexture` 程序化生成，工程零外部资源依赖

## 直接运行

工程是纯静态文件，**必须通过 HTTP 服务器访问**（`file://` 不能用 importmap + ES Module）。

任选其一：

```bash
# Python（已内置）
python3 -m http.server 5173

# 或 Node.js（首次运行会下载 serve）
npm run dev
```

然后在浏览器打开 <http://localhost:5173/>。

## 文件结构

```
minimax-m3/
├── index.html      # 入口页面 + importmap
├── main.js         # 全部 Three.js 逻辑
├── style.css       # 样式
├── package.json    # 可选的 dev 脚本
└── README.md
```

## 数据表约定

`main.js` 中每个天体只需要声明：

| 字段             | 含义                                       |
| ---------------- | ------------------------------------------ |
| `radius`         | 相对半径（视觉单位）                       |
| `orbitRadius`    | 轨道半径（视觉单位）                       |
| `orbitPeriod`    | 公转周期（秒，视觉用）                     |
| `rotationPeriod` | 自转周期（秒，视觉用）                     |
| `moons`          | 可选的卫星数组，每颗卫星沿父天体局部坐标运行 |

新增一颗行星只需要在 `BODIES` 数组里加一项，渲染与动画逻辑无需任何改动。