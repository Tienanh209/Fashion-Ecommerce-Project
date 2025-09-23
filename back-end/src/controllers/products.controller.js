const JSend = require("../jsend");

function addProduct(req, res) {
  return res.status(201).json(JSend.success({ product: {} }));
}

function getProductsByFilter(req, res) {
  const filters = [];
  const { category, size, color } = req.query;
  if (category) filters.push({ category });
  if (color) filters.push({ color });
  if (size) filters.push({ size });
  console.log(filters.join("&"));
  return res.json(JSend.success({ products: [] }));
}

function getProduct(req, res) {
  return res.json(JSend.success({ product: {} }));
}

function updateProduct(req, res) {
  return res.json(JSend.success({ product: {} }));
}

function deleteProduct(req, res) {
  return res.json(JSend.success({ message: "Product deleted" }));
}

module.exports = {
  addProduct,
  getProductsByFilter,
  getProduct,
  updateProduct,
  deleteProduct,
};
