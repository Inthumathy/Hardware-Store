
const express = require("express");

const {
  requestMockPhoneOTP,
  verifyMockPhoneOTP
} = require("../controllers/mockPhoneVerificationController");

const {
  authenticate,
  requireRole
} = require("../middleware/authMiddleware");

const {
  isMockModeEnabled
} = require("../services/mockOtpService");

const router = express.Router();

// Never allow mock endpoints outside development mode.
router.use((req, res, next) => {
  if (!isMockModeEnabled()) {
    return res.status(404).json({
      success: false,
      message: "Endpoint not available"
    });
  }

  next();
});

router.use(authenticate);

router.post(
  "/phone/request",
  requireRole("CUSTOMER"),
  requestMockPhoneOTP
);

router.post(
  "/phone/verify",
  requireRole("CUSTOMER"),
  verifyMockPhoneOTP
);

module.exports = router;
