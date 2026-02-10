
-- EJECUTA ESTO EN EL SQL EDITOR DE SUPABASE PARA PREPARAR TU BASE DE DATOS

-- 1. Tabla de Productos
CREATE TABLE public.products (
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

-- 2. Tabla de Clientes
CREATE TABLE public.customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    balance NUMERIC DEFAULT 0,
    "createdAt" BIGINT
);

-- 3. Tabla de Ventas
-- Usamos JSONB para los items para mantener flexibilidad sin crear tablas relacionales complejas por ahora
CREATE TABLE public.sales (
    id TEXT PRIMARY KEY,
    timestamp BIGINT,
    total NUMERIC,
    "exchangeRate" NUMERIC,
    "paymentMethod" TEXT,
    "customerId" TEXT,
    items JSONB
);

-- 4. Tabla de Configuración (Settings)
-- Guardará valores sueltos como exchangeRate, rateHistory, etc.
CREATE TABLE public.settings (
    id TEXT PRIMARY KEY,
    value JSONB -- Puede guardar números, strings u objetos complejos (historial)
);

-- POLÍTICAS DE SEGURIDAD (RLS)
-- Permitir todo acceso público (ANON) para esta demo. 
-- En producción deberías restringir esto.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Products" ON public.products FOR ALL USING (true);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Customers" ON public.customers FOR ALL USING (true);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Sales" ON public.sales FOR ALL USING (true);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Settings" ON public.settings FOR ALL USING (true);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
