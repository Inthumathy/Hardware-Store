
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Package,
  ShoppingBag,
  AlertCircle,
  LoaderCircle,
  ClipboardList
} from "lucide-react";

import { getOrderById } from "../services/orderApi";
import "./OrderDetails.css";

const formatPrice = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export default function OrderDetails() {
  const { id } = useParams();
  const location = useLocation();

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      setLoading(true);
      setError("");

      try {
        const result = await getOrderById(id);

        // Supports common response structures:
        // { data: { order, items } }
        // { order, items }
        const payload = result.data || result;
        const orderData = payload.order || payload;

        if (active) {
          setOrder(orderData);
          setItems(
            Array.isArray(payload.items)
              ? payload.items
              : Array.isArray(orderData.items)
                ? orderData.items
                : []
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
            "Unable to load order details."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [id]);

  const orderStatus = String(
    order?.status || "PENDING"
  ).toUpperCase();

  const paymentStatus = String(
    order?.payment_status || "UNPAID"
  ).toUpperCase();

  const total = Number(
    order?.total_amount ??
    order?.total ??
    items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.subtotal ??
          Number(item.price || item.unit_price || 0) *
          Number(item.quantity || 0)
        ),
      0
    )
  );

  return (
    <main className="hardware-order-page">

      <header className="hardware-order-header">
        <div>
          <span className="hardware-order-eyebrow">
            CUSTOMER / MY ORDERS / DETAILS
          </span>

          <h1>Order Details</h1>

          <p>
            View your order information, purchased
            products and payment status.
          </p>
        </div>

        <Link to="/orders" className="hardware-order-back">
          <ArrowLeft size={18} />
          My Orders
        </Link>
      </header>

      {location.state?.justPlaced && (
        <div
          className="hardware-order-success"
          role="status"
        >
          <CheckCircle2 size={24} />
          <div>
            <strong>Order placed successfully!</strong>
            <p>
              Your order has been created.
              You can review its details below.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="hardware-order-error" role="alert">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="hardware-order-loading">
          <LoaderCircle
            size={30}
            className="hardware-order-spinner"
          />
          <p>Loading order details...</p>
        </div>
      ) : !order ? (
        <div className="hardware-order-loading">
          <Package size={38} />
          <h2>Order not found</h2>
          <Link to="/orders">Back to My Orders</Link>
        </div>
      ) : (
        <div className="hardware-order-layout">

          <div className="hardware-order-main">

            {/* ORDER OVERVIEW */}

            <section className="hardware-order-card">
              <div className="hardware-order-card-heading">
                <div className="hardware-order-heading-icon">
                  <ClipboardList size={23} />
                </div>

                <div>
                  <h2>Order #{order.id || id}</h2>
                  <p>Order information and current status</p>
                </div>
              </div>

              <div className="hardware-order-status-grid">
                <div className="hardware-order-status-box">
                  <span>Order Status</span>

                  <strong className={
                    orderStatus === "PENDING"
                      ? "hardware-order-badge pending"
                      : orderStatus === "CANCELLED"
                        ? "hardware-order-badge cancelled"
                        : "hardware-order-badge active"
                  }>
                    <Clock3 size={15} />
                    {orderStatus}
                  </strong>
                </div>

                <div className="hardware-order-status-box">
                  <span>Payment Status</span>

                  <strong className={
                    paymentStatus === "PAID"
                      ? "hardware-order-badge active"
                      : "hardware-order-badge unpaid"
                  }>
                    <CreditCard size={15} />
                    {paymentStatus}
                  </strong>
                </div>

                <div className="hardware-order-status-box">
                  <span>Order Number</span>
                  <strong>#{order.id || id}</strong>
                </div>

                {order.created_at && (
                  <div className="hardware-order-status-box">
                    <span>Order Date</span>
                    <strong>
                      {new Date(
                        order.created_at
                      ).toLocaleDateString("en-GB")}
                    </strong>
                  </div>
                )}
              </div>
            </section>

            {/* PURCHASED PRODUCTS */}

            <section className="hardware-order-card">
              <div className="hardware-order-card-heading">
                <div className="hardware-order-heading-icon orange">
                  <ShoppingBag size={23} />
                </div>

                <div>
                  <h2>Purchased Products</h2>
                  <p>
                    {items.length} product
                    {items.length !== 1 ? "s" : ""} in this order
                  </p>
                </div>
              </div>

              {items.length === 0 ? (
                <p className="hardware-order-no-items">
                  No purchased products found.
                </p>
              ) : (
                <div className="hardware-order-items">
                  {items.map((item, index) => {
                    const price = Number(
                      item.unit_price ?? item.price ?? 0
                    );

                    const quantity = Number(
                      item.quantity || 0
                    );

                    const subtotal = Number(
                      item.subtotal ?? price * quantity
                    );

                    return (
                      <article
                        className="hardware-order-item"
                        key={item.id || item.product_id || index}
                      >
                        <div className="hardware-order-product-icon">
                          <Package size={27} />
                        </div>

                        <div className="hardware-order-product-info">
                          <h3>
                            {item.product_name ||
                              item.name ||
                              "Hardware Product"}
                          </h3>

                          <p>
                            {formatPrice(price)} / unit
                          </p>

                          <span>
                            Quantity: {quantity}
                          </span>
                        </div>

                        <strong className="hardware-order-product-total">
                          {formatPrice(subtotal)}
                        </strong>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <Link
              to="/products"
              className="hardware-order-shop-link"
            >
              <ShoppingBag size={18} />
              Continue Shopping
              <ArrowRight size={17} />
            </Link>
          </div>

          {/* ORDER SUMMARY */}

          <aside className="hardware-order-summary">
            <div className="hardware-order-summary-title">
              <h2>Order Summary</h2>
              <ClipboardList size={22} />
            </div>

            <div className="hardware-order-summary-row">
              <span>Order Number</span>
              <strong>#{order.id || id}</strong>
            </div>

            <div className="hardware-order-summary-row">
              <span>Products</span>
              <strong>{items.length}</strong>
            </div>

            <div className="hardware-order-summary-row">
              <span>Order Status</span>
              <strong>{orderStatus}</strong>
            </div>

            <div className="hardware-order-summary-row">
              <span>Payment</span>
              <span className={
                paymentStatus === "PAID"
                  ? "hardware-order-badge active"
                  : "hardware-order-badge unpaid"
              }>
                {paymentStatus}
              </span>
            </div>

            <div className="hardware-order-summary-divider" />

            <div className="hardware-order-summary-total">
              <span>Order Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <div className="hardware-order-summary-note">
              <CheckCircle2 size={19} />
              <span>
                Your order details are saved in the
                Hardware Store system.
              </span>
            </div>

            <Link
              to="/orders"
              className="hardware-order-summary-button"
            >
              View My Orders
              <ArrowRight size={18} />
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
