# 同步机制选型调研（ledger-sync）

Ticket: `.scratch/ledger-sync/issues/01-sync-mechanism.md`（research，claimed）
日期：2026-11-05

## 已定约束（只在此之内选型）

- 单用户，无多租户；数据模型全新设计。
- 电脑 CLI 离线优先（SQLite 本地库为常驻工作副本）。
- 手机网页：最简在线页面（记一笔 + 看最近流水），无 PWA、无离线缓存。
- 冲突处理起步：每条记录 last-write-wins（LWW）。
- 产出供「部署形态与权威库定案」决策使用。

---

## 路线 1：自托管中心服务（小 API + 权威 SQLite）

**机制**：一台常驻服务（VPS/家用小主机）跑一个小 HTTP API；服务端 SQLite（或任一嵌入式库）作为权威库。CLI 侧 `ledger sync` 把本地增量（新增/改删 + `updated_at`）推上去、拉回远端增量，按每条记录 `updated_at` 做 LWW 合并；手机网页直接走同一个 API 读写权威库（网页本身无本地库，天然无冲突面）。

**运维成本**：要自己管一个常驻进程——部署、HTTPS、崩溃重启（systemd/容器）、备份、内网穿透或公网暴露。单人项目这是四条路线里唯一"多了一台要照顾的机器"的路线；但协议完全自己定义，无外部依赖升级风险。

**风险**：可用性完全自己扛（机器断电/断网 = 手机端不可记账，CLI 侧不受影响）；安全面自己管（公网暴露一个小 API 需要做认证与 TLS）；备份策略要自己搭（可用 Litestream 把权威库 WAL 持续流式备份到对象存储——"Continuously stream SQLite changes to your preferred cloud storage"，https://litestream.io/ ）。

**契合度**：高。权威库位置明确（服务端），CLI 离线优先天然成立（本地就是主库的副本），手机网页在线直连最简形态刚好匹配；LWW 合并逻辑 30 行以内可写完，且完全符合"绝大多数只新增、偶尔改删"的变更形态。

---

## 路线 2：托管 BaaS 免费档（Supabase / Turso）

**机制**：权威库放在托管服务上，本地 CLI 库与之同步。

- **Supabase Free**：Postgres 托管 + 自动 RESTful API（PostgREST），手机网页和 CLI 都打它的 HTTP API；CLI 侧自己写增量推送/LWW 拉取。免费档限制（官方定价页，https://supabase.com/pricing ）："Free projects are paused after 1 week of inactivity"（闲置一周即停机），500 MB 库、5 GB egress、最多 2 个活跃项目。**记账是低频应用，"一周不记账就停机、手机端打不开"是这条路线最大的坑**（恢复需手动去控制台解冻）。
- **Turso Free**：托管 libSQL/SQLite，配额（官方定价页，https://turso.tech/pricing ）：100 库、5 GB 存储、每月 5 亿次行读、1000 万次行写、3 GB 月同步量——对单人记账是天文数字，配额完全够。

**运维成本**：接近零——不用管机器、TLS、备份（平台带 PITR）。代价是数据在别人平台上：CLI 需要改用其客户端 SDK/HTTP 协议而非裸 SQLite（Turso 用 libSQL 协议；Supabase 用 PostgREST/psql 协议）。

**风险**：免费档政策会变（Supabase 的"闲置即停"就是例证）；供应商锁定（Turso 的 libSQL 方言兼容 SQLite，锁定较浅；Supabase 是 Postgres，CLI 本地若仍是 SQLite 则两端是两种数据库，合并逻辑要同时懂两套语义）；平台故障时手机端与同步一起不可用。

**契合度**：中高。约束全部可满足，Turso 免费档对单用户尤为宽松；"闲置停机"风险与"个人记账低频使用"的真实用法直接冲突，是决策时必须 weigh 的点。

---

## 路线 3：文件层同步（Syncthing 直接同步 SQLite 文件）——不推荐

**SQLite 官方立场**：

- 网络文件系统上的锁不可靠：《How To Corrupt An SQLite Database》§2.1："SQLite depends on the underlying filesystem to do locking as the documentation says it will. But some filesystems contain bugs in their locking logic... This is especially true of network filesystems and NFS in particular." 后果："database corruption might result"。（https://www.sqlite.org/howtocorrupt.html ）
- 同步服务会复制"正在写入中的库"：同页 §1.2 警告不要在事务进行中复制库文件；§1.4：把主库文件与它的 journal/WAL 拆开拷贝会导致"committed transactions lost"或损坏——这正是文件同步服务最典型的失败模式（.db 与 -wal/-journal 到达时间不同步）。
- WAL 模式直接禁止跨主机：《WAL 模式官方文档》："All processes using a database must be on the same host computer; WAL does not work over a network filesystem. This is because WAL requires all processes to share a small amount of memory and processes on separate host machines obviously cannot share memory with each other."（https://www.sqlite.org/wal.html ）且 WAL 模式是持久属性——一旦 CLI 本地库开了 WAL，多出来的 `-wal`/`-shm` 文件也进入同步范围，进一步放大上面 §1.4 的拆散风险。
- **Syncthing 自己的冲突模型是"文件级、不合并"**：官方文档《Conflicting Changes》——冲突时老 mtime 一方被改名 `"<filename>.sync-conflict-<date>-<time>-<modifiedBy>.<ext>"`，"Syncthing does recognize conflicts"但只是把两份文件都留下，永不合并；它也无法感知"文件正在被另一个进程写入"（扫描靠整文件 SHA256 分块重算，watcher 有 10 秒延迟）。（https://docs.syncthing.net/users/syncing.html ）

