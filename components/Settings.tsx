
import React, { useState, useEffect } from 'react';
import { Smartphone, HardDrive, Upload, Download, FileSpreadsheet, Zap, Package, Users, AlertTriangle, X, Settings as SettingsIcon } from 'lucide-react';
import { Product, Customer, Sale } from '../types';
import { saveData, syncPath, isCloudEnabled } from '../services/supabaseService';
import { Cloud, CloudOff } from 'lucide-react';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    customers: Customer[];
    sales: Sale[];
    onImport: () => void;
    onReset: () => void;
    autoSync: boolean;
    onToggleAutoSync: () => void;
    installApp?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, products, customers, sales, onImport, onReset, installApp }) => {
    const [sheetsUrl, setSheetsUrl] = useState('');
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (isOpen) {
            const unsub = syncPath('settings/sheetsUrl', (data) => {
                setSheetsUrl(data || '');
            });
            return () => unsub();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSaveSheetsUrl = () => {
        saveData('settings/sheetsUrl', sheetsUrl);
        alert("Configuración de Google Sheets guardada.");
    };

    const triggerUpload = async (type: 'sales' | 'inventory' | 'customers') => {
        if (!sheetsUrl) return alert("Primero configura la URL de Google Sheets.");
        setSyncStatus('syncing');

        try {
            let payload: any = [];
            if (type === 'sales') {
                // Enriquecer ventas con nombres de clientes
                payload = sales.map(s => ({
                    ...s,
                    customerName: customers.find(c => c.id === s.customerId)?.name || 'General'
                }));
            } else if (type === 'inventory') {
                payload = products;
            } else if (type === 'customers') {
                payload = customers;
            }

            await fetch(sheetsUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ type, payload })
            });

            setSyncStatus('success');
            alert('Datos enviados a Google Sheets correctamente (Modo No-CORS)');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (e) {
            console.error(e);
            setSyncStatus('error');
            alert('Error al enviar datos. Verifica la URL del Script.');
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
    };

    const handleLocalExport = () => {
        try {
            const backup = {
                products: localStorage.getItem('pointy_data_products'),
                customers: localStorage.getItem('pointy_data_customers'),
                sales: localStorage.getItem('pointy_data_sales'),
                settings: localStorage.getItem('pointy_data_settings'),
                treasury: localStorage.getItem('pointy_data_treasury'),
                timestamp: Date.now()
            };

            const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pointy_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            alert("Error al exportar datos locales.");
        }
    };

    const handleLocalImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const backup = JSON.parse(event.target?.result as string);
                if (backup.products) localStorage.setItem('pointy_data_products', backup.products);
                if (backup.customers) localStorage.setItem('pointy_data_customers', backup.customers);
                if (backup.sales) localStorage.setItem('pointy_data_sales', backup.sales);
                if (backup.settings) localStorage.setItem('pointy_data_settings', backup.settings);
                if (backup.treasury) localStorage.setItem('pointy_data_treasury', backup.treasury);

                alert('Respaldo restaurado con éxito. La aplicación se reiniciará.');
                window.location.reload();
            } catch (err) {
                alert('Error al leer el archivo de respaldo');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-900 p-2 rounded-xl text-white">
                            <SettingsIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 leading-tight">Ajustes</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {isCloudEnabled ? (
                                    <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase">
                                        <Cloud className="w-3 h-3" /> Conectado a la Nube
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-[10px] font-black text-orange-400 uppercase">
                                        <CloudOff className="w-3 h-3" /> Modo Local (Sin Nube)
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white p-2 rounded-full text-gray-400 hover:text-gray-900 shadow-sm transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-6">

                    {/* BOTÓN DE INSTALACIÓN */}
                    {installApp && (
                        <button
                            onClick={installApp}
                            className="w-full p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-[2rem] shadow-lg shadow-indigo-200 flex items-center justify-between group active:scale-[0.98] transition-transform"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm uppercase">Instalar Aplicación</p>
                                    <p className="text-[10px] text-white/80 font-medium">Usar sin internet</p>
                                </div>
                            </div>
                            <Download className="w-5 h-5 mr-2 group-hover:translate-y-1 transition-transform" />
                        </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Local Backup */}
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-100 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                                    <HardDrive className="w-5 h-5" />
                                </div>
                                <h3 className="font-black text-gray-900 text-sm uppercase">Respaldo Local</h3>
                            </div>

                            <div className="space-y-3">
                                <button onClick={handleLocalExport} className="w-full p-3 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-sm active:scale-95 flex items-center justify-center gap-2">
                                    <Download className="w-4 h-4" /> Guardar Copia JSON
                                </button>
                                <div className="relative">
                                    <input type="file" accept=".json" onChange={handleLocalImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <button className="w-full p-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold uppercase tracking-widest text-[10px] active:scale-95 flex items-center justify-center gap-2">
                                        <Upload className="w-4 h-4" /> Restaurar Copia JSON
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Google Sheets Sync (Manual Trigger) */}
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-emerald-50 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <h3 className="font-black text-gray-900 text-sm uppercase">Google Sheets</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Script URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={sheetsUrl}
                                            onChange={(e) => setSheetsUrl(e.target.value)}
                                            className="flex-1 p-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 outline-none focus:border-emerald-500"
                                            placeholder="https://script.google.com/..."
                                        />
                                        <button onClick={handleSaveSheetsUrl} className="px-3 bg-gray-900 text-white rounded-xl font-bold text-[10px] active:scale-95">
                                            Ok
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <button disabled={!sheetsUrl || syncStatus === 'syncing'} onClick={() => triggerUpload('sales')} className="p-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-[9px] uppercase border border-emerald-100 active:scale-95 flex flex-col items-center gap-1">
                                        <Zap className="w-4 h-4" /> Ventas
                                    </button>
                                    <button disabled={!sheetsUrl || syncStatus === 'syncing'} onClick={() => triggerUpload('inventory')} className="p-3 bg-blue-50 text-blue-700 rounded-xl font-bold text-[9px] uppercase border border-blue-100 active:scale-95 flex flex-col items-center gap-1">
                                        <Package className="w-4 h-4" /> Stock
                                    </button>
                                    <button disabled={!sheetsUrl || syncStatus === 'syncing'} onClick={() => triggerUpload('customers')} className="p-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-[9px] uppercase border border-indigo-100 active:scale-95 flex flex-col items-center gap-1">
                                        <Users className="w-4 h-4" /> Clientes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <button onClick={onReset} className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black uppercase tracking-widest text-xs border border-red-100 active:scale-95 hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Resetear Aplicación (Borrar Todo)
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
        @keyframes scale-up { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scale-up { animation: scale-up 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
        </div>
    );
};

export default Settings;
