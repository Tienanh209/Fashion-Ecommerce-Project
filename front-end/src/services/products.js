import http from "./http";

export async function listProducts(params = {}) {
  const data = await http.getJSON("/products", params);
  return {
    products: data?.products || [],
    metadata: data?.metadata || {
      page: 1,
      lastPage: 1,
      totalRecords: 0,
      limit: 12,
    },
  };
}

export async function getProduct(product_id) {
  const data = await http.getJSON(`/products/${product_id}`);
  return data?.product;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
export function toImageUrl(u) {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}

export async function getVariant(variant_id) {
  return http.getJSON(`/products/variants/${variant_id}`);
}

export async function resolveVariantMeta(variant_id) {
  let v = null;
  try {
    v = await getVariant(variant_id);
  } catch (e) {
    console.log(e);
  }

  if (!v) return null;

  const product_id =
    v.product_id ?? v.product?.product_id ?? v.product?.id ?? v.productId ?? 0;

  let product_title =
    v.product_title || v.product?.title || v.title || v.product_name;
  let product_thumbnail =
    v.thumbnail || v.product?.thumbnail || v.product_thumbnail || v.image_url;

  if (product_id && (!product_title || !product_thumbnail)) {
    try {
      const p = await getProduct(product_id);
      product_title = product_title || p?.title || p?.name;
      product_thumbnail = product_thumbnail || p?.thumbnail || p?.image_url;
    } catch (e) {
      console.log(e);
    }
  }

  return {
    variant_id: Number(variant_id),
    product_id: Number(product_id || 0),
    size: v.size || v.variant_size || v.sku_size || "",
    color: v.color || v.variant_color || v.sku_color || "",
    product_title: product_title || "Product",
    product_thumbnail: toImageUrl(product_thumbnail),
  };
}

export async function resolveVariantMetaBatch(variantIds = []) {
  const uniq = [...new Set(variantIds.map(Number))].filter(Boolean);
  const metas = await Promise.all(uniq.map((id) => resolveVariantMeta(id)));
  const map = new Map();
  metas.forEach((m) => {
    if (m && m.variant_id) map.set(m.variant_id, m);
  });
  return map;
}

export async function createProduct(payload = {}) {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    form.append(key, value);
  });
  if (form.has("thumbnailFile")) {
    const file = form.get("thumbnailFile");
    form.delete("thumbnailFile");
    form.append("thumbnailFile", file);
  }
  const res = await http.postForm("/products", form);
  return res?.product ?? res;
}

export async function updateProduct(product_id, payload = {}) {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    form.append(key, value);
  });
  if (form.has("thumbnailFile")) {
    const file = form.get("thumbnailFile");
    form.delete("thumbnailFile");
    form.append("thumbnailFile", file);
  }
  const res = await http.putForm(`/products/${product_id}`, form);
  return res?.product ?? res;
}

export async function deleteProduct(product_id) {
  return http.deleteJSON(`/products/${product_id}`);
}

export async function addVariant(product_id, payload = {}) {
  const body = {
    size: payload.size || null,
    color: payload.color || null,
    sku: payload.sku || null,
    price:
      payload.price !== undefined && payload.price !== null
        ? Number(payload.price)
        : null,
    stock:
      payload.stock !== undefined && payload.stock !== null
        ? Number(payload.stock)
        : 0,
  };
  return http.postJSON(`/products/${product_id}/variants`, body);
}

export async function deleteVariant(variant_id) {
  return http.deleteJSON(`/products/variants/${variant_id}`);
}

export async function updateVariant(variant_id, payload = {}) {
  const body = {};
  if (payload.sku !== undefined) body.sku = payload.sku;
  if (payload.size !== undefined) body.size = payload.size;
  if (payload.color !== undefined) body.color = payload.color;
  if (payload.price !== undefined) body.price = payload.price;
  if (payload.stock !== undefined) body.stock = payload.stock;
  return http.patchJSON(`/products/variants/${variant_id}`, body);
}

export async function addGallery(product_id, file) {
  const form = new FormData();
  if (file) form.append("thumbnailFile", file);
  const res = await http.postForm(`/products/${product_id}/galleries`, form);
  return res?.gallery ?? res;
}

export async function deleteGallery(gallery_id) {
  return http.deleteJSON(`/products/galleries/${gallery_id}`);
}
