
const express = require("express");

const {
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");

const {
  authenticate,
  requireRole
} = require("../middleware/authMiddleware");

const router = express.Router();

// ====================================
// PUBLIC ROUTES
// ====================================

// Get all active products
router.get("/", getAllProducts);

// Get product by ID
router.get("/:id", getProductById);

// ====================================
// ADMIN ONLY ROUTES
// ====================================

// Add new product
router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  addProduct
);

// Update existing product
router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  updateProduct
);

// Soft delete product
router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  deleteProduct
);

module.exports = router;
