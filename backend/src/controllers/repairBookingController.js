
const pool = require("../config/db");

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const getUserId = (req) => {
  return Number(req.user?.id ?? req.user?.userId);
};

const validId = (value) => {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0;
};

const executeQuery = async (connection, sql, params = []) => {
  return connection.query({
    sql,
    values: params,
    timeout: 10000
  });
};

const rollbackSafely = async (connection) => {
  if (!connection) return;

  try {
    await connection.rollback();
  } catch (error) {
    console.error("ROLLBACK ERROR:", error.message);
  }
};

const sendError = (res, error, message) => {
  console.error("REPAIR API ERROR:", {
    code: error.code,
    message: error.message,
    sqlMessage: error.sqlMessage
  });

  if (!res.headersSent) {
    return res.status(500).json({
      success: false,
      message
    });
  }
};

// ==========================================
// 1. GET REPAIR SERVICES
// GET /api/repairs/services
// ==========================================

const getServices = async (req, res) => {
  try {
    console.log("SERVICES: Starting database query");

    const [services] = await pool.query({
      sql: `
        SELECT id, name, description, base_price
        FROM repair_services
        WHERE is_active = 1
        ORDER BY id DESC
      `,
      timeout: 10000
    });

    console.log("SERVICES: Query completed");

    return res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to fetch repair services"
    );
  }
};

// ==========================================
// 2. CREATE REPAIR BOOKING
// POST /api/repairs/bookings
// ==========================================

const createBooking = async (req, res) => {
  let connection;

  try {
    const userId = getUserId(req);

    const {
      service_id,
      address_line,
      city,
      latitude,
      longitude,
      scheduled_at,
      problem_description
    } = req.body || {};

    if (
      !validId(userId) ||
      !validId(service_id) ||
      typeof address_line !== "string" ||
      !address_line.trim() ||
      typeof city !== "string" ||
      !city.trim() ||
      !scheduled_at
    ) {
      return res.status(400).json({
        success: false,
        message: "Required booking details are missing"
      });
    }

    const normalizedDate = String(scheduled_at)
      .trim()
      .replace("T", " ");

    const datePattern =
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;

    if (!datePattern.test(normalizedDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid scheduled_at format"
      });
    }

    const scheduledDate =
      normalizedDate.length === 16
        ? normalizedDate + ":00"
        : normalizedDate;

    const parseCoordinate = (value, min, max) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      const number = Number(value);

      if (!Number.isFinite(number) || number < min || number > max) {
        return NaN;
      }

      return number;
    };

    const lat = parseCoordinate(latitude, -90, 90);
    const lng = parseCoordinate(longitude, -180, 180);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude"
      });
    }

    console.log("BOOKING: Getting database connection");

    connection = await pool.getConnection();

    await connection.beginTransaction();

    const [services] = await executeQuery(
      connection,
      `SELECT id
       FROM repair_services
       WHERE id = ? AND is_active = 1`,
      [Number(service_id)]
    );

    if (services.length === 0) {
      await rollbackSafely(connection);

      return res.status(404).json({
        success: false,
        message: "Repair service not found"
      });
    }

    const [addressResult] = await executeQuery(
      connection,
      `INSERT INTO addresses
       (user_id, address_line, city, latitude, longitude)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        address_line.trim(),
        city.trim(),
        lat,
        lng
      ]
    );

    const [bookingResult] = await executeQuery(
      connection,
      `INSERT INTO repair_bookings
       (
         user_id,
         service_id,
         address_id,
         scheduled_at,
         problem_description,
         status
       )
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [
        userId,
        Number(service_id),
        addressResult.insertId,
        scheduledDate,
        problem_description || null
      ]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Repair booking created successfully",
      data: {
        bookingId: bookingResult.insertId,
        status: "PENDING"
      }
    });
  } catch (error) {
    await rollbackSafely(connection);

    return sendError(
      res,
      error,
      "Unable to create repair booking"
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ==========================================
// 3. CUSTOMER - GET MY BOOKINGS
// GET /api/repairs/bookings/my
// ==========================================

const getMyBookings = async (req, res) => {
  let connection;

  console.log("BOOKINGS STEP 1: Controller reached");

  try {
    const userId = getUserId(req);

    if (!validId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticated user"
      });
    }

    console.log("BOOKINGS STEP 2: Getting database connection");

    connection = await pool.getConnection();

    console.log("BOOKINGS STEP 3: Database connection acquired");

    const [bookings] = await executeQuery(
      connection,
      `SELECT
         rb.id,
         rb.service_id,
         rs.name AS service_name,
         rb.worker_id,
         worker_user.full_name AS worker_name,
         rb.scheduled_at,
         rb.problem_description,
         rb.status,
         a.address_line,
         a.city,
         a.latitude,
         a.longitude,
         rb.created_at
       FROM repair_bookings rb
       JOIN repair_services rs
         ON rb.service_id = rs.id
       JOIN addresses a
         ON rb.address_id = a.id
       LEFT JOIN workers w
         ON rb.worker_id = w.id
       LEFT JOIN users worker_user
         ON w.user_id = worker_user.id
       WHERE rb.user_id = ?
       ORDER BY rb.created_at DESC, rb.id DESC`,
      [userId]
    );

    console.log("BOOKINGS STEP 4: MySQL query completed");
    console.log("BOOKINGS FOUND:", bookings.length);

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to load your bookings"
    );
  } finally {
    if (connection) {
      connection.release();
      console.log("BOOKINGS STEP 5: Connection released");
    }
  }
};

