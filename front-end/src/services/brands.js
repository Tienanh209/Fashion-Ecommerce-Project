import http from "./http";

export async function listBrands() {
  const data = await http.getJSON("/brands");
  return data?.brands || [];
}
