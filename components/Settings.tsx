
import React, { useState, useEffect } from 'react';
import { Trash2, TrendingUp, QrCode, Copy, Check, Globe, Smartphone, Monitor, Lock, Unlock, MousePointer2, CloudOff, Cloud, Info, Calendar, Edit, Save, X } from 'lucide-react';
import { Product, Customer, Sale, ExchangeRateRecord } from '../types';

interface SettingsProps {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  exchangeRate: number;
  rateHistory: ExchangeRateRecord[];
  onExchangeRateChange: (rate: number) => void;
  onHistoryUpdate: (record: ExchangeRateRecord) => void;
  onHistoryDelete: (id: string) => void;
  onImport: (data: { products: Product[]; customers: Customer[]; sales: Sale[] }) => void;
  onReset: () => void;
}

const Settings: React.FC<SettingsProps> = ({ products, customers, sales, exchangeRate, rateHistory = [], onExchangeRateChange, onHistoryUpdate, onHistoryDelete, onImport, onReset }) => {
  const [localRate, setLocalRate] = useState(exchangeRate.toString());
  const [currentUrl, setCurrentUrl] = useState('');
  const [copied, setCopied] = useState(false);
  
  // State for editing history
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');

  useEffect(() => {
    setCurrentUrl(window.location.href);
    setLocalRate(exchangeRate.toString());
  }, [exchangeRate]);

  const handleUpdateRate = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(localRate);
    if (rate > 0) onExchangeRateChange(rate);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEditing = (record: ExchangeRateRecord) => {
    setEditingId(record.id);
    setEditRate(record.rate.toString());
    // Format timestamp to YYYY-MM-DD for input[type="date"]
    const date = new Date(record.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    setEditDate(dateStr);
  };

  const saveEditing = (id: string) => {
    const rate = parseFloat(editRate);
    if (rate > 0 && editDate) {
      // Create timestamp from date string (at noon to avoid timezone shift issues)
      const timestamp = new Date(editDate + 'T12:00:00').getTime();
      // Fix: Removed 'dateString' as it is not a valid property of ExchangeRateRecord
      onHistoryUpdate({
        id,
        rate,
        timestamp
      });
      setEditingId(null);
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(currentUrl)}`;

  // Sort history by date descending
  const sortedHistory = [...rateHistory].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-8 pb-24 max-w-5xl mx-auto px-2">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-gray-900 to-indigo-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2">Ajustes & Conexión</h2>
          <p className="text-indigo-200 font-medium opacity-90 max-w-md">
            Gestiona la tasa de cambio y conecta tus dispositivos.
          </p>
        </div>
        <Smartphone className="absolute -right-6 -bottom-6 w-48 h-48 text-white/5 rotate-12" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMNA IZQUIERDA: TASA Y QR */}
        <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                <div className="bg-emerald-100 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-gray-900">Tasa de Cambio (BCV)</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase">Actualizar Valor Hoy</p>
                </div>
                </div>
                <form onSubmit={handleUpdateRate} className="space-y-4">
                <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-xl">Bs.</span>
                    <input 
                    type="number" 
                    step="0.01"
                    value={localRate}
                    onChange={(e) => setLocalRate(e.target.value)}
                    className="w-full pl-16 pr-4 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-2xl font-black text-gray-700 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                    />
                </div>
                <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-100 active:scale-95 transition-all">
                    Guardar Nueva Tasa
                </button>
                </form>
            </div>

            {/* Código QR */}
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-xl flex flex-col items-center justify-center text-center">
            <div className="bg-gray-900 p-6 rounded-[2.5rem] mb-6 shadow-2xl group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-[2.5rem] opacity-20 blur-xl group-hover:opacity-40 transition-opacity"></div>
                <img src={qrUrl} alt="QR" className="relative w-56 h-56 md:w-64 md:h-64 object-contain rounded-xl mix-blend-screen" />
            </div>
            <div className="space-y-4 w-full">
                <div className="bg-indigo-50 p-4 rounded-2xl flex items-center justify-between gap-3 overflow-hidden border border-indigo-100">
                <div className="truncate flex-1 text-left">
                    <p className="text-[10px] font-black text-indigo-400 uppercase">Tu Enlace Personal</p>
                    <p className="text-xs font-mono truncate text-indigo-900 font-bold">{currentUrl}</p>
                </div>
                <button onClick={copyUrl} className="bg-white p-3 rounded-xl shadow-sm hover:bg-indigo-600 hover:text-white transition-all active:scale-90 shrink-0 border border-indigo-100">
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
                </div>
            </div>
            </div>
        </div>

        {/* COLUMNA DERECHA: HISTORIAL */}
        <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
                <div className="p-8 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-100 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900">Histórico de Tasas</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase">Registro de cambios</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-4">
                    {sortedHistory.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">No hay historial registrado aún.</div>
                    ) : (
                        <div className="space-y-3">
                            {sortedHistory.map(record => (
                                <div key={record.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors group">
                                    {editingId === record.id ? (
                                        // MODO EDICIÓN
                                        <div className="flex-1 flex items-center gap-2">
                                            <input 
                                                type="date" 
                                                className="bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold text-gray-700 outline-none focus:border-indigo-500"
                                                value={editDate}
                                                onChange={(e) => setEditDate(e.target.value)}
                                            />
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="w-20 bg-white border border-gray-200 rounded-lg p-2 text-xs font-black text-emerald-600 outline-none focus:border-emerald-500"
                                                value={editRate}
                                                onChange={(e) => setEditRate(e.target.value)}
                                            />
                                            <div className="flex gap-1 ml-auto">
                                                <button onClick={() => saveEditing(record.id)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"><Save className="w-4 h-4"/></button>
                                                <button onClick={() => setEditingId(null)} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"><X className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    ) : (
                                        // MODO VISUALIZACIÓN
                                        <>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-400 uppercase">
                                                    {new Date(record.timestamp).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                </span>
                                                <span className="text-lg font-black text-emerald-600 tracking-tight">{record.rate.toFixed(2)} Bs.</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEditing(record)} className="p-2 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 shadow-sm border border-gray-100"><Edit className="w-4 h-4"/></button>
                                                <button onClick={() => onHistoryDelete(record.id)} className="p-2 bg-white text-red-500 rounded-xl hover:bg-red-50 shadow-sm border border-gray-100"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-red-50/50 p-6 rounded-[2rem] border border-red-100">
                <h4 className="text-sm font-black text-red-900 mb-4 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Zona de Peligro
                </h4>
                <div className="flex gap-2">
                    <button onClick={() => {
                    const data = { products, customers, sales, exchangeRate };
                    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'pointy_backup.json';
                    a.click();
                }} className="flex-1 py-3 bg-white border border-indigo-200 rounded-xl text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 transition-all">
                    Respaldar Datos
                    </button>
                    <button onClick={onReset} className="px-4 py-3 bg-white border border-red-200 rounded-xl text-red-500 hover:bg-red-50 transition-all">
                    Borrar Todo
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
