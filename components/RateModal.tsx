
import React, { useState, useEffect } from 'react';
import { ExchangeRateRecord } from '../types';
import { X, TrendingUp, Calendar, Save, Edit, Trash2, DollarSign, History, Check } from '../constants';

interface RateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRate: number;
  rateHistory: ExchangeRateRecord[];
  onUpdateRate: (rate: number) => void;
  onHistoryUpdate: (record: ExchangeRateRecord) => void;
  onHistoryDelete: (id: string) => void;
}

const RateModal: React.FC<RateModalProps> = ({
  isOpen,
  onClose,
  currentRate,
  rateHistory,
  onUpdateRate,
  onHistoryUpdate,
  onHistoryDelete
}) => {
  const [localRate, setLocalRate] = useState(currentRate.toString());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLocalRate(currentRate.toString());
    }
  }, [isOpen, currentRate]);

  if (!isOpen) return null;

  const handleUpdateCurrentRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(localRate);
    if (rate > 0) {
      // Actualizar la tasa actual e historial inmediatamente
      onUpdateRate(rate);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayTimestamp = new Date(todayStr + 'T12:00:00').getTime();

      const existingRecord = rateHistory.find(r => {
        const rDate = new Date(r.timestamp).toISOString().split('T')[0];
        return rDate === todayStr;
      });

      const recordId = existingRecord ? existingRecord.id : `rate_${Date.now()}`;
      const newRecord = { id: recordId, rate: rate, timestamp: todayTimestamp };

      await onHistoryUpdate(newRecord);
      onClose();
    }
  };

  const startEditing = (record: ExchangeRateRecord) => {
    setEditingId(record.id);
    setEditRate(record.rate.toString());
    const date = new Date(record.timestamp);
    setEditDate(date.toISOString().split('T')[0]);
  };

  const saveEditing = (id: string) => {
    const rate = parseFloat(editRate);
    if (rate > 0 && editDate) {
      const timestamp = new Date(editDate + 'T12:00:00').getTime();
      onHistoryUpdate({ id, rate, timestamp });
      setEditingId(null);
    }
  };

  const sortedHistory = [...rateHistory].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Tasa de Cambio</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Gestión de Divisas</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white p-2 rounded-full text-gray-400 hover:text-gray-900 shadow-sm transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">

          {/* Current Rate Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-6 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-4">Tasa del Día (BCV)</h4>
              <form onSubmit={handleUpdateCurrentRate} className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 w-5 h-5" />
                  <input
                    autoFocus
                    type="number"
                    step="0.01"
                    value={localRate}
                    onChange={(e) => setLocalRate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-2xl text-2xl font-black text-white outline-none focus:bg-white/20 transition-all placeholder:text-white/50"
                  />
                </div>
                <button type="submit" className="bg-white text-indigo-600 p-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                  <Save className="w-6 h-6" />
                </button>
              </form>
              <p className="text-[10px] text-indigo-200 mt-3 flex items-center gap-1">
                <Check className="w-3 h-3" /> Se guardará en el historial automáticamente
              </p>
            </div>
            <TrendingUp className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10 rotate-12 pointer-events-none" />
          </div>

          {/* History List */}
          <div>
            <div className="flex items-center gap-2 mb-4 px-2">
              <History className="w-4 h-4 text-gray-400" />
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Historial Registrado</h4>
            </div>

            <div className="space-y-2">
              {sortedHistory.length === 0 ? (
                <div className="text-center py-8 opacity-40">
                  <p className="text-xs font-bold text-gray-400">No hay historial disponible</p>
                </div>
              ) : (
                sortedHistory.map(record => (
                  <div key={record.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100 group hover:border-indigo-100 transition-colors">
                    {editingId === record.id ? (
                      <div className="flex-1 flex gap-2 items-center">
                        <input
                          type="date"
                          className="bg-white p-2 rounded-xl text-xs font-bold border border-gray-200 outline-none focus:border-indigo-500"
                          value={editDate}
                          onChange={e => setEditDate(e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="w-20 bg-white p-2 rounded-xl text-xs font-black text-emerald-600 border border-gray-200 outline-none focus:border-indigo-500"
                          value={editRate}
                          onChange={e => setEditRate(e.target.value)}
                        />
                        <button onClick={() => saveEditing(record.id)} className="p-2 bg-emerald-500 text-white rounded-xl shadow-sm"><Save className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-xl text-gray-400 font-bold text-xs shadow-sm border border-gray-100">
                            {new Date(record.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                          </div>
                          <span className="text-lg font-black text-gray-700">{record.rate.toFixed(2)} Bs</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditing(record)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => { if (window.confirm('Eliminar registro?')) onHistoryDelete(record.id) }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
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

export default RateModal;
