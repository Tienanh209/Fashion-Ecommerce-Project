import http from "./http";

export async function listCategories() {
  const data = await http.getJSON("/categories");
  return data?.categories || [];
}
