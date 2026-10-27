
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// =====================================
// DATABASE POOL DEBUG
// Development use only
// =====================================

const logPoolStatus = () => {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("POOL STATUS:", {
    total: pool.pool?._allConnections?.length,
    free: pool.pool?._freeConnections?.length,
    queued: pool.pool?._connectionQueue?.length
  });
};

// =====================================
// JWT AUTHENTICATION
// =====================================

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;

  if (
    typeof header !== "string" ||
    !header.startsWith("Bearer ")
  ) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please login."
    });
  }

  const token = header.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "JWT token is missing"
    });
  }

  let decoded;

  // STEP 1: Verify JWT
  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error"
      });
    }

    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"]
    });

    if (
      !decoded ||
      !Number.isSafeInteger(decoded.userId) ||
      decoded.userId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload"
      });
    }
  } catch (error) {
    console.error("JWT ERROR:", error.name);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }

  // STEP 2: Get current user from database
  try {
    console.log("AUTH: Starting database query");
    logPoolStatus();

    const [users] = await pool.query({
      sql: `
        SELECT
  id,
  full_name,
  email,
  role,
  is_verified,
  email_verified,
  phone_verified,
  nic_verified
FROM users
WHERE id = ?
LIMIT 1
      `,
      values: [decoded.userId],
      timeout: 10000
    });

    console.log("AUTH: Database query completed");
    logPoolStatus();

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    const user = users[0];

    // STEP 3: Attach user to request
    req.user = {
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  role: user.role,
  is_verified: Boolean(user.is_verified),
  email_verified: Boolean(user.email_verified),
  phone_verified: Boolean(user.phone_verified),
  nic_verified: Boolean(user.nic_verified)
};

    console.log("AUTH: Authentication successful");

    return next();
  } catch (error) {
    console.error("AUTH DATABASE ERROR:", error);

    logPoolStatus();

    return res.status(500).json({
      success: false,
      message: "Authentication service unavailable"
    });
  }
};

// =====================================
// ROLE-BASED AUTHORIZATION
// =====================================

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions"
      });
    }

    return next();
  };
};

// =====================================
// VERIFIED USER AUTHORIZATION
// =====================================

const requireVerified = (req, res, next) => {
  console.log("VERIFY: Middleware reached");

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  // Option A: Email + Admin-approved NIC
  const emailVerified = req.user.email_verified === true;
  const nicVerified = req.user.nic_verified === true;

  if (!emailVerified || !nicVerified) {
    console.log("VERIFY: Access denied");

    return res.status(403).json({
      success: false,
      message:
        "Email verification and approved NIC verification are required before purchasing.",
      verification: {
        emailVerified,
        nicVerified
      }
    });
  }

  console.log("VERIFY: Access granted");

  return next();
};



/* =====================================
   WORKER ACCOUNT VERIFICATION
   ===================================== */

const requireVerifiedWorker = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  if (req.user.role !== "WORKER") {
    return res.status(403).json({
      success: false,
      message: "Worker access only"
    });
  }

  // Worker account must be verified by the system.
  if (req.user.is_verified !== true) {
    return res.status(403).json({
      success: false,
      message: "Your worker account is not verified yet."
    });
  }

  return next();
};

// =====================================
// EXPORT MIDDLEWARE
// =====================================

module.exports = {
  authenticate,
  requireRole,
  requireVerified,
  requireVerifiedWorker
};
