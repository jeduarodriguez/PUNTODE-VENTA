# Pointy - Sistema de Punto de Venta

Este proyecto es un sistema de punto de venta (POS) moderno migrado de Firebase a **Supabase**.

## Requisitos Previos

- **Node.js**: Asegúrate de tener instalado Node.js (v18 o superior).

## Configuración Local

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Define las siguientes variables en tu archivo `.env.local`:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
   ```

3. **Base de Datos**:
   Ejecuta el contenido de `supabase_schema.sql` en el SQL Editor de tu proyecto de Supabase para crear las tablas necesarias.

## Iniciar la Aplicación

Para ejecutar la aplicación en modo desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

© 2026 Pointy POS
