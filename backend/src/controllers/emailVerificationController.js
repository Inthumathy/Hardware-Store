
const crypto = require("crypto");
const pool = require("../config/db");
const {
  sendVerificationEmail
} = require("../services/emailService");

// ==========================================
// CONFIGURATION
// ==========================================

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const DB_TIMEOUT_MS = 10000;

// ==========================================
// OTP HASHING
// ==========================================

function hashOtp(userId, otp) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing");
  }

  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${userId}:${otp}`)
    .digest("hex");
}

// ==========================================
// DATABASE QUERY HELPER
// ==========================================

function dbQuery(sql, values = []) {
  return pool.query({
    sql,
    values,
    timeout: DB_TIMEOUT_MS
  });
}

// ==========================================
// SEND EMAIL OTP
// POST /api/verification/email/send-otp
// ==========================================

const sendEmailOtp = async (req, res) => {
  console.log("EMAIL STEP 1: OTP request received");

  const userId = req.user.id;
  const email = req.user.email;

  try {
    console.log("EMAIL STEP 2: Checking user verification");

    const [users] = await dbQuery(
      `SELECT email_verified
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    console.log("EMAIL STEP 3: User query completed");

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (Boolean(users[0].email_verified)) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified",
        email_verified: true
      });
    }

    console.log("EMAIL STEP 4: Checking OTP cooldown");

    const [existing] = await dbQuery(
      `SELECT
         id,
         TIMESTAMPDIFF(
           SECOND,
           created_at,
           NOW()
         ) AS elapsed_seconds
       FROM email_verification_otps
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [userId]
    );

    console.log("EMAIL STEP 5: OTP cooldown query completed");

    if (existing.length) {
      const elapsed = Number(existing[0].elapsed_seconds);

      if (
        elapsed >= 0 &&
        elapsed < RESEND_COOLDOWN_SECONDS
      ) {
        return res.status(429).json({
          success: false,
          message:
            `Please wait ${
              RESEND_COOLDOWN_SECONDS - elapsed
            } seconds before requesting another OTP`
        });
      }
    }

    console.log("EMAIL STEP 6: Generating OTP");

    const otp = crypto.randomInt(0, 1000000)
      .toString()
      .padStart(6, "0");

    const otpHash = hashOtp(userId, otp);

    console.log("EMAIL STEP 7: Saving OTP");

    await dbQuery(
      `DELETE FROM email_verification_otps
       WHERE user_id = ?`,
      [userId]
    );

    const [insertResult] = await dbQuery(
      `INSERT INTO email_verification_otps
       (user_id, otp_hash, expires_at, attempts)
       VALUES (
         ?,
         ?,
         DATE_ADD(NOW(), INTERVAL 5 MINUTE),
         0
       )`,
      [userId, otpHash]
    );

    console.log("EMAIL STEP 8: OTP saved");

    console.log("EMAIL STEP 9: Sending Gmail OTP");

    try {
      await sendVerificationEmail(email, otp);

      console.log("EMAIL STEP 10: Gmail OTP sent");
    } catch (mailError) {
      console.error("EMAIL SMTP ERROR:", {
        code: mailError.code,
        message: mailError.message
      });

      await dbQuery(
        `DELETE FROM email_verification_otps
         WHERE id = ?`,
        [insertResult.insertId]
      ).catch((cleanupError) => {
        console.error(
          "OTP CLEANUP ERROR:",
          cleanupError.message
        );
      });

      return res.status(502).json({
        success: false,
        message: "Unable to send OTP email"
      });
    }

    console.log("EMAIL STEP 11: Sending response");

    return res.status(200).json({
      success: true,
      message: "OTP sent to your registered email",
      expiresInMinutes: OTP_EXPIRY_MINUTES
    });
  } catch (error) {
    console.error("SEND OTP ERROR:", {
      code: error.code,
      message: error.message
    });

    return res.status(500).json({
      success: false,
      message: "Unable to process OTP request"
    });
  }
};

// ==========================================
// VERIFY EMAIL OTP
// POST /api/verification/email/verify-otp
// ==========================================

const verifyEmailOtp = async (req, res) => {
  console.log("VERIFY STEP 1: OTP request received");

  const userId = req.user.id;
  const otp = String(req.body?.otp ?? "");

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid 6-digit OTP"
    });
  }

  let connection;
  let transactionStarted = false;

  try {
    console.log("VERIFY STEP 2: Getting MySQL connection");

    connection = await pool.getConnection();

    console.log("VERIFY STEP 3: Connection acquired");

    // Limit InnoDB row-lock waiting time
    await connection.query(
      "SET SESSION innodb_lock_wait_timeout = 5"
    );

    console.log("VERIFY STEP 4: Starting transaction");

    await connection.beginTransaction();
    transactionStarted = true;

    console.log("VERIFY STEP 5: Fetching OTP record");

    const [rows] = await connection.query({
      sql: `
        SELECT
          id,
          otp_hash,
          attempts,
          (expires_at <= NOW()) AS is_expired
        FROM email_verification_otps
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
      `,
      values: [userId],
      timeout: DB_TIMEOUT_MS
    });

    console.log("VERIFY STEP 6: OTP query completed");

    if (!rows.length) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "OTP not found. Request a new OTP."
      });
    }

    const record = rows[0];

    if (Boolean(record.is_expired)) {
      await connection.query({
        sql: `
          DELETE FROM email_verification_otps
          WHERE user_id = ?
        `,
        values: [userId],
        timeout: DB_TIMEOUT_MS
      });

      await connection.commit();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "OTP expired. Request a new OTP."
      });
    }

    if (Number(record.attempts) >= MAX_ATTEMPTS) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(429).json({
        success: false,
        message: "Too many attempts. Request a new OTP."
      });
    }

    console.log("VERIFY STEP 7: Comparing OTP");

    const submittedHash = Buffer.from(
      hashOtp(userId, otp),
      "hex"
    );

    const storedHash = Buffer.from(
      record.otp_hash,
      "hex"
    );

    const isValid =
      submittedHash.length === storedHash.length &&
      crypto.timingSafeEqual(
        submittedHash,
        storedHash
      );

    if (!isValid) {
      await connection.query({
        sql: `
          UPDATE email_verification_otps
          SET attempts = attempts + 1
          WHERE id = ?
        `,
        values: [record.id],
        timeout: DB_TIMEOUT_MS
      });

      await connection.commit();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP"
      });
    }

    console.log("VERIFY STEP 8: Updating email_verified");

    await connection.query({
      sql: `
        UPDATE users
        SET email_verified = 1
        WHERE id = ?
      `,
      values: [userId],
      timeout: DB_TIMEOUT_MS
    });

    await connection.query({
      sql: `
        DELETE FROM email_verification_otps
        WHERE user_id = ?
      `,
      values: [userId],
      timeout: DB_TIMEOUT_MS
    });

    await connection.commit();
    transactionStarted = false;

    console.log("VERIFY STEP 9: Verification successful");

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      email_verified: true
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", {
      code: error.code,
      message: error.message
    });

    if (connection && transactionStarted) {
      await connection.rollback().catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: "Unable to verify OTP"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ==========================================
// GET EMAIL STATUS
// GET /api/verification/email/status
// ==========================================

const getEmailStatus = async (req, res) => {
  try {
    const [users] = await dbQuery(
      `SELECT email, email_verified
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user.id]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      email: users[0].email,
      email_verified: Boolean(users[0].email_verified)
    });
  } catch (error) {
    console.error("EMAIL STATUS ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to get email verification status"
    });
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  sendEmailOtp,
  verifyEmailOtp,
  getEmailStatus
};
