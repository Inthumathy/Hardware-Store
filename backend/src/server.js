
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

// Existing API routes
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const repairBookingRoutes = require("./routes/repairBookingRoutes");
const verificationRoutes = require("./routes/verificationRoutes");

// Development-only Mock OTP routes
const mockPhoneVerificationRoutes = require(
  "./routes/mockPhoneVerificationRoutes"
);

const app = express();

const PORT = Number(process.env.PORT) || 5000;

const mockOtpEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.ENABLE_MOCK_PHONE_OTP === "true";

// =====================================
// SECURITY MIDDLEWARE
// =====================================

app.disable("x-powered-by");

app.use(helmet());

// =====================================
// CORS CONFIGURATION
// =====================================

// Allowed React development frontend URLs
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

// Optional production frontend URL
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(
    process.env.FRONTEND_URL.replace(/\/$/, "")
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // (Postman, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

// =====================================
// BODY PARSING
// =====================================

app.use(express.json({ limit: "1mb" }));

app.use(express.urlencoded({ extended: true }));

// =====================================
// REQUEST LOGGER
// =====================================

app.use((req, res, next) => {
  console.log(
    "REQUEST RECEIVED:",
    req.method,
    req.originalUrl
  );

  res.on("finish", () => {
    console.log("RESPONSE SENT:", res.statusCode);
  });

  next();
});

// =====================================
// HEALTH CHECK
// =====================================

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Hardware Store Backend is running",
    environment: process.env.NODE_ENV || "development",
  });
});

// =====================================
// AUTHENTICATION ROUTES
// =====================================

app.use("/api/auth", authRoutes);

// =====================================
// PRODUCT ROUTES
// =====================================

app.use("/api/products", productRoutes);

// =====================================
// SHOPPING CART ROUTES
// =====================================

app.use("/api/cart", cartRoutes);

// =====================================
// ORDER ROUTES
// =====================================

app.use("/api/orders", orderRoutes);

// =====================================
// REPAIR BOOKING ROUTES
// =====================================

app.use("/api/repairs", repairBookingRoutes);

// =====================================
// MOCK OTP ROUTES (DEVELOPMENT ONLY)
// =====================================

if (mockOtpEnabled) {
  app.use(
    "/api/verification/mock",
    mockPhoneVerificationRoutes
  );

  console.log("MOCK OTP ROUTES ENABLED");
} else {
  console.log("MOCK OTP ROUTES DISABLED");
}

// =====================================
// REAL VERIFICATION ROUTES
// =====================================

app.use("/api/verification", verificationRoutes);

// =====================================
// 404 HANDLER
// =====================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
  });
});

// =====================================
// GLOBAL ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.message);

  if (err.message === "CORS origin not allowed") {
    return res.status(403).json({
      success: false,
      message: "Origin not allowed",
    });
  }

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// =====================================
// START SERVER
// =====================================

app.listen(PORT, () => {
  console.log("=================================");
  console.log("Hardware Store Backend Started");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log("=================================");
});
