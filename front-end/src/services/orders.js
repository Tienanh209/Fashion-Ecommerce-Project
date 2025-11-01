import http from "./http";

/** List orders for current user (or admin if user_id omitted) */
export function listOrders(params = {}) {
  // ví dụ: { page, limit, status, user_id }
  return http.getJSON("/orders", { params });
}

/** List orders of current user (helper) */
export function listMyOrders(user_id, params = {}) {
  const q = new URLSearchParams({ user_id, ...(params || {}) }).toString();
  return http.getJSON(`/orders?${q}`);
}

/** Get detail of an order */
export function getOrder(order_id) {
  return http.getJSON(`/orders/${order_id}`);
}

/** Checkout from user's cart */
export function checkout(user_id, payload) {
  // payload: { address, note }
  return http.postJSON(`/orders/${user_id}/checkout`, payload);
}

/** Cancel order (only pending) */
export function cancelOrder(order_id) {
  return http.deleteJSON(`/orders/${order_id}`);
}

/** Update order status (admin or internal usage) */
export function updateOrderStatus(order_id, status) {
  // status: 'paid' | 'shipped' | 'completed' | 'cancelled' | ...
  return http.patchJSON(`/orders/${order_id}/status`, { status });
}
