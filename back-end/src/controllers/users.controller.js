const usersService = require("../services/users.service");
const ApiError = require("../api-error");
const JSend = require("../jsend");

// GET /users
async function listUsers(req, res, next) {
  let result = {
    users: [],
    metadata: {
      totalRecords: 0,
      firstPage: 1,
      lastPage: 1,
      page: 1,
      limit: 12,
    },
  };

  try {
    result = await usersService.listUsers(req.query);
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occurred while retrieving users"));
  }
  return res.json(
    JSend.success({
      users: result.users,
      metadata: result.metadata,
    })
  );
}

// GET /users/:user_id
async function getUser(req, res, next) {
  const { user_id } = req.params;
  try {
    const user = await usersService.getUser(user_id);
    if (!user) return next(new ApiError(404, "User not found"));
    return res.json(JSend.success({ user }));
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, `Error retrieving user with id=${user_id}`));
  }
}

// POST: /users/register
async function register(req, res, next) {
  const email = req.body?.email;
  if (!email || typeof email !== "string") {
    return next(new ApiError(400, "Email should be a non-empty string"));
  }

  try {
    const user = await usersService.register({
      ...req.body,
    });
    return res.status(201).json(
      JSend.success({
        user,
      })
    );
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occurred while adding the user"));
  }
}

// PUT: /users/:user_id
async function updateUser(req, res, next) {
  if (Object.keys(req.body).length === 0 && !req.file) {
    return next(new ApiError(400, "Data to update can not be empty"));
  }

  const { user_id } = req.params;

  try {
    const updated = await usersService.updateUser(user_id, {
      ...req.body,
      avatar_url: req.file ? `/public/uploads/${req.file.filename}` : null,
    });

    if (!updated) {
      return next(new ApiError(404, "User not found"));
    }

    return res.json(
      JSend.success({
        user: updated,
      })
    );
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, `Error updating user with user_id=${user_id}`)
    );
  }
}

// DELETE: /users/:user_id
async function deleteUser(req, res, next) {
  const { user_id } = req.params;
  try {
    const deleted = await usersService.deleteUser(user_id);
    if (!deleted) return next(new ApiError(404, "user not found"));
    return res.json(JSend.success());
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, `Could not delete user with user_id=${user_id}`)
    );
  }
}

// POST /users/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ApiError(400, "Email and password are required"));
    }
    const data = await usersService.login({ email, password });
    if (!data) return next(new ApiError(401, "Invalid credentials"));
    return res.json(JSend.success(data));
  } catch (err) {
    console.error(err);
    return next(new ApiError(500, "Login failed"));
  }
}

module.exports = {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  register,
  login,
};
