const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD?.replace(/\s/g, ""),
  },

  connectionTimeout: 30000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
});

async function sendVerificationEmail(to, otp) {
  return transporter.sendMail({
    from: `"Hardware Store" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Hardware Store - Email Verification OTP",

    text: `Your verification code is ${otp}. It expires in 5 minutes.`,

    html: `
      <div style="font-family:Arial,sans-serif;padding:24px">
        <h2>Hardware Store</h2>
        <p>Your email verification code is:</p>
        <h1 style="color:#f58a24;letter-spacing:8px">${otp}</h1>
        <p>This OTP expires in 5 minutes.</p>
        <p>If you did not request this code, ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail };