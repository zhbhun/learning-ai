# REA

- 1. 入门
  - [1.1 安装与设置](cheatsheets/installation/README.mdx)
    安装 Node 与 REA，用 setup 命令把 MCP 服务器接入 AI 代理并完成验证。
  - [1.2 第一次分析](cheatsheets/first-analysis/README.mdx)
    用官方 Notes 示例跑通一次 JS 应用静态分析，读懂带证据编号的输出。
  - [1.3 CLI 与 Evidence](cheatsheets/cli-evidence/README.mdx)
    掌握全局选项、JSON 输出过滤、退出码和 Evidence 的基本概念。
  - [1.4 MCP 接入](cheatsheets/mcp-integration/README.mdx)
    理解 MCP 服务器的工作方式、契约与提示词，以及客户端配置和诊断。

- 2. JavaScript 与 Electron
  - [2.1 静态分析](cheatsheets/js-static-analysis/README.mdx)
    用 analyze-javascript-application 分析目录和 ASAR，得到应用图与证据。
  - [2.2 应用图与工作流](cheatsheets/js-application-graph/README.mdx)
    读懂 JS 应用图的结构，按工作流追踪功能到具体模块。
  - [2.3 运行时观测](cheatsheets/js-runtime-observation/README.mdx)
    观察 JS 应用运行时的行为，把动态现象归因到代码位置。
  - [2.4 运行时对账](cheatsheets/js-runtime-reconciliation/README.mdx)
    对比静态分析与运行时观测的差异，确认结论以哪边为准。
  - [2.5 源码恢复与重建](cheatsheets/js-source-recovery/README.mdx)
    从打包产物恢复可读源码，重建构件并评估还原度。
  - [2.6 Electron 观测与 Fuses](cheatsheets/electron-observation/README.mdx)
    观测 Electron 应用运行时行为，读懂 fuses 安全配置的含义。

- 3. 网站与浏览器
  - [3.1 浏览器观测](cheatsheets/browser-observation/README.mdx)
    带调试端口启动浏览器，列出页面目标并观察一段时间内的行为。
  - [3.2 场景捕获](cheatsheets/browser-scenario-capture/README.mdx)
    按场景契约捕获一段完整的浏览器交互，得到可复盘的证据。
  - [3.3 网络抓包](cheatsheets/web-network-captures/README.mdx)
    分析 HAR/SAZ 网络抓包，把请求归因到发起它的代码。
  - [3.4 源码定位与导出](cheatsheets/web-source-tracing/README.mdx)
    定位网站资源的源码位置，追踪模块依赖并导出脚本。

- 4. 原生二进制
  - 4.1 静态调查
    - [4.1.1 原生调查](cheatsheets/native-investigation/README.mdx)
      用 analyze、search、function、decompile、xrefs、trace 调查原生二进制。
    - [4.1.2 原始二进制与诊断](cheatsheets/raw-binary-diagnostics/README.mdx)
      处理没有格式的原始字节，用诊断命令摸清 ELF 布局与异常。
    - [4.1.3 崩溃记录](cheatsheets/recorded-crashes/README.mdx)
      分析 Linux 崩溃记录，定位崩溃点并回溯调用链。
  - 4.2 语言与平台
    - [4.2.1 Go 二进制](cheatsheets/go-binaries/README.mdx)
      提取 Go 二进制的编译器版本与模块依赖等构建元数据。
    - [4.2.2 Rust 二进制](cheatsheets/rust-binaries/README.mdx)
      读取 cargo-auditable 嵌入的 Rust 依赖清单。
    - [4.2.3 Ghidra 平台专题](cheatsheets/ghidra-platforms/README.mdx)
      了解 DOS、MIPS、PowerPC、PSP、RISC-V、NativeAOT 等平台的 Ghidra 支持差异。
  - 4.3 反汇编 Provider
    - [4.3.1 Provider 体系](cheatsheets/native-providers/README.mdx)
      理解 provider 机制，用 providers、capabilities、doctor 管理分析引擎。
    - [4.3.2 Ghidra 接入](cheatsheets/ghidra-provider/README.mdx)
      配置 Ghidra 作为原生分析引擎，处理常见就绪问题。
    - [4.3.3 IDA 与 Kuna](cheatsheets/ida-kuna-providers/README.mdx)
      配置 IDA 或 Kuna 作为原生分析引擎，按平台选择 provider。
  - 4.4 动态分析
    - [4.4.1 Frida 插桩](cheatsheets/frida-instrumentation/README.mdx)
      用 Frida 在运行时插桩原生进程，观察函数调用与参数。
    - [4.4.2 进程捕获](cheatsheets/process-capture/README.mdx)
      捕获进程行为快照并比较两次捕获的差异。
    - [4.4.3 离线工具链](cheatsheets/offline-native-tools/README.mdx)
      在无 provider 时用 objdump、Rizin、Cutter、GDB 完成基础调查。

