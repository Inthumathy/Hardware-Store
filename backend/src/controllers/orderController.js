
const pool = require("../config/db");

// POST /api/orders/checkout
const checkout = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const userId = req.user.id;

    // Lock customer's cart to prevent concurrent checkouts.
    const [carts] = await connection.query(
      "SELECT id FROM carts WHERE user_id = ? FOR UPDATE",
      [userId]
    );

    if (!carts.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    const cartId = carts[0].id;

    const [items] = await connection.query(
      `SELECT product_id, quantity
       FROM cart_items
       WHERE cart_id = ?
       ORDER BY product_id`,
      [cartId]
    );

    if (!items.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    let totalCents = 0;
    const orderItems = [];

    // Lock products in a consistent order.
    for (const item of items) {
      const [products] = await connection.query(
        `SELECT id, name, price, stock_quantity, is_active
         FROM products
         WHERE id = ?
         FOR UPDATE`,
        [item.product_id]
      );

      if (!products.length || !products[0].is_active) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({
          success: false,
          message: "A cart product is unavailable"
        });
      }

      const product = products[0];
      const quantity = Number(item.quantity);

      if (
        !Number.isSafeInteger(quantity) ||
        quantity <= 0 ||
        quantity > product.stock_quantity
      ) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      // Work in cents to avoid floating point total errors.
      const priceCents = Math.round(Number(product.price) * 100);

      if (
        !Number.isSafeInteger(priceCents) ||
        priceCents < 0 ||
        !Number.isSafeInteger(priceCents * quantity)
      ) {
        throw new Error("Invalid price or order total");
      }

      totalCents += priceCents * quantity;

      if (!Number.isSafeInteger(totalCents)) {
        throw new Error("Order total exceeds supported range");
      }

      orderItems.push({
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice: (priceCents / 100).toFixed(2)
      });
    }

    const totalAmount = (totalCents / 100).toFixed(2);

    // Create an unpaid order.
    const [orderResult] = await connection.query(
      `INSERT INTO orders
       (user_id, total_amount, status, payment_status)
       VALUES (?, ?, 'PENDING', 'UNPAID')`,
      [userId, totalAmount]
    );

    const orderId = orderResult.insertId;

    for (const item of orderItems) {
      // Save order item with its purchase-time price.
      await connection.query(
        `INSERT INTO order_items
         (order_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`,
        [
          orderId,
          item.productId,
          item.quantity,
          item.unitPrice
        ]
      );

      // Reduce available inventory.
      const [stockResult] = await connection.query(
        `UPDATE products
         SET stock_quantity = stock_quantity - ?
         WHERE id = ?
           AND stock_quantity >= ?`,
        [item.quantity, item.productId, item.quantity]
      );

      if (stockResult.affectedRows !== 1) {
        throw new Error("Stock update failed");
      }

      // Record inventory movement.
      await connection.query(
        `INSERT INTO inventory_transactions
         (product_id, transaction_type, quantity_change, note)
         VALUES (?, 'SALE', ?, ?)`,
        [
          item.productId,
          -item.quantity,
          `Reserved for unpaid order #${orderId}`
        ]
      );
    }

    // Clear cart only after successful order creation.
    await connection.query(
      "DELETE FROM cart_items WHERE cart_id = ?",
      [cartId]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: {
        orderId,
        totalAmount,
        status: "PENDING",
        paymentStatus: "UNPAID",
        items: orderItems
      }
    });

  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("CHECKOUT ROLLBACK ERROR:", rollbackError);
      }
    }

    console.error("CHECKOUT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to place order"
    });

  } finally {
    if (connection) connection.release();
  }
};

// GET /api/orders/my
const getMyOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT id, total_amount, status,
              payment_status, created_at
       FROM orders
       WHERE user_id = ?
       ORDER BY id DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });

  } catch (error) {
    console.error("GET MY ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch orders"
    });
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res) => {
  const orderId = Number(req.params.id);

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID"
    });
  }

  try {
    const isAdmin = req.user.role === "ADMIN";

    const sql = isAdmin
      ? `SELECT * FROM orders WHERE id = ?`
      : `SELECT * FROM orders WHERE id = ? AND user_id = ?`;

    const params = isAdmin
      ? [orderId]
      : [orderId, req.user.id];

    const [orders] = await pool.query(sql, params);

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const [items] = await pool.query(
      `SELECT oi.product_id, p.name, oi.quantity,
              oi.unit_price,
              (oi.quantity * oi.unit_price) AS subtotal
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...orders[0],
        items
      }
    });

  } catch (error) {
    console.error("GET ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch order"
    });
  }
};



const getAllOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.user_id, u.full_name,
              o.total_amount, o.status,
              o.payment_status, o.created_at
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ORDER BY o.id DESC`
    );

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error("ADMIN GET ORDERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch orders"
    });
  }
};

const updateOrderStatus = async (req, res) => {
  const orderId = Number(req.params.id);
  const newStatus = req.body.status;

  const allowedStatuses = [
    "CONFIRMED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED"
  ];

  if (!Number.isSafeInteger(orderId) || orderId <= 0 ||
      !allowedStatuses.includes(newStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID or status"
    });
  }

  let connection;
  let transactionStarted = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [orders] = await connection.query(
      "SELECT id, status, payment_status FROM orders WHERE id = ? FOR UPDATE",
      [orderId]
    );

    if (!orders.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const currentStatus = orders[0].status;

    const transitions = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED"],
      DELIVERED: [],
      CANCELLED: []
    };

    if (!(transitions[currentStatus] || []).includes(newStatus)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        success: false,
        message: `Cannot change ${currentStatus} to ${newStatus}`
      });
    }

    if (newStatus === "CANCELLED") {
      // Refund processing is not implemented yet.
      if (orders[0].payment_status !== "UNPAID") {
        await connection.rollback();
        transactionStarted = false;
        return res.status(409).json({
          success: false,
          message: "Paid orders require a refund workflow before cancellation"
        });
      }

      const [items] = await connection.query(
        `SELECT product_id, quantity
         FROM order_items
         WHERE order_id = ?
         ORDER BY product_id`,
        [orderId]
      );

      for (const item of items) {
        await connection.query(
          `UPDATE products
           SET stock_quantity = stock_quantity + ?
           WHERE id = ?`,
          [item.quantity, item.product_id]
        );

        await connection.query(
          `INSERT INTO inventory_transactions
           (product_id, transaction_type, quantity_change, note)
           VALUES (?, 'RETURN', ?, ?)`,
          [
            item.product_id,
            item.quantity,
            `Stock restored for cancelled order #${orderId}`
          ]
        );
      }
    }

    await connection.query(
      "UPDATE orders SET status = ? WHERE id = ?",
      [newStatus, orderId]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: {
        orderId,
        previousStatus: currentStatus,
        status: newStatus
      }
    });

  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("ORDER ROLLBACK ERROR:", rollbackError);
      }
    }

    console.error("UPDATE ORDER STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update order status"
    });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  checkout,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus
};

