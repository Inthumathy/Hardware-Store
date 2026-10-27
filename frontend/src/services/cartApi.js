
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const addToCart = async (productId, quantity = 1) => {
  const response = await api.post("/cart/items", {
    product_id: productId,
    quantity,
  });

  return response.data;
};

export const getCart = async () => {
  const response = await api.get("/cart");
  return response.data;
};

export const updateCartQuantity = async (cartItemId, quantity) => {
  const response = await api.put(`/cart/items/${cartItemId}`, {
    quantity,
  });

  return response.data;
};

export const removeCartItem = async (cartItemId) => {
  const response = await api.delete(`/cart/items/${cartItemId}`);
  return response.data;
};
