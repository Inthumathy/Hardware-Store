
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// =====================================
// VALIDATION
// =====================================

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9]{9,15}$/;

// =====================================
// USER REGISTRATION
// =====================================

const register = async (req, res) => {
  console.log("REGISTER: Request received");

  try {
    const { full_name, email, phone, password } = req.body || {};

    // Validate name
    if (
      typeof full_name !== "string" ||
      !full_name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid full name is required"
      });
    }

    // Validate email
    if (
      typeof email !== "string" ||
      !emailPattern.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid email address is required"
      });
    }

    // Validate password
    if (
      typeof password !== "string" ||
      password.length < 12 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 12 characters and no more than 72 bytes"
      });
    }

    // Validate phone
    if (
      phone !== undefined &&
      phone !== null &&
      (
        typeof phone !== "string" ||
        !phonePattern.test(phone)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check existing user
    console.log("REGISTER: Checking existing user");

    const [existingUsers] = await pool.query({
  sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
  values: [normalizedEmail],
  timeout: 10000
});

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    // Hash password
    console.log("REGISTER: Hashing password");

    const passwordHash = await bcrypt.hash(password, 12);

    // Save user
    console.log("REGISTER: Saving user");

    const [result] = await pool.execute(
      `INSERT INTO users
       (full_name, email, phone, password_hash, role, is_verified)
       VALUES (?, ?, ?, ?, 'CUSTOMER', FALSE)`,
      [
        full_name.trim(),
        normalizedEmail,
        phone || null,
        passwordHash
      ]
    );

    console.log("REGISTER: Registration successful");

    return res.status(201).json({
      success: true,
      message: "Registration successful. Verification pending.",
      userId: result.insertId
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
};

// =====================================
// USER LOGIN
// =====================================

const login = async (req, res) => {
  console.log("STEP 1: Login request received");

  try {
    const { email, password } = req.body || {};

    // Validate login data
    if (
      typeof email !== "string" ||
      !emailPattern.test(email.trim()) ||
      typeof password !== "string" ||
      password.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid email and password required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Database query
    console.log("STEP 2: Starting database query");

console.log("POOL STATUS:", {
  total: pool.pool?._allConnections?.length,
  free: pool.pool?._freeConnections?.length,
  queued: pool.pool?._connectionQueue?.length
});

    const [users] = await pool.query(
      `SELECT
         id,
         full_name,
         email,
         password_hash,
         role,
         is_verified
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    console.log("STEP 3: Database query completed");

    // Check user
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const user = users[0];

    // Compare password
    console.log("STEP 4: Starting password verification");

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    console.log("STEP 5: Password verification completed");

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // JWT configuration
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing");
    }

    // Generate JWT
    console.log("STEP 6: Generating JWT");

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: process.env.JWT_EXPIRES_IN || "1h"
      }
    );

    console.log("STEP 7: Login successful");

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_verified: Boolean(user.is_verified)
      }
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
};

// =====================================
// EXPORT
// =====================================

module.exports = {
  register,
  login
};
