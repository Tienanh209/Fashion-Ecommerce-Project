// services/orders.service.js
const knex = require("../database/knex");
const Paginator = require("./paginator");
const { ACTIVE_SALE_DISCOUNT } = require("./products.service");

const ORDER_STATUS = ["pending", "paid", "shipped", "completed", "cancelled"];

function ordersQueryBase() {
  return knex("orders as o")
    .join("users as u", "o.user_id", "u.user_id")
    .select(
      "o.order_id",
      "o.user_id",
      "u.fullname as user_fullname",
      "u.email as user_email",
      "o.address",
      "o.note",
      "o.status",
      "o.total_price",
      "o.created_at",
      "o.updated_at"
    );
}

async function getOrderItems(order_id, trx = knex) {
  return trx("order_items as oi")
    .leftJoin("product_variants as v", "oi.variant_id", "v.variant_id")
    .leftJoin("products as p", "v.product_id", "p.product_id")
    .leftJoin("categories as c", "p.category_id", "c.category_id")
    .select(
      "oi.order_item_id",
      "oi.variant_id",
      "v.product_id",
      "oi.quantity",
      "oi.price",
      "v.price as variant_price",
      "v.size",
      "v.color",
      "v.sku",
      "p.price as product_price",
      knex.raw(`${ACTIVE_SALE_DISCOUNT} AS product_discount`),
      "p.title as product_title",
      "p.thumbnail as product_thumbnail",
      "p.category_id",
      "c.name as category_name"
    )
    .where("oi.order_id", order_id);
}

// GET: /orders
async function listOrders(query) {
  const { status, user_id, page = 1, limit = 12 } = query || {};
  const paginator = new Paginator(page, limit);

  let rows = await ordersQueryBase()
    .where((qb) => {
      if (status) qb.where("o.status", status);
      if (user_id) qb.where("o.user_id", user_id);
    })
    .select(knex.raw("COUNT(*) OVER() AS recordCount"))
    .orderBy("o.order_id", "desc")
    .limit(paginator.limit)
    .offset(paginator.offset);

  const totalRecords = rows[0] ? Number(rows[0].recordCount) : 0;
  for (const r of rows) delete r.recordCount;

  return { metadata: paginator.getMetadata(totalRecords), orders: rows };
}

// GET: /orders/:order_id
async function getOrder(order_id) {
  const order = await ordersQueryBase().where("o.order_id", order_id).first();
  if (!order) return null;
  const items = await getOrderItems(order_id);
  return { ...order, items };
}

// POST: /orders/:user_id (create from user's cart)
async function createFromCart(user_id, payload) {
  const { address, note = null } = payload || {};
  if (!address || typeof address !== "string")
    throw new Error("Address is required");

  return knex.transaction(async (trx) => {
    // read cart
    const cartItems = await trx("cart_items").where({ user_id });
    if (!cartItems || cartItems.length === 0) throw new Error("Cart is empty");

    const total = cartItems.reduce(
      (sum, it) => sum + Number(it.price_snapshot) * Number(it.quantity),
      0
    );

    const [order_id] = await trx("orders").insert({
      user_id,
      address,
      note,
      status: "pending",
      total_price: Math.round(total),
    });

    const orderItems = cartItems.map((it) => ({
      order_id,
      variant_id: it.variant_id,
      quantity: it.quantity,
      price: it.price_snapshot,
    }));

    if (orderItems.length) await trx("order_items").insert(orderItems);

    // clear cart
    await trx("cart_items").where({ user_id }).del();

    const created = await ordersQueryBase()
      .where("o.order_id", order_id)
      .first();
    const items = await getOrderItems(order_id, trx);
    return { ...created, items };
  });
}

// PATCH: /orders/:order_id/status
async function updateStatus(order_id, status) {
  if (!ORDER_STATUS.includes(status)) return null;
  const existing = await knex("orders").where({ order_id }).first();
  if (!existing) return null;
  await knex("orders").where({ order_id }).update({ status });
  return getOrder(order_id);
}

// DELETE /orders/:order_id
async function cancelOrder(order_id) {
  const existing = await knex("orders").where({ order_id }).first();
  if (!existing) return null;
  if (existing.status !== "pending") {
    // only pending orders can be cancelled
    throw new Error("Only pending orders can be cancelled");
  }
  await knex("orders").where({ order_id }).update({ status: "cancelled" });
  return true;
}

module.exports = {
  listOrders,
  getOrder,
  createFromCart,
  updateStatus,
  cancelOrder,
  ORDER_STATUS,
};
