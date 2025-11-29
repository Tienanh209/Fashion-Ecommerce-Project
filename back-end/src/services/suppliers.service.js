const knex = require("../database/knex");

async function listSuppliers() {
  return knex("suppliers")
    .select("supplier_id", "name", "address", "created_at")
    .orderBy("name", "asc");
}

async function createSupplier({ name, address }) {
  const payload = {
    name: name.trim(),
    address: address ? address.trim() : null,
  };
  const [supplier_id] = await knex("suppliers").insert(payload);
  return knex("suppliers")
    .select("supplier_id", "name", "address", "created_at")
    .where({ supplier_id })
    .first();
}

async function getSupplierById(supplier_id) {
  return knex("suppliers")
    .select("supplier_id")
    .where({ supplier_id })
    .first();
}

module.exports = {
  listSuppliers,
  createSupplier,
  getSupplierById,
};
