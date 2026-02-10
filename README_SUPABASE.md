
# Integración con Supabase Exitosa 🚀

¡He configurado automáticamente tu aplicación con el proyecto "jeduarodriguez's Project" en Supabase!

**Datos del proyecto conectado:**
- **URL**: `https://wldybbgzxbcqymqwtxzj.supabase.co`
- **Proyecto**: `wldybbgzxbcqymqwtxzj`

## ⚠️ ÚLTIMO PASO REQUERIDO: Ejecutar SQL

Para que la aplicación funcione correctamente y pueda guardar productos y ventas, necesitas crear las tablas en la base de datos. Como medida de seguridad, debes hacerlo desde el panel de control.

1.  Ve directamente al editor SQL de tu proyecto haciendo clic aquí:
    👉 [**Abrir Editor SQL en Supabase**](https://supabase.com/dashboard/project/wldybbgzxbcqymqwtxzj/sql/new)

2.  Copia el siguiente código SQL y pégalo en el editor:

```sql
-- TABLAS PRINCIPALES
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

-- HABILITAR ACCESO PÚBLICO (Puede restringirse luego si lo deseas)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Products" ON public.products FOR ALL USING (true);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Customers" ON public.customers FOR ALL USING (true);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Sales" ON public.sales FOR ALL USING (true);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Settings" ON public.settings FOR ALL USING (true);

-- ACTIVAR TIEMPO REAL
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
```

3.  Haz clic en el botón verde **Run** (Ejecutar).

¡Y listo! Tu aplicación ya estará sincronizando datos en tiempo real.
