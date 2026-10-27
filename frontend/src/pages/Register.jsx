
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  UserPlus,
  User,
  Mail,
  Phone,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

import { registerUser } from "../services/authApi";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (
      new TextEncoder().encode(form.password).length > 72
    ) {
      setError("Password must not exceed 72 UTF-8 bytes.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        password: form.password
      };

      await registerUser(payload);

      navigate("/login", {
        replace: true,
        state: {
          message:
            "Account created successfully! Please login to verify your email.",
          email: payload.email,
          needsEmailVerification: true
        }
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <form
        className="auth-card"
        onSubmit={handleSubmit}
      >
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 16,
            background: "#fff1e3",
            color: "#f58a24",
            display: "grid",
            placeItems: "center",
            marginBottom: 18
          }}
        >
          <UserPlus size={28} />
        </div>

        <h1>Create Account</h1>

        <p>
          Join Hardware Store to explore products
          and manage your account.
        </p>

        {error && (
          <p role="alert" className="auth-error">
            {error}
          </p>
        )}

        <label htmlFor="full_name">
          <User size={16} /> Full Name
        </label>

        <input
          id="full_name"
          name="full_name"
          type="text"
          placeholder="Enter your full name"
          value={form.full_name}
          onChange={handleChange}
          autoComplete="name"
          required
        />

        <label htmlFor="email">
          <Mail size={16} /> Email Address
        </label>

        <input
          id="email"
          name="email"
          type="email"
          placeholder="example@gmail.com"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

        <label htmlFor="phone">
          <Phone size={16} /> Phone Number
        </label>

        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+94771234567"
          value={form.phone}
          onChange={handleChange}
          autoComplete="tel"
        />

        <label htmlFor="password">
          <LockKeyhole size={16} /> Password
        </label>

        <div style={{ position: "relative" }}>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={form.password}
            onChange={handleChange}
            minLength={12}
            autoComplete="new-password"
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              paddingRight: 50
            }}
          />

          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={
              showPassword ? "Hide password" : "Show password"
            }
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              background: "transparent",
              color: "#64748b",
              border: "none",
              cursor: "pointer"
            }}
          >
            {showPassword
              ? <EyeOff size={19} />
              : <Eye size={19} />}
          </button>
        </div>

        <small>
          Minimum 12 characters, maximum 72 UTF-8 bytes.
        </small>

        <div
          style={{
            display: "flex",
            gap: 10,
            padding: 14,
            marginTop: 18,
            borderRadius: 10,
            background: "#f8fafc",
            color: "#64748b",
            fontSize: 13
          }}
        >
          <ShieldCheck size={20} />

          <span>
            After registration, login to verify
            your email using a secure OTP.
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            marginTop: 20
          }}
        >
          {loading ? "Creating Account..." : "Create Account"}

          {!loading && <ArrowRight size={18} />}
        </button>

        <p style={{ textAlign: "center", marginTop: 20 }}>
          Already registered?{" "}
          <Link to="/login">Login</Link>
        </p>
      </form>
    </main>
  );
}
