
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000
});

// Attach customer/admin JWT from existing login.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Customer NIC Submission
export const submitNIC = async (nic) => {
  const response = await api.post(
    "/verification/nic/submit",
    { nic }
  );

  return response.data;
};

// Development Mock OTP Request
export const requestMockOTP = async () => {
  const response = await api.post(
    "/verification/mock/phone/request"
  );

  return response.data;
};

// Development Mock OTP Verification
export const verifyMockOTP = async (otp) => {
  const response = await api.post(
    "/verification/mock/phone/verify",
    { otp }
  );

  return response.data;
};

// Admin Pending NIC Requests
export const getPendingNICRequests = async () => {
  const response = await api.get(
    "/verification/admin/nic/pending"
  );

  return response.data;
};

// Admin NIC Rejection
export const rejectNIC = async (requestId) => {
  const response = await api.patch(
    `/verification/admin/nic/${requestId}/review`,
    { status: "REJECTED" }
  );

  return response.data;
};

// =====================================
// EMAIL OTP VERIFICATION
// =====================================

// Get current email verification status
export const getEmailVerificationStatus = async () => {
  const response = await api.get(
    "/verification/email/status"
  );

  return response.data;
};

// Send OTP to registered email
export const sendEmailOTP = async () => {
  const response = await api.post(
    "/verification/email/send-otp",
    {}
  );

  return response.data;
};

// Verify the 6-digit email OTP
export const verifyEmailOTP = async (otp) => {
  const response = await api.post(
    "/verification/email/verify-otp",
    { otp }
  );

  return response.data;
};

export const approveNIC = async (requestId, reviewNote) => {
  const response = await api.patch(
    `/verification/admin/nic/${requestId}/review`,
    {
      status: "APPROVED",
      identityEvidenceReviewed: true,
      reviewNote
    }
  );

  return response.data;
};

export default api;
