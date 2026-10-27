
const pool = require("../config/db");
const crypto = require("crypto");

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const getUserId = (req) => {
  return Number(req.user?.id ?? req.user?.userId);
};

const isValidId = (value) => {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0;
};

const sendServerError = (res, error, message) => {
  console.error("VERIFICATION ERROR:", {
    code: error.code,
    message: error.message,
    sqlMessage: error.sqlMessage
  });

  if (!res.headersSent) {
    return res.status(500).json({
      success: false,
      message
    });
  }
};

// SQL query timeout.
// This does not cover waiting for pool.getConnection().
const executeQuery = async (connection, sql, params = []) => {
  return connection.query({
    sql,
    values: params,
    timeout: 10000
  });
};

// NIC is sensitive personal information.
// Use a keyed HMAC instead of an ordinary SHA-256 hash.
const hashNIC = (nic) => {
  const secret = process.env.NIC_HASH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "NIC_HASH_SECRET must contain at least 32 characters"
    );
  }

  return crypto
    .createHmac("sha256", secret)
    .update(nic)
    .digest("hex");
};

// ==========================================
// 1. REQUEST PHONE OTP
// POST /api/verification/phone/request
// ==========================================

const requestPhoneOTP = async (req, res) => {
  console.log("PHONE OTP STEP 1: Controller reached");

  // Real SMS provider integration is pending.
  // Never issue an OTP that cannot be delivered.
  return res.status(501).json({
    success: false,
    message: "Phone OTP delivery is not configured yet"
  });
};

// ==========================================
// 2. VERIFY PHONE OTP
// POST /api/verification/phone/verify
// ==========================================

const verifyPhoneOTP = async (req, res) => {
  console.log("PHONE OTP VERIFY: Controller reached");

  return res.status(501).json({
    success: false,
    message: "Phone OTP verification is not configured yet"
  });
};

// ==========================================
// 3. CUSTOMER - SUBMIT NIC
// POST /api/verification/nic/submit
// ==========================================

const submitNIC = async (req, res) => {
  let connection;

  console.log("NIC STEP 1: Controller started");

  try {
    const userId = getUserId(req);

    console.log("NIC STEP 2: Authenticated user ID:", userId);

    if (!isValidId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticated user"
      });
    }

    const nic = String(req.body?.nic || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    // Sri Lankan NIC formats:
    // Old: 9 digits followed by V or X
    // New: 12 digits
    if (!/^(\d{9}[VX]|\d{12})$/.test(nic)) {
      return res.status(400).json({
        success: false,
        message: "Invalid NIC format"
      });
    }

    console.log("NIC STEP 3: NIC format validated");

    const nicHash = hashNIC(nic);

    console.log("NIC STEP 4: NIC hashed");

    console.log("NIC STEP 5: Getting database connection");

    connection = await pool.getConnection();

    console.log("NIC STEP 6: Database connected");

    const [pending] = await executeQuery(
      connection,
      `SELECT id
       FROM nic_verification_requests
       WHERE user_id = ?
         AND status = 'PENDING'
       LIMIT 1`,
      [userId]
    );

    console.log("NIC STEP 7: Pending request check completed");

    if (pending.length > 0) {
      return res.status(409).json({
        success: false,
        message: "NIC verification request already pending"
      });
    }

    const [approved] = await executeQuery(
      connection,
      `SELECT id
       FROM nic_verification_requests
       WHERE user_id = ?
         AND status = 'APPROVED'
       LIMIT 1`,
      [userId]
    );

    console.log("NIC STEP 8: Approved request check completed");

    if (approved.length > 0) {
      return res.status(409).json({
        success: false,
        message: "NIC verification already approved"
      });
    }

    const [result] = await executeQuery(
      connection,
      `INSERT INTO nic_verification_requests
       (user_id, nic_hash, status)
       VALUES (?, ?, 'PENDING')`,
      [userId, nicHash]
    );

    console.log("NIC STEP 9: NIC request inserted");

    return res.status(201).json({
      success: true,
      message: "NIC verification request submitted for review",
      data: {
        requestId: result.insertId,
        status: "PENDING"
      }
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      "Unable to submit NIC verification request"
    );
  } finally {
    if (connection) {
      connection.release();
      console.log("NIC STEP 10: Database connection released");
    }
  }
};

// ==========================================
// 4. ADMIN - GET PENDING NIC REQUESTS
// GET /api/verification/admin/nic/pending
// ==========================================

const getPendingNICRequests = async (req, res) => {
  let connection;

  console.log("ADMIN NIC STEP 1: Controller started");

  try {
    connection = await pool.getConnection();

    console.log("ADMIN NIC STEP 2: Database connected");

    const [requests] = await executeQuery(
      connection,
      `SELECT
          n.id,
          n.user_id,
          u.full_name,
          u.email,
          n.status,
          n.created_at
       FROM nic_verification_requests n
       JOIN users u ON n.user_id = u.id
       WHERE n.status = 'PENDING'
       ORDER BY n.created_at ASC`
    );

    console.log("ADMIN NIC STEP 3: Query completed");

    return res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      "Unable to load pending NIC requests"
    );
  } finally {
    if (connection) {
      connection.release();
      console.log("ADMIN NIC STEP 4: Connection released");
    }
  }
};

// ==========================================
// 5. ADMIN - REVIEW NIC (REJECTION ONLY)
// PATCH /api/verification/admin/nic/:id/review
// ==========================================


const reviewNIC = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const requestId = Number(req.params.id);
    const adminId = getUserId(req);
    const decision = String(req.body?.status || "")
      .trim()
      .toUpperCase();

    if (!isValidId(requestId) || !isValidId(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID or admin ID"
      });
    }

    if (!["APPROVED", "REJECTED"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Status must be APPROVED or REJECTED"
      });
    }

    // Approval must be backed by an actual identity review.
    if (
      decision === "APPROVED" &&
      (
        req.body?.identityEvidenceReviewed !== true ||
        typeof req.body?.reviewNote !== "string" ||
        req.body.reviewNote.trim().length < 10
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Confirm identity evidence review and provide a review note before approval"
      });
    }

    connection = await pool.getConnection();

    await connection.query(
      "SET SESSION innodb_lock_wait_timeout = 5"
    );

    await connection.beginTransaction();
    transactionStarted = true;

    const [requests] = await executeQuery(
      connection,
      `SELECT id, user_id, status
       FROM nic_verification_requests
       WHERE id = ?
       FOR UPDATE`,
      [requestId]
    );

    if (requests.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "NIC request not found"
      });
    }

    const request = requests[0];

    if (request.status !== "PENDING") {
      await connection.rollback();
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        message: "NIC request already reviewed"
      });
    }

    await executeQuery(
      connection,
      `UPDATE nic_verification_requests
       SET status = ?,
           reviewed_by = ?,
           reviewed_at = NOW()
       WHERE id = ?`,
      [decision, adminId, requestId]
    );

    await executeQuery(
      connection,
      `UPDATE users
       SET nic_verified = ?
       WHERE id = ?`,
      [decision === "APPROVED" ? 1 : 0, request.user_id]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message:
        decision === "APPROVED"
          ? "NIC approved successfully"
          : "NIC rejected successfully",
      data: {
        requestId,
        status: decision
      }
    });
  } catch (error) {
    if (transactionStarted && connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "NIC REVIEW ROLLBACK ERROR:",
          rollbackError.message
        );
      }
    }

    return sendServerError(
      res,
      error,
      "Unable to review NIC request"
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
};


// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  requestPhoneOTP,
  verifyPhoneOTP,
  submitNIC,
  getPendingNICRequests,
  reviewNIC
};
