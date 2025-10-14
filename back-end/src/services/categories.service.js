const knex = require("../database/knex");

function categoryRepository() {
  return knex("categories");
}

function readCategory(payload) {
  return {
    name: payload.name,
  };
}

// POST /categories
async function addCategory(payload) {
  const category = readCategory(payload);
  const [id] = await categoryRepository().insert(category);
  return { category_id: id, ...category };
}

// GET /categories
async function getCategories() {
  return categoryRepository().select("*").orderBy("category_id", "asc");
}

// PATCH /categories/:category_id
async function updateCategory(category_id, payload) {
  const existing = await categoryRepository()
    .where("category_id", category_id)
    .first();
  if (!existing) return null;

  const update = readCategory(payload);
  await categoryRepository().where("category_id", category_id).update(update);

  return { ...existing, ...update, category_id: Number(category_id) };
}

// DELETE /categories/:category_id
async function deleteCategory(category_id) {
  const existing = await categoryRepository()
    .where("category_id", category_id)
    .first();
  if (!existing) return null;

  await categoryRepository().where("category_id", category_id).del();
  return existing;
}

module.exports = {
  addCategory,
  getCategories,
  updateCategory,
  deleteCategory,
};
