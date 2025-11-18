import http from "./http";

export async function listSales() {
  const res = await http.getJSON("/sales");
  return res?.sales ?? [];
}

export async function getSale(sale_id) {
  const res = await http.getJSON(`/sales/${sale_id}`);
  return res?.sale ?? res;
}

function buildSaleFormData(payload = {}) {
  const form = new FormData();
  const fields = {
    title: payload.title,
    content: payload.content || "",
    discount:
      payload.discount !== undefined && payload.discount !== null
        ? Number(payload.discount)
        : 0,
    start_date: payload.start_date,
    end_date: payload.end_date,
  };

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    form.append(key, value);
  });

  if (Array.isArray(payload.product_ids)) {
    payload.product_ids.forEach((id) => {
      if (id !== undefined && id !== null && id !== "") {
        form.append("product_ids[]", id);
      }
    });
  }

  if (payload.bannerFile) {
    form.append("bannerFile", payload.bannerFile);
  } else if (payload.banner_url) {
    form.append("banner_url", payload.banner_url);
  }

  return form;
}

export async function createSale(payload = {}) {
  const form = buildSaleFormData(payload);
  const res = await http.postForm("/sales", form);
  return res?.sale ?? res;
}

export async function updateSale(sale_id, payload = {}) {
  const form = buildSaleFormData(payload);
  const res = await http.patchForm(`/sales/${sale_id}`, form);
  return res?.sale ?? res;
}

export async function deleteSale(sale_id) {
  return http.deleteJSON(`/sales/${sale_id}`);
}
