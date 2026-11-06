# 订单(Ordering)

订单模块的领域语言:一张订单由若干订单行组成;取消既可以作用于整单,也可以单独作用于其中一行;发货始终是整单级概念。

## Language

**Order**:
一张客户订单,由若干 OrderItem 组成,持有整单的履约状态。
_Avoid_: Purchase, transaction

**OrderItem**:
订单中的一行,对应一种商品及其数量与单价;取消作用于整行,数量不拆分。
_Avoid_: 商品(Product 指 catalog 里的商品,订单行通过 productId 引用它)、line item

**Order Status**:
整单的履约生命周期状态:pending → shipped,或 pending → cancelled。它不代表任何一行的取消情况。
_Avoid_: 用整单状态表达部分取消

**Item Status**:
订单行自己的取消状态,取值仅 pending / cancelled。行没有 shipped 取值。
_Avoid_: 行状态、订单状态混用

**Whole-Order Cancellation(整单取消)**:
取消整张订单:整单状态置为 cancelled,所有 pending 行级联置为 cancelled。
_Avoid_: 全部取消、取消订单(与行级取消对举时含糊)

**Item Cancellation(行级取消)**:
单独取消订单中的一行,其余行保持不变;若这是最后一行 pending 行,整单状态联动为 cancelled。
_Avoid_: 部分取消(含糊,易被读成按数量取消)、单品取消
