
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  Mail,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Send,
  CheckCircle2,
  Clock3,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  LockKeyhole
} from "lucide-react";

import {
  submitNIC,
  getEmailVerificationStatus,
  sendEmailOTP,
  verifyEmailOTP
} from "../services/verificationApi";

import "./CustomerVerification.css";

export default function CustomerVerification() {
  // ======================================
  // FORM STATES
  // ======================================

  const [nic, setNic] = useState("");
  const [otp, setOtp] = useState("");

  // ======================================
  // EMAIL STATES
  // ======================================

  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [submittingNIC, setSubmittingNIC] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // ======================================
  // NOTIFICATION STATES
  // ======================================

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const getErrorMessage = (err, fallback) => {
    if (err.response?.status === 401) {
      return "Your session has expired. Please login again.";
    }

    return (
      err.response?.data?.message ||
      err.message ||
      fallback
    );
  };

  // ======================================
  // LOAD EMAIL VERIFICATION STATUS
  // ======================================

  useEffect(() => {
    let active = true;

    const loadEmailStatus = async () => {
      try {
        const result = await getEmailVerificationStatus();

        if (!active) return;

        setEmail(result.email || "");
        setEmailVerified(Boolean(result.email_verified));
      } catch (err) {
        if (!active) return;

        setError(
          getErrorMessage(
            err,
            "Unable to load email verification status."
          )
        );
      } finally {
        if (active) {
          setLoadingStatus(false);
        }
      }
    };

    loadEmailStatus();

    return () => {
      active = false;
    };
  }, []);

  // ======================================
  // RESEND OTP COUNTDOWN
  // ======================================

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => {
      setCooldown((previous) =>
        Math.max(0, previous - 1)
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  // ======================================
  // SEND EMAIL OTP
  // ======================================

  const handleSendOTP = async () => {
    if (
      sendingOTP ||
      verifyingOTP ||
      loadingStatus ||
      emailVerified ||
      cooldown > 0
    ) {
      return;
    }

    clearMessages();
    setSendingOTP(true);

    try {
      const result = await sendEmailOTP();

      if (result.email_verified) {
        setEmailVerified(true);
        setOtpSent(false);
        setMessage("Your email is already verified.");
        return;
      }

      setOtpSent(true);
      setCooldown(60);
      setOtp("");

      setMessage(
        result.message ||
        "Verification OTP sent to your registered email."
      );
    } catch (err) {
      const retryAfter =
        err.response?.status === 429;

      if (retryAfter) {
        // Allow entry of an OTP already sent.
        setOtpSent(true);
      }

      setError(
        getErrorMessage(err, "Unable to send OTP.")
      );
    } finally {
      setSendingOTP(false);
    }
  };

  // ======================================
  // VERIFY EMAIL OTP
  // ======================================

  const handleVerifyOTP = async (event) => {
    event.preventDefault();
    clearMessages();

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    if (verifyingOTP || emailVerified) return;

    setVerifyingOTP(true);

    try {
      const result = await verifyEmailOTP(otp);

      if (!result.email_verified) {
        throw new Error(
          "Email verification was not confirmed."
        );
      }

      setEmailVerified(true);
      setOtpSent(false);
      setOtp("");
      setCooldown(0);

      setMessage(
        result.message ||
        "Email verified successfully!"
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to verify email OTP."
        )
      );
    } finally {
      setVerifyingOTP(false);
    }
  };

  // ======================================
  // SUBMIT NIC FOR ADMIN REVIEW
  // ======================================

  const handleNICSubmit = async (event) => {
    event.preventDefault();
    clearMessages();

    const trimmedNIC = nic.trim();

    if (!trimmedNIC) {
      setError("Please enter your NIC number.");
      return;
    }

    if (submittingNIC) return;

    setSubmittingNIC(true);

    try {
      const result = await submitNIC(trimmedNIC);

      setMessage(
        result.message ||
        "NIC submitted for administrative review."
      );

      setNic("");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to submit NIC."
        )
      );
    } finally {
      setSubmittingNIC(false);
    }
  };

  // ======================================
  // REFRESH EMAIL STATUS
  // ======================================

  const handleRefreshStatus = async () => {
    clearMessages();
    setLoadingStatus(true);

    try {
      const result = await getEmailVerificationStatus();

      setEmail(result.email || "");
      setEmailVerified(Boolean(result.email_verified));

      setMessage("Verification status updated.");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to refresh verification status."
        )
      );
    } finally {
      setLoadingStatus(false);
    }
  };

  // ======================================
  // UI
  // ======================================

  return (
    <main className="verification-page">
      {/* PAGE HEADER */}

      <div className="verification-heading">
        <div>
          <span className="verification-eyebrow">
            ACCOUNT SECURITY
          </span>

          <h1>Account Verification</h1>

          <p>
            Verify your email address and submit your
            identity details to secure your Hardware
            Store account.
          </p>

          <Link
            to="/customer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "14px",
              color: "#f58a24",
              fontWeight: 700,
              textDecoration: "none"
            }}
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </Link>
        </div>

        <div className="verification-heading-icon">
          <ShieldCheck size={30} />
        </div>
      </div>

      {/* NOTIFICATIONS */}

      {message && (
        <div
          className="verification-alert success"
          role="status"
        >
          <CheckCircle2 size={20} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          className="verification-alert error"
          role="alert"
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* VERIFICATION CARDS */}

      <div className="verification-grid">
        {/* ==================================
            EMAIL VERIFICATION
        ================================== */}

        <section className="verification-card">
          <div className="verification-card-top">
            <div className="verification-icon orange">
              <Mail size={23} />
            </div>

            <span
              className={
                emailVerified
                  ? "verification-badge verified"
                  : "verification-badge pending"
              }
            >
              {emailVerified ? "Verified" : "Pending"}
            </span>
          </div>

          <h2>Email Verification</h2>

          <p className="verification-description">
            Verify your registered email address using
            a secure 6-digit verification code.
          </p>

          <div className="verification-email-box">
            <span>Registered Email Address</span>

            <strong>
              {loadingStatus
                ? "Loading..."
                : email || "Email not available"}
            </strong>
          </div>

          {emailVerified ? (
            <div className="verification-complete">
              <CheckCircle2 size={25} />

              <div>
                <strong>
                  Email Verified Successfully
                </strong>

                <p>
                  Your registered email address has
                  been verified.
                </p>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="verification-primary-btn"
                onClick={handleSendOTP}
                disabled={
                  sendingOTP ||
                  verifyingOTP ||
                  loadingStatus ||
                  cooldown > 0
                }
              >
                {sendingOTP ? (
                  <RefreshCw size={17} />
                ) : (
                  <Send size={17} />
                )}

                {sendingOTP
                  ? "Sending OTP..."
                  : cooldown > 0
                    ? `Resend OTP in ${cooldown}s`
                    : otpSent
                      ? "Resend Verification OTP"
                      : "Send Verification OTP"}
              </button>

              {otpSent && (
                <form
                  className="verification-otp-form"
                  onSubmit={handleVerifyOTP}
                >
                  <label htmlFor="email-otp">
                    Enter 6-Digit OTP
                  </label>

                  <input
                    id="email-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                    placeholder="000000"
                    required
                    disabled={verifyingOTP}
                  />

                  <button
                    type="submit"
                    className="verification-secondary-btn"
                    disabled={
                      verifyingOTP ||
                      sendingOTP ||
                      otp.length !== 6
                    }
                  >
                    {verifyingOTP
                      ? "Verifying Email..."
                      : "Verify Email"}
                  </button>
                </form>
              )}

              <p className="verification-hint">
                <Clock3 size={15} />
                OTP is valid for 5 minutes.
              </p>
            </>
          )}

          <button
            type="button"
            onClick={handleRefreshStatus}
            disabled={loadingStatus}
            style={{
              marginTop: "16px",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              background: "transparent",
              border: "none",
              color: "#64748b",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            <RefreshCw size={15} />
            {loadingStatus
              ? "Refreshing..."
              : "Refresh Status"}
          </button>
        </section>

        {/* ==================================
            NIC VERIFICATION
        ================================== */}

        <section className="verification-card">
          <div className="verification-card-top">
            <div className="verification-icon blue">
              <CreditCard size={23} />
            </div>

            <span className="verification-badge pending">
              Admin Review
            </span>
          </div>

          <h2>NIC Verification</h2>

          <p className="verification-description">
            Submit your National Identity Card number
            for verification by the store administrator.
          </p>

          <form
            className="verification-nic-form"
            onSubmit={handleNICSubmit}
          >
            <label htmlFor="nic">
              NIC Number
            </label>

            <input
              id="nic"
              type="text"
              value={nic}
              onChange={(event) =>
                setNic(event.target.value)
              }
              placeholder="Enter your NIC number"
              autoComplete="off"
              required
              disabled={submittingNIC}
            />

            <button
              type="submit"
              className="verification-primary-btn"
              disabled={
                submittingNIC ||
                !nic.trim()
              }
            >
              <CreditCard size={17} />

              {submittingNIC
                ? "Submitting NIC..."
                : "Submit NIC for Review"}
            </button>
          </form>

          <p className="verification-hint">
            <LockKeyhole size={15} />
            NIC approval is completed by the
            administrator.
          </p>
        </section>

        {/* ==================================
            PHONE VERIFICATION
        ================================== */}

        <section className="verification-card">
          <div className="verification-card-top">
            <div className="verification-icon purple">
              <Smartphone size={23} />
            </div>

            <span className="verification-badge upcoming">
              Coming Soon
            </span>
          </div>

          <h2>Phone Verification</h2>

          <p className="verification-description">
            Phone number verification using real SMS
            OTP will be implemented in a future update.
          </p>

          <div className="verification-coming-soon">
            <Smartphone size={23} />

            <span>
              SMS OTP verification is currently
              unavailable.
            </span>
          </div>

          <p className="verification-hint">
            <Clock3 size={15} />
            This feature will be available soon.
          </p>
        </section>
      </div>
    </main>
  );
}
