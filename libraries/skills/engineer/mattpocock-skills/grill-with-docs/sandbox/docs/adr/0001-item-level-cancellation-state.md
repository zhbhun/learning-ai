# 取消状态双轨:行持有取消状态,整单状态只管履约

部分取消要求"订单里哪几行被取消了"成为可查询的事实,而现有 Order.status(pending/cancelled/shipped)表达的是履约生命周期,两者语义不同。我们决定让每个 OrderItem 持有自己的 status(pending/cancelled),Order.status 继续只表达履约生命周期,互不代位:行状态不试图表达整单取消,整单状态不试图记录哪几行取消了。两条联动规则维持不变量 `order.status === "cancelled"` 当且仅当所有行已取消:整单取消级联翻转所有 pending 行;行级取消翻掉最后一行 pending 行时把整单置为 cancelled。取消门槛保持仅 pending 订单可取消,因此行状态无需 shipped 取值。

## Considered Options

- **Order 持有 cancelledItemIds,item 无状态**:省掉一个字段,但"行已被取消"要跨对象推导,行自己不完整,且所有取消记账集中在一处数组,容易被绕过。落选。
- **Order.status 增加 partially_cancelled**:单一状态说不清哪几行取消,仍需另存明细,等于回到上一方案再加一个易漂移的冗余标志。落选。
