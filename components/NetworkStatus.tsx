import React, { useState, useEffect, useCallback } from 'react';
import { syncOfflineQueue } from '../services/supabaseService';
import { getPendingCount } from '../services/offlineSync';

interface NetworkStatusProps {
    onSyncComplete?: (synced: number) => void;
}

/**
 * Indicador compacto de estado de red con sync automático
 * al recuperar conexión.
 */
const NetworkStatus: React.FC<NetworkStatusProps> = ({ onSyncComplete }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(getPendingCount());
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);

    // Actualizar conteo de pendientes
    const refreshPending = useCallback(() => {
        setPendingCount(getPendingCount());
    }, []);

    // Sincronizar cola offline cuando se recupera internet
    const doSync = useCallback(async () => {
        if (!navigator.onLine || isSyncing) return;
        const count = getPendingCount();
        if (count === 0) return;

        setIsSyncing(true);
        try {
            const { synced, failed } = await syncOfflineQueue();
            if (synced > 0) {
                setLastSynced(new Date());
                onSyncComplete?.(synced);
            }
            refreshPending();
        } catch (err) {
            console.warn('Error en sync:', err);
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, onSyncComplete, refreshPending]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Pequeño delay para que la conexión se estabilice
            setTimeout(() => doSync(), 1500);
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Escuchar mensajes del Service Worker (background sync)
        const handleSwMessage = (event: MessageEvent) => {
            if (event.data?.type === 'TRIGGER_SYNC') {
                doSync();
            }
            if (event.data?.type === 'QUEUE_PROCESSED') {
                refreshPending();
            }
        };
        navigator.serviceWorker?.addEventListener('message', handleSwMessage);

        // Verificar pendientes al montar
        refreshPending();

        // Polling cada 30s para actualizar el conteo
        const interval = setInterval(refreshPending, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
            clearInterval(interval);
        };
    }, [doSync, refreshPending]);

    // Colores y labels
    const statusColor = isOnline
        ? (isSyncing ? '#f59e0b' : '#10b981')  // amber si sincronizando, verde si online
        : '#ef4444';                              // rojo si offline

    const statusLabel = isOnline
        ? (isSyncing ? 'Sincronizando...' : 'En línea')
        : 'Sin conexión';

    const statusBg = isOnline
        ? (isSyncing ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.12)')
        : 'rgba(239,68,68,0.12)';

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Chip principal */}
            <button
                onClick={() => { setShowTooltip(!showTooltip); if (isOnline && pendingCount > 0) doSync(); }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 8px',
                    borderRadius: '20px',
                    border: `1px solid ${statusColor}30`,
                    background: statusBg,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                }}
                title={statusLabel}
            >
                {/* Punto parpadeante */}
                <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: statusColor,
                    display: 'block',
                    flexShrink: 0,
                    animation: isOnline && !isSyncing ? 'none' : 'pulse-dot 1.5s ease-in-out infinite',
                    boxShadow: `0 0 4px ${statusColor}80`,
                }} />

                {/* Label */}
                <span style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    color: statusColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    lineHeight: 1,
                }}>
                    {isSyncing ? 'Sync' : (isOnline ? 'Online' : 'Offline')}
                </span>

                {/* Badge de pendientes */}
                {pendingCount > 0 && (
                    <span style={{
                        background: '#f59e0b',
                        color: 'white',
                        fontSize: '8px',
                        fontWeight: 900,
                        borderRadius: '10px',
                        padding: '1px 4px',
                        minWidth: '14px',
                        textAlign: 'center',
                        lineHeight: '14px',
                    }}>
                        {pendingCount}
                    </span>
                )}
            </button>

            {/* Tooltip */}
            {showTooltip && (
                <>
                    {/* Overlay para cerrar */}
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                        onClick={() => setShowTooltip(false)}
                    />
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: '220px',
                        background: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                        border: '1px solid rgba(0,0,0,0.06)',
                        padding: '12px',
                        zIndex: 999,
                        animation: 'fadeInDown 0.2s ease',
                    }}>
                        {/* Estado */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '10px',
                        }}>
                            <div style={{
                                width: '10px', height: '10px',
                                borderRadius: '50%',
                                background: statusColor,
                                boxShadow: `0 0 6px ${statusColor}`,
                            }} />
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#111' }}>
                                    {statusLabel}
                                </div>
                                {lastSynced && (
                                    <div style={{ fontSize: '10px', color: '#888' }}>
                                        Última sync: {formatTime(lastSynced)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info de pendientes */}
                        {pendingCount > 0 ? (
                            <div style={{
                                background: '#fef3c7',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                marginBottom: '8px',
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e' }}>
                                    ⏳ {pendingCount} cambio(s) pendiente(s)
                                </div>
                                <div style={{ fontSize: '10px', color: '#a16207', marginTop: '2px' }}>
                                    {isOnline
                                        ? 'Se sincronizarán ahora'
                                        : 'Se sincronizarán al conectarse'}
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                background: '#f0fdf4',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                marginBottom: '8px',
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>
                                    ✅ Todo sincronizado
                                </div>
                            </div>
                        )}

                        {/* Botón de sync manual */}
                        {isOnline && pendingCount > 0 && (
                            <button
                                onClick={() => { doSync(); setShowTooltip(false); }}
                                disabled={isSyncing}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    background: '#4f46e5',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    opacity: isSyncing ? 0.6 : 1,
                                }}
                            >
                                {isSyncing ? '⟳ Sincronizando...' : '↑ Sincronizar ahora'}
                            </button>
                        )}

                        {/* Info offline */}
                        {!isOnline && (
                            <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>
                                💾 Trabajando en modo local.<br />
                                Los datos se guardarán en este dispositivo.
                            </div>
                        )}
                    </div>
                </>
            )}

            <style>{`
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.8); }
                }
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default NetworkStatus;
