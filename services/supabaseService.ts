
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ ERROR: No se detectaron las credenciales de Supabase en .env.local");
}

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isCloudEnabled = !!supabase;

// Helper: Convertir Array a Objeto Map (para compatibilidad con la app refinada)
const arrayToMap = (data: any[]) => {
    if (!data || !Array.isArray(data)) return {};
    return data.reduce((acc: any, item: any) => {
        if (item && item.id) acc[item.id] = item;
        return acc;
    }, {});
};

// --- API COMPATIBLE CON FIREBASE SERVICE (REFINADA) ---

export const syncPath = (path: string, callback: (data: any) => void) => {
    if (!supabase) {
        console.warn("⚠️ Supabase no configurado. Operando en modo Local únicamente.");
        return () => { };
    }

    const parts = path.split('/');
    const table = parts[0];
    const docId = parts[1]; // Si existe, es un documento específico

    // CASO 1: Documento único (ej: settings/exchangeRate)
    if (docId) {
        // Carga inicial
        supabase.from(table).select('*').eq('id', docId).single()
            .then(({ data }) => {
                if (data && 'value' in data && table === 'settings') {
                    // Caso especial para settings: devolver el valor directo
                    callback(data.value);
                } else if (data) {
                    callback(data);
                } else {
                    callback(null);
                }
            });

        // Suscripción a cambios
        const channel = supabase.channel(`doc:${table}:${docId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: table, filter: `id=eq.${docId}` },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        callback(null);
                    } else {
                        let val = payload.new;
                        if (val && 'value' in val && table === 'settings') {
                            val = val.value;
                        }
                        callback(val);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }

    // CASO 2: Colección completa (ej: products, customers, sales)
    else {
        // Convertir snake_case a camelCase
        const toCamelCase = (obj: any): any => {
            if (Array.isArray(obj)) return obj.map(toCamelCase);
            if (obj !== null && typeof obj === 'object') {
                return Object.keys(obj).reduce((result, key) => {
                    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                    result[camelKey] = toCamelCase(obj[key]);
                    return result;
                }, {} as any);
            }
            return obj;
        };
        
        // Carga inicial
        supabase.from(table).select('*')
            .then(({ data, error }) => {
                console.log(`📥 Cargando ${table}:`, data, error);
                const mapped = arrayToMap(data || []);
                const converted = Object.fromEntries(
                    Object.entries(mapped).map(([k, v]) => [k, toCamelCase(v)])
                );
                callback(converted);
            });

        // Suscripción de toda la tabla
        // NOTA: Esto no es lo más eficiente para bases de datos enormes, pero para un POS pyme está perfecto.
        const channel = supabase.channel(`col:${table}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: table },
                () => {
                    // Al haber cualquier cambio, recargamos todo el mapa para simplificar la sincronización
                    // (Supabase realtime envía solo el registro cambiado, pero la app espera el objeto completo del estado actual)
                    supabase.from(table).select('*')
                        .then(({ data }) => {
                            const mapped = arrayToMap(data || []);
                            const converted = Object.fromEntries(
                                Object.entries(mapped).map(([k, v]) => [k, toCamelCase(v)])
                            );
                            callback(converted);
                        });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }
};

export const saveData = async (path: string, data: any) => {
    if (!supabase) {
        console.warn('⚠️ Supabase no configurado - no se puede guardar:', path);
        return;
    }

    const parts = path.split('/');
    const table = parts[0];
    const docId = parts[1];

    if (!docId) {
        console.error("❌ saveData requiere un ID en el path:", path);
        return;
    }

    // Convertir camelCase a snake_case para Supabase
    const toSnakeCase = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(toSnakeCase);
        if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj).reduce((result, key) => {
                const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                result[snakeKey] = toSnakeCase(obj[key]);
                return result;
            }, {} as any);
        }
        return obj;
    };

    // Caso especial para settings: estructurar como { id, value }
    let payload: any;
    if (table === 'settings') {
        payload = { id: docId, value: data };
    } else {
        payload = toSnakeCase({ id: docId, ...data });
    }

    console.log(`📝 Guardando en ${table}/${docId}:`, data);
    console.log(`📝 Payload convertido:`, payload);

    const { data: result, error } = await supabase.from(table).upsert(payload);

    if (error) {
        console.error(`❌ Error guardando en ${path}:`, error);
        console.error(`❌ Error details:`, JSON.stringify(error));
        
        // Mostrar alert con el error específico
        alert(`Error al guardar: ${error.message}`);
        
        // Mostrar error más detallado
        if (error.message && error.message.includes('relation')) {
            console.error(`⚠️ La tabla '${table}' no existe en Supabase. Debes crearla en el panel de Supabase.`);
            alert(`Error: La tabla '${table}' no existe. Por favor, créala en Supabase SQL Editor:\n\nCREATE TABLE workers (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  position TEXT,\n  salary NUMERIC DEFAULT 0,\n  pay_day TEXT,\n  balance NUMERIC DEFAULT 0,\n  created_at BIGINT\n);`);
        }
        
        return false;
    } else {
        console.log(`✅ Guardado exitoso en ${path}:`, result);
        return true;
    }
};

export const deleteData = async (path: string) => {
    if (!supabase) return;

    const parts = path.split('/');
    const table = parts[0];
    const docId = parts[1];

    if (docId) {
        // Borrar el documento específico
        await supabase.from(table).delete().eq('id', docId);
    } else {
        console.error("deleteData requiere un ID específico");
    }
};

export const updateBatch = async (updates: Record<string, any>) => {
    if (!supabase) return;

    // Supabase no tiene un "multi-path batch" atómico simple desde cliente JS como Firebase.
    // Procesaremos las actualizaciones en paralelo.
    const promises = Object.entries(updates).map(async ([path, value]) => {
        if (value === null) {
            return deleteData(path);
        } else {
            return saveData(path, value);
        }
    });

    await Promise.all(promises);
};

// Funciones dummy par mantener compatibilidad si algo las llama
export const saveFirebaseConfig = () => { };
export const clearFirebaseConfig = () => { };
