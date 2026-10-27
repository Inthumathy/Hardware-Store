
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getProducts } from "../services/productApi";
import { addToCart } from "../services/cartApi";
import { useAuth } from "../context/AuthContext";

export default function ProductCatalog() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Product states
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Cart states
  const [addingId, setAddingId] = useState(null);
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");
  const [error, setError] = useState("");

  // Load all active products
  const loadProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getProducts();
      setProducts(result.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load products"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Search products
  const filteredProducts = products.filter((product) => {
    const searchText = `
      ${product.name}
      ${product.sku}
      ${product.category || ""}
      ${product.description || ""}
    `.toLowerCase();

    return searchText.includes(search.trim().toLowerCase());
  });

  // Add product to cart
  const handleAddToCart = async (product) => {
    setCartMessage("");
    setCartError("");

    // Guest user
    if (!user) {
      navigate("/login");
      return;
    }

    // Admin and Worker cannot purchase
    if (user.role !== "CUSTOMER") {
      setCartError(
        "Only customer accounts can add products to cart."
      );
      return;
    }

    // Check stock
    if (Number(product.stock_quantity) <= 0) {
      setCartError("This product is currently out of stock.");
      return;
    }

    setAddingId(product.id);

    try {
      await addToCart(product.id, 1);

      setCartMessage(
        `${product.name} added to cart successfully!`
      );
    } catch (err) {
      const status = err.response?.status;

      if (status === 403) {
        setCartError(
          "Account verification is required before adding products to cart."
        );
      } else if (status === 401) {
        setCartError(
          "Your login session has expired. Please log in again."
        );
      } else {
        setCartError(
          err.response?.data?.message ||
          "Unable to add product to cart."
        );
      }
    } finally {
      setAddingId(null);
    }
  };

  return (
    <main className="catalog-page">
      {/* Header */}
      <header className="catalog-header">
        <h1>Hardware Store Products</h1>

        <p>
          Explore quality tools, building materials,
          electrical supplies and hardware accessories.
        </p>

        {/* Search */}
        <input
          type="search"
          className="catalog-search"
          placeholder="Search by product name, SKU or category..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {/* Navigation */}
        <div className="catalog-navigation">
          {user?.role === "CUSTOMER" && (
            <>
              <Link to="/customer">
                Dashboard
              </Link>

              <Link to="/cart">
                My Cart
              </Link>

              <Link to="/orders">
                My Orders
              </Link>
            </>
          )}

          {user?.role === "ADMIN" && (
            <Link to="/admin">
              Admin Dashboard
            </Link>
          )}

          {user?.role === "WORKER" && (
            <Link to="/worker">
              Worker Dashboard
            </Link>
          )}

          {!user && (
            <>
              <Link to="/login">
                Login
              </Link>

              <Link to="/register">
                Create Account
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Success Message */}
      {cartMessage && (
        <p className="catalog-success" role="status">
          {cartMessage}
        </p>
      )}

      {/* Cart Error */}
      {cartError && (
        <div className="catalog-error" role="alert">
          <p>{cartError}</p>

          {user?.role === "CUSTOMER" && (
            <Link to="/customer/verification">
              Go to Account Verification
            </Link>
          )}
        </div>
      )}

      {/* Product Error */}
      {error && (
        <p className="catalog-error" role="alert">
          {error}
        </p>
      )}

      {/* Loading */}
      {loading ? (
        <p className="catalog-status">
          Loading products...
        </p>
      ) : (
        <>
          {/* Product Count */}
          <div className="catalog-count">
            <h2>
              Available Products ({filteredProducts.length})
            </h2>

            <button
              type="button"
              onClick={loadProducts}
            >
              Refresh
            </button>
          </div>

          {/* Product Grid */}
          <section className="catalog-grid">
            {filteredProducts.map((product) => (
              <article
                className="catalog-card"
                key={product.id}
              >
                {/* Product Image */}
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="catalog-image"
                    loading="lazy"
                  />
                ) : (
                  <div className="catalog-placeholder">
                    ⚒
                  </div>
                )}

                {/* Product Information */}
                <div className="catalog-product-info">
                  <span className="catalog-category">
                    {product.category || "Hardware"}
                  </span>

                  <h3>{product.name}</h3>

                  <p className="catalog-sku">
                    SKU: {product.sku}
                  </p>

                  <p className="catalog-description">
                    {product.description ||
                      "Quality hardware product."}
                  </p>

                  <h3 className="catalog-price">
                    Rs. {Number(product.price).toFixed(2)}
                  </h3>

                  {/* Stock Status */}
                  {Number(product.stock_quantity) > 0 ? (
                    <p className="catalog-instock">
                      In Stock: {product.stock_quantity}
                    </p>
                  ) : (
                    <p className="catalog-outstock">
                      Out of Stock
                    </p>
                  )}

                  {/* Add to Cart */}
                  <button
                    type="button"
                    className="catalog-add-btn"
                    disabled={
                      Number(product.stock_quantity) <= 0 ||
                      addingId !== null
                    }
                    onClick={() => handleAddToCart(product)}
                  >
                    {addingId === product.id
                      ? "Adding..."
                      : Number(product.stock_quantity) <= 0
                        ? "Out of Stock"
                        : !user
                          ? "Login to Purchase"
                          : "Add to Cart"}
                  </button>
                </div>
              </article>
            ))}
          </section>

          {/* No products */}
          {filteredProducts.length === 0 && (
            <p className="catalog-status">
              No matching products found.
            </p>
          )}
        </>
      )}
    </main>
  );
}
