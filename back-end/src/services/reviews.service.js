const knex = require("../database/knex");
const Paginator = require("./paginator");

const REVIEW_STATUS = ["pending", "approved", "rejected"];

function reviewsBaseQuery() {
  return knex("reviews as r")
    .join("users as u", "r.user_id", "u.user_id")
    .join("products as p", "r.product_id", "p.product_id")
    .select(
      "r.review_id",
      "r.user_id",
      "u.fullname as user_fullname",
      "u.email as user_email",
      "r.product_id",
      "p.title as product_title",
      "r.order_item_id",
      "r.rating",
      "r.title",
      "r.content",
      "r.status",
      "r.created_at",
      "r.updated_at"
    );
}

// GET /reviews
async function listReviews(query) {
  const {
    product_id,
    user_id,
    status,
    rating,
    page = 1,
    limit = 12,
  } = query || {};
  const paginator = new Paginator(page, limit);

  let rows = await reviewsBaseQuery()
    .where((qb) => {
      if (product_id) qb.where("r.product_id", product_id);
      if (user_id) qb.where("r.user_id", user_id);
      if (status) qb.where("r.status", status);
      if (rating) qb.where("r.rating", rating);
    })
    .select(knex.raw("COUNT(*) OVER() AS recordCount"))
    .orderBy("r.review_id", "desc")
    .limit(paginator.limit)
    .offset(paginator.offset);

  const totalRecords = rows[0] ? Number(rows[0].recordCount) : 0;
  for (const r of rows) delete r.recordCount;

  return { metadata: paginator.getMetadata(totalRecords), reviews: rows };
}

// GET /reviews/:review_id
async function getReview(review_id) {
  return reviewsBaseQuery().where("r.review_id", review_id).first();
}

function readReviewPayload(payload) {
  const {
    product_id,
    rating,
    title = null,
    content = null,
    order_item_id = null,
  } = payload || {};
  return { product_id, rating, title, content, order_item_id };
}

async function validateBuyerIfProvided(
  user_id,
  product_id,
  order_item_id,
  trx
) {
  if (!order_item_id) return true;
  const row = await trx("order_items as oi")
    .join("orders as o", "oi.order_id", "o.order_id")
    .join("product_variants as v", "oi.variant_id", "v.variant_id")
    .where("oi.order_item_id", order_item_id)
    .select("o.user_id as buyer_id", "v.product_id")
    .first();
  if (!row) return false;
  return (
    Number(row.buyer_id) === Number(user_id) &&
    Number(row.product_id) === Number(product_id)
  );
}

// POST /reviews/:user_id
async function addReview(user_id, payload) {
  const data = readReviewPayload(payload);
  if (!data?.product_id) throw new Error("product_id is required");
  if (!data?.rating || data.rating < 1 || data.rating > 5)
    throw new Error("rating must be 1..5");

  return knex.transaction(async (trx) => {
    // ensure product exists
    const product = await trx("products")
      .where({ product_id: data.product_id })
      .first();
    if (!product) throw new Error("Product not found");

    // validate buyer for given order_item_id (if present)
    const okBuyer = await validateBuyerIfProvided(
      user_id,
      data.product_id,
      data.order_item_id,
      trx
    );
    if (!okBuyer)
      throw new Error("order_item_id invalid for this user/product");

    const insertData = {
      user_id,
      product_id: data.product_id,
      order_item_id: data.order_item_id || null,
      rating: Math.round(Number(data.rating)),
      title: data.title,
      content: data.content,
      status: "pending",
    };

    const [review_id] = await trx("reviews").insert(insertData);
    return getReview(review_id);
  });
}

// PATCH /reviews/:review_id
async function updateReview(review_id, user_id, payload) {
  const existing = await knex("reviews").where({ review_id }).first();
  if (!existing) return null;
  if (Number(existing.user_id) !== Number(user_id))
    throw new Error("Forbidden: cannot edit others' review");

  const patch = {};
  if (payload?.rating != null) {
    const r = Number(payload.rating);
    if (r < 1 || r > 5) throw new Error("rating must be 1..5");
    patch.rating = Math.round(r);
  }
  if (payload?.title !== undefined) patch.title = payload.title;
  if (payload?.content !== undefined) patch.content = payload.content;

  if (Object.keys(patch).length === 0) return getReview(review_id);

  await knex("reviews").where({ review_id }).update(patch);
  return getReview(review_id);
}

// DELETE /reviews/:review_id
async function deleteReview(review_id, user_id = null) {
  const existing = await knex("reviews").where({ review_id }).first();
  if (!existing) return null;
  if (user_id && Number(existing.user_id) !== Number(user_id))
    throw new Error("Forbidden: cannot delete others' review");
  await knex("reviews").where({ review_id }).del();
  return existing;
}

// PATCH /reviews/:review_id/status
async function updateStatus(review_id, status) {
  if (!REVIEW_STATUS.includes(status)) return null;
  const existing = await knex("reviews").where({ review_id }).first();
  if (!existing) return null;
  await knex("reviews").where({ review_id }).update({ status });
  return getReview(review_id);
}

// GET /reviews/summary/:product_id
async function summaryByProduct(product_id) {
  const rows = await knex("reviews")
    .where({ product_id, status: "approved" })
    .groupBy("rating")
    .select("rating")
    .count({ count: "review_id" });
  const total = rows.reduce((s, r) => s + Number(r.count), 0);
  const avgRow = await knex("reviews")
    .where({ product_id, status: "approved" })
    .avg({ avgRating: "rating" })
    .first();
  const average = avgRow?.avgRating ? Number(avgRow.avgRating) : 0;
  return {
    product_id,
    total,
    average,
    breakdown: rows,
  };
}

module.exports = {
  listReviews,
  getReview,
  addReview,
  updateReview,
  deleteReview,
  updateStatus,
  summaryByProduct,
  REVIEW_STATUS,
};
