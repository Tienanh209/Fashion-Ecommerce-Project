const knex = require("../database/knex");

async function getActiveSaleDiscount(product_id, trx = knex) {
  const row = await trx("sale_details as sd")
    .join("sales as s", "sd.sale_id", "s.sale_id")
    .where("sd.product_id", product_id)
    .where("s.start_date", "<=", trx.fn.now())
    .where("s.end_date", ">=", trx.fn.now())
    .max({ discount: "s.discount" })
    .first();
  const value = Number(row?.discount);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function computeSnapshotPrice(variant_id, trx = knex) {
  const row = await trx("product_variants as v")
    .join("products as p", "v.product_id", "p.product_id")
    .where("v.variant_id", variant_id)
    .select("v.price as variant_price", "p.price as product_price", "p.product_id")
    .first();
  if (!row) return null;

  const basePrice =
    row.variant_price != null ? row.variant_price : row.product_price;
  const saleDiscount = await getActiveSaleDiscount(row.product_id, trx);
  const finalPrice =
    saleDiscount > 0
      ? Math.max(
          0,
          Math.round(Number(basePrice) - (Number(basePrice) * saleDiscount) / 100)
        )
      : Math.round(Number(basePrice));
  return finalPrice;
}

// GET /carts/:user_id
async function getCartItems(user_id) {
  const items = await knex("cart_items").where({ user_id });
  if (!items) return { user_id, items: [] };

  return { user_id, items };
}

// POST /carts/:user_id/items
async function addItem(user_id, { variant_id, quantity }) {
  return knex.transaction(async (trx) => {
    const exist = await trx("cart_items")
      .where({ user_id, variant_id })
      .first();
    if (exist) {
      await trx("cart_items")
        .where({ cart_item_id: exist.cart_item_id })
        .update({ quantity: exist.quantity + quantity });
    } else {
      const price_snapshot = await computeSnapshotPrice(variant_id, trx);
      if (price_snapshot == null)
        throw new Error(`Variant not found: ${variant_id}`);
      await trx("cart_items").insert({
        user_id,
        variant_id,
        quantity,
        price_snapshot,
      });
    }
    return getCartItems(user_id);
  });
}

// PATCH /carts/:user_id/items/:cart_item_id
async function updateItem(user_id, cart_item_id, { quantity }) {
  const row = await knex("cart_items").where({ cart_item_id, user_id }).first();
  if (!row) return null;

  if (quantity <= 0) await knex("cart_items").where({ cart_item_id }).del();
  else await knex("cart_items").where({ cart_item_id }).update({ quantity });

  return getCartItems(user_id);
}

// DELETE /carts/:user_id/items/:cart_item_id
async function removeItem(user_id, cart_item_id) {
  const deleted = await knex("cart_items")
    .where({ cart_item_id, user_id })
    .del();
  return deleted > 0;
}

// DELETE /carts/:user_id
async function clearCart(user_id) {
  await knex("cart_items").where({ user_id }).del();
  return true;
}

module.exports = {
  getCartItems,
  addItem,
  updateItem,
  removeItem,
  clearCart,
};
