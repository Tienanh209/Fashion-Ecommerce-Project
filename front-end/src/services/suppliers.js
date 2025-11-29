import http from "./http";

export async function listSuppliers() {
  const data = await http.getJSON("/suppliers");
  return data?.suppliers || [];
}

export async function createSupplier(payload = {}) {
  const body = {
    name: payload.name,
    address: payload.address || "",
  };
  const data = await http.postJSON("/suppliers", body);
  return data?.supplier;
}
