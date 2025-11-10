const knex = require("../database/knex");

function favoritesWithProduct() {
  return knex("favorites as f")
    .leftJoin("products as p", "f.product_id", "p.product_id")
    .leftJoin("categories as c", "p.category_id", "c.category_id")
    .leftJoin("brands as b", "p.brand_id", "b.brand_id")
    .select(
      "f.favorite_id",
      "f.user_id",
      "p.product_id",
      "f.created_at",
      "p.title",
      "p.thumbnail",
      "p.price",
      "p.discount",
      "p.gender",
      "p.material",
      "p.description",
      "c.name as category",
      "b.name as brand"
    );
}

function getUserId(user_id) {
  const id = Number(user_id);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function getProductId(product_id) {
  const id = Number(product_id);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

async function listFavorites(user_id) {
  const uid = getUserId(user_id);
  if (!uid) return [];
  return favoritesWithProduct().where("f.user_id", uid).orderBy("f.created_at", "desc");
}

async function getFavoriteById(favorite_id) {
  return favoritesWithProduct().where("f.favorite_id", favorite_id).first();
}

async function getFavoriteByProduct(user_id, product_id) {
  return favoritesWithProduct()
    .where("f.user_id", getUserId(user_id))
    .andWhere("f.product_id", getProductId(product_id))
    .first();
}

async function ensureProduct(product_id) {
  const pid = getProductId(product_id);
  if (!pid) throw new Error("Invalid product_id");
  const exists = await knex("products").where("product_id", pid).first();
  if (!exists) throw new Error("Product not found");
  return pid;
}

async function addFavorite(user_id, product_id) {
  const uid = getUserId(user_id);
  if (!uid) throw new Error("Invalid user_id");
  const pid = await ensureProduct(product_id);

  const existing = await getFavoriteByProduct(uid, pid);
  if (existing) return existing;

  const [favorite_id] = await knex("favorites").insert({
    user_id: uid,
    product_id: pid,
  });
  return getFavoriteById(favorite_id);
}

async function removeFavorite(user_id, product_id) {
  const uid = getUserId(user_id);
  const pid = getProductId(product_id);
  if (!uid || !pid) return 0;

  return knex("favorites").where({ user_id: uid, product_id: pid }).del();
}

module.exports = {
  listFavorites,
  addFavorite,
  removeFavorite,
};
