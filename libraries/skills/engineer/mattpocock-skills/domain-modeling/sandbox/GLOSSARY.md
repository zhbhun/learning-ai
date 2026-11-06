# Billing

管理订单生命周期与取消的模块。这里的词是团队口头讨论、代码命名和产品沟通的统一用语。

## Language

**Order**:
客户一次下单产生的整体,由一个或多个 OrderItem 组成。
_Avoid_: purchase, transaction

**OrderItem**:
Order 中的一种商品及其数量与单价,是取消的最小单位。
_Avoid_: line item, product

### People

**Customer**:
下单并为之付费的一方,订单通过 customerId 关联它。与谁能登录无关。
_Avoid_: account, buyer, client

**User**:
登录身份,属于账号体系,不是 billing 的概念。说 "account" 之前,先想清楚指的是 Customer 还是 User。
_Avoid_: account

### Cancellation

**Cancellation**:
把整个 Order 作废,其全部 OrderItem 一并失效。
_Avoid_: refund, close

**Item Cancellation**:
把 Order 中选定的 OrderItem 作废,其余 OrderItem 不受影响。
_Avoid_: partial refund
