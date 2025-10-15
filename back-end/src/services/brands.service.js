const knex = require("../database/knex");

// GET /brands
async function listBrands() {
  return knex("brands").select("brand_id", "name").orderBy("name");
}

// GET /brands/:brand_id
async function getBrand(brand_id) {
  return knex("brands").where({ brand_id }).first();
}

// POST /brands
async function createBrand({ name }) {
  const [id] = await knex("brands").insert({ name });
  return getBrand(id);
}

// PUT /brands/:brand_id
async function updateBrand(brand_id, { name }) {
  const existed = await getBrand(brand_id);
  if (!existed) return null;
  await knex("brands").where({ brand_id }).update({ name });
  return getBrand(brand_id);
}

// DELETE /brands/:brand_id
async function deleteBrand(brand_id) {
  return knex("brands").where({ brand_id }).del();
}

module.exports = {
  listBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
};
