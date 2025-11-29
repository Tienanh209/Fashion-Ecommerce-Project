import http from "./http";

export async function listReviews(params = {}) {
  return http.getJSON("/reviews", { params });
}

export async function listAdminReviews(params = {}) {
  const query = {
    limit: params.limit ?? 200,
    page: params.page ?? 1,
  };
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query[key] = value;
    }
  });
  return http.getJSON("/reviews", { params: query });
}

export async function getSummary(product_id) {
  return http.getJSON(`/reviews/summary/${product_id}`);
}

export async function createReview(user_id, payload = {}) {
  if (!user_id) throw new Error("Missing user_id");
  const body = {
    product_id: payload.product_id,
    rating: Number(payload.rating || 0),
    title: payload.title || "",
    content: payload.content || "",
    order_item_id: payload.order_item_id || null,
  };
  return http.postJSON(`/reviews/${user_id}`, body);
}

export async function updateReviewStatus(review_id, status) {
  if (!review_id) throw new Error("Missing review_id");
  return http.patchJSON(`/reviews/${review_id}/status`, { status });
}
