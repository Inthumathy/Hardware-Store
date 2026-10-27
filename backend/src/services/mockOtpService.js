
const crypto = require("crypto");

// Development-only, in-memory OTP store.
// Server restart clears all mock OTPs.
const otpStore = new Map();
const requestHistory = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const REQUEST_COOLDOWN_MS = 60 * 1000;

const isMockModeEnabled = () => {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_MOCK_PHONE_OTP === "true"
  );
};

const generateOTP = () => {
  return String(
    crypto.randomInt(100000, 1000000)
  );
};

const hashOTP = (otp, userId, secret) => {
  return crypto
    .createHmac("sha256", secret)
    .update(`${userId}:${otp}`)
    .digest("hex");
};

const createMockOTP = (userId) => {
  if (!isMockModeEnabled()) {
    throw new Error("MOCK_MODE_DISABLED");
  }

  const secret = process.env.OTP_HASH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_HASH_SECRET_NOT_CONFIGURED");
  }

  const now = Date.now();
  const key = String(userId);

  const lastRequest = requestHistory.get(key);

  if (
    lastRequest &&
    now - lastRequest < REQUEST_COOLDOWN_MS
  ) {
    return {
      success: false,
      reason: "COOLDOWN",
      retryAfterSeconds: Math.ceil(
        (REQUEST_COOLDOWN_MS - (now - lastRequest)) / 1000
      )
    };
  }

  const otp = generateOTP();

  otpStore.set(key, {
    otpHash: hashOTP(otp, userId, secret),
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0
  });

  requestHistory.set(key, now);

  return {
    success: true,
    otp,
    expiresInSeconds: OTP_EXPIRY_MS / 1000
  };
};

const verifyMockOTP = (userId, otp) => {
  if (!isMockModeEnabled()) {
    throw new Error("MOCK_MODE_DISABLED");
  }

  const secret = process.env.OTP_HASH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_HASH_SECRET_NOT_CONFIGURED");
  }

  const key = String(userId);
  const record = otpStore.get(key);

  if (!record) {
    return {
      success: false,
      reason: "NOT_FOUND"
    };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);

    return {
      success: false,
      reason: "EXPIRED"
    };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(key);

    return {
      success: false,
      reason: "TOO_MANY_ATTEMPTS"
    };
  }

  // Increment before checking to prevent unlimited retries.
  record.attempts += 1;

  const providedHash = hashOTP(otp, userId, secret);

  const expectedBuffer = Buffer.from(
    record.otpHash,
    "hex"
  );

  const providedBuffer = Buffer.from(
    providedHash,
    "hex"
  );

  const matched = crypto.timingSafeEqual(
    expectedBuffer,
    providedBuffer
  );

  if (!matched) {
    const attemptsRemaining =
      MAX_ATTEMPTS - record.attempts;

    if (attemptsRemaining === 0) {
      otpStore.delete(key);
    }

    return {
      success: false,
      reason: "INVALID",
      attemptsRemaining
    };
  }

  // One-time use: remove OTP after success.
  otpStore.delete(key);

  return {
    success: true
  };
};

module.exports = {
  isMockModeEnabled,
  createMockOTP,
  verifyMockOTP
};
