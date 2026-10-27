
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getAdminOrders,
  getAdminOrderDetails,
  updateAdminOrderStatus
} from "../services/adminOrderApi";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getAdminOrders();
      setOrders(
        Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.orders)
            ? result.orders
            : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load orders"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const viewDetails = async (id) => {
    setError("");

    try {
      const result = await getAdminOrderDetails(id);
      setSelectedOrder(result.data || result.order || result);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load order details"
      );
    }
  };

  const changeStatus = async (order, status) => {
    if (
      status === "CANCELLED" &&
      !window.confirm(
        `Cancel order #${order.id}?`
      )
    ) {
      return;
    }

    setUpdatingId(order.id);
    setError("");
    setMessage("");

    try {
      const result = await updateAdminOrderStatus(
        order.id,
        status
      );

      setMessage(
        result.message ||
        "Order status updated successfully"
      );

      setSelectedOrder(null);
      await loadOrders();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update order status"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main className="admin-orders-page">
      <div className="admin-orders-container">
        <div className="admin-orders-header">
          <div>
            <h1>Admin Order Management</h1>
            <p>Manage customer orders and deliveries.</p>
          </div>

          <Link to="/admin">
            Back to Dashboard
          </Link>
        </div>

        <button onClick={loadOrders}>
          Refresh Orders
        </button>

        {error && (
          <p className="checkout-error">{error}</p>
        )}

        {message && (
          <p className="checkout-success">{message}</p>
        )}

        {loading ? (
          <p>Loading orders...</p>
        ) : orders.length === 0 ? (
          <p>No customer orders found.</p>
        ) : (
          <div className="order-table-wrapper">
            <table className="order-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>

                    <td>
                      {order.customer_name ||
                        order.full_name ||
                        `Customer #${order.user_id}`}
                    </td>

                    <td>
                      Rs.{" "}
                      {Number(
                        order.total_amount ?? order.total ?? 0
                      ).toFixed(2)}
                    </td>

                    <td>{order.status}</td>

                    <td>
                      <div className="admin-order-actions">
                        <button
                          onClick={() => viewDetails(order.id)}
                        >
                          Details
                        </button>

                        {order.status === "PENDING" && (
                          <button
                            disabled={updatingId === order.id}
                            onClick={() =>
                              changeStatus(order, "CONFIRMED")
                            }
                          >
                            Confirm
                          </button>
                        )}

                        {order.status === "CONFIRMED" && (
                          <button
                            disabled={updatingId === order.id}
                            onClick={() =>
                              changeStatus(order, "SHIPPED")
                            }
                          >
                            Ship
                          </button>
                        )}

                        {order.status === "SHIPPED" && (
                          <button
                            disabled={updatingId === order.id}
                            onClick={() =>
                              changeStatus(order, "DELIVERED")
                            }
                          >
                            Deliver
                          </button>
                        )}

                        {["PENDING", "CONFIRMED"].includes(
                          order.status
                        ) && (
                          <button
                            className="danger-button"
                            disabled={updatingId === order.id}
                            onClick={() =>
                              changeStatus(order, "CANCELLED")
                            }
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedOrder && (
          <section className="admin-order-details">
            <h2>Order #{selectedOrder.id}</h2>

            <p>
              Status: {selectedOrder.status}
            </p>

            <p>
              Total: Rs.{" "}
              {Number(
                selectedOrder.total_amount ??
                selectedOrder.total ??
                0
              ).toFixed(2)}
            </p>

            {Array.isArray(selectedOrder.items) && (
              <ul>
                {selectedOrder.items.map((item, index) => (
                  <li key={item.id || index}>
                    {item.product_name || item.name} —{" "}
                    Qty: {item.quantity}
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => setSelectedOrder(null)}
            >
              Close Details
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
