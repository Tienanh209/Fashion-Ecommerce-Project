const ApiError = require("../api-error");
const JSend = require("../jsend");
const historyService = require("../services/history.service");

async function getUserHistory(req, res, next) {
  try {
    const { user_id } = req.params;
    const { limit } = req.query;

    if (!Number(user_id)) {
      throw new ApiError(400, "Invalid user ID");
    }

    const history = await historyService.listHistoryByUser(user_id, { limit });
    return res.json(JSend.success({ history }));
  } catch (error) {
    return next(error);
  }
}

async function storeHistory(req, res, next) {
  try {
    const { user_id } = req.params;
    if (!Number(user_id)) {
      throw new ApiError(400, "Invalid user ID");
    }

    const { imageUrl, videoUrl } = req.body || {};
    if (!imageUrl) {
      throw new ApiError(400, "imageUrl is required");
    }

    const created = await historyService.addHistoryEntry(user_id, {
      image_url: imageUrl,
      video_url: videoUrl,
    });

    return res.status(201).json(JSend.success({ history: created }));
  } catch (error) {
    return next(error);
  }
}

async function deleteHistory(req, res, next) {
  try {
    const { user_id, history_id } = req.params;

    if (!Number(user_id) || !Number(history_id)) {
      throw new ApiError(400, "Invalid identifier");
    }

    const deleted = await historyService.deleteHistoryEntry(
      Number(user_id),
      Number(history_id)
    );

    if (!deleted) {
      throw new ApiError(404, "History entry not found");
    }

    return res.json(JSend.success({ deleted: true }));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUserHistory,
  storeHistory,
  deleteHistory,
};
