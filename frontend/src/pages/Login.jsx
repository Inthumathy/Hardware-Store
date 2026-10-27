
import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  Store,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

import {
  getEmailVerificationStatus
} from "../services/verificationApi";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();

  const [email, setEmail] = useState(
    location.state?.email || ""
  );

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const registrationMessage =
    location.state?.message || "";

  // ======================================
  // HANDLE LOGIN
  // ======================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Login and save JWT using AuthContext
      const user = await login(
        email.trim().toLowerCase(),
        password
      );

      // ==================================
      // ADMIN LOGIN
      // ==================================

      if (user.role === "ADMIN") {
        navigate("/admin", {
          replace: true
        });

        return;
      }

      // ==================================
      // WORKER LOGIN
      // ==================================

      if (user.role === "WORKER") {
        navigate("/worker", {
          replace: true
        });

        return;
      }

      // ==================================
      // CUSTOMER LOGIN
      // ==================================

      if (user.role === "CUSTOMER") {
        try {
          const status =
            await getEmailVerificationStatus();

          if (status.email_verified) {
            navigate("/customer", {
              replace: true
            });
          } else {
            navigate("/customer/verification", {
              replace: true
            });
          }
        } catch (statusError) {
          console.error(
            "Email verification status error:",
            statusError
          );

          // Do not treat a status API failure as
          // successful verification.
          navigate("/customer/verification", {
            replace: true
          });
        }

        return;
      }

      setError("Unknown user role. Contact administrator.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================
  // LOGIN UI
  // ======================================

  return (
    <main className="auth-page">
      <form
        className="auth-card"
        onSubmit={handleSubmit}
      >
        {/* LOGO */}

        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: 17,
            background: "#f58a24",
            color: "#ffffff",
            display: "grid",
            placeItems: "center",
            marginBottom: 20
          }}
        >
          <Store size={30} />
        </div>

        <h1>Hardware Store</h1>

        <h2>Welcome Back</h2>

        <p>
          Sign in to manage your hardware store account.
        </p>

        {/* REGISTRATION SUCCESS MESSAGE */}

        {registrationMessage && (
          <div
            role="status"
            style={{
              background: "#dcfce7",
              color: "#166534",
              padding: "13px 15px",
              borderRadius: 10,
              marginBottom: 18,
              fontSize: 14
            }}
          >
            {registrationMessage}
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <p
            role="alert"
            className="auth-error"
          >
            {error}
          </p>
        )}

        {/* EMAIL */}

        <label htmlFor="email">
          <Mail size={16} />
          Email Address
        </label>

        <input
          id="email"
          type="email"
          placeholder="example@gmail.com"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          autoComplete="email"
          required
        />

        {/* PASSWORD */}

        <label htmlFor="password">
          <LockKeyhole size={16} />
          Password
        </label>

        <div style={{ position: "relative" }}>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            autoComplete="current-password"
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              paddingRight: 52
            }}
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword((previous) => !previous)
            }
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              padding: 0,
              border: "none",
              background: "transparent",
              color: "#64748b",
              cursor: "pointer"
            }}
          >
            {showPassword
              ? <EyeOff size={19} />
              : <Eye size={19} />}
          </button>
        </div>

        {/* LOGIN BUTTON */}

        <button
          type="submit"
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            marginTop: 22
          }}
        >
          <LogIn size={18} />

          {loading
            ? "Signing In..."
            : "Login"}
        </button>

        {/* SECURITY NOTE */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginTop: 18,
            padding: 12,
            background: "#f8fafc",
            borderRadius: 10,
            color: "#64748b",
            fontSize: 13
          }}
        >
          <ShieldCheck size={19} />

          <span>
            Customer email verification is required
            after registration.
          </span>
        </div>

        {/* REGISTER LINK */}

        <p
          style={{
            marginTop: 20,
            textAlign: "center"
          }}
        >
          Don't have an account?{" "}
          <Link to="/register">
            Create Account
          </Link>
        </p>
      </form>
    </main>
  );
}
