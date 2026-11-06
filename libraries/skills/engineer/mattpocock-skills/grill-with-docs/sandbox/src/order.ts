// 订单取消:支持整单取消与行级取消(行级取消作用于整行,数量不拆分)
export type OrderStatus = "pending" | "cancelled" | "shipped";

// 行没有 shipped 取值:发货是整单级概念
export type ItemStatus = "pending" | "cancelled";

export interface Order {
  id: string;
  items: OrderItem[];
  status: OrderStatus;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  status: ItemStatus;
}

// 整单取消:级联翻转所有 pending 行。
// 不变量:order.status === "cancelled" 当且仅当所有行都已取消。
export function cancelOrder(order: Order): Order {
  if (order.status !== "pending") {
    throw new Error("only pending orders can be cancelled");
  }
  return {
    ...order,
    status: "cancelled",
    items: order.items.map((item) =>
      item.status === "pending" ? { ...item, status: "cancelled" } : item
    ),
  };
}

// 行级取消:只取消指定的一行,其余行保持不变;
// 若这是最后一行 pending 行,整单状态联动为 cancelled。
export function cancelOrderItem(order: Order, itemId: string): Order {
  if (order.status !== "pending") {
    throw new Error("only pending orders can be cancelled");
  }
  const target = order.items.find((item) => item.id === itemId);
  if (!target) {
    throw new Error(`order item ${itemId} not found`);
  }
  if (target.status === "cancelled") {
    throw new Error(`order item ${itemId} is already cancelled`);
  }
  const items = order.items.map((item) =>
    item.id === itemId ? { ...item, status: "cancelled" as const } : item
  );
  const allCancelled = items.every((item) => item.status === "cancelled");
  return {
    ...order,
    items,
    status: allCancelled ? "cancelled" : order.status,
  };
}
