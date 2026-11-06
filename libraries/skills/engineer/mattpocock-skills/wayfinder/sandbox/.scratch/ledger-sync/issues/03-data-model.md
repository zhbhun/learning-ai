# 同步友好的数据模型

Type: grilling
Status: open
Label: wayfinder:grilling
Blocked by: 02

## Question

为同步而设计记账数据模型，需定：

1. 主键策略：UUID（哪种版本）替代自增 id，两端可各自生成。
2. 时间戳字段：`updated_at` 的精度与时钟来源（设备时钟偏差对 LWW 的影响，要不要逻辑时钟）。
3. 删除语义：硬删除 vs tombstone（软删）——LWW 下删除如何不被"复活"。
4. 哪些表参与同步：流水条目之外，分类、账户等配置表是否也同步，冲突语义是否不同。
5. schema 变更如何同步到两端（迁移在 CLI 与手机网页后端各跑一份还是共享权威库 schema）。

前置：同步拓扑已定（「部署形态与权威库定案」），LWW 已定，按此细化。

## Answer

（待解决后记录）