**机制**：两台设备各存一份 `.db` 文件，Syncthing 在后台做块级同步。

**运维成本**：几乎为零（装好即用），但这是"省运维、赔数据"的省钱。

**风险**：对记账这种"持续被 SQLite 写 + 有 journal/WAL 附属文件 + 单文件内含状态"的文件，是官方文档点名的高危场景——轻则丢最近事务，重则库损坏；且即便不损坏，Syncthing 的冲突语义是"文件级二选一留档"，与"每条记录 LWW"的需求完全对不上（它会把整库两份都留给你，而不是按行合并）。

**契合度**：低。唯一优点是零代码，但与已定的"每条记录 LWW"约束正面冲突，且踩在 SQLite 官方明确警告的失败模式上。

---

## 路线 4：CRDT / 嵌入式同步引擎（cr-sqlite / ElectricSQL / PowerSync / Turso embedded replicas）

逐个核实到 2026-11 的现状：

### cr-sqlite（vlcn-io）——维护已停滞，不引入

- **机制**：SQLite 运行时扩展，把表升级为 CRR（CRDT 关系），通过 `crsql_changes` 虚拟表在多机之间交换 changeset 做 active-active 合并（README："It allows merging different SQLite databases together that have taken independent writes"）。MIT 许可。
- **维护状态（一手证据）**：GitHub Releases 最新版 **v0.16.3，发布于 2024-01-17**（https://github.com/vlcn-io/cr-sqlite/releases ；API `releases/latest` 返回 `published_at: "2024-01-17T17:42:28Z"`）。截至 2026-11-05 **近 22 个月无任何新 release**，tag 列表同样停在 2024-01。仓库未打 archived 标，但 README 里 roadmap 条目（v2 事件日志方案、counter/rich-text CRDT）均标注"still being implemented / To be implemented in v2"未见兑现。
- **结论**：版本号长期停在 0.x 且近两年无发版，不适合作为新项目的同步底座。

### ElectricSQL——已转型，不再是 SQLite 写路径同步

- **机制（现状）**：官方 README 定位 "Electric is a **read-path sync engine for Postgres**. It syncs data **out of** Postgres into ... anything you like."（https://github.com/electric-sql/electric ）。Apache-2.0，活跃维护（最新 tag 2026-09-28）。
- **对本案的硬伤**：只做 Postgres→客户端的读路径同步；客户端写要自己另建写回 API。而本案源库是 SQLite 不是 Postgres——整条路线与约束错位。旧 v1 的 CRDT/SQLite 写路径方案在当前 README/文档中已不见踪影（不是可选形态）。
- **结论**：架构上已不适合"本地 SQLite 为工作副本"的形态，排除。

### PowerSync——工程完备但对单用户过重

- **机制**：PowerSync Service 从源数据库（Postgres/MongoDB 为 GA，MySQL/SQL Server 为 Beta）做副本复制，按 sync streams 分区后流式同步到客户端 SQLite；**写路径由你的应用后端实现**——客户端 SDK 把写写入本地 upload queue，调你实现的 `uploadData()` 推给你的后端 API，后端写入源库后再被复制回所有设备（"You implement steps 3 and 4. The client SDK and the PowerSync Service handle the other steps."，https://docs.powersync.com/handling-writes/writing-client-changes ）。
- **部署/许可**：PowerSync Service 可自托管（Docker），License 为 **Apache-2.0**（https://github.com/powersync-ja/powersync-service 的 LICENSE 文件全文开头即 Apache License 2.0）；另有 PowerSync Cloud 托管版。
- **对本案的错位**：源库不支持 SQLite（必须 Postgres/Mongo 等）；意味着 CLI 本地 SQLite 之外还得再架一个 Postgres + 一个 PowerSync Service + 一个自己的写回 API——对单用户记账是四层架构。冲突处理能力（custom conflict resolution）远超本案 LWW 的需求。
- **结论**：工程质量好、开源许可干净，但规模严重错配，排除。

### Turso embedded replicas——离线优先契合，但绑定 Turso 平台

