const knex = require("../database/knex");

function toDateTime(value, fallback = null) {
  if (!value) return fallback;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return fallback;
  return d;
}

function formatDateTime(value) {
  if (!value) return null;
  const pad = (n) => String(n).padStart(2, "0");
  const y = value.getFullYear();
  const m = pad(value.getMonth() + 1);
  const d = pad(value.getDate());
  const h = pad(value.getHours());
  const min = pad(value.getMinutes());
  const s = pad(value.getSeconds());
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

async function listSales() {
  const rows = await knex("sales as s")
    .leftJoin("sale_details as sd", "s.sale_id", "sd.sale_id")
    .groupBy("s.sale_id")
    .select(
      "s.sale_id",
      "s.title",
      "s.content",
      "s.banner_url",
      "s.discount",
      "s.start_date",
      "s.end_date",
      knex.raw("COUNT(sd.product_id) as product_count")
    )
    .orderBy("s.start_date", "desc");
  return rows;
}

async function getSale(sale_id) {
  const sale = await knex("sales").where({ sale_id }).first();
  if (!sale) return null;

  const products = await knex("sale_details as sd")
    .join("products as p", "sd.product_id", "p.product_id")
    .leftJoin("categories as c", "p.category_id", "c.category_id")
    .leftJoin("brands as b", "p.brand_id", "b.brand_id")
    .where("sd.sale_id", sale_id)
    .select(
      "p.product_id",
      "p.title",
      "p.price",
      "p.thumbnail",
      "c.name as category",
      "b.name as brand"
    );

  return { ...sale, products };
}

async function createSale(payload = {}) {
  const {
    title,
    content = "",
    banner_url = null,
    discount = 0,
    start_date,
    end_date,
    product_ids = [],
  } = payload;

  if (!title) throw new Error("Title is required");
  const startDateObj = toDateTime(start_date);
  const endDateObj = toDateTime(end_date);
  if (!startDateObj || !endDateObj) {
    throw new Error("Start date and end date are required");
  }
  const formattedStart = formatDateTime(startDateObj);
  const formattedEnd = formatDateTime(endDateObj);

  return knex.transaction(async (trx) => {
    const insertPayload = {
      title,
      content,
      banner_url,
      discount: Number(discount) || 0,
      start_date: formattedStart,
      end_date: formattedEnd,
    };
    const insertResult = await trx("sales").insert(insertPayload);
    const sale_id =
      Array.isArray(insertResult) && insertResult.length
        ? insertResult[0]
        : insertResult?.insertId;
    if (!sale_id) {
      throw new Error("Failed to create sale");
    }

    const uniqueProductIds = [...new Set(product_ids.map(Number))].filter(Boolean);
    if (uniqueProductIds.length) {
      const rows = uniqueProductIds.map((pid) => ({
        sale_id,
        product_id: pid,
      }));
      await trx("sale_details").insert(rows);
    }

    return getSale(sale_id);
  });
}

async function updateSale(sale_id, payload = {}) {
  const existing = await knex("sales").where({ sale_id }).first();
  if (!existing) return null;

  const update = {};
  ["title", "content", "banner_url", "discount"].forEach((field) => {
    if (payload[field] !== undefined) {
      update[field] = payload[field];
    }
  });

  if (payload.start_date !== undefined) {
    const startDateObj = toDateTime(payload.start_date);
    if (startDateObj) update.start_date = formatDateTime(startDateObj);
  }
  if (payload.end_date !== undefined) {
    const endDateObj = toDateTime(payload.end_date);
    if (endDateObj) update.end_date = formatDateTime(endDateObj);
  }

  await knex.transaction(async (trx) => {
    if (Object.keys(update).length) {
      await trx("sales").where({ sale_id }).update(update);
    }

    if (payload.product_ids) {
      await trx("sale_details").where({ sale_id }).del();
      const uniqueProductIds = [...new Set(payload.product_ids.map(Number))].filter(
        Boolean
      );
      if (uniqueProductIds.length) {
        const rows = uniqueProductIds.map((pid) => ({
          sale_id,
          product_id: pid,
        }));
        await trx("sale_details").insert(rows);
      }
    }
  });

  return getSale(sale_id);
}

async function deleteSale(sale_id) {
  return knex.transaction(async (trx) => {
    await trx("sale_details").where({ sale_id }).del();
    return trx("sales").where({ sale_id }).del();
  });
}

module.exports = {
  listSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
};
