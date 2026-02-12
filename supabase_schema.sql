
-- EJECUTA ESTO PARA RESETEAR Y CONFIGURAR CORRECTAMENTE LAS TABLAS
-- Este script es seguro para ejecutar varias veces.

-- 1. Tablas con sus columnas actualizadas
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT,
    category TEXT,
    price NUMERIC,
    "costPrice" NUMERIC,
    stock NUMERIC,
    image TEXT,
    description TEXT,
    "sellingMode" TEXT DEFAULT 'simple',
    "measurementUnit" TEXT DEFAULT 'kg',
    "unitsPerPackage" NUMERIC DEFAULT 0,
    "pricePerUnit" NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
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

CREATE TABLE IF NOT EXISTS public.treasury (
    id TEXT PRIMARY KEY,
    timestamp BIGINT,
    type TEXT,
    category TEXT,
    amount NUMERIC,
    "amountBs" NUMERIC,
    "exchangeRate" NUMERIC,
    description TEXT,
    method TEXT
);

CREATE TABLE IF NOT EXISTS public.rate_history (
    id TEXT PRIMARY KEY,
    rate NUMERIC,
    timestamp BIGINT
);

-- 2. Limpiar y recrear políticas (Esto evita el error de "ya existe")
DO $$ 
BEGIN
    -- Borrar políticas si existen
    DROP POLICY IF EXISTS "Public Access Products" ON public.products;
    DROP POLICY IF EXISTS "Public Access Customers" ON public.customers;
    DROP POLICY IF EXISTS "Public Access Sales" ON public.sales;
    DROP POLICY IF EXISTS "Public Access Settings" ON public.settings;
    DROP POLICY IF EXISTS "Public Access Treasury" ON public.treasury;
    DROP POLICY IF EXISTS "Public Access Rate History" ON public.rate_history;
END $$;

-- Crear políticas nuevas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Products" ON public.products FOR ALL USING (true);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Customers" ON public.customers FOR ALL USING (true);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Sales" ON public.sales FOR ALL USING (true);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Settings" ON public.settings FOR ALL USING (true);

ALTER TABLE public.treasury ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Treasury" ON public.treasury FOR ALL USING (true);

ALTER TABLE public.rate_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Rate History" ON public.rate_history FOR ALL USING (true);

-- 3. Habilitar Realtime
-- Intentamos habilitar realtime para todas las tablas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime SET TABLE 
    public.products,
    public.customers,
    public.sales,
    public.settings,
    public.treasury,
    public.rate_history;
