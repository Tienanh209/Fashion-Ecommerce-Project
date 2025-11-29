const knex = require("../database/knex");

function parseCurrency(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number(String(value).replace(/[^0-9.-]+/g, ""));
  if (!Number.isFinite(normalized)) return null;
  return Math.round(normalized);
}

let schemaReadyPromise = null;

async function ensurePurchaseOrderSchema() {
  if (schemaReadyPromise) return schemaReadyPromise;
  schemaReadyPromise = (async () => {
    const hasSuppliersTable = await knex.schema.hasTable("suppliers");
    if (!hasSuppliersTable) {
      await knex.schema.createTable("suppliers", (table) => {
        table.increments("supplier_id").primary();
        table.string("name", 255).notNullable();
        table.string("address", 255);
        table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      });
    }

    const hasSupplierColumn = await knex.schema.hasColumn(
      "inventory_imports",
      "supplier_id"
    );
    if (!hasSupplierColumn) {
      await knex.schema.alterTable("inventory_imports", (table) => {
        table.integer("supplier_id").unsigned().nullable();
      });
    }

    const hasPurchaseOrders = await knex.schema.hasTable("purchase_orders");
    if (!hasPurchaseOrders) {
      await knex.schema.createTable("purchase_orders", (table) => {
        table.increments("purchase_order_id").primary();
        table
          .integer("supplier_id")
          .unsigned()
          .notNullable()
          .references("supplier_id")
          .inTable("suppliers")
          .onDelete("CASCADE");
        table.text("note");
        table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      });
    }

    const hasPoColumn = await knex.schema.hasColumn(
      "inventory_imports",
      "purchase_order_id"
    );
    if (!hasPoColumn) {
      await knex.schema.alterTable("inventory_imports", (table) => {
        table.integer("purchase_order_id").unsigned().nullable();
      });
    }
  })()
    .catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });

  return schemaReadyPromise;
}

function orderError(message) {
  const error = new Error(message);
  error.isInventoryImport = true;
  return error;
}

async function ensureSupplierExists(supplier_id, trx = knex) {
    const supplier = await trx("suppliers")
      .select("supplier_id", "name")
      .where({ supplier_id })
      .first();
    if (!supplier) throw orderError("Supplier not found.");
    return supplier;
  }

async function ensureVariant(trx, variant_id) {
  const variant = await trx("product_variants")
    .where({ variant_id })
    .select("variant_id", "product_id", "sku", "size", "color", "stock")
    .first();
  if (!variant) throw orderError("Variant not found.");
  return variant;
}

async function createPurchaseOrder({ supplier_id, note = "", items = [] }) {
  await ensurePurchaseOrderSchema();
  const supplierId = Number(supplier_id);
  if (!Number.isFinite(supplierId) || supplierId <= 0) {
    throw orderError("Supplier ID is required.");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw orderError("At least one variant must be included.");
  }

  return knex.transaction(async (trx) => {
    await ensureSupplierExists(supplierId, trx);
    const [purchase_order_id] = await trx("purchase_orders").insert({
      supplier_id: supplierId,
      note: note ? String(note).trim() : null,
    });

    let totalQuantity = 0;
    const normalizedItems = [];

    for (const rawItem of items) {
      const variantId = Number(rawItem.variant_id);
      const qty = Number(rawItem.quantity);
      const cost = parseCurrency(rawItem.cost_price);
      const selling = parseCurrency(rawItem.selling_price);

      if (!Number.isFinite(variantId) || variantId <= 0) {
        throw orderError("Variant ID is required for each entry.");
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        throw orderError("Quantity must be greater than 0.");
      }
      if (cost === null || selling === null) {
        throw orderError("Cost and selling prices are required.");
      }
      if (cost >= selling) {
        throw orderError("Cost price must be lower than selling price.");
      }

      const variant = await ensureVariant(trx, variantId);
      const nextStock = Number(variant.stock || 0) + qty;
      await trx("product_variants")
        .where({ variant_id: variantId })
        .update({
          stock: nextStock,
          cost_price: cost,
          price: selling,
        });

      await trx("inventory_imports").insert({
        product_id: variant.product_id,
        variant_id: variantId,
        sku: variant.sku,
        size: variant.size || null,
        color: variant.color || null,
        quantity: qty,
        cost_price: cost,
        selling_price: selling,
        supplier_id: supplierId,
        purchase_order_id,
        source_file: null,
      });

      totalQuantity += qty;
      normalizedItems.push({
        variant_id: variantId,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        quantity: qty,
        cost_price: cost,
        selling_price: selling,
      });
    }

    return {
      purchase_order_id,
      supplier_id: supplierId,
      note: note ? String(note).trim() : "",
      total_items: normalizedItems.length,
      total_quantity: totalQuantity,
      items: normalizedItems,
    };
  });
}

