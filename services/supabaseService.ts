
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
        // Carga inicial
        supabase.from(table).select('*')
            .then(({ data }) => {
                const map = arrayToMap(data || []);
                callback(map);
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
                            callback(arrayToMap(data || []));
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

    console.log(`📝 Guardando en ${table}/${docId}:`, data);

    let payload: any = data;

    // Adaptación para Settings (guardar valor en columna 'value')
    if (table === 'settings') {
        // Si data es primitivo (numero, string) o un objeto sin ID, lo envolvemos
        if (typeof data !== 'object' || data === null || !data.id) {
            payload = { id: docId, value: data };
        } else {
            payload = { id: docId, value: data };
        }
    } else {
        // Para otras tablas, asegurarnos que el ID esté en el objeto
        if (typeof data === 'object') {
            payload = { ...data, id: docId };
        }
    }

    console.log(`💾 Payload final para ${table}:`, payload);

    const { data: result, error } = await supabase.from(table).upsert(payload);

    if (error) {
        console.error(`❌ Error guardando en ${path}:`, error);
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
