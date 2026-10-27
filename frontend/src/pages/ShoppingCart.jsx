
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  ShoppingCart as CartIcon,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Minus,
  Plus,
  Package,
  ShieldCheck,
  Truck,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

import {
  getCart,
  updateCartQuantity,
  removeCartItem
} from "../services/cartApi";

import "./ShoppingCart.css";

const formatPrice = (value) => {
  return `Rs. ${Number(value || 0).toLocaleString(
    "en-LK",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  )}`;
};

export default function ShoppingCart() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCart = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const result = await getCart();

      setItems(result.items || []);
      setTotal(Number(result.total || 0));
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load your shopping cart."
      );
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const changeQuantity = async (item, newQuantity) => {
    if (
      !Number.isSafeInteger(newQuantity) ||
      newQuantity < 1 ||
      newQuantity > Number(item.stock_quantity)
    ) {
      setError("Invalid quantity or insufficient stock.");
      return;
    }

    setBusyId(item.cart_item_id);
    setError("");
    setMessage("");

    try {
      await updateCartQuantity(
        item.cart_item_id,
        newQuantity
      );

      await loadCart(false);
      setMessage("Cart updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update quantity."
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (cartItemId) => {
    if (!window.confirm("Remove this item from cart?")) {
      return;
    }

    setBusyId(cartItemId);
    setError("");
    setMessage("");

    try {
      await removeCartItem(cartItemId);

      await loadCart(false);
      setMessage("Product removed from cart.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to remove product."
      );
    } finally {
      setBusyId(null);
    }
  };

  const itemCount = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  return (
    <main className="shopping-cart-page">
      {/* PAGE HEADER */}

      <header className="shopping-cart-header">
        <div>
          <div className="shopping-cart-eyebrow">
            <CartIcon size={16} />
            CUSTOMER / SHOPPING CART
          </div>

          <h1>My Shopping Cart</h1>

          <p>
            Review your hardware products before checkout.
          </p>
        </div>

        <Link
          to="/products"
          className="shopping-cart-continue"
        >
          <ArrowLeft size={17} />
          Continue Shopping
        </Link>
      </header>

      {/* NOTIFICATIONS */}

      {error && (
        <div
          className="shopping-cart-alert error"
          role="alert"
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div
          className="shopping-cart-alert success"
          role="status"
        >
          <CheckCircle2 size={20} />
          <span>{message}</span>
        </div>
      )}

      {/* LOADING */}

      {loading ? (
        <div className="shopping-cart-empty">
          <RefreshCw
            size={36}
            className="shopping-cart-spinner"
          />

          <h2>Loading your cart...</h2>
          <p>Please wait a moment.</p>
        </div>
      ) : items.length === 0 ? (
        /* EMPTY CART */

        <div className="shopping-cart-empty">
          <div className="shopping-cart-empty-icon">
            <CartIcon size={38} />
          </div>

          <h2>Your cart is empty</h2>

          <p>
            Looks like you haven't added any hardware
            products to your cart yet.
          </p>

          <Link
            to="/products"
            className="shopping-cart-primary-link"
          >
            Browse Products
            <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        /* CART CONTENT */

        <div className="shopping-cart-layout">
          {/* LEFT: PRODUCTS */}

          <section className="shopping-cart-products">
            <div className="shopping-cart-section-header">
              <div>
                <h2>Cart Items</h2>

                <p>
                  {itemCount}{" "}
                  {itemCount === 1 ? "item" : "items"}{" "}
                  in your cart
                </p>
              </div>

              <button
                type="button"
                className="shopping-cart-refresh"
                onClick={() => loadCart(false)}
                disabled={busyId !== null}
              >
                <RefreshCw size={17} />
                Refresh
              </button>
            </div>

            <div className="shopping-cart-items">
              {items.map((item) => {
                const isBusy =
                  busyId === item.cart_item_id;

                const maxStock = Number(
                  item.stock_quantity || 0
                );

                return (
                  <article
                    className="shopping-cart-item"
                    key={item.cart_item_id}
                  >
                    {/* PRODUCT IMAGE */}

                    <div className="shopping-cart-product-image">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                        />
                      ) : (
                        <Package size={36} />
                      )}
                    </div>

                    {/* PRODUCT DETAILS */}

                    <div className="shopping-cart-product-details">
                      <span className="shopping-cart-category">
                        {item.category || "Hardware Product"}
                      </span>

                      <h3>{item.name}</h3>

                      {item.sku && (
                        <p className="shopping-cart-sku">
                          SKU: {item.sku}
                        </p>
                      )}

                      <p className="shopping-cart-unit-price">
                        {formatPrice(item.price)} / unit
                      </p>

                      <div className="shopping-cart-stock">
                        <span className="shopping-cart-stock-dot" />
                        {maxStock > 0
                          ? `${maxStock} available in stock`
                          : "Out of stock"}
                      </div>
                    </div>

                    {/* QUANTITY AND PRICE */}

                    <div className="shopping-cart-item-right">
                      <div className="shopping-cart-quantity">
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name} quantity`}
                          disabled={
                            busyId !== null ||
                            Number(item.quantity) <= 1
                          }
                          onClick={() =>
                            changeQuantity(
                              item,
                              Number(item.quantity) - 1
                            )
                          }
                        >
                          <Minus size={16} />
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          type="button"
                          aria-label={`Increase ${item.name} quantity`}
                          disabled={
                            busyId !== null ||
                            Number(item.quantity) >= maxStock
                          }
                          onClick={() =>
                            changeQuantity(
                              item,
                              Number(item.quantity) + 1
                            )
                          }
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <strong className="shopping-cart-subtotal">
                        {formatPrice(item.subtotal)}
                      </strong>

                      <button
                        type="button"
                        className="shopping-cart-remove"
                        disabled={busyId !== null}
                        onClick={() =>
                          handleRemove(item.cart_item_id)
                        }
                      >
                        <Trash2 size={16} />
                        {isBusy ? "Updating..." : "Remove"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="shopping-cart-bottom-link">
              <Link to="/products">
                <ArrowLeft size={17} />
                Continue Shopping
              </Link>
            </div>
          </section>

          {/* RIGHT: ORDER SUMMARY */}

          <aside className="shopping-cart-summary">
            <div className="shopping-cart-summary-title">
              <h2>Order Summary</h2>
              <CartIcon size={21} />
            </div>

            <div className="shopping-cart-summary-row">
              <span>Subtotal ({itemCount} items)</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <div className="shopping-cart-summary-row">
              <span>Delivery Charges</span>
              <span className="shopping-cart-muted">
                Calculated at checkout
              </span>
            </div>

            <div className="shopping-cart-summary-divider" />

            <div className="shopping-cart-summary-total">
              <span>Cart Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <p className="shopping-cart-summary-note">
              Final charges, if applicable, will be
              confirmed during checkout.
            </p>

            <Link
              to="/checkout"
              className="shopping-cart-checkout"
            >
              Proceed to Checkout
              <ArrowRight size={19} />
            </Link>

            <div className="shopping-cart-trust">
              <div>
                <ShieldCheck size={19} />
                <span>Account-protected checkout</span>
              </div>

              <div>
                <Truck size={19} />
                <span>Order details confirmed at checkout</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
