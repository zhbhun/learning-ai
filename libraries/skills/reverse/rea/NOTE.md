# 学习笔记：REA

## 偏好
- 主题：REA（rea-agents，Reverse Engineer Anything）工具本身——CLI 与 MCP 服务器的安装、用法与全部分析能力；不是通用逆向工程知识。
- 主题边界：全能力地图（2026-10-20 确认）。覆盖入门、JavaScript/Electron、网站与浏览器、原生二进制、托管代码与字节码、移动与桌面应用包、固件/数据/流量、Evidence 与重建；不纳入 Ghidra、Frida、JADX 等第三方工具自身的系统教学（用到时在课程内交代所需操作）。
- 运行环境：macOS arm64 主机，Node 22.19+/24.11+/26+；需要特定平台或硬件的目标（Android 设备、Windows 应用等）优先使用公开样例，无法本机演示时在课程中明确标注环境要求。
- 范例媒介：REA 是 CLI/MCP 工具，课程以真实命令 + 输出证据为核心，正文以 docs-only 为主，不做 Canvas 交互实例。

## 工作笔记
- 官方站点 rea.tools 与仓库 docs/ 是课程内容的一手来源；各目标类型的细分文档页写进对应课程的 `## 参考资料`，不进 RESOURCES.md。
