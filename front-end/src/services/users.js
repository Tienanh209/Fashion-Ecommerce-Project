import http from "./http";

export const listUsers = (params = {}) => {
  const query = {
    ...params,
  };
  return http.getJSON("/users", { params: query });
};

export const getUser = (id) => http.getJSON(`/users/${id}`);

export const updateUser = async (user_id, payload) => {
  const form = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") form.append(k, v);
  });
  const res = await http.patchForm(`/users/${user_id}`, form);
  return res?.user ?? res?.users ?? res?.data?.user ?? res?.data?.users ?? res;
};

export const changePassword = (
  user_id,
  { current_password, new_password, confirm_password }
) => {
  return http.patchJSON(`/users/${user_id}/password`, {
    current_password,
    new_password,
    confirm_password,
  });
};
