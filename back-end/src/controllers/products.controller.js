const productsService = require("../services/products.service");
const ApiError = require("../api-error");
const JSend = require("../jsend");

// GET: /products
async function getProductsByFilter(req, res, next) {
  try {
    const result = await productsService.getManyProducts(req.query);
    return res.json(
      JSend.success({
        products: result.products,
        metadata: result.metadata,
      })
    );
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, "An error occurred while retrieving products")
    );
  }
}

// GET: /products/:product_id
async function getProduct(req, res, next) {
  const { product_id } = req.params;
  try {
    const product = await productsService.getProduct(product_id);
    if (!product) return next(new ApiError(404, "Product not found"));
    return res.json(JSend.success({ product }));
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, `Error retrieving product with id=${product_id}`)
    );
  }
}

// NEW: GET /products/variants/:variant_id
async function getVariant(req, res, next) {
  const { variant_id } = req.params;
  try {
    const variant = await productsService.getVariant(variant_id);
    if (!variant) return next(new ApiError(404, "Variant not found"));
    return res.json(JSend.success(variant));
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, `Error retrieving variant with id=${variant_id}`)
    );
  }
}

// GET: /products/variants/:variant_id/details
async function getProductsByVariantId(req, res, next) {
  const { variant_id } = req.params;
  try {
    const detail = await productsService.getProductsByVariantId(variant_id);
    if (!detail) return next(new ApiError(404, "Variant not found"));
    return res.json(
      JSend.success({
        product: detail.product,
        variant: detail.variant,
        galleries: detail.galleries,
      })
    );
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(
        500,
        `Error retrieving product by variant_id=${variant_id}`
      )
    );
  }
}

// POST: /products
async function addProduct(req, res, next) {
  const title = req.body?.title;
  if (!title || typeof title !== "string") {
    return next(new ApiError(400, "Title should be a non-empty string"));
  }
  try {
    const product = await productsService.addProduct({
      ...req.body, // include category, gender, brand or brand_id
      thumbnail: req.file ? `/public/uploads/${req.file.filename}` : null,
    });
    return res
      .status(201)
      .set({ Location: `${req.baseUrl}/${product.product_id}` })
      .json(JSend.success({ product }));
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occurred while adding products"));
  }
}

// POST /products/:product_id/import
async function importInventory(req, res, next) {
  const { product_id } = req.params;
  if (!req.file || !req.file.buffer) {
    return next(new ApiError(400, "Inventory Excel file is required."));
  }

  try {
    const report = await productsService.importInventory(
      Number(product_id),
      req.file.buffer,
      req.file.originalname
    );
    return res.status(201).json(JSend.success({ import: report }));
  } catch (error) {
    console.log(error);
    if (error?.isInventoryImport) {
      const status =
        error.message === "Product not found."
          ? 404
          : error.message === "Product ID is required."
          ? 400
          : 400;
      return next(new ApiError(status, error.message));
    }
    return next(
      new ApiError(
        500,
        `Failed to import inventory for product_id=${product_id}`
      )
    );
  }
}

// POST /products/import/bulk
async function importInventoryBulk(req, res, next) {
  if (!req.file || !req.file.buffer) {
    return next(new ApiError(400, "Inventory Excel file is required."));
  }

  try {
    const report = await productsService.importInventoryBulk(
      req.file.buffer,
      req.file.originalname
    );
    return res.status(201).json(JSend.success({ import: report }));
  } catch (error) {
    console.log(error);
    if (error?.isInventoryImport) {
      return next(new ApiError(400, error.message));
    }
    return next(new ApiError(500, "Failed to import inventory in bulk"));
  }
}

// PUT: /products/:product_id
async function updateProduct(req, res, next) {
  if (Object.keys(req.body).length === 0 && !req.file) {
    return next(new ApiError(400, "Data to update can not be empty"));
  }
  const { product_id } = req.params;
  try {
    const updated = await productsService.updateProduct(product_id, {
      ...req.body, // include category, gender, brand or brand_id
      thumbnail: req.file ? `/public/uploads/${req.file.filename}` : null,
    });
    if (!updated) return next(new ApiError(404, "Product not found"));
    return res.json(JSend.success({ product: updated }));
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, `Error updating product with product_id=${product_id}`)
    );
  }
}

// DELETE: /products/:product_id
async function deleteProduct(req, res, next) {
  const { product_id } = req.params;
  try {
    const deleted = await productsService.deleteProduct(product_id);
    if (!deleted) return next(new ApiError(404, "Product not found"));
    return res.json(JSend.success());
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(
        500,
        `Could not delete product with product_id=${product_id}`
      )
    );
  }
}

// POST /products/:product_id/variants
async function addVariant(req, res, next) {
  const { product_id } = req.params;
  try {
    const variant = await productsService.addVariant(product_id, {
      ...req.body,
    });
    return res.status(201).json(JSend.success({ variant }));
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occurred while adding variant"));
  }
}

// DELETE /products/variants/:variant_id
async function deleteVariant(req, res, next) {
  const { variant_id } = req.params;
  try {
    const deleted = await productsService.deleteVariant(variant_id);
    if (!deleted) return next(new ApiError(404, "Product's variant not found"));
    return res.json(JSend.success());
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(
        500,
        `Could not delete product's variant with id=${variant_id}`
      )
    );
  }
}

// PATCH /products/variants/:variant_id
async function updateVariant(req, res, next) {
  const { variant_id } = req.params;
  try {
    const updated = await productsService.updateVariant(variant_id, {
      ...req.body,
    });
    if (!updated) return next(new ApiError(404, "Product variant not found"));
    return res.json(JSend.success({ variant: updated }));
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, `Error updating product variant with id=${variant_id}`)
    );
  }
}

// POST /products/:product_id/galleries
async function addGallery(req, res, next) {
  const { product_id } = req.params;
  try {
    const gallery = await productsService.addGallery(product_id, {
      thumbnail: req.file ? `/public/uploads/${req.file.filename}` : null,
    });
    return res
      .status(201)
      .set({ Location: `${req.baseUrl}/${gallery.gallery_id}` })
      .json(JSend.success({ gallery }));
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occurred while adding gallery"));
  }
}

// DELETE /products/galleries/:gallery_id
async function deleteGallery(req, res, next) {
  const { gallery_id } = req.params;
  try {
    const deleted = await productsService.deleteGallery(gallery_id);
    if (!deleted) return next(new ApiError(404, "Gallery not found"));
    return res.json(JSend.success());
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(
        500,
        `Could not delete product's gallery with id=${gallery_id}`
      )
    );
  }
}

module.exports = {
  getProductsByFilter,
  getProduct,
  getVariant,
  getProductsByVariantId,
  addProduct,
  importInventory,
  importInventoryBulk,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  addGallery,
  deleteGallery,
};
