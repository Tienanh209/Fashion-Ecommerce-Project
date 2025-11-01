import http from "../services/http";

export function imgUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const base = String(http.BASE_URL || "").replace(/\/+$/, "");
  const p = String(path).startsWith("/") ? String(path) : `/${path}`;
  return `${base}${p}`;
}
