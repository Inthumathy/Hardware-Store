
const express = require("express");

const {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem
} = require("../controllers/cartController");

const {
  authenticate,
  requireRole,
  requireVerified
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);
router.use(requireRole("CUSTOMER"));
router.use(requireVerified);

router.post("/items", addToCart);
router.get("/", getCart);
router.put("/items/:id", updateCartItem);
router.delete("/items/:id", removeCartItem);

module.exports = router;
