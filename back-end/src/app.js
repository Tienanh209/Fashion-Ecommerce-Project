const express = require("express");
const cors = require("cors");

const {
  resourceNotFound,
  handleError,
} = require("./controllers/errors.controller");
const { specs, swaggerUi } = require("./docs/swagger");

const categoriesRouter = require("./routes/categories.router");
const productsRouter = require("./routes/products.router");
const usersRouter = require("./routes/users.router");
const cartsRouter = require("./routes/carts.router");
const ordersRouter = require("./routes/orders.router");
const reviewsRouter = require("./routes/reviews.router");
const brandsRouter = require("./routes/brands.router");
const virtualTryonRouter = require("./routes/virtual-tryon.router");
const historyRouter = require("./routes/history.router");
const favoritesRouter = require("./routes/favorites.router");
const salesRouter = require("./routes/sales.router");
const suppliersRouter = require("./routes/suppliers.router");
const purchaseOrdersRouter = require("./routes/purchase-orders.router");

const JSend = require("./jsend");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  return res.json(JSend.success());
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
app.use("/public", express.static("public"));

usersRouter.setup(app);
categoriesRouter.setup(app);
brandsRouter.setup(app);
productsRouter.setup(app);
cartsRouter.setup(app);
ordersRouter.setup(app);
reviewsRouter.setup(app);
virtualTryonRouter.setup(app);
historyRouter.setup(app);
favoritesRouter.setup(app);
salesRouter.setup(app);
suppliersRouter.setup(app);
purchaseOrdersRouter.setup(app);

app.use(resourceNotFound);

app.use(handleError);

module.exports = app;
