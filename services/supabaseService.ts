
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN ---
// Crea un archivo .env si no existe y agrega:
// VITE_SUPABASE_URL=tu_url_de_supabase
// VITE_SUPABASE_ANON_KEY=tu_anon_key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Inicializar cliente solo si hay keys, para evitar errores
export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isCloudEnabled = !!supabase;

// --- ADAPTADOR DE MEMORIA (CACHE) ---
// Para mantener compatibilidad con la estructura de objeto anidado de Firebase y optimizar lecturas
const memoryCache: Record<string, any> = {};

// Helper para convertir array a objeto mapa por ID
const arrayToMap = (data: any[]) => {
    if (!data) return {};
    return data.reduce((acc: any, item: any) => {
        acc[item.id] = item;
        return acc;
    }, {});
};

// --- SISTEMA DE RESPALDO LOCAL (FALLBACK) ---
// Se usa solo si no hay configuración de nube o como caché inicial

const getLocalData = (path: string) => {
    const parts = path.split('/');
    const root = parts[0];
    const storageKey = `pointy_data_${root}`;
    const raw = localStorage.getItem(storageKey);
    const data = raw ? JSON.parse(raw) : null;

    if (parts.length > 1 && data) {
        return data[parts[1]] || null;
    }
    return data;
};

const setLocalData = (path: string, value: any) => {
    const parts = path.split('/');
    const root = parts[0];
    const storageKey = `pointy_data_${root}`;

    let currentRootData = JSON.parse(localStorage.getItem(storageKey) || '{}');

    if (parts.length === 1) {
        if (value === null) {
            localStorage.removeItem(storageKey);
        } else {
            localStorage.setItem(storageKey, JSON.stringify(value));
        }
    } else if (parts.length === 2) {
        if (value === null) {
            delete currentRootData[parts[1]];
        } else {
            currentRootData[parts[1]] = value;
        }
        localStorage.setItem(storageKey, JSON.stringify(currentRootData));
    }

    window.dispatchEvent(new Event('pointy_storage_update'));
};


// --- API HÍBRIDA (SUPABASE + LOCAL) ---

export const syncPath = (path: string, callback: (data: any) => void) => {
    // Siempre cargar datos locales primero para respuesta inmediata (Optimistic UI)
    const localData = getLocalData(path);
    if (localData) callback(localData);

    if (isCloudEnabled && supabase) {
        // --- MODO NUBE (SUPABASE) ---

        // Identificar si es colección completa o documento
        const parts = path.split('/');
        const table = parts[0];
        const docId = parts[1];

        // CASO 1: Documento único (ej: settings/exchangeRate)
        if (docId) {
            const fetchData = async () => {
                const { data } = await supabase.from(table).select('*').eq('id', docId).single();
                if (data) {
                    let val = data;
                    if (table === 'settings' && 'value' in data) {
                        val = data.value;
                    }
                    // Guardar en local para caché futura
                    setLocalData(path, val);
                    callback(val);
                }
            };
            fetchData();

            const channel = supabase.channel(`${table}:${docId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: table, filter: `id=eq.${docId}` }, (payload: any) => {
                    let val = payload.new;
                    if (payload.new && 'value' in payload.new && table === 'settings') {
                        val = payload.new.value;
                    }
                    // Actualizar local y callback
                    if (val) setLocalData(path, val);
                    callback(val || null);
                })
                .subscribe();

            return () => supabase.removeChannel(channel);
        }

        // CASO 2: Colección completa (ej: products)
        else {
            const fetchData = async () => {
                // Obtener todo
                const { data } = await supabase.from(table).select('*');
                const map = arrayToMap(data || []);

                // Actualizar caché local completa
                setLocalData(path, map);
                callback(map);
            };
            fetchData();

            const channel = supabase.channel(table)
                .on('postgres_changes', { event: '*', schema: 'public', table: table }, (payload) => {
                    // Recargar todo es ineficiente pero seguro. O mejor, actualizar diferencialmente.
                    // Para simplicidad en syncPath híbrido, volveremos a leer local, aplicar cambio y notificar.
                    // Pero syncPath no tiene estado interno fácil más que memoryCache.

                    // Estrategia simple: Al haber cambio, volver a hacer fetch de la tabla (no es óptimo pero es robusto)
                    // Estrategia optimizada: Aplicar cambio al mapa local.

                    let currentMap = getLocalData(path) || {};

                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        currentMap[payload.new.id] = payload.new;
                    } else if (payload.eventType === 'DELETE') {
                        delete currentMap[payload.old.id];
                    }

                    setLocalData(path, currentMap);
                    callback(currentMap);
                })
                .subscribe();

            return () => supabase.removeChannel(channel);
        }

    } else {
        // --- MODO LOCAL (OFFLINE / SIN CONFIG) ---
        // Ya cargamos data inicial arriba.
        // Solo necesitamos escuchar eventos de otras pestañas.
        const handler = () => callback(getLocalData(path));
        window.addEventListener('pointy_storage_update', handler);
        return () => window.removeEventListener('pointy_storage_update', handler);
    }
};

export const saveData = async (path: string, data: any) => {
    // 1. Guardar localmente siempre (Optimistic UI + Fallback)
    setLocalData(path, data);

    // 2. Si hay nube, sincronizar
    if (isCloudEnabled && supabase) {
        const parts = path.split('/');
        const table = parts[0];
        const docId = parts[1];

        if (docId) {
            let payload = data;
            // Adaptador para settings (valor primitivo -> objeto)
            if (table === 'settings' && typeof data !== 'object') {
                payload = { id: docId, value: data };
            } else if (typeof data === 'object' && !data.id) {
                payload = { ...data, id: docId };
            }

            const { error } = await supabase.from(table).upsert(payload);
            if (error) console.error("Error saving to Supabase:", error);
        }
    }
};

export const deleteData = async (path: string) => {
    // 1. Borrar localmente
    // Logica de borrado local custom (null update)
    const parts = path.split('/');
    if (parts.length === 2) {
        setLocalData(path, null);
    } else {
        localStorage.removeItem(`pointy_data_${path}`);
        window.dispatchEvent(new Event('pointy_storage_update'));
    }

    // 2. Borrar en nube
    if (isCloudEnabled && supabase) {
        const table = parts[0];
        const docId = parts[1];

        if (docId) {
            await supabase.from(table).delete().eq('id', docId);
        }
    }
};

export const updateBatch = async (updates: Record<string, any>) => {
    // 1. Aplicar todo localmente
    Object.entries(updates).forEach(([path, value]) => {
        if (value === null) {
            const parts = path.split('/');
            if (parts.length === 2) setLocalData(path, null);
        } else {
            setLocalData(path, value);
        }
    });

    // 2. Aplicar en nube
    if (isCloudEnabled && supabase) {
        const promises = Object.entries(updates).map(async ([path, value]) => {
            if (value === null) {
                await deleteData(path); // Redundante pero seguro, llama a deleteData que tiene check
            } else {
                await saveData(path, value);
            }
        });
        await Promise.all(promises);
    }
};