// ==========================================
// 4. ADMIN - GET ALL BOOKINGS
// GET /api/repairs/admin/bookings
// ==========================================

const getAllBookings = async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();

    const [bookings] = await executeQuery(
      connection,
      `SELECT
         rb.id,
         rb.user_id,
         customer.full_name AS customer_name,
         customer.phone AS customer_phone,
         rs.name AS service_name,
         rb.worker_id,
         worker_user.full_name AS worker_name,
         rb.scheduled_at,
         rb.problem_description,
         rb.status,
         a.address_line,
         a.city,
         a.latitude,
         a.longitude,
         rb.created_at
       FROM repair_bookings rb
       JOIN users customer
         ON rb.user_id = customer.id
       JOIN repair_services rs
         ON rb.service_id = rs.id
       JOIN addresses a
         ON rb.address_id = a.id
       LEFT JOIN workers w
         ON rb.worker_id = w.id
       LEFT JOIN users worker_user
         ON w.user_id = worker_user.id
       ORDER BY rb.created_at DESC, rb.id DESC`
    );

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to load repair bookings"
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ==========================================
// 5. ADMIN - ASSIGN WORKER
// PATCH /api/repairs/admin/bookings/:id/assign
// ==========================================

const assignWorker = async (req, res) => {
  let connection;
  let transactionStarted = false;

  console.log("ASSIGN STEP 1: Controller started");

  try {
    const bookingId = Number(req.params.id);
    const workerUserId = Number(req.body?.worker_id);

    if (!validId(bookingId) || !validId(workerUserId)) {
      return res.status(400).json({
        success: false,
        message: "Valid booking ID and worker ID are required"
      });
    }

    console.log("ASSIGN STEP 2: Getting DB connection");

    connection = await pool.getConnection();

    console.log("ASSIGN STEP 3: DB connection acquired");

    await executeQuery(
      connection,
      "SET SESSION innodb_lock_wait_timeout = 5"
    );

    await connection.beginTransaction();
    transactionStarted = true;

    // API worker_id = users.id
    // Database repair_bookings.worker_id = workers.id

    const [workerRows] = await executeQuery(
      connection,
      `SELECT
         w.id AS worker_profile_id,
         w.user_id
       FROM workers w
       JOIN users u ON w.user_id = u.id
       WHERE u.id = ?
         AND u.role = 'WORKER'
         AND u.is_verified = 1
         AND w.is_available = 1
       FOR UPDATE`,
      [workerUserId]
    );

    if (workerRows.length === 0) {
      await rollbackSafely(connection);
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Verified and available worker profile not found"
      });
    }

    const workerProfileId = workerRows[0].worker_profile_id;

    const [bookingRows] = await executeQuery(
      connection,
      `SELECT id, worker_id, status
       FROM repair_bookings
       WHERE id = ?
       FOR UPDATE`,
      [bookingId]
    );

    if (bookingRows.length === 0) {
      await rollbackSafely(connection);
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Repair booking not found"
      });
    }

    const booking = bookingRows[0];

    if (
      booking.status !== "PENDING" ||
      booking.worker_id !== null
    ) {
      await rollbackSafely(connection);
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        message: "Booking is not available for assignment"
      });
    }

    await executeQuery(
      connection,
      `UPDATE repair_bookings
       SET worker_id = ?, status = 'CONFIRMED'
       WHERE id = ?`,
      [workerProfileId, bookingId]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Worker assigned successfully",
      data: {
        bookingId,
        workerUserId,
        workerProfileId,
        status: "CONFIRMED"
      }
    });
  } catch (error) {
    if (transactionStarted) {
      await rollbackSafely(connection);
    }

    return sendError(
      res,
      error,
      "Unable to assign worker"
    );
  } finally {
    if (connection) {
      connection.release();
      console.log("ASSIGN: Connection released");
    }
  }
};

// ==========================================
// 6. WORKER - GET MY JOBS
// GET /api/repairs/worker/jobs
// ==========================================

