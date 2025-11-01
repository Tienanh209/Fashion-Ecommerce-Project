import http from "./http";

export const login = (formData) => http.postForm("/users/login", formData);
export const register = (formData) =>
  http.postForm("/users/register", formData);
