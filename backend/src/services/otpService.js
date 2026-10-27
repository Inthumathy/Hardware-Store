
const crypto = require("crypto");

const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashOTP = (otp) => {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_HASH_SECRET must be at least 32 characters");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(String(otp))
    .digest("hex");
};

module.exports = {
  generateOTP,
  hashOTP
};
