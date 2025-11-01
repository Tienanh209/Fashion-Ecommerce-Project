import http from "./http";

export async function listReviews(params = {}) {
  return http.getJSON("/reviews", params);
}
