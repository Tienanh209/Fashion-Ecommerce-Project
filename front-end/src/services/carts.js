// src/services/carts.js
import http from "./http";

/**
 * BE (carts.router.js):
 *  GET    /carts/:user_id
 *  POST   /carts/:user_id/items            { variant_id, quantity }
 *  PATCH  /carts/:user_id/items/:item_id   { quantity }
 *  DELETE /carts/:user_id/items/:item_id
 *  DELETE /carts/:user_id                  (clear all)
 */

export const getCart = async (user_id) => {
  const res = await http.getJSON(`/carts/${user_id}`);

  // cart_items có dạng { items: [...] } theo BE của bạn
  const items = res?.cart_items?.items ?? res?.cart_items ?? res?.items ?? [];

  const summaryRaw = res?.summary ?? res ?? {};
  const summary = {
    subtotal: Number(summaryRaw?.subtotal ?? res?.subtotal ?? 0),
    discount: Number(summaryRaw?.discount ?? res?.discount ?? 0),
    delivery_fee: Number(summaryRaw?.delivery_fee ?? res?.delivery_fee ?? 0),
    total: Number(summaryRaw?.total ?? res?.total ?? 0),
  };

  return {
    items: Array.isArray(items) ? items : [],
    summary,
    raw: res,
  };
};

export const addItem = (user_id, { variant_id, quantity }) =>
  http.postJSON(`/carts/${user_id}/items`, {
    variant_id: Number(variant_id),
    quantity: Number(quantity || 1),
  });

export const updateItem = (user_id, cart_item_id, quantity) =>
  http.patchJSON(`/carts/${user_id}/items/${cart_item_id}`, {
    quantity: Number(quantity),
  });

export const removeItem = (user_id, cart_item_id) =>
  http.deleteJSON(`/carts/${user_id}/items/${cart_item_id}`);

export const clearCart = (user_id) => http.deleteJSON(`/carts/${user_id}`);
