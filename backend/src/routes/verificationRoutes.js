
const express = require("express");

const {
  submitNIC,
  getPendingNICRequests,
  reviewNIC
} = require("../controllers/verificationController");

const {
  sendEmailOtp,
  verifyEmailOtp,
  getEmailStatus
} = require("../controllers/emailVerificationController");

const {
  authenticate,
  requireRole
} = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// EMAIL VERIFICATION - CUSTOMER
router.post(
  "/email/send-otp",
  requireRole("CUSTOMER"),
  sendEmailOtp
);

router.post(
  "/email/verify-otp",
  requireRole("CUSTOMER"),
  verifyEmailOtp
);

router.get(
  "/email/status",
  requireRole("CUSTOMER"),
  getEmailStatus
);

// NIC SUBMISSION - CUSTOMER
router.post(
  "/nic/submit",
  requireRole("CUSTOMER"),
  submitNIC
);

// NIC REVIEW - ADMIN
router.get(
  "/admin/nic/pending",
  requireRole("ADMIN"),
  getPendingNICRequests
);

router.patch(
  "/admin/nic/:id/review",
  requireRole("ADMIN"),
  reviewNIC
);

// Phone OTP will be implemented later.

module.exports = router;
