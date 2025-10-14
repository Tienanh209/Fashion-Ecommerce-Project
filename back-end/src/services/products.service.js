const knex = require("../database/knex");
const Paginator = require("./paginator");
const { unlink } = require("node:fs");

function productCategory() {
  return knex("products as p")
    .leftJoin("categories as c", "p.category_id", "c.category_id")
    .select(
      "p.product_id",
      "c.name as category",
      "p.title",
      "p.description",
      "p.price",
      "p.discount",
      "p.thumbnail"
    );
}

async function readProduct(payload) {
  const {
    category,
    title,
    description,
    price,
    discount = 0,
    thumbnail = null,
  } = payload;
  const category_id = await convertCategoryId(category);
  return {
    category_id,
    title,
    description,
    price,
    discount,
    thumbnail,
  };
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

// GET: /products
async function getManyProducts(query) {
  const { title, category, page = 1, limit = 12 } = query;
  const paginator = new Paginator(page, limit);

  let results = await productCategory()
    .where((qb) => {
      if (title) qb.where("p.title", "like", `%${title}%`);
      if (category) qb.where("c.name", "like", `%${category}%`);
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

// GET: /products/:product_id (detail product, variants and galleries)
async function getProduct(product_id) {
  const product = await productCategory()
    .where("product_id", product_id)
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
  console.log(product_id, payload);
  const updatedProduct = await knex("products")
    .where("product_id", product_id)
    .select("*")
    .first();
  if (!updatedProduct) {
    return null;
  }

  const update = await readProduct(payload);
  if (!update.thumbnail) {
    delete update.thumbnail;
  }
  console.log(update);
  await knex("products").where("product_id", product_id).update(update);
  if (
    update.thumbnail &&
    updatedProduct.thumbnail &&
    update.thumbnail !== updatedProduct.thumbnail &&
    updatedProduct.thumbnail.startsWith("/public/uploads")
  ) {
    unlink(`.${updatedProduct.thumbnail}`, (err) => {});
  }
  return { ...updatedProduct, ...update };
}

// DELETE /products/:product_id
async function deleteProduct(product_id) {
  return knex.transaction(async (builder) => {
    await builder("product_variants").where({ product_id }).del();
    await builder("galleries").where({ product_id }).del();
    return builder("products").where({ product_id }).del();
  });
}

// Variants

// POST products/:product_id/variants/
async function addVariant(product_id, payload) {
  const [variant_id] = await knex("product_variants").insert({
    product_id,
    ...payload,
  });
  return knex("product_variants").where({ variant_id }).first();
}

// DELETE products/variants/:variant_id
async function deleteVariant(variant_id) {
  return knex("product_variants").where({ variant_id }).del();
}

// Galleries

// POST products/:product_id/galleries/
async function addGallery(product_id, payload) {
  const [gallery_id] = await knex("galleries").insert({
    product_id,
    ...payload,
  });
  return knex("galleries").where({ gallery_id }).first();
}

// DELETE products/galleries/:gallery_id
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
