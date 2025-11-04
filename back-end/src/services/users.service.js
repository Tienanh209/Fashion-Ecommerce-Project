const knex = require("../database/knex");
const Paginator = require("./paginator");
const { unlink } = require("node:fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

function userCategory() {
  return knex("users as u")
    .leftJoin("roles as r", "u.role_id", "r.role_id")
    .select(
      "u.user_id",
      "u.fullname",
      "u.email",
      "u.phone_number",
      "u.address",
      "u.avatar_url",
      "u.role_id",
      "r.name as role_name"
    );
}

// GET: /users
async function listUsers(query) {
  const { fullname, email, phone, page = 1, limit = 12 } = query;
  const paginator = new Paginator(page, limit);

  let results = await userCategory()
    .where((qb) => {
      if (fullname) qb.where("u.fullname", "like", `%${fullname}%`);
      if (email) qb.where("u.email", "like", `%${email}%`);
      if (phone) qb.where("u.phone", "like", `%${phone}%`);
    })
    .select(knex.raw("COUNT(*) OVER() AS recordCount"))
    .orderBy("u.user_id", "desc")
    .limit(paginator.limit)
    .offset(paginator.offset);

  const totalRecords = results[0] ? Number(results[0].recordCount) : 0;
  for (const r of results) delete r.recordCount;

  return {
    metadata: paginator.getMetadata(totalRecords),
    users: results,
  };
}

// GET /users/:user_id
async function getUser(user_id) {
  return userCategory().where("u.user_id", user_id).first();
}

// POST: /users/register
async function register(payload) {
  const { fullname, email, password } = payload;

  if (!fullname || !email || !password) {
    throw new Error("fullname, email, password are required");
  }

  const hashed = await bcrypt.hash(String(password), 10);
  const [user_id] = await knex("users").insert({
    fullname: fullname,
    email: email,
    phone_number: null,
    address: null,
    password: hashed,
    role_id: 2,
    avatar_url: null,
  });

  return getUser(user_id);
}

// POST: /users/login
async function login({ email, password }) {
  const user = await knex("users").where({ email }).first();
  if (!user) return null;

  const match = await bcrypt.compare(String(password), user.password);
  if (!match) return null;

  const token = jwt.sign(
    { user_id: user.user_id, email: user.email, role_id: user.role_id },
    SECRET,
    { expiresIn: "7d" }
  );

  const safeUser = await getUser(user.user_id);
  return { user: safeUser, token };
}

// PUT /users/:user_id
async function updateUser(user_id, payload) {
  console.log(user_id, payload);
  const updatedUser = await knex("users").where("user_id", user_id).first();
  if (!updatedUser) {
    return null;
  }

  const update = {
    fullname: payload.fullname ?? updatedUser.fullname,
    email: payload.email ?? updatedUser.email,
    phone_number: payload.phone_number ?? "",
    address: payload.address ?? "",
    role_id: 2,
    avatar_url: payload.avatar_url ?? updatedUser.avatar_url,
  };

  if (!update.avatar_url) {
    delete update.avatar_url;
  }

  if (payload.password) {
    update.password = await bcrypt.hash(String(payload.password), 10);
  }
  console.log(update);
  await knex("users").where("user_id", user_id).update(update);
  if (
    update.avatar_url &&
    updatedUser.avatar_url &&
    update.avatar_url !== updatedUser.avatar_url &&
    updatedUser.avatar_url.startsWith("/public/uploads")
  ) {
    unlink(`.${updatedUser.avatar_url}`, (err) => {});
  }
  return { ...updatedUser, ...update };
}

// DELETE users/:user_id
async function deleteUser(user_id) {
  const deleted = await knex("users").where({ user_id }).del();
  return deleted > 0;
}

// PATCH /:user_id/password
async function changePassword(user_id, { current_password, new_password }) {
  const user = await knex("users").where({ user_id }).first();
  if (!user) return { ok: false, code: 404, message: "User not found" };

  const match = await bcrypt.compare(
    String(current_password || ""),
    user.password
  );
  if (!match)
    return { ok: false, code: 400, message: "Current password is incorrect" };

  const hashed = await bcrypt.hash(String(new_password), 10);
  await knex("users").where({ user_id }).update({ password: hashed });

  return { ok: true };
}

module.exports = {
  listUsers,
  getUser,
  register,
  login,
  updateUser,
  deleteUser,
  changePassword,
};
