-- Setup SQL Script for Mario POS (Go Backend)
-- This script creates the database schema for the migrated Go backend.

-- 1. Stores Module
CREATE TABLE IF NOT EXISTS stores_store (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(254),
    gst_number VARCHAR(15),
    invoice_prefix VARCHAR(10) DEFAULT 'INV',
    logo VARCHAR(100), -- Path to file
    location VARCHAR(255),
    fssai_lic_no VARCHAR(50),
    mobile VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    is_kitchen_step_enabled BOOLEAN DEFAULT TRUE,
    is_take_away_enabled BOOLEAN DEFAULT TRUE,
    is_reservations_enabled BOOLEAN DEFAULT TRUE,
    thermal_printer_size VARCHAR(10) DEFAULT '3_INCH',
    thermal_printer_name VARCHAR(255),
    thermal_printer_vendor_id VARCHAR(20),
    thermal_printer_product_id VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users Module (Simplified for migration, adding essential fields)
CREATE TABLE IF NOT EXISTS users_user (
    id SERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMPTZ,
    is_superuser BOOLEAN DEFAULT FALSE,
    username VARCHAR(150) UNIQUE NOT NULL,
    first_name VARCHAR(150),
    last_name VARCHAR(150),
    email VARCHAR(254),
    is_staff BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    date_joined TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    store_id INTEGER REFERENCES stores_store(id) ON DELETE SET NULL
);

-- 3. Catalogs Module
CREATE TABLE IF NOT EXISTS catalogs_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    store_id INTEGER REFERENCES stores_store(id) ON DELETE CASCADE,
    image VARCHAR(100),
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, store_id)
);

CREATE TABLE IF NOT EXISTS catalogs_item (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES catalogs_category(id) ON DELETE SET NULL,
    store_id INTEGER REFERENCES stores_store(id) ON DELETE CASCADE,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    image VARCHAR(100),
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0.00,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Restaurants Module
CREATE TABLE IF NOT EXISTS restaurants_table (
    id SERIAL PRIMARY KEY,
    number VARCHAR(20) NOT NULL,
    store_id INTEGER REFERENCES stores_store(id) ON DELETE CASCADE,
    capacity INTEGER DEFAULT 2,
    status VARCHAR(20) DEFAULT 'VACANT',
    is_active BOOLEAN DEFAULT TRUE,
    pos_x FLOAT DEFAULT 10.0,
    pos_y FLOAT DEFAULT 10.0,
    shape VARCHAR(10) DEFAULT 'RECT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (number, store_id)
);

CREATE TABLE IF NOT EXISTS restaurants_order (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES restaurants_table(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores_store(id) ON DELETE CASCADE,
    waiter_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_mobile VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ORDER_TAKEN',
    number_of_persons INTEGER DEFAULT 1,
    order_type VARCHAR(20) DEFAULT 'DINE_IN',
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restaurants_orderitem (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES restaurants_order(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES catalogs_item(id) ON DELETE PROTECT,
    quantity INTEGER DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'ORDERED',
    notes VARCHAR(255),
    rejection_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restaurants_reservation (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES restaurants_table(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores_store(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    reservation_time TIMESTAMPTZ NOT NULL,
    number_of_guests INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'CONFIRMED',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restaurants_invoice (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    store_id INTEGER REFERENCES stores_store(id) ON DELETE CASCADE,
    order_id INTEGER UNIQUE REFERENCES restaurants_order(id) ON DELETE CASCADE,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    tax_details JSONB DEFAULT '{}',
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'EXTERNAL',
    waiter_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Core Module
CREATE TABLE IF NOT EXISTS core_taxconfiguration (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) DEFAULT 'Default Tax Configuration',
    store_id INTEGER REFERENCES stores_store(id) ON DELETE CASCADE,
    tax_type VARCHAR(20) DEFAULT 'EXCLUSIVE',
    is_gst_enabled BOOLEAN DEFAULT FALSE,
    cgst_rate DECIMAL(5, 2) DEFAULT 0.00,
    sgst_rate DECIMAL(5, 2) DEFAULT 0.00,
    igst_rate DECIMAL(5, 2) DEFAULT 0.00,
    is_cess_enabled BOOLEAN DEFAULT FALSE,
    cess_rate DECIMAL(5, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_order_store ON restaurants_order(store_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON restaurants_order(status);
CREATE INDEX IF NOT EXISTS idx_invoice_number ON restaurants_invoice(invoice_number);
CREATE INDEX IF NOT EXISTS idx_item_category ON catalogs_item(category_id);
