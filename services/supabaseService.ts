
import { createClient } from '@supabase/supabase-js';
import { enqueueOp, processOfflineQueue, getPendingCount } from './offlineSync';

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

// Helper: Convertir Array a Objeto Map
const arrayToMap = (data: any[]) => {
    if (!data || !Array.isArray(data)) return {};
    return data.reduce((acc: any, item: any) => {
        if (item && item.id) acc[item.id] = item;
        return acc;
    }, {});
};

// Convertir camelCase a snake_case
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

// --- API COMPATIBLE ---

const CACHE_PREFIX = 'pointy_cache_';

export const syncPath = (path: string, callback: (data: any) => void) => {
    // Intentar cargar desde caché local primero para respuesta inmediata (offline load)
    const cached = localStorage.getItem(CACHE_PREFIX + path);
    if (cached) {
        try {
            callback(JSON.parse(cached));
        } catch (e) {
            console.warn(`⚠️ Error parseando caché de ${path}`, e);
        }
    }

    if (!supabase) {
        console.warn("⚠️ Supabase no configurado. Operando en modo Local únicamente.");
        return () => { };
    }

    const parts = path.split('/');
    const table = parts[0];
    const docId = parts[1];

    // Helper para emitir y cachear
    const emit = (val: any) => {
        if (val !== undefined) {
            localStorage.setItem(CACHE_PREFIX + path, JSON.stringify(val));
            callback(val);
        }
    };

    // CASO 1: Documento único
    if (docId) {
        supabase.from(table).select('*').eq('id', docId).single()
            .then(({ data }) => {
                if (data && 'value' in data && table === 'settings') {
                    emit(data.value);
                } else if (data) {
                    emit(toCamelCase(data));
                } else {
                    emit(null);
                }
            });

        const channel = supabase.channel(`doc:${table}:${docId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: table, filter: `id=eq.${docId}` },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        emit(null);
                    } else {
                        let val = payload.new;
                        if (val && 'value' in val && table === 'settings') {
                            val = val.value;
                        } else {
                            val = toCamelCase(val);
                        }
                        emit(val);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }

    // CASO 2: Colección completa
    else {
        const fetchAll = () => {
            supabase.from(table).select('*')
                .then(({ data, error }) => {
                    if (error) console.warn(`⚠️ Error cargando ${table}:`, error);
                    const mapped = arrayToMap(data || []);
                    const converted = Object.fromEntries(
                        Object.entries(mapped).map(([k, v]) => [k, toCamelCase(v)])
                    );
                    emit(converted);
                });
        };

        fetchAll();

        const channel = supabase.channel(`col:${table}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: table },
                () => fetchAll()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }
};

export const saveData = async (path: string, data: any): Promise<boolean> => {
    if (!supabase) {
        console.warn('⚠️ Supabase no configurado - encolando para offline:', path);
        enqueueOp('save', path, data);
        return true; // Optimista: se guardará cuando haya internet
    }

    const parts = path.split('/');
    const table = parts[0];
    const docId = parts[1];

    if (!docId) {
        console.error("❌ saveData requiere un ID en el path:", path);
        return false;
    }

    let payload: any;
    if (table === 'settings') {
        payload = { id: docId, value: data };
    } else {
        payload = toSnakeCase({ id: docId, ...data });
    }

    try {
        const { error } = await supabase.from(table).upsert(payload);
        if (error) {
            // Error de red → encolar para sync posterior
            if (isNetworkError(error)) {
                console.warn(`📦 Sin conexión — encolando: ${path}`);
                enqueueOp('save', path, data);
                return true; // La app continúa normalmente
            }
            console.error(`❌ Error guardando en ${path}:`, error.message);
            return false;
        }
        return true;
    } catch (err: any) {
        // Error de red/fetch → encolar
        console.warn(`📦 Error de red — encolando: ${path}`);
        enqueueOp('save', path, data);
        return true; // La app continúa normalmente
    }
};

export const deleteData = async (path: string): Promise<void> => {
    if (!supabase) {
        enqueueOp('delete', path);
        return;
    }

    const parts = path.split('/');
    const table = parts[0];
    const docId = parts[1];

    if (!docId) {
        console.error("deleteData requiere un ID específico");
        return;
    }

    try {
        const { error } = await supabase.from(table).delete().eq('id', docId);
        if (error && isNetworkError(error)) {
            enqueueOp('delete', path);
        }
    } catch {
        enqueueOp('delete', path);
    }
};

export const updateBatch = async (updates: Record<string, any>): Promise<void> => {
    const promises = Object.entries(updates).map(async ([path, value]) => {
        if (value === null) {
            return deleteData(path);
        } else {
            return saveData(path, value);
        }
    });
    await Promise.all(promises);
};

// ── Sincronizar cola pendiente ───────────────────────────────
export const syncOfflineQueue = async (): Promise<{ synced: number; failed: number }> => {
    if (!supabase || !navigator.onLine) return { synced: 0, failed: 0 };

    // Pasamos las funciones de BD directas (sin encolar de nuevo en errores para evitar loop)
    const directSave = async (path: string, data: any) => {
        const parts = path.split('/');
        const table = parts[0];
        const docId = parts[1];
        if (!docId) return false;
        let payload: any;
        if (table === 'settings') {
            payload = { id: docId, value: data };
        } else {
            payload = toSnakeCase({ id: docId, ...data });
        }
        const { error } = await supabase!.from(table).upsert(payload);
        if (error) throw new Error(error.message);
        return true;
    };

    const directDelete = async (path: string) => {
        const parts = path.split('/');
        const table = parts[0];
        const docId = parts[1];
        if (!docId) return;
        const { error } = await supabase!.from(table).delete().eq('id', docId);
        if (error) throw new Error(error.message);
    };

    return processOfflineQueue(directSave, directDelete);
};

// ── Detectar errores de red ──────────────────────────────────
function isNetworkError(error: any): boolean {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    return (
        msg.includes('network') ||
        msg.includes('fetch') ||
        msg.includes('failed') ||
        msg.includes('timeout') ||
        error.code === 'PGRST' ||
        !navigator.onLine
    );
}

// ── Funciones de compatibilidad ──────────────────────────────
export const saveFirebaseConfig = () => { };
export const clearFirebaseConfig = () => { };

export const clearAllTreasuryTransactions = async () => {
    if (!supabase) return;
    await supabase.from('treasury').delete().neq('id', '');
};

export const clearAllSales = async () => {
    if (!supabase) return;
    await supabase.from('sales').delete().neq('id', '');
};

export const clearAllData = async () => {
    if (!supabase) return;
    await Promise.all([
        supabase.from('treasury').delete().neq('id', ''),
        supabase.from('sales').delete().neq('id', ''),
        supabase.from('products').delete().neq('id', ''),
        supabase.from('customers').delete().neq('id', ''),
    ]);
};
