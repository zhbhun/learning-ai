# wayfinder:ledger-sync

Label: wayfinder:map

## Destination

一份"个人记账 CLI 多设备同步"方案 spec：选定同步架构、为同步而设计的数据模型（字段、主键、时间戳策略）、两端（电脑 CLI + 手机网页）如何交互、离线与冲突处理策略。实现不在本图内，spec 完成即到岸。

## Notes

- 域：单人使用的个人记账工具，数据在本地 SQLite，两台设备（电脑 CLI + 手机网页）。
- 手机端已定：最简网页，只有"记一笔"和"看最近流水"，不做 PWA、不做离线缓存。
- 离线口径：电脑 CLI 离线优先（SQLite 天然离线）；手机网页在线使用，不承诺离线。
- 已定决策：数据模型全新设计、不受旧 schema 约束；变更形态按"绝大多数只新增、偶尔改删"，冲突处理按每条记录 last-write-wins 起步。
- 服务器意愿、同步机制选型尚未定，见 tickets。
- 本图按 wayfinder 默认"规划不做"：产出决策与 spec，不产代码。唯一例外是原型 ticket（网页原型），它为决策服务，不是交付物。
- 本仓库的 tracker 约定见 `.scratch/`（local-markdown）；资产（研究笔记、原型）放 `.scratch/ledger-sync/assets/`，从 ticket 链接过去。

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [同步机制选型调研](issues/01-sync-mechanism.md): 四路线对比后推荐自托管小 API + 权威 SQLite（按行 LWW、手机网页直连）；文件层同步否决（SQLite 官方损坏警告），CRDT 引擎全部排除（停更/转型/错配），BaaS 留 Turso 作备胎。

## Not yet specified

- spec 的成文形式与存放位置（一份 `spec.md`？分节？）——等核心决策齐了再钉。
- 调研结论落地后仍开放：权威库的机器到底用哪台（等「部署形态与权威库定案」拍板时一并回答）。

## Out of scope

- 多用户/多人记账：目的地是单人工具的同步，多租户不在图内。
- 手机端 App（原生/跨端）与离线缓存（PWA）：用户已明确手机只做最简在线网页。
- 数据导入导出、报表统计等记账功能本身的演进：这是记账工具的路线，不是同步方案的路线。