async function listPurchaseOrders({ page = 1, limit = 25 } = {}) {
  await ensurePurchaseOrderSchema();
  const parsedPage = Number(page) > 0 ? Number(page) : 1;
  const parsedLimit = Number(limit) > 0 ? Number(limit) : 25;
  const offset = (parsedPage - 1) * parsedLimit;

  const rows = await knex("purchase_orders as po")
    .leftJoin("suppliers as s", "po.supplier_id", "s.supplier_id")
    .leftJoin("inventory_imports as ii", "po.purchase_order_id", "ii.purchase_order_id")
    .groupBy(
      "po.purchase_order_id",
      "po.created_at",
      "po.note",
      "s.supplier_id",
      "s.name",
      "s.address"
    )
    .orderBy("po.purchase_order_id", "desc")
    .select(
      "po.purchase_order_id",
      "po.created_at",
      "po.note",
      "s.supplier_id",
      "s.name as supplier_name",
      "s.address as supplier_address"
    )
    .select(knex.raw("COALESCE(SUM(ii.quantity),0) as total_quantity"))
    .select(knex.raw("COUNT(ii.import_id) as total_items"))
    .select(knex.raw("COALESCE(SUM(ii.quantity * COALESCE(ii.cost_price,0)),0) as total_cost"))
    .limit(parsedLimit)
    .offset(offset);

  return rows.map((row) => ({
    purchase_order_id: row.purchase_order_id,
    created_at: row.created_at,
    note: row.note,
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name,
    supplier_address: row.supplier_address,
    total_quantity: Number(row.total_quantity || 0),
    total_items: Number(row.total_items || 0),
    total_cost: Number(row.total_cost || 0),
  }));
}

async function getPurchaseOrder(purchase_order_id) {
  await ensurePurchaseOrderSchema();
  const order = await knex("purchase_orders as po")
    .leftJoin("suppliers as s", "po.supplier_id", "s.supplier_id")
    .select(
      "po.purchase_order_id",
      "po.created_at",
      "po.note",
      "s.supplier_id",
      "s.name as supplier_name",
      "s.address as supplier_address"
    )
    .where("po.purchase_order_id", purchase_order_id)
    .first();
  if (!order) return null;

  const items = await knex("inventory_imports as ii")
    .leftJoin("product_variants as pv", "ii.variant_id", "pv.variant_id")
    .leftJoin("products as p", "pv.product_id", "p.product_id")
    .select(
      "ii.import_id",
      "ii.variant_id",
      "ii.quantity",
      "ii.cost_price",
      "ii.selling_price",
      "pv.sku",
      "pv.size",
      "pv.color",
      "p.product_id",
      "p.title as product_title"
    )
    .where("ii.purchase_order_id", purchase_order_id)
    .orderBy("ii.import_id", "asc");

  return {
    ...order,
    items: items.map((item) => ({
      import_id: item.import_id,
      variant_id: item.variant_id,
      product_id: item.product_id,
      product_title: item.product_title,
      sku: item.sku,
      size: item.size,
      color: item.color,
      quantity: Number(item.quantity || 0),
      cost_price: Number(item.cost_price || 0),
      selling_price: Number(item.selling_price || 0),
    })),
  };
}

module.exports = {
  createPurchaseOrder,
  listPurchaseOrders,
  getPurchaseOrder,
};
