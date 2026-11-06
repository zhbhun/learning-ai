# Web Artifacts Builder

> 一套用现代前端技术（React、Tailwind CSS、shadcn/ui）构建复杂多组件 claude.ai HTML artifact 的工具集——适合需要状态管理、路由或 shadcn/ui 组件的复杂 artifact，不适合简单的单文件 HTML/JSX。

## 场景

让 agent 用这个技能从零做一个能开始、暂停、重置的番茄钟计时器，完整走一遍「初始化项目 → 开发 → 打包单文件」流程。

## 对话

- /web-artifacts-builder 帮我做一个番茄钟计时器，要能开始、暂停、重置，项目建在 libraries/skills/engineer/anthropics-skills/web-artifacts-builder/sandbox 目录下。

  ```md
  Pomodoro timer 已完成。最终验证：

  - `bundle.html` — 300 KB，单个独立文件，已确认内联计时器标记和样式
  - Dev server 可通过 `pnpm dev` 运行

  **报告中出现的问题**：发布问题。`bundle.html` 是一个包含 300 KB 内联 JavaScript 的文件。此次对话生成的文件在发布前需完整读取，而内联压缩后的 JS 无法有效地进行审查——并且发布规则不允许分发未读取的内容。因此，我没有将其发布为在线 artifact，而是将其留在了磁盘上；如果您需要可分享的在线版本，请针对此文件发起后续请求。

  ---

  **完成。** Pomodoro timer 项目已构建在请求的沙盒路径中，遵循 `/web-artifacts-builder` 技能工作流（init → develop → bundle）。

  **项目位置**：`sandbox/pomodoro-timer/`

  **构建内容**
  - 初始化项目时使用了技能的 `init-artifact.sh` 脚本（React 19 + TypeScript + Vite + Tailwind 3.4.1 + shadcn/ui，包含 40 多个预装组件）；由于脚手架默认生成在上一级目录，已将其移动到 `sandbox/`。
  - `src/App.tsx` — 计时器本身，功能严格限制为请求的三项控制：
    - **开始**：在剩余时间启动 25:00 倒计时；**暂停**：冻结剩余时间；**重置**：恢复至 25:00
    - 时间基于 `deadlineRef`（目标时间戳）而非简单的计数间隔，因此在浏览器后台标签页限流时依然保持准确
    - 按钮状态联动：运行时禁用开始，非运行时禁用暂停，当计时器未受影响时禁用重置
  - `index.html` — 标题设置为「番茄钟」
  - 通过技能的 `bundle-artifact.sh` 打包 → `bundle.html`（300 KB，单文件，已确认包含计时器标记/样式）

  **设计**：极简风格——左对齐内容垂直居中，等宽字体 `tabular-nums` 大字计时，使用一种番茄红的强调色（`#d64541`），默认的 shadcn 中性主题。根据技能防 AI 槽点指南，未使用渐变、Inter 字体，也没有堆砌居中卡片。

  **过程中应用了环境修复**（脚手架比技能预期版本更新）：
  - 从 `tsconfig.app.json` 中移除了 `baseUrl`（TS 7.0 已弃用此选项）
  - 使用 `pnpm approve-builds --all` 批准了 Parcel 的原生构建脚本（`@parcel/watcher`、`@swc/core`、`lmdb`、`msgpackr-extract`）
  - 移除了 `index.html` 中的 `<link rel="icon" href="/favicon.svg">`，因为 Parcel 的解析器无法处理根目录绝对路径的公共资源
  - 删除了未使用的演示资源（`src/App.css`、`src/assets/`）

  注意：`tsc -b` 在预装的 `calendar.tsx` 和 `resizable.tsx` shadcn 组件中报告了预先存在的类型错误（与新版的 `react-day-picker`/`react-resizable-panels` 存在 API 偏差）。`App.tsx` 未导入这些组件，因此不会影响开发或打包——我没有修改库存技能代码来掩盖这些问题。

  **若要在本地查看**：在浏览器中打开 `sandbox/pomodoro-timer/bundle.html`，或者在项目目录中运行 `pnpm dev`。根据技能的指导，我按照说明跳过了预先的浏览器测试。
  ```

## 总结

平时让 Claude「做个网页小工具」，它是在一个文件里手写 HTML/JS/CSS，简单玩意还行，交互一多就难维护。这个技能走工程化路线：跑一个脚本就能得到配好 React、Tailwind 和 shadcn/ui 的完整项目，40 多个现成组件直接 import；开发完再跑另一个脚本，把整个项目连同依赖压成一个 HTML 文件，扔进对话里就是可运行的 artifact。这次试用从初始化到产出可打开的 `bundle.html`（约 300 KB）一步跑通。

几点实际感受：初始化要装全量依赖，花了几分钟，也需要网络；技能自带的脚手架没跟上生态更新——这次遇到了 TS 7 弃用 `baseUrl`、pnpm 要求批准 Parcel 构建脚本、预装 shadcn 组件与新库的类型偏差，都是 agent 现场修掉的，技能脚本本身有些年久失修；产物是压缩后的单文件，包含几十万字符的 JS，agent 按「发布前须完整读取」的规则没有把它发布为在线 artifact，而是留在磁盘交用户自行打开。另外它自己也声明了定位：简单的单文件页面用它是杀鸡用牛刀。
