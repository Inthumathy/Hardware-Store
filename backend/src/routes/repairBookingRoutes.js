
const express = require("express");

const {
  getServices,
  createBooking,
  getMyBookings,
  getAllBookings,
  assignWorker,
  getMyWorkerJobs,
  updateBookingStatus,
  getAvailableWorkers
} = require("../controllers/repairBookingController");
const {
  authenticate,
  requireRole,
  requireVerified,
  requireVerifiedWorker
} = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// DEBUG MIDDLEWARE
// ==========================================

const debugAssignRequest = (req, res, next) => {
  console.log("STEP A: ASSIGN ROUTE REACHED");
  next();
};

const debugAuthenticated = (req, res, next) => {
  console.log("STEP B: AUTHENTICATION COMPLETED");
  next();
};

const debugAdminAuthorized = (req, res, next) => {
  console.log("STEP C: ADMIN AUTHORIZED");
  next();
};

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/repairs/services
router.get("/services", getServices);

// ==========================================
// AUTHENTICATION
// ==========================================

router.use(authenticate);

// ==========================================
// CUSTOMER ROUTES
// ==========================================

// POST /api/repairs/bookings
router.post(
  "/bookings",
  requireRole("CUSTOMER"),
  requireVerified,
  createBooking
);

// GET /api/repairs/bookings/my
router.get(
  "/bookings/my",
  requireRole("CUSTOMER"),
  getMyBookings
);

// ==========================================
// ADMIN ROUTES
// ==========================================

// GET /api/repairs/admin/bookings
router.get(
  "/admin/bookings",
  requireRole("ADMIN"),
  getAllBookings
);

// PATCH /api/repairs/admin/bookings/:id/assign
router.patch(
  "/admin/bookings/:id/assign",
  debugAssignRequest,
  debugAuthenticated,
  requireRole("ADMIN"),
  debugAdminAuthorized,
  assignWorker
);

// GET /api/repairs/admin/workers
router.get(
  "/admin/workers",
  requireRole("ADMIN"),
  getAvailableWorkers
);
// ==========================================
// WORKER ROUTES
// ==========================================

// GET /api/repairs/worker/jobs
router.get(
  "/worker/jobs",
  requireRole("WORKER"),
  requireVerifiedWorker,
  getMyWorkerJobs
);

// ==========================================
// UPDATE REPAIR BOOKING STATUS
// ==========================================

// PATCH /api/repairs/bookings/:id/status
router.patch(
  "/bookings/:id/status",
  requireRole("ADMIN", "WORKER"),
  (req, res, next) => {
    if (req.user.role === "WORKER") {
      return requireVerifiedWorker(req, res, next);
    }

    // Admin account verification.
    if (req.user.is_verified !== true) {
      return res.status(403).json({
        success: false,
        message: "Admin account is not verified"
      });
    }

    return next();
  },
  updateBookingStatus
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
