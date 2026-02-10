
-- ACTUALIZACIÓN: Script corregido para evitar errores si ya ejecutaste una parte.

-- 1. TABLAS PRINCIPALES
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT,
    category TEXT,
    price NUMERIC,
    "costPrice" NUMERIC,
    stock INTEGER,
    image TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    balance NUMERIC DEFAULT 0,
    "createdAt" BIGINT
);

CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    timestamp BIGINT,
    total NUMERIC,
    "exchangeRate" NUMERIC,
    "paymentMethod" TEXT,
    "customerId" TEXT,
    items JSONB
);

CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    value JSONB
);

-- 2. SEGURIDAD (RLS) - Corregido con DROP IF EXISTS para evitar errores
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Products" ON public.products;
CREATE POLICY "Public Products" ON public.products FOR ALL USING (true);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Customers" ON public.customers;
CREATE POLICY "Public Customers" ON public.customers FOR ALL USING (true);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Sales" ON public.sales;
CREATE POLICY "Public Sales" ON public.sales FOR ALL USING (true);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Settings" ON public.settings;
CREATE POLICY "Public Settings" ON public.settings FOR ALL USING (true);

-- 3. TIEMPO REAL (Solo añadirá si no existen, ignorar error si ya están)
BEGIN;
  -- Intentamos añadir las tablas, si falla porque ya están, no pasa nada
  ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
EXCEPTION WHEN OTHERS THEN
  -- Si ya están añadidas, ignoramos el error
  RAISE NOTICE 'Tablas ya estaban en realtime o error ignorado: %', SQLERRM;
END;
