const knex = require("../database/knex");
const Paginator = require("./paginator");
const { unlink } = require("node:fs");
const XLSX = require("xlsx");

function normalizeHeaderLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCurrency(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number(String(value).replace(/[^0-9.-]+/g, ""));
  if (!Number.isFinite(normalized)) return null;
  return Math.round(normalized);
}

function inventoryError(message) {
  const error = new Error(message);
  error.isInventoryImport = true;
  return error;
}

function parseInventoryRows(buffer) {
  if (!buffer || !buffer.length) {
    throw inventoryError("Inventory file is empty.");
  }
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch (error) {
    throw inventoryError(
      "Unable to read the Excel file. Please double-check the template."
    );
  }
  const sheetName = workbook.SheetNames[0];
  if (!sheetName)
    throw inventoryError("The uploaded workbook does not contain any sheets.");
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const filteredRows = rows
    .map((row) =>
      row.map((cell) =>
        typeof cell === "string" ? cell.trim() : cell
      )
    )
    .filter((row) =>
      row.some(
        (cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""
      )
    );

  const headerIndex = filteredRows.findIndex((row) =>
    row.some((cell) => normalizeHeaderLabel(cell) === "sku")
  );
  if (headerIndex === -1) {
    throw inventoryError(
      "Could not find the header row containing the SKU column."
    );
  }

  const headers = filteredRows[headerIndex].map(normalizeHeaderLabel);
  const findColumn = (names = []) => {
    for (const name of names) {
      const index = headers.indexOf(name);
      if (index !== -1) return index;
    }
    return -1;
  };

  const columnMap = {
    product_id: findColumn(["product_id", "productid", "product"]),
    sku: findColumn(["sku"]),
    size: findColumn(["size"]),
    color: findColumn(["color"]),
    quantity: findColumn([
      "import_inventory",
      "import_qty",
      "quantity",
      "qty",
      "stock",
      "so_luong",
    ]),
    cost_price: findColumn(["cost_price", "cost", "gia_nhap"]),
    selling_price: findColumn([
      "selling_price",
      "selling_price_vnd",
      "price",
      "gia_ban",
      "retail_price",
    ]),
  };

  if (columnMap.sku === -1) {
    throw inventoryError("Inventory file must include a SKU column.");
  }
  if (columnMap.quantity === -1) {
    throw inventoryError(
      "Inventory file must include an import quantity column."
    );
  }

  const payloads = [];
  for (let i = headerIndex + 1; i < filteredRows.length; i += 1) {
    const row = filteredRows[i] || [];
    const productIdRaw =
      columnMap.product_id !== -1 ? row[columnMap.product_id] : "";
    const parsedProductId = Number(productIdRaw);
    const product_id =
      Number.isFinite(parsedProductId) && parsedProductId > 0
        ? parsedProductId
        : null;
    const skuRaw = columnMap.sku !== -1 ? row[columnMap.sku] : null;
    const sku = skuRaw ? String(skuRaw).trim() : "";
    if (!sku) continue;

    const quantityRaw = columnMap.quantity !== -1 ? row[columnMap.quantity] : "";
    const quantity = Number(quantityRaw);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    const sizeRaw = columnMap.size !== -1 ? row[columnMap.size] : "";
    const colorRaw = columnMap.color !== -1 ? row[columnMap.color] : "";
    const costRaw = columnMap.cost_price !== -1 ? row[columnMap.cost_price] : "";
    const sellingRaw =
      columnMap.selling_price !== -1 ? row[columnMap.selling_price] : "";

    payloads.push({
      product_id,
      sku,
      size: sizeRaw ? String(sizeRaw).trim() : "",
      color: colorRaw ? String(colorRaw).trim() : "",
      quantity: Math.trunc(quantity),
      cost_price: parseCurrency(costRaw),
      selling_price: parseCurrency(sellingRaw),
    });
  }

  if (!payloads.length) {
    throw inventoryError(
      "No valid inventory rows were found in the uploaded file."
    );
  }

  return payloads;
}

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
        "cost_price",
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
      "v.cost_price",
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
      "cost_price",
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
  const insertPayload = {
    product_id,
    size: payload.size || null,
    color: payload.color || null,
    sku: payload.sku || null,
    stock:
      payload.stock !== undefined && payload.stock !== null
        ? Number(payload.stock)
        : 0,
  };

  if (payload.price !== undefined) {
    insertPayload.price =
      payload.price === null || payload.price === ""
        ? null
        : Number(payload.price);
  }

  if (payload.cost_price !== undefined) {
    insertPayload.cost_price =
      payload.cost_price === null || payload.cost_price === ""
        ? null
        : Number(payload.cost_price);
  }

  const [variant_id] = await knex("product_variants").insert(insertPayload);
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
  if (payload.cost_price !== undefined) {
    update.cost_price =
      payload.cost_price === null || payload.cost_price === ""
        ? null
        : Number(payload.cost_price);
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

async function applyInventoryForProduct(product_id, rows, originalName = null) {
  if (!rows.length) {
    throw inventoryError("No inventory rows found for this product.");
  }
  const product = await knex("products")
    .where({ product_id })
    .select("product_id")
    .first();
  if (!product) throw inventoryError(`Product not found (id=${product_id}).`);

  return knex.transaction(async (trx) => {
    let totalQuantity = 0;
    const variants = [];

    for (const row of rows) {
      const existing = await trx("product_variants")
        .where({ product_id, sku: row.sku })
        .first();
      let variant_id;

      if (existing) {
        const update = {};
        if (row.size) update.size = row.size;
        if (row.color) update.color = row.color;
        if (row.selling_price !== null) update.price = row.selling_price;
        if (row.cost_price !== null) update.cost_price = row.cost_price;
        update.stock = Number(existing.stock || 0) + row.quantity;

        await trx("product_variants")
          .where({ variant_id: existing.variant_id })
          .update(update);
        variant_id = existing.variant_id;
      } else {
        const payload = {
          product_id,
          sku: row.sku,
          size: row.size || null,
          color: row.color || null,
          stock: row.quantity,
          price: row.selling_price,
          cost_price: row.cost_price,
        };
        const inserted = await trx("product_variants").insert(payload);
        variant_id = inserted[0];
      }

      await trx("inventory_imports").insert({
        product_id,
        variant_id,
        sku: row.sku,
        size: row.size || null,
        color: row.color || null,
        quantity: row.quantity,
        cost_price: row.cost_price,
        selling_price: row.selling_price,
        source_file: originalName || null,
      });

      totalQuantity += row.quantity;
      variants.push({
        variant_id,
        sku: row.sku,
        quantity: row.quantity,
      });
    }

    return {
      product_id,
      processed: variants.length,
      totalQuantity,
      variants,
    };
  });
}

async function importInventory(product_id, fileBuffer, originalName = null) {
  const resolvedProductId = Number(product_id);
  if (!Number.isFinite(resolvedProductId) || resolvedProductId <= 0) {
    throw inventoryError("Product ID is required.");
  }

  const rows = parseInventoryRows(fileBuffer);
  const filtered = rows
    .map((row) => ({
      ...row,
      product_id: row.product_id || resolvedProductId,
    }))
    .filter((row) => row.product_id === resolvedProductId);

  if (!filtered.length) {
    throw inventoryError(
      "No matching rows were found for the selected product in the uploaded file."
    );
  }

  return applyInventoryForProduct(resolvedProductId, filtered, originalName);
}

async function importInventoryBulk(fileBuffer, originalName = null) {
  const rows = parseInventoryRows(fileBuffer);
  const withProductId = rows.filter((row) =>
    Number.isFinite(row.product_id)
  );

  if (!withProductId.length) {
    throw inventoryError("Each row must include a valid product_id.");
  }

  const grouped = withProductId.reduce((acc, row) => {
    const list = acc.get(row.product_id) || [];
    list.push(row);
    acc.set(row.product_id, list);
    return acc;
  }, new Map());

  const results = [];
  for (const [id, productRows] of grouped.entries()) {
    // eslint-disable-next-line no-await-in-loop
    const summary = await applyInventoryForProduct(
      id,
      productRows,
      originalName
    );
    results.push(summary);
  }

  return {
    processedProducts: results.length,
    results,
  };
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
  importInventory,
  importInventoryBulk,
};
