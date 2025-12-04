const knex = require("../database/knex");

function baseHistoryQuery() {
  return knex("history_images as hi")
    .leftJoin("history_videos as hv", "hv.history_id", "hi.history_id")
    .select(
      "hi.history_id",
      "hi.user_id",
      "hi.image_url",
      "hi.created_at",
      "hv.video_url",
      "hv.created_at as video_created_at"
    );
}

async function getHistoryById(historyId) {
  if (!Number(historyId)) {
    return null;
  }

  return baseHistoryQuery().where("hi.history_id", historyId).first();
}

async function listHistoryByUser(userId, { limit = 20 }) {
  return baseHistoryQuery()
    .where("hi.user_id", userId)
    .orderBy("hi.created_at", "desc")
    .limit(Number(limit) || 20);
}

async function addHistoryEntry(userId, payload) {
  const record = {
    user_id: userId,
    image_url: payload.image_url,
  };

  const [history_id] = await knex("history_images").insert(record);

  if (payload.video_url) {
    await knex("history_videos").insert({
      history_id,
      video_url: payload.video_url,
    });
  }

  return getHistoryById(history_id);
}

async function updateHistoryVideo(historyId, videoUrl) {
  if (!Number(historyId)) {
    return null;
  }

  const existing = await knex("history_videos")
    .where({ history_id: historyId })
    .first();

  if (existing) {
    await knex("history_videos")
      .where({ history_id: historyId })
      .update({ video_url: videoUrl, updated_at: knex.fn.now() });
  } else {
    await knex("history_videos").insert({
      history_id: historyId,
      video_url: videoUrl,
    });
  }

  return getHistoryById(historyId);
}

module.exports = {
  listHistoryByUser,
  addHistoryEntry,
  updateHistoryVideo,
};
