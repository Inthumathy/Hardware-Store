const API_BASE = `${
  import.meta.env.VITE_API_URL || "http://localhost:5001/api"
}/verification/email`;

function getToken() {
  // Replace this key if your AuthContext stores the JWT differently.
  return localStorage.getItem("token");
}

async function emailRequest(path, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Please log in again.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || "Email verification request failed"
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

export const getEmailVerificationStatus = () =>
  emailRequest("/status");

export const sendEmailOTP = () =>
  emailRequest("/send-otp", {
    method: "POST",
    body: JSON.stringify({})
  });

export const verifyEmailOTP = (otp) =>
  emailRequest("/verify-otp", {
    method: "POST",
    body: JSON.stringify({ otp })
  });
