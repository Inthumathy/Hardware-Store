
const express = require("express");

const {
  checkout,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus
} = require("../controllers/orderController");

const {
  authenticate,
  requireRole,
  requireVerified
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

// Customer checkout
router.post(
  "/checkout",
  requireRole("CUSTOMER"),
  requireVerified,
  checkout
);

// Customer order history
router.get(
  "/my",
  requireRole("CUSTOMER"),
  getMyOrders
);

// Admin: all orders
router.get(
  "/admin/all",
  requireRole("ADMIN"),
  getAllOrders
);

// Admin: update order status
router.patch(
  "/:id/status",
  requireRole("ADMIN"),
  updateOrderStatus
);

// Customer's own order or admin order details
router.get("/:id", getOrderById);

module.exports = router;
