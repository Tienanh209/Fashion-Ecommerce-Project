import http from "./http";

export async function createPurchaseOrder(payload = {}) {
  const body = {
    supplier_id: payload.supplier_id,
    note: payload.note || "",
    items: Array.isArray(payload.items) ? payload.items : [],
  };
  const data = await http.postJSON("/purchase-orders", body);
  return data?.purchase_order;
}

export async function listPurchaseOrders(params = {}) {
  const query = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const data = await http.getJSON("/purchase-orders", { params: query });
  return data?.purchase_orders || [];
}

export async function getPurchaseOrder(orderId) {
  const data = await http.getJSON(`/purchase-orders/${orderId}`);
  return data?.purchase_order || null;
}
