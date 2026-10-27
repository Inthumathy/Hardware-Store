
import { useEffect, useState } from "react";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../services/productApi";

const emptyForm = {
  sku: "",
  name: "",
  description: "",
  price: "",
  stock_quantity: "",
  category_id: "",
  image_url: "",
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleEdit = (product) => {
    setEditingId(product.id);

    setForm({
      sku: product.sku || "",
      name: product.name || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      stock_quantity: String(product.stock_quantity ?? ""),
      category_id: "",
      image_url: product.image_url || "",
    });

    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const price = Number(form.price);
    const stock = Number(form.stock_quantity);

    if (
      !form.sku.trim() ||
      !form.name.trim() ||
      form.price.trim() === "" ||
      !Number.isFinite(price) ||
      price < 0 ||
      form.stock_quantity.trim() === "" ||
      !Number.isSafeInteger(stock) ||
      stock < 0
    ) {
      setError("Please enter valid product details.");
      return;
    }

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      stock_quantity: stock,
      image_url: form.image_url.trim() || null,
    };

    if (form.category_id.trim() !== "") {
      const categoryId = Number(form.category_id);

      if (
        !Number.isSafeInteger(categoryId) ||
        categoryId <= 0
      ) {
        setError("Category ID must be a positive integer.");
        return;
      }

      payload.category_id = categoryId;
    }

    setSaving(true);

    try {
      if (editingId) {
        await updateProduct(editingId, payload);
        setMessage("Product updated successfully.");
      } else {
        await addProduct(payload);
        setMessage("Product added successfully.");
      }

      handleCancel();
      await loadProducts();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to save product"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this product?")) {
      return;
    }

    setMessage("");
    setError("");

    try {
      await deleteProduct(id);
      setMessage("Product deactivated successfully.");
      await loadProducts();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to deactivate product"
      );
    }
  };

  return (
    <main className="product-page">
      <header className="product-header">
        <h1>Product Management</h1>
        <p>Manage your hardware store inventory.</p>
      </header>

      {message && (
        <p className="product-success" role="status">
          {message}
        </p>
      )}

      {error && (
        <p className="product-error" role="alert">
          {error}
        </p>
      )}

      <section className="product-card">
        <h2>{editingId ? "Edit Product" : "Add New Product"}</h2>

        <form onSubmit={handleSubmit} className="product-form">
          <label>
            SKU
            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Product Name
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Price (LKR)
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Stock Quantity
            <input
              name="stock_quantity"
              type="number"
              min="0"
              step="1"
              value={form.stock_quantity}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Category ID (optional)
            <input
              name="category_id"
              type="number"
              min="1"
              step="1"
              value={form.category_id}
              onChange={handleChange}
              placeholder="Existing category ID"
            />
          </label>

          <label>
            Image URL (optional)
            <input
              name="image_url"
              type="url"
              value={form.image_url}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </label>

          <label className="product-full">
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="3"
            />
          </label>

          <div className="product-actions">
            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Product"
                  : "Add Product"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="secondary-btn"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="product-card">
        <div className="product-list-heading">
          <h2>Available Products ({products.length})</h2>
          <button onClick={loadProducts} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading products...</p>
        ) : products.length === 0 ? (
          <p>No active products found.</p>
        ) : (
          <div className="product-table-wrapper">
            <table className="product-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.sku}</td>
                    <td>{product.name}</td>
                    <td>{product.category || "—"}</td>
                    <td>
                      Rs. {Number(product.price).toFixed(2)}
                    </td>
                    <td>{product.stock_quantity}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleEdit(product)}
                        >
                          Edit
                        </button>

                        <button
                          className="danger-btn"
                          onClick={() => handleDelete(product.id)}
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
