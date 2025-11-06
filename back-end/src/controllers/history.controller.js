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

    const { imageUrl } = req.body || {};
    if (!imageUrl) {
      throw new ApiError(400, "imageUrl is required");
    }

    const created = await historyService.addHistoryEntry(user_id, {
      image_url: imageUrl,
    });

    return res.status(201).json(JSend.success({ history: created }));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUserHistory,
  storeHistory,
};
