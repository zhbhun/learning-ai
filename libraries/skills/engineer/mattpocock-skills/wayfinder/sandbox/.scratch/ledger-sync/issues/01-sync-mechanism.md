# 同步机制选型调研

Type: research
Status: resolved
Label: wayfinder:research

## Question

调研"个人记账数据（本地 SQLite）在电脑 CLI 与手机网页两设备间同步"的机制选型。已定约束：单用户、无多租户；冲突处理按每条记录 last-write-wins 起步；电脑 CLI 离线优先，手机网页在线使用（最简网页，无离线缓存）。

对比至少四条路线，逐一说明机制、运维成本、风险与对上述约束的契合度：

1. 自托管中心服务：小 API + 权威 SQLite（或服务端库）
2. 托管 BaaS：Supabase / Turso / 同类免费档
3. 文件层同步：Syncthing 等直接同步 SQLite 文件（注意 SQLite 对网络文件系统的官方警告、WAL 模式影响）
4. CRDT/嵌入式同步引擎：cr-sqlite、ElectricSQL、PowerSync、Turso embedded replicas 等

只依据一手来源（官方文档、源码、spec），每条结论注明出处；注意核实各项目当前维护状态（今日为 2026-11-05）。

产出：对比结论 + 一个带理由的推荐，供后续「部署形态与权威库定案」决策使用。发现写入 `.scratch/ledger-sync/assets/sync-mechanism-research.md`。

## Answer

**推荐：自托管小 API + 服务端权威 SQLite**。CLI 本地是普通 SQLite 副本 + 增量同步（每条记录 `updated_at` LWW），手机网页在线直连该 API 读写权威库（无本地副本，天然无冲突面）。

四条路线结论：

1. **自托管中心服务**——机制、冲突语义、离线优先与两设备形态全部精确契合；代价是照顾一台常驻机器（备份用 Litestream 流式 WAL 到对象存储解决）。**推荐。**
2. **托管 BaaS 免费档**——运维最省，但 Turso 可行（免费配额对单用户绰绰有余）、Supabase 有硬伤（免费项目闲置 7 天自动停机，与低频记账的真实用法冲突）；本质是"数据自持 vs 零运维"的取舍，留作备胎。
3. **文件层同步（Syncthing 直接同步 .db）——否决**。SQLite 官方 howtocorrupt 文档点名网络文件系统锁不可靠、拆散 .db 与 -wal/-journal 会丢事务或损坏；WAL 文档明言跨主机不工作；Syncthing 冲突语义是文件级改名留档（.sync-conflict），根本做不了按行 LWW。
4. **CRDT/嵌入式同步引擎——全部排除**。cr-sqlite 最新 release 停在 2024-01-17（近 22 个月无发版，维护停滞）；ElectricSQL 已转型为"Postgres 只读同步引擎"（read-path，源库不支持 SQLite）；PowerSync 工程完备（Apache-2.0 可自托管）但源库不支持 SQLite 且要求额外 Postgres + 写回 API，单用户场景规模严重错配；Turso embedded replicas 技术契合但绑死 Turso 平台，只值得作为后续增强项。

详见 [sync-mechanism-research.md](../assets/sync-mechanism-research.md)（全部结论附一手来源链接；已提交至 `research/sync-mechanism` 分支）。
