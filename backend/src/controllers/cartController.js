
const pool = require("../config/db");

// POST /api/cart/items
const addToCart = async (req, res) => {
  const userId = req.user.id;
  const productId = Number(req.body.product_id);
  const quantity = Number(req.body.quantity);

  if (
    !Number.isSafeInteger(productId) || productId <= 0 ||
    !Number.isSafeInteger(quantity) || quantity <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid product ID and quantity required"
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [products] = await connection.query(
      `SELECT id, stock_quantity
       FROM products
       WHERE id = ? AND is_active = TRUE`,
      [productId]
    );

    if (!products.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    await connection.query(
      `INSERT INTO carts (user_id)
       VALUES (?)
       ON DUPLICATE KEY UPDATE user_id = user_id`,
      [userId]
    );

    const [carts] = await connection.query(
      "SELECT id FROM carts WHERE user_id = ?",
      [userId]
    );

    const cartId = carts[0].id;

    const [items] = await connection.query(
      `SELECT quantity FROM cart_items
       WHERE cart_id = ? AND product_id = ?`,
      [cartId, productId]
    );

    const existingQuantity = items.length
      ? items[0].quantity
      : 0;

    const newQuantity = existingQuantity + quantity;

    if (!Number.isSafeInteger(newQuantity) ||
        newQuantity > products[0].stock_quantity) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient stock"
      });
    }

    await connection.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = ?`,
      [cartId, productId, quantity, newQuantity]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Product added to cart"
    });

  } catch (error) {
    await connection.rollback();
    console.error("ADD TO CART ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to add product to cart"
    });
  } finally {
    connection.release();
  }
};

// GET /api/cart
const getCart = async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT
         ci.id AS cart_item_id,
         p.id AS product_id,
         p.name,
         p.price,
         p.stock_quantity,
         ci.quantity,
         (p.price * ci.quantity) AS subtotal
       FROM carts c
       JOIN cart_items ci ON ci.cart_id = c.id
       JOIN products p ON p.id = ci.product_id
       WHERE c.user_id = ?
         AND p.is_active = TRUE
       ORDER BY ci.id DESC`,
      [req.user.id]
    );

    const total = items.reduce(
      (sum, item) => sum + Number(item.subtotal), 0
    );

    return res.status(200).json({
      success: true,
      items,
      total: Number(total.toFixed(2))
    });

  } catch (error) {
    console.error("GET CART ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch cart"
    });
  }
};

// PUT /api/cart/items/:id
const updateCartItem = async (req, res) => {
  const itemId = Number(req.params.id);
  const quantity = Number(req.body.quantity);

  if (!Number.isSafeInteger(itemId) || itemId <= 0 ||
      !Number.isSafeInteger(quantity) || quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid item ID or quantity"
    });
  }

  try {
    const [result] = await pool.query(
      `UPDATE cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       JOIN products p ON p.id = ci.product_id
       SET ci.quantity = ?
       WHERE ci.id = ?
         AND c.user_id = ?
         AND p.is_active = TRUE
         AND p.stock_quantity >= ?`,
      [quantity, itemId, req.user.id, quantity]
    );

    if (!result.affectedRows) {
      return res.status(400).json({
        success: false,
        message: "Item not found or insufficient stock"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated"
    });

  } catch (error) {
    console.error("UPDATE CART ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update cart"
    });
  }
};

// DELETE /api/cart/items/:id
const removeCartItem = async (req, res) => {
  const itemId = Number(req.params.id);

  if (!Number.isSafeInteger(itemId) || itemId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid cart item ID"
    });
  }

  try {
    const [result] = await pool.query(
      `DELETE ci FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       WHERE ci.id = ? AND c.user_id = ?`,
      [itemId, req.user.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Item removed from cart"
    });

  } catch (error) {
    console.error("REMOVE CART ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to remove cart item"
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem
};
