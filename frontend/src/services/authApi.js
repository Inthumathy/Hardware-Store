
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5001/api";

const authApi = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

export const loginUser = async (email, password) => {
  const response = await authApi.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};

export const registerUser = async (formData) => {
  const response = await authApi.post(
    "/auth/register",
    formData
  );

  return response.data;
};

export const getProfile = async (token) => {
  const response = await authApi.get("/auth/profile", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};