- **机制**：本地放一个 libSQL 副本文件（读在本地微秒级完成），写默认直发云端主库，写成功后自动刷新本地副本（"Reads are always served from the local replica"、"Writes are sent to the remote primary database"，https://docs.turso.tech/features/embedded-replicas ）。支持 `syncInterval` 周期同步与手动 `.sync()`。注意官方警告："Do not open the local database while the embedded replica is syncing. This can lead to data corruption."，以及"offline: true"才支持本地写排队。
- **平台绑定**：要求远端必须是 Turso Cloud 数据库（免费档额度见路线 2，单人绰绰有余）；本地是 libSQL 而非原生 SQLite CLI 可直接打开的普通库（生态兼容但非零成本）。
- **结论**：技术上契合"CLI 离线优先 + 手机在线"的形态，但把权威库和同步协议都绑死在单一供应商上；若未来想脱离 Turso（自托管或换平台），embedded replicas 无法带走。

---

## 对比结论

| 路线 | 权威库 | 运维成本 | 冲突语义 | 与约束契合 | 关键风险 |
|---|---|---|---|---|---|
| 1 自托管小 API | 服务端 SQLite | 中（要照顾一台机器） | 按行 LWW，自己写 | **高** | 单点可用性、备份需自建（Litestream 可解） |
| 2 托管 BaaS | 云端 | 极低 | 按行 LWW，自己写 | 中高（Turso） | Supabase 闲置 7 天停机；平台锁定 |
| 3 文件层同步 | 无（两份对等副本） | 极低 | 文件级二选一，**无法按行合并** | 低 | SQLite 官方点名损坏场景；WAL 禁跨主机 |
| 4 CRDT/嵌入式引擎 | 各异 | 高（PowerSync）~低（cr-sqlite 但已停更） | CRDT/引擎内置 | 低~中 | cr-sqlite 停更；Electric 转型只读；PowerSync 规模错配；Turso 平台绑定 |

核心判断：**本案的冲突语义（每条记录 LWW）+ 变更形态（绝大多数只新增）过于简单，不足以论证引入任何专用同步引擎；而文件层同步在数据安全上不成立。** 剩下的选择本质是"权威库放自己机器上还是放别人平台上"。

## 推荐

**推荐路线 1：自托管小 API + 服务端权威 SQLite**，CLI 做本地副本 + 增量同步（按行 LWW），手机网页在线直连该 API。

理由（顺约束）：

1. **冲突语义完全自主**：每条记录 `updated_at` LWW 由自己一行 SQL/代码实现，与已定约束精确对齐，不欠任何引擎的语义账。
2. **离线优先零妥协**：CLI 本地就是普通 SQLite 文件，断网照用，`ledger sync` 才上网——不需要引入 libSQL 扩展或 CRDT 列，库文件保持"任何一个 sqlite3 二进制都能打开"的最简形态。
3. **手机网页最简形态正好匹配**：无离线缓存意味着手机端不需要本地副本，直接打 API 读写权威库即可，天然绕开手机端冲突面。
4. **运维成本可压缩**：单用户、无多租户的 API 是一个几百行的进程；备份用 Litestream（WAL 流式到对象存储，"Runs as a separate process so you can integrate into existing applications with no code changes"，https://litestream.io/ ）一条 systemd 服务解决。
5. **唯一真实代价**是多照顾一台常驻机器及其可用性——若"手机端随时随地能用"的优先级高于"数据完全自持"，路线 2（**Turso** 免费档，而非 Supabase——后者闲置 7 天停机对低频记账是实际风险）是唯一值得保留的备胎；embedded replicas 可作为"想在 CLI 侧获得更顺滑离线写"的后续增强项，而非起步必需。

---

## 附：本次引用的全部一手来源

- SQLite 官方《How To Corrupt An SQLite Database》：https://www.sqlite.org/howtocorrupt.html
- SQLite 官方《Write-Ahead Logging》：https://www.sqlite.org/wal.html
- Syncthing 官方文档《Syncing / Conflicting Changes》：https://docs.syncthing.net/users/syncing.html
- Syncthing 官方 FAQ：https://docs.syncthing.net/users/faq.html
- cr-sqlite 仓库与 Releases（最新 v0.16.3，2024-01-17）：https://github.com/vlcn-io/cr-sqlite 、https://github.com/vlcn-io/cr-sqlite/releases
- ElectricSQL 仓库（read-path sync engine for Postgres）：https://github.com/electric-sql/electric
- PowerSync 官方文档（架构 / 写回 / 自托管）：https://docs.powersync.com/ 、https://docs.powersync.com/handling-writes/writing-client-changes 、https://docs.powersync.com/intro/self-hosting
- PowerSync Service License（Apache-2.0）：https://github.com/powersync-ja/powersync-service （LICENSE 文件）
- Turso embedded replicas 官方文档：https://docs.turso.tech/features/embedded-replicas
- Turso 定价页（免费档配额）：https://turso.tech/pricing
- Supabase 定价页（免费档限制与闲置停机）：https://supabase.com/pricing
- Litestream 官网（WAL 流式备份）：https://litestream.io/
