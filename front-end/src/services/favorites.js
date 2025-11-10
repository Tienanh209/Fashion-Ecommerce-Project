import http from "./http";

function normalizeUserId(user) {
  if (!user) return null;
  return (
    user.user_id ??
    user.id ??
    user?.user?.user_id ??
    user?.user?.id ??
    null
  );
}

export const resolveUserId = normalizeUserId;

export async function listFavorites(user_id) {
  const data = await http.getJSON(`/favorites/${user_id}`);
  return data?.favorites || [];
}

export async function addFavorite(user_id, product_id) {
  const data = await http.postJSON(`/favorites/${user_id}`, { product_id });
  return data?.favorite || data;
}

export async function removeFavorite(user_id, product_id) {
  return http.deleteJSON(`/favorites/${user_id}/${product_id}`);
}
