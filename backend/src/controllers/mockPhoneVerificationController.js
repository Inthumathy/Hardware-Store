
const {
  isMockModeEnabled,
  createMockOTP,
  verifyMockOTP
} = require("../services/mockOtpService");

const getUserId = (req) => {
  return Number(req.user?.id ?? req.user?.userId);
};

// POST /api/verification/mock/phone/request
const requestMockPhoneOTP = async (req, res) => {
  try {
    if (!isMockModeEnabled()) {
      return res.status(404).json({
        success: false,
        message: "Endpoint not available"
      });
    }

    const userId = getUserId(req);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticated user"
      });
    }

    const result = createMockOTP(userId);

    if (!result.success) {
      return res.status(429).json({
        success: false,
        message: "Please wait before requesting another OTP",
        retryAfterSeconds: result.retryAfterSeconds
      });
    }

    // Return OTP only in development mock mode.
    // Never return an OTP in a real SMS verification flow.
    return res.status(200).json({
      success: true,
      message: "Development mock OTP generated",
      data: {
        mockOTP: result.otp,
        expiresInSeconds: result.expiresInSeconds,
        realPhoneVerified: false
      }
    });
  } catch (error) {
    console.error("MOCK OTP REQUEST ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate mock OTP"
    });
  }
};

// POST /api/verification/mock/phone/verify
const verifyMockPhoneOTP = async (req, res) => {
  try {
    if (!isMockModeEnabled()) {
      return res.status(404).json({
        success: false,
        message: "Endpoint not available"
      });
    }

    const userId = getUserId(req);
    const otp = String(req.body?.otp ?? "").trim();

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticated user"
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must contain exactly 6 digits"
      });
    }

    const result = verifyMockOTP(userId, otp);

    if (!result.success) {
      const messages = {
        NOT_FOUND: "No active mock OTP found",
        EXPIRED: "Mock OTP has expired",
        INVALID: "Incorrect mock OTP",
        TOO_MANY_ATTEMPTS: "Too many attempts"
      };

      return res.status(400).json({
        success: false,
        message: messages[result.reason] || "OTP verification failed",
        attemptsRemaining: result.attemptsRemaining ?? 0
      });
    }

    // IMPORTANT:
    // Do NOT update users.phone_verified.
    // Do NOT update users.is_verified.
    // Do NOT issue a verified JWT.
    // Do NOT grant purchase or booking permission.

    return res.status(200).json({
      success: true,
      message: "Mock OTP test passed successfully",
      data: {
        mockTestPassed: true,
        phoneVerified: false,
        productionAccessGranted: false
      }
    });
  } catch (error) {
    console.error("MOCK OTP VERIFY ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify mock OTP"
    });
  }
};

module.exports = {
  requestMockPhoneOTP,
  verifyMockPhoneOTP
};
