
CREATE DATABASE IF NOT EXISTS hardware_store_db;
USE hardware_store_db;

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('CUSTOMER', 'ADMIN', 'WORKER')
        NOT NULL DEFAULT 'CUSTOMER',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT
);

-- 3. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED,
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    reorder_level INT UNSIGNED NOT NULL DEFAULT 5,
    image_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id)
        REFERENCES categories(id),
    CHECK (price >= 0)
);

-- 4. INVENTORY TRANSACTIONS
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    transaction_type ENUM(
        'STOCK_IN', 'SALE', 'RETURN', 'ADJUSTMENT'
    ) NOT NULL,
    quantity_change INT NOT NULL,
    note VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id)
        REFERENCES products(id)
);

-- 5. CUSTOMER ADDRESSES
CREATE TABLE IF NOT EXISTS addresses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    address_line VARCHAR(255) NOT NULL,
    city VARCHAR(120) NOT NULL,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    FOREIGN KEY (user_id)
        REFERENCES users(id)
);

-- 6. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status ENUM(
        'PENDING', 'CONFIRMED',
        'SHIPPED', 'DELIVERED', 'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',
    payment_status ENUM(
        'UNPAID', 'PAID', 'REFUNDED'
    ) NOT NULL DEFAULT 'UNPAID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)
        REFERENCES users(id)
);

-- 7. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (order_id)
        REFERENCES orders(id),
    FOREIGN KEY (product_id)
        REFERENCES products(id),
    CHECK (quantity > 0)
);

-- 8. REPAIR SERVICES
CREATE TABLE IF NOT EXISTS repair_services (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    base_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 9. WORKERS
CREATE TABLE IF NOT EXISTS workers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    specialization VARCHAR(150),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (user_id)
        REFERENCES users(id)
);

-- 10. REPAIR BOOKINGS
CREATE TABLE IF NOT EXISTS repair_bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    worker_id BIGINT UNSIGNED,
    address_id BIGINT UNSIGNED NOT NULL,
    scheduled_at DATETIME NOT NULL,
    problem_description TEXT,
    status ENUM(
        'PENDING', 'CONFIRMED', 'IN_PROGRESS',
        'COMPLETED', 'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)
        REFERENCES users(id),
    FOREIGN KEY (service_id)
        REFERENCES repair_services(id),
    FOREIGN KEY (worker_id)
        REFERENCES workers(id),
    FOREIGN KEY (address_id)
        REFERENCES addresses(id)
);
