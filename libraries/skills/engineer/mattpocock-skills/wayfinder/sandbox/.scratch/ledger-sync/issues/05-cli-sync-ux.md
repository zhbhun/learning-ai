# CLI 同步体验设计

Type: grilling
Status: open
Label: wayfinder:grilling
Blocked by: 02

## Question

电脑 CLI 侧的同步体验：

1. 命令形态：手动 `ledger sync`，还是启动/退出时自动同步，还是定时？
2. 同步中的反馈：进度、结果摘要（几条上行/下行）怎么呈现？
3. 冲突发生时（LWW 裁掉了本地改动）CLI 要不要提示、怎么提示？
4. 离线时记账零感知，联网后第一次 sync 的补同步行为。

前置：同步拓扑已定（「部署形态与权威库定案」），机制决定 push/pull 的具体形态。

## Answer

（待解决后记录）
