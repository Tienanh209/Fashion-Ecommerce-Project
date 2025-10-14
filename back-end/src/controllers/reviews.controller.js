const reviewsService = require("../services/reviews.service");
const ApiError = require("../api-error");
const JSend = require("../jsend");

// GET /reviews
async function listReviews(req, res, next) {
  try {
    const result = await reviewsService.listReviews(req.query);
    return res.json(JSend.success(result));
  } catch (e) {
    console.error(e);
    next(new ApiError(500, "An error occurred while retrieving reviews"));
  }
}

// GET /reviews/:review_id
async function getReview(req, res, next) {
  try {
    const review = await reviewsService.getReview(+req.params.review_id);
    if (!review) return next(new ApiError(404, "Review not found"));
    return res.json(JSend.success({ review }));
  } catch (e) {
    console.error(e);
    next(new ApiError(500, "Error retrieving review"));
  }
}

// POST /reviews/:user_id
async function addReview(req, res, next) {
  const { user_id } = req.params;
  try {
    const review = await reviewsService.addReview(+user_id, req.body);
    return res.status(201).json(JSend.success({ review }));
  } catch (e) {
    console.error(e);
    if (
      /product_id is required|rating must be 1..5|Product not found|order_item_id invalid/i.test(
        e?.message
      )
    )
      return next(new ApiError(400, e.message));
    next(new ApiError(500, "Create review failed"));
  }
}

// PATCH /reviews/:review_id
async function updateReview(req, res, next) {
  const { review_id } = req.params;
  const { user_id } = req.body;
  try {
    const updated = await reviewsService.updateReview(
      +review_id,
      +user_id,
      req.body
    );
    if (!updated) return next(new ApiError(404, "Review not found"));
    return res.json(JSend.success({ review: updated }));
  } catch (e) {
    console.error(e);
    if (/Forbidden/.test(e?.message) || /rating must be 1..5/.test(e?.message))
      return next(new ApiError(400, e.message));
    next(new ApiError(500, "Update review failed"));
  }
}

// DELETE /reviews/:review_id
async function deleteReview(req, res, next) {
  const { review_id } = req.params;
  const { user_id } = req.query; // admin can omit user_id; normal user should pass theirs
  try {
    const deleted = await reviewsService.deleteReview(
      +review_id,
      user_id ? +user_id : null
    );
    if (!deleted) return next(new ApiError(404, "Review not found"));
    return res.json(JSend.success());
  } catch (e) {
    console.error(e);
    if (/Forbidden/.test(e?.message)) return next(new ApiError(400, e.message));
    next(new ApiError(500, "Delete review failed"));
  }
}

// PATCH /reviews/:review_id/status
async function updateStatus(req, res, next) {
  const { review_id } = req.params;
  const { status } = req.body || {};
  try {
    const updated = await reviewsService.updateStatus(+review_id, status);
    if (!updated) return next(new ApiError(400, "Invalid review or status"));
    return res.json(JSend.success({ review: updated }));
  } catch (e) {
    console.error(e);
    next(new ApiError(500, "Update review status failed"));
  }
}

// GET /reviews/summary/:product_id
async function productSummary(req, res, next) {
  const { product_id } = req.params;
  try {
    const summary = await reviewsService.summaryByProduct(+product_id);
    return res.json(JSend.success({ summary }));
  } catch (e) {
    console.error(e);
    next(new ApiError(500, "Get product review summary failed"));
  }
}

module.exports = {
  listReviews,
  getReview,
  addReview,
  updateReview,
  deleteReview,
  updateStatus,
  productSummary,
};
