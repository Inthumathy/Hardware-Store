
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Search,
  ShoppingBag,
  ArrowRight,
  CalendarDays,
  Wallet,
  RefreshCw,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Clock3
} from "lucide-react";

import { getMyOrders } from "../services/orderApi";
import "./MyOrders.css";

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadOrders = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const result = await getMyOrders();
      const data = result.data;

      setOrders(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.orders)
            ? data.orders
            : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load your orders."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = String(order.id)
        .toLowerCase()
        .includes(search.trim().replace("#", "").toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        String(order.status || "").toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const totalSpent = orders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  );

  const pendingCount = orders.filter(
    (order) => String(order.status).toUpperCase() === "PENDING"
  ).length;

  const completedCount = orders.filter(
    (order) =>
      ["COMPLETED", "DELIVERED"].includes(
        String(order.status).toUpperCase()
      )
  ).length;

  const formatPrice = (amount) =>
    `Rs. ${Number(amount || 0).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  const formatDate = (date) => {
    if (!date) return "—";

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "—";

    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const getStatusClass = (status) => {
    const value = String(status || "").toUpperCase();

    if (["COMPLETED", "DELIVERED"].includes(value)) {
      return "completed";
    }

    if (["CANCELLED", "REJECTED"].includes(value)) {
      return "cancelled";
    }

    if (["PROCESSING", "CONFIRMED", "SHIPPED"].includes(value)) {
      return "processing";
    }

    return "pending";
  };

  return (
    <main className="my-orders-page">
      <header className="my-orders-heading">
        <div>
          <div className="my-orders-eyebrow">
            <Package size={16} />
            CUSTOMER / ORDER HISTORY
          </div>

          <h1>My Orders</h1>

          <p>
            Track your purchases, review order details and
            stay updated on your hardware orders.
          </p>
        </div>

        <Link to="/products" className="my-orders-shop-btn">
          <ShoppingBag size={19} />
          Shop Products
          <ArrowRight size={17} />
        </Link>
      </header>

      <section className="my-orders-stats">
        <article className="my-orders-stat-card">
          <div className="my-orders-stat-icon blue">
            <ClipboardList size={24} />
          </div>
          <div>
            <span>Total Orders</span>
            <strong>{orders.length}</strong>
            <small>All your purchases</small>
          </div>
        </article>

        <article className="my-orders-stat-card">
          <div className="my-orders-stat-icon orange">
            <Clock3 size={24} />
          </div>
          <div>
            <span>Pending Orders</span>
            <strong>{pendingCount}</strong>
            <small>Awaiting processing</small>
          </div>
        </article>

        <article className="my-orders-stat-card">
          <div className="my-orders-stat-icon green">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span>Completed Orders</span>
            <strong>{completedCount}</strong>
            <small>Completed purchases</small>
          </div>
        </article>

        <article className="my-orders-stat-card">
          <div className="my-orders-stat-icon purple">
            <Wallet size={24} />
          </div>
          <div>
            <span>Total Order Value</span>
            <strong className="my-orders-money">
              {formatPrice(totalSpent)}
            </strong>
            <small>Includes unpaid orders</small>
          </div>
        </article>
      </section>

      <section className="my-orders-panel">
        <div className="my-orders-panel-header">
          <div>
            <h2>Order History</h2>
            <p>View and manage your recent purchases.</p>
          </div>

          <button
            type="button"
            className="my-orders-refresh"
            onClick={() => loadOrders(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "spinning" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="my-orders-toolbar">
          <div className="my-orders-search">
            <Search size={19} />
            <input
              type="search"
              placeholder="Search by order ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search orders by ID"
            />
          </div>

          <select
            className="my-orders-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by order status"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {error && (
          <div className="my-orders-alert" role="alert">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="my-orders-empty">
            <RefreshCw size={32} className="spinning" />
            <p>Loading your orders...</p>
          </div>
        ) : !error && filteredOrders.length === 0 ? (
          <div className="my-orders-empty">
            <div className="my-orders-empty-icon">
              <ShoppingBag size={34} />
            </div>
            <h3>
              {orders.length === 0
                ? "No orders yet"
                : "No matching orders"}
            </h3>
            <p>
              {orders.length === 0
                ? "Start shopping to see your orders here."
                : "Try changing your search or status filter."}
            </p>

            {orders.length === 0 && (
              <Link to="/products" className="my-orders-shop-btn">
                Browse Products
                <ArrowRight size={17} />
              </Link>
            )}
          </div>
        ) : !error && (
          <>
            <div className="my-orders-table-wrapper">
              <table className="my-orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Order Date</th>
                    <th>Total Amount</th>
                    <th>Order Status</th>
                    <th>Payment</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => {
                    const paymentStatus = String(
                      order.payment_status || "UNPAID"
                    ).toUpperCase();

                    return (
                      <tr key={order.id}>
                        <td>
                          <div className="my-orders-order-id">
                            <span className="my-orders-package-icon">
                              <Package size={19} />
                            </span>
                            <div>
                              <strong>Order #{order.id}</strong>
                              <small>Hardware purchase</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="my-orders-date">
                            <CalendarDays size={16} />
                            {formatDate(order.created_at)}
                          </span>
                        </td>

                        <td>
                          <strong className="my-orders-amount">
                            {formatPrice(order.total_amount)}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`my-orders-status ${getStatusClass(
                              order.status
                            )}`}
                          >
                            <span className="my-orders-status-dot" />
                            {order.status || "UNKNOWN"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`my-orders-payment ${
                              paymentStatus === "PAID"
                                ? "paid"
                                : "unpaid"
                            }`}
                          >
                            {paymentStatus}
                          </span>
                        </td>

                        <td>
                          <Link
                            to={`/orders/${order.id}`}
                            className="my-orders-view-btn"
                          >
                            View Details
                            <ArrowRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="my-orders-table-footer">
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
          </>
        )}
      </section>
    </main>
  );
}
