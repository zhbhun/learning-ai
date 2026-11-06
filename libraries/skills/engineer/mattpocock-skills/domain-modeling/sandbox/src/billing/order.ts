export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalCents: number;
  status: OrderStatus;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPriceCents: number;
}

export function cancelEntireOrder(order: Order): Order {
  if (order.status === "shipped" || order.status === "delivered") {
    throw new Error("cannot cancel a shipped order");
  }
  return { ...order, status: "cancelled" };
}
