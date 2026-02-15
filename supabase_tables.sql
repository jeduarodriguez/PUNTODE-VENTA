-- Tabla de Trabajadores (Workers)
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT,
  salary NUMERIC DEFAULT 0,
  pay_day TEXT,
  balance NUMERIC DEFAULT 0,
  created_at BIGINT
);

-- Habilitar Realtime para workers
ALTER PUBLICATION supabase_realtime ADD TABLE workers;

-- El resto de tablas ya deberían existir. Verifica que existan:
-- products, customers, sales, treasury, settings, rate_history

-- Si alguna no existe, créala:

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  stock NUMERIC DEFAULT 0,
  image TEXT,
  description TEXT,
  selling_mode TEXT,
  measurement_unit TEXT,
  units_per_package NUMERIC,
  price_per_unit NUMERIC,
  remaining_units NUMERIC DEFAULT 0
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  balance NUMERIC DEFAULT 0,
  created_at BIGINT
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  timestamp BIGINT,
  items JSONB,
  total NUMERIC DEFAULT 0,
  exchange_rate NUMERIC DEFAULT 0,
  payment_method TEXT,
  customer_id TEXT
);

-- Treasury
CREATE TABLE IF NOT EXISTS treasury (
  id TEXT PRIMARY KEY,
  timestamp BIGINT,
  type TEXT,
  category TEXT,
  amount NUMERIC DEFAULT 0,
  amount_bs NUMERIC DEFAULT 0,
  exchange_rate NUMERIC DEFAULT 0,
  description TEXT,
  method TEXT
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  value JSONB
);

-- Rate History
CREATE TABLE IF NOT EXISTS rate_history (
  id TEXT PRIMARY KEY,
  rate NUMERIC DEFAULT 0,
  timestamp BIGINT
);

-- Habilitar Realtime para todas las tablas
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE treasury;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;
ALTER PUBLICATION supabase_realtime ADD TABLE rate_history;
