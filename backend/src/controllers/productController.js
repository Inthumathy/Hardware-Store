
const pool = require("../config/db");

const getAllProducts = async (req, res) => {
  console.log("GET /api/products request received");

  try {
    console.log("Executing MySQL query...");

    const [products] = await pool.query({
      sql: `
        SELECT
          p.id,
          p.sku,
          p.name,
          p.description,
          p.price,
          p.stock_quantity,
          p.image_url,
          c.name AS category
        FROM products p
        LEFT JOIN categories c
          ON p.category_id = c.id
        WHERE p.is_active = TRUE
        ORDER BY p.id DESC
      `,
      timeout: 10000
    });

    console.log("Products fetched:", products.length);

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });

  } catch (error) {
    console.error("PRODUCT API ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch products"
    });
  }
};

const getProductById = async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID"
    });
  }

  try {
    const [products] = await pool.execute(
      `SELECT id, sku, name, description,
              price, stock_quantity, image_url
       FROM products
       WHERE id = ? AND is_active = TRUE`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: products[0]
    });

  } catch (error) {
    console.error("PRODUCT API ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product"
    });
  }
};


const addProduct = async (req, res) => {
  try {
    const {
      sku, name, description, price,
      stock_quantity, category_id, image_url
    } = req.body || {};

    if (
      typeof sku !== "string" || !sku.trim() ||
      typeof name !== "string" || !name.trim() ||
      price === undefined || price === null ||
      !Number.isFinite(Number(price)) || Number(price) < 0 ||
      !Number.isSafeInteger(stock_quantity) || stock_quantity < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid SKU, name, price and stock quantity required"
      });
    }

    if (
      category_id != null &&
      (!Number.isSafeInteger(category_id) || category_id <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO products
       (sku, name, description, price, stock_quantity,
        category_id, image_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        sku.trim(), name.trim(), description ?? null,
        Number(price), stock_quantity,
        category_id ?? null, image_url ?? null
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      productId: result.insertId
    });

  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error);

    return res.status(error.code === "ER_DUP_ENTRY" ? 409 : 500).json({
      success: false,
      message: error.code === "ER_DUP_ENTRY"
        ? "Product SKU already exists"
        : "Unable to add product"
    });
  }
};

const updateProduct = async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID"
    });
  }

  const allowedFields = [
    "sku", "name", "description", "price",
    "stock_quantity", "category_id", "image_url"
  ];

  const updates = Object.entries(req.body || {})
    .filter(([key]) => allowedFields.includes(key));

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid fields to update"
    });
  }

  const data = Object.fromEntries(updates);

  if (
    ("sku" in data && (typeof data.sku !== "string" || !data.sku.trim())) ||
    ("name" in data && (typeof data.name !== "string" || !data.name.trim())) ||
    ("price" in data && (data.price == null ||
      !Number.isFinite(Number(data.price)) || Number(data.price) < 0)) ||
    ("stock_quantity" in data &&
      (!Number.isSafeInteger(data.stock_quantity) || data.stock_quantity < 0)) ||
    ("category_id" in data && data.category_id != null &&
      (!Number.isSafeInteger(data.category_id) || data.category_id <= 0))
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid product data"
    });
  }

  try {
    const fields = updates.map(([key]) => `${key} = ?`).join(", ");
    const values = updates.map(([key, value]) =>
      ["sku", "name"].includes(key) ? value.trim() : value
    );

    const [result] = await pool.execute(
      `UPDATE products SET ${fields}
       WHERE id = ? AND is_active = TRUE`,
      [...values, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.json({
      success: true,
      message: "Product updated successfully"
    });

  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);

    return res.status(error.code === "ER_DUP_ENTRY" ? 409 : 500).json({
      success: false,
      message: error.code === "ER_DUP_ENTRY"
        ? "Product SKU already exists"
        : "Unable to update product"
    });
  }
};

const deleteProduct = async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID"
    });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE products SET is_active = FALSE
       WHERE id = ? AND is_active = TRUE`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.json({
      success: true,
      message: "Product deactivated successfully"
    });

  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete product"
    });
  }
};


module.exports = {
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct
};
