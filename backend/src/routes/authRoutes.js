
const express = require("express");
const rateLimit = require("express-rate-limit");

const { register, login } = require("../controllers/authController");

const {
  authenticate,
  requireRole,
  requireVerified
} = require("../middleware/authMiddleware");

const router = express.Router();

// Rate limiter for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

// Register
router.post("/register", authLimiter, register);

// Login
router.post("/login", authLimiter, login);

// Logged-in user profile
router.get("/profile", authenticate, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Profile accessed successfully",
    user: req.user
  });
});

// Admin-only route
router.get(
  "/admin",
  authenticate,
  requireRole("ADMIN"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Welcome Admin",
      user: req.user
    });
  }
);

// Verified user route
router.get(
  "/verified",
  authenticate,
  requireVerified,
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Verified user access granted"
    });
  }
);

module.exports = router;