const getMyWorkerJobs = async (req, res) => {
  let connection;

  console.log("WORKER JOBS STEP 1: Controller reached");

  try {
    const userId = getUserId(req);

    if (!validId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticated user"
      });
    }

    console.log("WORKER JOBS STEP 2: Getting DB connection");

    connection = await pool.getConnection();

    console.log("WORKER JOBS STEP 3: Connection acquired");

    const [jobs] = await executeQuery(
      connection,
      `SELECT
         rb.id,
         rb.status,
         rb.scheduled_at,
         rb.problem_description,
         rs.name AS service_name,
         customer.full_name AS customer_name,
         customer.phone AS customer_phone,
         a.address_line,
         a.city,
         a.latitude,
         a.longitude
       FROM repair_bookings rb
       JOIN workers w
         ON rb.worker_id = w.id
       JOIN repair_services rs
         ON rb.service_id = rs.id
       JOIN users customer
         ON rb.user_id = customer.id
       JOIN addresses a
         ON rb.address_id = a.id
       WHERE w.user_id = ?
       ORDER BY rb.scheduled_at ASC`,
      [userId]
    );

    console.log("WORKER JOBS STEP 4: Query completed");

    return res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to load worker jobs"
    );
  } finally {
    if (connection) {
      connection.release();
      console.log("WORKER JOBS STEP 5: Connection released");
    }
  }
};

// ==========================================
// 7. WORKER / ADMIN - UPDATE BOOKING STATUS
// PATCH /api/repairs/bookings/:id/status
// ==========================================

const updateBookingStatus = async (req, res) => {
  let connection;

  try {
    const bookingId = Number(req.params.id);
    const userId = getUserId(req);

    const newStatus = String(req.body?.status || "")
      .trim()
      .toUpperCase();

    if (
      !validId(bookingId) ||
      !validId(userId) ||
      !["IN_PROGRESS", "COMPLETED"].includes(newStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID or status"
      });
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();

    const [rows] = await executeQuery(
      connection,
      `SELECT
         rb.id,
         rb.status,
         rb.worker_id,
         w.user_id AS worker_user_id
       FROM repair_bookings rb
       LEFT JOIN workers w
         ON rb.worker_id = w.id
       WHERE rb.id = ?
       FOR UPDATE`,
      [bookingId]
    );

    if (rows.length === 0) {
      await rollbackSafely(connection);

      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    const booking = rows[0];

    const [actorRows] = await executeQuery(
      connection,
      `SELECT role, is_verified
       FROM users
       WHERE id = ?`,
      [userId]
    );

    const actor = actorRows[0];

    if (
      !actor ||
      Number(actor.is_verified) !== 1 ||
      !["ADMIN", "WORKER"].includes(actor.role)
    ) {
      await rollbackSafely(connection);

      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }

    if (
      actor.role === "WORKER" &&
      Number(booking.worker_user_id) !== userId
    ) {
      await rollbackSafely(connection);

      return res.status(403).json({
        success: false,
        message: "This job is not assigned to you"
      });
    }

    const allowedTransition =
      (booking.status === "CONFIRMED" &&
        newStatus === "IN_PROGRESS") ||
      (booking.status === "IN_PROGRESS" &&
        newStatus === "COMPLETED");

    if (!allowedTransition) {
      await rollbackSafely(connection);

      return res.status(409).json({
        success: false,
        message: "Invalid booking status transition"
      });
    }

    await executeQuery(
      connection,
      `UPDATE repair_bookings
       SET status = ?
       WHERE id = ?`,
      [newStatus, bookingId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: {
        bookingId,
        status: newStatus
      }
    });
  } catch (error) {
    await rollbackSafely(connection);

    return sendError(
      res,
      error,
      "Unable to update booking status"
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
};


/* ==========================================
   8. ADMIN - GET AVAILABLE WORKERS
   GET /api/repairs/admin/workers
========================================== */

const getAvailableWorkers = async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();

    const [workers] = await executeQuery(
      connection,
      `SELECT
         u.id AS user_id,
         w.id AS worker_profile_id,
         u.full_name,
         u.phone,
         w.is_available
       FROM workers w
       INNER JOIN users u
         ON w.user_id = u.id
       WHERE u.role = 'WORKER'
         AND u.is_verified = 1
         AND w.is_available = 1
       ORDER BY u.full_name ASC`
    );

    return res.status(200).json({
      success: true,
      count: workers.length,
      data: workers
    });

  } catch (error) {
    return sendError(
      res,
      error,
      "Unable to load available workers"
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
};



// ==========================================
// EXPORTS
// ==========================================


module.exports = {
  getServices,
  createBooking,
  getMyBookings,
  getAllBookings,
  assignWorker,
  getMyWorkerJobs,
  updateBookingStatus,
  getAvailableWorkers
};
