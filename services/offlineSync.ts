/**
 * offlineSync.ts
 * 
 * Sistema de sincronización offline para Pointy POS.
 * 
 * CÓMO FUNCIONA:
 * 1. saveData / deleteData / updateBatch se interceptan
 * 2. Si hay internet → se ejecutan directo contra Supabase (como siempre)
 * 3. Si NO hay internet → se guardan en la cola (localStorage) y se retornan como "exitosas"
 * 4. Cuando se recupera internet → se dispara el sync y se envían todos los ops pendientes
 */

const QUEUE_KEY = 'pointy_offline_queue';
const MAX_QUEUE_SIZE = 500;  // Límite de seguridad

interface PendingOp {
    id: string;
    type: 'save' | 'delete';
    path: string;
    data?: any;
    timestamp: number;
    retries: number;
}

// ── Lectura / escritura de la cola ───────────────────────────
export function getOfflineQueue(): PendingOp[] {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveOfflineQueue(queue: PendingOp[]): void {
    try {
        // Si la cola crece demasiado, mantener los más recientes
        const trimmed = queue.slice(-MAX_QUEUE_SIZE);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.warn('No se pudo guardar la cola offline:', e);
    }
}

export function clearOfflineQueue(): void {
    localStorage.removeItem(QUEUE_KEY);
}

// ── Encolar una operación ────────────────────────────────────
export function enqueueOp(type: 'save' | 'delete', path: string, data?: any): void {
    const queue = getOfflineQueue();

    // Si ya existe una operación para este path, reemplazarla (última gana)
    const existingIdx = queue.findIndex(op => op.path === path && op.type === type);
    const newOp: PendingOp = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type,
        path,
        data,
        timestamp: Date.now(),
        retries: 0,
    };

    if (existingIdx !== -1) {
        queue[existingIdx] = newOp; // Reemplazar con datos más recientes
    } else {
        queue.push(newOp);
    }

    saveOfflineQueue(queue);
    console.log(`📦 [Offline] Operación encolada: ${type} ${path} (total: ${queue.length})`);
}

// ── Procesar la cola ─────────────────────────────────────────
let isSyncing = false;

export async function processOfflineQueue(
    saveFn: (path: string, data: any) => Promise<boolean | undefined>,
    deleteFn: (path: string) => Promise<void>
): Promise<{ synced: number; failed: number }> {
    if (isSyncing) {
        console.log('⏳ Sync ya en progreso, saltando...');
        return { synced: 0, failed: 0 };
    }

    const queue = getOfflineQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    isSyncing = true;
    console.log(`🔄 Iniciando sync offline: ${queue.length} operación(es) pendiente(s)`);

    let synced = 0;
    let failed = 0;
    const remaining: PendingOp[] = [];

    for (const op of queue) {
        try {
            if (op.type === 'save') {
                await saveFn(op.path, op.data);
            } else if (op.type === 'delete') {
                await deleteFn(op.path);
            }
            synced++;
            console.log(`✅ Sync exitoso: ${op.type} ${op.path}`);
        } catch (err) {
            console.warn(`⚠️ Error en sync: ${op.path}`, err);
            op.retries++;
            if (op.retries < 3) {
                remaining.push(op); // Reintentar más tarde
            } else {
                console.error(`❌ Op descartada tras 3 intentos: ${op.path}`);
                failed++;
            }
        }
    }

    saveOfflineQueue(remaining);
    isSyncing = false;

    console.log(`✅ Sync completado: ${synced} exitosos, ${failed} fallidos, ${remaining.length} pendientes`);
    return { synced, failed };
}

export function getPendingCount(): number {
    return getOfflineQueue().length;
}
