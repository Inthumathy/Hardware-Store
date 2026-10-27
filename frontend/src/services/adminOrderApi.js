
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5001/api";

const authHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`
  };
};

export const getAdminOrders = async () => {
  const response = await axios.get(
    `${API_URL}/orders/admin/all`,
    { headers: authHeaders() }
  );

  return response.data;
};

export const getAdminOrderDetails = async (id) => {
  const response = await axios.get(
    `${API_URL}/orders/${id}`,
    { headers: authHeaders() }
  );

  return response.data;
};

export const updateAdminOrderStatus = async (
  id,
  status
) => {
  const response = await axios.patch(
    `${API_URL}/orders/${id}/status`,
    { status },
    { headers: authHeaders() }
  );

  return response.data;
};
