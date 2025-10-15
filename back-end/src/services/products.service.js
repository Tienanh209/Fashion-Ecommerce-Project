const knex = require("../database/knex");
const Paginator = require("./paginator");
const { unlink } = require("node:fs");

function productWithCategoryBrand() {
  return knex("products as p")
    .leftJoin("categories as c", "p.category_id", "c.category_id")
    .leftJoin("brands as b", "p.brand_id", "b.brand_id")
    .select(
      "p.product_id",
      "c.name as category",
      "p.title",
      "p.gender",
      "p.description",
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
    title,
    description,
    price,
    discount = 0,
    thumbnail = null,
    gender = "unisex",
    brand,
    brand_id,
  } = payload;

  const category_id = await convertCategoryId(category);
  const resolved_brand_id = await convertBrandId(brand, brand_id);

  return {
    category_id,
    brand_id: resolved_brand_id,
    title,
    gender,
    description,
    price,
    discount,
    thumbnail,
  };
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
  for (const r of results) delete r.recordCount;

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
  addProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  deleteVariant,
  addGallery,
  deleteGallery,
};
