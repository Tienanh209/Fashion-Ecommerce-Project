const knex = require("../database/knex");

async function listHistoryByUser(userId, { limit = 20 }) {
  return knex("history_images")
    .where({ user_id: userId })
    .orderBy("created_at", "desc")
    .limit(Number(limit) || 20);
}

async function addHistoryEntry(userId, payload) {
  const record = {
    user_id: userId,
    image_url: payload.image_url,
  };

  const [history_id] = await knex("history_images").insert(record);
  return knex("history_images").where({ history_id }).first();
}

module.exports = {
  listHistoryByUser,
  addHistoryEntry,
};
