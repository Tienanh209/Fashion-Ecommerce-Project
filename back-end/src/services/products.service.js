const knex = require("../database/knex");
const Paginator = require("./paginator");
const { unlink } = require("node:fs");

function productWithCategoryBrand() {
  return knex("products as p")
    .leftJoin("categories as c", "p.category_id", "c.category_id")
    .leftJoin("brands as b", "p.brand_id", "b.brand_id")
    .select(
      "p.product_id",
      "p.category_id",
      "c.name as category",
      "p.title",
      "p.gender",
      "p.description",
      "p.material",
      "p.price",
      "p.discount",
      "p.thumbnail",
      "b.brand_id",
      "b.name as brand"
    );
}

async function convertCategoryId(category) {
  if (category == null) return null;
  const row = await knex("categories")
    .select("category_id")
    .where("name", category)
    .first();
  if (!row) throw new Error(`Category not found: ${category}`);
  return row.category_id;
}

async function convertBrandId(brand, brand_id) {
  if (brand_id) return brand_id;
  if (brand == null) return null;
  const row = await knex("brands")
    .select("brand_id")
    .where("name", brand)
    .first();
  if (!row) throw new Error(`Brand not found: ${brand}`);
  return row.brand_id;
}

async function readProduct(payload) {
  const {
    category,
    category_id,
    title,
    description,
    material,
    price,
    discount = 0,
    thumbnail = null,
    gender = "unisex",
    brand,
    brand_id,
  } = payload;

  const resolved_category_id =
    category_id ?? (category ? await convertCategoryId(category) : null);
  const resolved_brand_id = await convertBrandId(brand, brand_id);
  const cleanedMaterial =
    material === undefined
      ? undefined
      : material === null
      ? null
      : String(material).trim();

  const result = {
    category_id: resolved_category_id,
    brand_id: resolved_brand_id,
    title,
    gender,
    description,
    price,
    discount,
    thumbnail,
  };

  if (cleanedMaterial !== undefined) {
    result.material = cleanedMaterial || null;
  }

  return result;
}

// GET: /products
async function getManyProducts(query) {
  const {
    title,
    category,
    page = 1,
    limit = 12,
    gender,
    brand,
    brand_id,
  } = query;
  const paginator = new Paginator(page, limit);

  let results = await productWithCategoryBrand()
    .where((qb) => {
      if (title) qb.where("p.title", "like", `%${title}%`);
      if (category) qb.where("c.name", "like", `%${category}%`);
      if (gender) qb.where("p.gender", gender);
      if (brand_id) qb.where("p.brand_id", brand_id);
      if (brand) qb.where("b.name", "like", `%${brand}%`);
    })
    .select(knex.raw("COUNT(*) OVER() AS recordCount"))
    .orderBy("p.product_id", "desc")
    .limit(paginator.limit)
    .offset(paginator.offset);

  const totalRecords = results[0] ? Number(results[0].recordCount) : 0;
  results = results.map((row) => {
    const cloned = { ...row };
    delete cloned.recordCount;
    return cloned;
  });

  return {
    metadata: paginator.getMetadata(totalRecords),
    products: results,
  };
}

// GET: /products/:product_id
async function getProduct(product_id) {
  const product = await productWithCategoryBrand()
    .where("p.product_id", product_id)
    .first();
  if (!product) return null;

  const [variants, galleries] = await Promise.all([
    knex("product_variants")
      .where({ product_id })
      .select(
        "variant_id",
        "product_id",
        "size",
        "color",
        "sku",
        "price",
        "stock"
      ),
    knex("galleries").where({ product_id }),
  ]);

  return { ...product, variants, galleries };
}

// NEW: GET /products/variants/:variant_id
async function getVariant(variant_id) {
  const row = await knex("product_variants as v")
    .leftJoin("products as p", "v.product_id", "p.product_id")
    .select(
      "v.variant_id",
      "v.product_id",
      "v.size",
      "v.color",
      "v.sku",
      "v.price",
      "v.stock",
      "p.title as product_title",
      "p.thumbnail as product_thumbnail"
    )
    .where("v.variant_id", variant_id)
    .first();
  return row || null;
}

// GET: /products/variants/:variant_id/details
async function getProductsByVariantId(variant_id) {
  const variant = await knex("product_variants")
    .select(
      "variant_id",
      "product_id",
      "size",
      "color",
      "sku",
      "price",
      "stock"
    )
    .where({ variant_id })
    .first();
  if (!variant) return null;

  const productPromise = productWithCategoryBrand()
    .where("p.product_id", variant.product_id)
    .first();
  const galleriesPromise = knex("galleries")
    .where({ product_id: variant.product_id })
    .select("gallery_id", "product_id", "thumbnail");

  const [product, galleries] = await Promise.all([
    productPromise,
    galleriesPromise,
  ]);

  if (!product) return null;

  return { product, variant, galleries };
}

// POST: /products
async function addProduct(payload) {
  const product = await readProduct(payload);
  const [id] = await knex("products").insert(product);
  return { product_id: id, ...product };
}

// PUT /products/:product_id
async function updateProduct(product_id, payload) {
  const current = await knex("products")
    .where("product_id", product_id)
    .select("*")
    .first();
  if (!current) return null;

  const update = await readProduct(payload);
  if (!update.thumbnail) delete update.thumbnail;

  await knex("products").where("product_id", product_id).update(update);

  if (
    update.thumbnail &&
    current.thumbnail &&
    update.thumbnail !== current.thumbnail &&
    current.thumbnail.startsWith("/public/uploads")
  ) {
    unlink(`.${current.thumbnail}`, () => {});
  }
  return { ...current, ...update };
}

// DELETE /products/:product_id
async function deleteProduct(product_id) {
  return knex.transaction(async (trx) => {
    await trx("product_variants").where({ product_id }).del();
    await trx("galleries").where({ product_id }).del();
    return trx("products").where({ product_id }).del();
  });
}

// Variants
async function addVariant(product_id, payload) {
  const [variant_id] = await knex("product_variants").insert({
    product_id,
    ...payload,
  });
  return knex("product_variants").where({ variant_id }).first();
}

async function updateVariant(variant_id, payload = {}) {
  const existing = await knex("product_variants").where({ variant_id }).first();
  if (!existing) return null;

  const update = {};
  if (payload.size !== undefined) update.size = payload.size || null;
  if (payload.color !== undefined) update.color = payload.color || null;
  if (payload.sku !== undefined && payload.sku !== null) {
    update.sku = payload.sku;
  }
  if (payload.price !== undefined) {
    update.price =
      payload.price === null || payload.price === ""
        ? null
        : Number(payload.price);
  }
  if (payload.stock !== undefined) {
    update.stock = Number(payload.stock) || 0;
  }

  if (Object.keys(update).length === 0) return existing;

  await knex("product_variants").where({ variant_id }).update(update);

  return { ...existing, ...update };
}

async function deleteVariant(variant_id) {
  return knex("product_variants").where({ variant_id }).del();
}

// Galleries
async function addGallery(product_id, payload) {
  const [gallery_id] = await knex("galleries").insert({
    product_id,
    ...payload,
  });
  return knex("galleries").where({ gallery_id }).first();
}

async function deleteGallery(gallery_id) {
  return knex("galleries").where({ gallery_id }).del();
}

module.exports = {
  getManyProducts,
  getProduct,
  getVariant, // <— export mới
  getProductsByVariantId,
  addProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  addGallery,
  deleteGallery,
};
