# 备份与保留策略

Type: grilling
Status: open
Label: wayfinder:grilling
Blocked by: 02

## Question

权威库定案后的备份与保留策略：

1. 机制：是否采纳调研推荐的 Litestream（流式 WAL 到对象存储），还是定时 `VACUUM INTO`/dump 更符合单人规模？要不要备份本身也可不做的判断（数据可否接受丢失）。
2. 保留：保留几个版本、保留多久。
3. 恢复：恢复流程是否写进 spec，要不要一次恢复演练验证可行性。

前置：权威库位置由「部署形态与权威库定案」决定；调研推荐（Litestream）见「同步机制选型调研」。

## Answer

（待解决后记录）