- 5. 托管代码与字节码
  - [5.1 .NET 程序集](cheatsheets/managed-assemblies/README.mdx)
    读取程序集身份与部署元数据，解码类型和成员定义。
  - [5.2 IL2CPP 元数据](cheatsheets/il2cpp-metadata/README.mdx)
    解码 Unity global-metadata.dat，还原 IL2CPP 编译后的类型信息。
  - [5.3 WASM 构件](cheatsheets/wasm-artifacts/README.mdx)
    检查 WebAssembly 构件的结构与导出，理解模块能力。
  - [5.4 EVM 字节码](cheatsheets/evm-bytecode/README.mdx)
    分析以太坊虚拟机字节码，理解合约的行为逻辑。

- 6. 移动与桌面应用包
  - 6.1 Android
    - [6.1.1 应用分析](cheatsheets/android-analysis/README.mdx)
      分析 Android APK 的结构、代码与组件。
    - [6.1.2 设备分析](cheatsheets/adb-device-analysis/README.mdx)
      通过 adb 分析运行中的 Android 设备与应用状态。
    - [6.1.3 资源分析](cheatsheets/apktool-resources/README.mdx)
      用 Apktool 解包并分析 Android 资源与清单。
    - [6.1.4 JEB 项目](cheatsheets/jeb-projects/README.mdx)
      在 JEB 项目中进行 Android 反编译分析。
  - 6.2 框架与系统
    - [6.2.1 Flutter 应用](cheatsheets/flutter-analysis/README.mdx)
      分析 Flutter 应用特有的产物结构与 Dart 代码。
    - [6.2.2 HarmonyOS 应用](cheatsheets/harmony-analysis/README.mdx)
      分析鸿蒙应用的包结构与代码。
    - [6.2.3 Apple 应用](cheatsheets/apple-applications/README.mdx)
      解包并分析 Apple 平台应用包。

- 7. 固件、数据与流量
  - [7.1 固件分析](cheatsheets/firmware-analysis/README.mdx)
    用 Binwalk/Unblob 解包固件镜像，分析其中的文件系统与程序。
  - [7.2 SQLite 数据库](cheatsheets/sqlite-databases/README.mdx)
    检查应用本地 SQLite 快照的表结构与数据。
  - [7.3 数据包捕获](cheatsheets/packet-captures/README.mdx)
    用 TShark 分析 PCAP 数据包捕获，梳理网络行为。
  - [7.4 信号记录](cheatsheets/signal-recordings/README.mdx)
    分析 sigrok 逻辑信号记录，理解硬件通信过程。

- 8. Evidence 与重建
  - [8.1 Evidence 包管理](cheatsheets/evidence-bundles/README.mdx)
    导入、导出、校验和比较 Evidence 包，投影出分析视图。
  - [8.2 历史源码比对](cheatsheets/reference-source-compare/README.mdx)
    导入历史源码树，与逆向结果逐层比对。
  - [8.3 重建工作流](cheatsheets/reconstruction-workflow/README.mdx)
    用重建就绪度、覆盖率与义务台账驱动完整的功能重建。
  - [8.4 代理环境](cheatsheets/agent-environments/README.mdx)
    把分析环境打包成 agentenv，让代理在一致的环境中工作。
