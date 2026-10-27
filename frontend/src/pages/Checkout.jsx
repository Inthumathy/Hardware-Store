
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  ClipboardCheck,
  Package,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Info,
  LockKeyhole,
  LoaderCircle
} from "lucide-react";

import { getCart } from "../services/cartApi";
import { checkoutOrder } from "../services/orderApi";

import "./Checkout.css";

const formatPrice = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export default function Checkout() {
  const navigate = useNavigate();

  const [cart, setCart] = useState({
    items: [],
    total: 0
  });

  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadCart = async () => {
      try {
        const result = await getCart();

        if (active) {
          setCart({
            items: result.items || [],
            total: Number(result.total || 0)
          });
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
            "Unable to load cart."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadCart();

    return () => {
      active = false;
    };
  }, []);

  const handleCheckout = async () => {
    if (placing || cart.items.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to place this order?\n\n" +
      "Payment status will remain UNPAID."
    );

    if (!confirmed) return;

    setPlacing(true);
    setError("");

    try {
      const result = await checkoutOrder();

      navigate(`/orders/${result.data.orderId}`, {
        replace: true,
        state: {
          justPlaced: true
        }
      });
    } catch (err) {
      if (!err.response) {
        setError(
          "Connection lost. Your order may have been placed. " +
          "Check My Orders before trying again."
        );
      } else {
        setError(
          err.response.data?.message ||
          "Unable to place order."
        );
      }
    } finally {
      setPlacing(false);
    }
  };

  const itemCount = cart.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  return (
    <main className="hardware-checkout-page">

      {/* PAGE HEADER */}

      <header className="hardware-checkout-header">
        <div>
          <span className="hardware-checkout-eyebrow">
            <ShoppingBag size={16} />
            CUSTOMER / CHECKOUT
          </span>

          <h1>Checkout</h1>

          <p>
            Review your order details before confirming
            your purchase.
          </p>
        </div>

        <Link
          to="/cart"
          className="hardware-checkout-back"
        >
          <ArrowLeft size={18} />
          Back to Cart
        </Link>
      </header>

      {/* ERROR MESSAGE */}

      {error && (
        <div
          className="hardware-checkout-error"
          role="alert"
        >
          <AlertCircle size={21} />
          <span>{error}</span>
        </div>
      )}

      {/* LOADING STATE */}

      {loading ? (
        <section className="hardware-checkout-empty">
          <LoaderCircle
            size={38}
            className="hardware-checkout-spinner"
          />

          <h2>Preparing your checkout...</h2>

          <p>
            Loading your order details.
          </p>
        </section>
      ) : cart.items.length === 0 ? (
        /* EMPTY CART */

        <section className="hardware-checkout-empty">
          <div className="hardware-checkout-empty-icon">
            <ShoppingBag size={38} />
          </div>

          <h2>Your shopping cart is empty</h2>

          <p>
            Add hardware products to your cart
            before proceeding to checkout.
          </p>

          <Link
            to="/products"
            className="hardware-checkout-primary-link"
          >
            Browse Products
            <ArrowRight size={18} />
          </Link>
        </section>
      ) : (
        <div className="hardware-checkout-layout">

          {/* LEFT SECTION */}

          <div className="hardware-checkout-left">

            {/* ORDER ITEMS */}

            <section className="hardware-checkout-card">

              <div className="hardware-checkout-card-header">
                <div className="hardware-checkout-card-heading">
                  <div className="hardware-checkout-icon">
                    <Package size={22} />
                  </div>

                  <div>
                    <h2>Order Items</h2>
                    <p>
                      {itemCount}{" "}
                      {itemCount === 1 ? "item" : "items"}{" "}
                      in your order
                    </p>
                  </div>
                </div>
              </div>

              <div className="hardware-checkout-items">
                {cart.items.map((item) => (
                  <article
                    className="hardware-checkout-item"
                    key={item.cart_item_id}
                  >
                    <div className="hardware-checkout-product-image">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                        />
                      ) : (
                        <Package size={30} />
                      )}
                    </div>

                    <div className="hardware-checkout-product-info">
                      <h3>{item.name}</h3>

                      {item.sku && (
                        <p className="hardware-checkout-sku">
                          SKU: {item.sku}
                        </p>
                      )}

                      <p>
                        {formatPrice(item.price)} / unit
                      </p>

                      <span className="hardware-checkout-quantity">
                        Qty: {item.quantity}
                      </span>
                    </div>

                    <strong className="hardware-checkout-item-price">
                      {formatPrice(item.subtotal)}
                    </strong>
                  </article>
                ))}
              </div>

              <div className="hardware-checkout-edit-cart">
                <Link to="/cart">
                  <ArrowLeft size={16} />
                  Edit Shopping Cart
                </Link>
              </div>
            </section>

            {/* PAYMENT INFORMATION */}

            <section className="hardware-checkout-card hardware-checkout-payment">
              <div className="hardware-checkout-card-heading">
                <div className="hardware-checkout-icon blue">
                  <CreditCard size={22} />
                </div>

                <div>
                  <h2>Payment Information</h2>
                  <p>Current order payment details</p>
                </div>
              </div>

              <div className="hardware-checkout-payment-status">
                <span>Payment Status</span>

                <span className="hardware-checkout-unpaid">
                  UNPAID
                </span>
              </div>

              <div className="hardware-checkout-info">
                <Info size={20} />

                <p>
                  Online payment and delivery address
                  features are not implemented yet.
                  Your order will be created with
                  an unpaid payment status.
                </p>
              </div>
            </section>

          </div>

          {/* RIGHT SECTION - SUMMARY */}

          <aside className="hardware-checkout-summary">

            <div className="hardware-checkout-summary-heading">
              <h2>Order Summary</h2>
              <ClipboardCheck size={23} />
            </div>

            <div className="hardware-checkout-summary-row">
              <span>Items ({itemCount})</span>
              <strong>{formatPrice(cart.total)}</strong>
            </div>

            <div className="hardware-checkout-summary-row">
              <span>Payment Status</span>

              <span className="hardware-checkout-unpaid">
                UNPAID
              </span>
            </div>

            <div className="hardware-checkout-summary-divider" />

            <div className="hardware-checkout-total">
              <span>Order Total</span>

              <strong>
                {formatPrice(cart.total)}
              </strong>
            </div>

            <p className="hardware-checkout-total-note">
              This is your current cart total.
              No online payment will be collected.
            </p>

            <button
              type="button"
              className="hardware-checkout-place-order"
              onClick={handleCheckout}
              disabled={placing || loading}
            >
              {placing ? (
                <>
                  <LoaderCircle
                    size={19}
                    className="hardware-checkout-spinner"
                  />
                  Placing Order...
                </>
              ) : (
                <>
                  <ShieldCheck size={19} />
                  Place Order
                  <ArrowRight size={19} />
                </>
              )}
            </button>

            <div className="hardware-checkout-security">
              <LockKeyhole size={17} />

              <span>
                Your account must meet the required
                verification rules before ordering.
              </span>
            </div>

          </aside>

        </div>
      )}
    </main>
  );
}
