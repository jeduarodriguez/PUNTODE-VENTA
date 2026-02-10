import React, { useState, useEffect } from 'react';
import { Sale, Shift, Customer } from '../types';
import { ShoppingBag, TrendingUp, DollarSign, Wallet, Banknote, Smartphone, CreditCard, History, Plus, Lock, XCircle, CheckCircle2, ShoppingCart, ArrowRight, Building, PiggyBank, Clock, X, Trash2, Edit, Search } from '../constants';
import { saveData, syncPath } from '../services/supabaseService';

interface ReportsProps {
  sales: Sale[];
  customers?: Customer[];
  exchangeRate: number;
  onOpenPOS: () => void;
  onVoidSale: (saleId: string) => void;
  onEditSale: (sale: Sale) => void;
}

const VentasCaja: React.FC<ReportsProps> = ({ sales, customers = [], exchangeRate, onOpenPOS, onVoidSale, onEditSale }) => {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [mercantilBalance, setMercantilBalance] = useState<number>(0);
  const [efectivoBalance, setEfectivoBalance] = useState<number>(0); // Saldo histórico de efectivo (Bóveda)
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [initialCashInput, setInitialCashInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // State for Receipt Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Sync Active Shift
  useEffect(() => {
    const unsub = syncPath('settings/activeShift', (data) => {
      if (data) setActiveShift(data);
      else setActiveShift(null);
    });
    return () => unsub();
  }, []);

  // Sync Mercantil Balance (Historic)
  useEffect(() => {
    const unsub = syncPath('settings/mercantilBalance', (data) => {
      setMercantilBalance(data || 0);
    });
    return () => unsub();
  }, []);

  // Sync Efectivo Balance (Historic/Vault)
  useEffect(() => {
    const unsub = syncPath('settings/efectivoBalance', (data) => {
      setEfectivoBalance(data || 0);
    });
    return () => unsub();
  }, []);

  const openShift = () => {
    const cash = parseFloat(initialCashInput) || 0;

    // Al abrir, restamos la base del saldo acumulado de efectivo (sacamos de bóveda a caja)
    if (cash > efectivoBalance) {
      if (!confirm("El monto base es mayor al efectivo disponible en bóveda. ¿Continuar y dejar saldo negativo?")) {
        return;
      }
    }

    const newShift: Shift = {
      id: Date.now().toString(),
      startTime: Date.now(),
      initialCash: cash, // This is now in Bs
      status: 'open'
    };

    saveData('settings/activeShift', newShift);
    saveData('settings/efectivoBalance', efectivoBalance - cash); // Restar de bóveda
    setShowOpenModal(false);
    setInitialCashInput('');
  };

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return 'Cliente Desconocido';
    const c = customers.find(cust => cust.id === customerId);
    return c ? c.name : 'Cliente';
  };

  // Filtrar ventas del turno actual y aplicar búsqueda
  const shiftSales = activeShift
    ? sales
      .filter(s => s.timestamp >= activeShift.startTime)
      .filter(s => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const totalBs = (s.total * s.exchangeRate).toFixed(2);
        const totalUsd = s.total.toFixed(2);

        const matchesItems = s.items.some(item => item.name.toLowerCase().includes(term));
        const matchesAmount = totalBs.includes(term) || totalUsd.includes(term);
        const matchesMethod =
          (s.paymentMethod === 'Cash' && 'efectivo'.includes(term)) ||
          (s.paymentMethod === 'Card' && 'tarjeta'.includes(term)) ||
          (s.paymentMethod === 'PagoMovil' && 'pago movil'.includes(term)) ||
          (s.paymentMethod === 'Credit' && 'credito'.includes(term));

        let matchesCustomer = false;
        if (s.customerId) {
          const cName = getCustomerName(s.customerId).toLowerCase();
          matchesCustomer = cName.includes(term);
        }

        return matchesItems || matchesAmount || matchesMethod || matchesCustomer;
      })
    : [];

  // Cálculos del Turno en BOLIVARES
  const ventasEfectivoBs = shiftSales
    .filter(s => s.paymentMethod === 'Cash')
    .reduce((sum, s) => sum + (s.total * s.exchangeRate), 0);

  const ventasPuntoBs = shiftSales
    .filter(s => s.paymentMethod === 'Card' || s.paymentMethod === 'PagoMovil')
    .reduce((sum, s) => sum + (s.total * s.exchangeRate), 0);

  // Totales de Cuentas
  const efectivoEnCajaBs = (activeShift?.initialCash || 0) + ventasEfectivoBs;
  const puntoPorLiquidarBs = ventasPuntoBs;

  const closeShift = () => {
    if (confirm(`¿Cerrar turno?\n\n- Se enviarán ${efectivoEnCajaBs.toFixed(2)} Bs a Bóveda.\n- Se enviarán ${puntoPorLiquidarBs.toFixed(2)} Bs a Banco Mercantil.`)) {

      // Transfer point balance to bank
      const newMercantilBalance = mercantilBalance + puntoPorLiquidarBs;
      // Transfer cash in drawer back to vault
      const newEfectivoBalance = efectivoBalance + efectivoEnCajaBs;

      saveData('settings/mercantilBalance', newMercantilBalance);
      saveData('settings/efectivoBalance', newEfectivoBalance);
      saveData('settings/activeShift', null);
    }
  };

  const getSaleDescription = (sale: Sale) => {
    if (sale.items.length === 0) return "Venta sin items";
    const itemSummaries = sale.items.map(item => {
      if (item.id === 'debt_payment') return item.name;
      return `${item.quantity} ${item.name}`;
    });
    return itemSummaries.join(', ');
  };

  const handleVoid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedSale) return;

    if (window.confirm("¿Estás seguro de ELIMINAR esta venta? Esta acción no se puede deshacer.")) {
      onVoidSale(selectedSale.id);
      setSelectedSale(null);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedSale) return;

    if (window.confirm("Se anulará esta factura y se cargarán los productos al carrito para corregirla. ¿Continuar?")) {
      onEditSale(selectedSale);
      setSelectedSale(null);
    }
  };

  if (!activeShift) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center text-center p-6 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 animate-fade-in relative overflow-hidden">
        {/* ... (Keep existing content for closed shift) ... */}
        <div className="relative z-10 flex flex-col items-center max-w-md w-full">
          <div className="bg-gray-100 w-24 h-24 rounded-3xl flex items-center justify-center text-gray-400 mb-6 shadow-inner">
            <Lock className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">Caja Cerrada</h2>
          <p className="text-sm text-gray-500 font-medium mb-8 max-w-xs leading-relaxed">Inicia un nuevo turno operativo para habilitar el sistema de ventas.</p>

          <button
            onClick={() => setShowOpenModal(true)}
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-indigo-700 mb-8"
          >
            <Plus className="w-6 h-6" /> Aperturar Caja
          </button>

          {/* Saldos Históricos */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {/* Banco Mercantil */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                  <Building className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase text-gray-400">Mercantil</span>
              </div>
              <p className="text-lg font-black text-gray-900">{mercantilBalance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</p>
              <p className="text-xs font-bold text-emerald-500 mt-1">Ref: ${(mercantilBalance / exchangeRate).toFixed(2)}</p>
            </div>

            {/* Efectivo en Bóveda */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase text-gray-400">Efectivo</span>
              </div>
              <p className="text-lg font-black text-gray-900">{efectivoBalance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</p>
              <p className="text-xs font-bold text-emerald-500 mt-1">Ref: ${(efectivoBalance / exchangeRate).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {showOpenModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm animate-scale-up shadow-2xl">
              <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 mx-auto">
                <Banknote className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2 text-center">Base en Efectivo</h3>
              <p className="text-xs text-gray-400 mb-8 font-bold uppercase tracking-widest text-center">Monto inicial para dar vuelto (Bs)</p>

              <div className="relative mb-2">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-300 text-lg">Bs.</span>
                <input
                  autoFocus
                  type="number"
                  placeholder="0.00"
                  className="w-full pl-14 pr-4 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-3xl font-black text-gray-900 outline-none focus:border-emerald-500 focus:bg-white transition-all text-center"
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(e.target.value)}
                />
              </div>

              <div className="mb-8 text-center">
                <p className="text-[10px] text-gray-400 font-medium">
                  Disponible en Bóveda: <span className="text-emerald-600 font-bold">{efectivoBalance.toLocaleString('es-VE')} Bs</span>
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowOpenModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl active:scale-95 transition-colors hover:bg-gray-200">Cancelar</button>
                <button onClick={openShift} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-200 active:scale-95 transition-transform hover:bg-emerald-700">ABRIR</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-24 animate-fade-in relative">
        {/* --- NUEVO LAYOUT SUPERIOR --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ... (Same as before) ... */}
          {/* Tarjeta Banco Mercantil */}
          <div className="bg-indigo-900 text-white p-5 rounded-[2rem] relative overflow-hidden flex flex-col justify-between h-36 shadow-lg">
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/10 rounded-xl"><Building className="w-4 h-4" /></div>
                <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Banco Mercantil</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-indigo-300 uppercase">Disponible</p>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-3xl font-black tracking-tight">{mercantilBalance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</p>
              <p className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Ref: ${(mercantilBalance / exchangeRate).toFixed(2)}
              </p>
            </div>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-40"></div>
          </div>

          {/* Tarjeta Información Turno */}
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Turno Activo</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="w-3 h-3" />
                  <p className="text-[10px] font-bold">Desde: {new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            <button
              onClick={closeShift}
              className="w-full py-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border border-red-100"
            >
              <XCircle className="w-4 h-4" /> Cerrar Turno
            </button>
          </div>
        </div>

        {/* --- MÉTRICAS DE CAJA ACTUAL --- */}
        <div className="grid grid-cols-2 gap-4">
          {/* Efectivo en Caja */}
          <div className="bg-emerald-50 p-5 rounded-[2rem] border border-emerald-100 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white rounded-xl text-emerald-600 shadow-sm"><Banknote className="w-5 h-5" /></div>
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">En Caja</span>
              </div>
              <p className="text-2xl font-black text-gray-900 truncate" title={efectivoEnCajaBs.toLocaleString('es-VE')}>{efectivoEnCajaBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</p>
              <p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase">Base: {activeShift.initialCash.toLocaleString('es-VE')} Bs</p>
            </div>
            <Banknote className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-100 rotate-12 group-hover:rotate-6 transition-transform z-0" />
          </div>

          {/* Punto de Venta */}
          <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white rounded-xl text-blue-600 shadow-sm"><CreditCard className="w-5 h-5" /></div>
                <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Punto</span>
              </div>
              <p className="text-2xl font-black text-gray-900 truncate" title={puntoPorLiquidarBs.toLocaleString('es-VE')}>{puntoPorLiquidarBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</p>
              <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase">Por Liquidar</p>
            </div>
            <CreditCard className="absolute -right-4 -bottom-4 w-24 h-24 text-blue-100 rotate-12 group-hover:rotate-6 transition-transform z-0" />
          </div>
        </div>

        {/* Historial Reciente */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-2 rounded-xl text-gray-500">
                <History className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Movimientos Recientes</h3>
            </div>

            {/* Buscador de Movimientos */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar producto, monto..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {shiftSales.length === 0 ? (
              <div className="py-12 text-center opacity-40">
                <p className="text-xs font-black uppercase text-gray-400">
                  {searchTerm ? 'No se encontraron resultados' : 'Sin movimientos en este turno'}
                </p>
              </div>
            ) : (
              shiftSales.slice().reverse().map(sale => {
                const totalVES = sale.total * sale.exchangeRate;
                const isCash = sale.paymentMethod === 'Cash';
                const isCredit = sale.paymentMethod === 'Credit';

                return (
                  <div
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer active:scale-[0.99] group"
                  >
                    {/* LEFT: Icon & Description */}
                    <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isCash ? 'bg-emerald-100 text-emerald-600' : isCredit ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isCash ? <Banknote className="w-6 h-6" /> : isCredit ? <Wallet className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-800 truncate leading-tight">
                          {getSaleDescription(sale)}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                          {isCredit && (
                            <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-1.5 rounded uppercase tracking-wide">
                              {getCustomerName(sale.customerId)}
                            </span>
                          )}
                          <span className="text-[10px] font-medium text-gray-400">
                            {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Amounts */}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-gray-900 leading-none">{totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-1">${sale.total.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* FLOATING ACTION BUTTON (FAB) PARA FACTURAR */}
        <button
          onClick={onOpenPOS}
          className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-30 bg-gray-900 text-white pl-4 pr-6 py-4 rounded-full shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
        >
          <div className="bg-indigo-600 p-2 rounded-full group-hover:rotate-12 transition-transform">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase leading-none">Ir a</span>
            <span className="text-sm font-black text-white leading-none">FACTURAR</span>
          </div>
        </button>
      </div>

      {/* MODAL DE RECIBO / FACTURA - MOVED OUTSIDE OF ANIMATED CONTAINER */}
      {selectedSale && (
        <div
          onClick={() => setSelectedSale(null)}
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]"
          >

            {/* Header Recibo */}
            <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">Recibo de Venta</h3>
                <p className="text-xs text-gray-500 font-mono mt-1">ID: {selectedSale.id.slice(-6)}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="bg-white p-2 rounded-full text-gray-400 hover:text-gray-900 shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido Recibo Scrollable */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="text-center mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Fecha de Emisión</p>
                <p className="text-sm font-bold text-gray-900">
                  {new Date(selectedSale.timestamp).toLocaleDateString()} • {new Date(selectedSale.timestamp).toLocaleTimeString()}
                </p>
              </div>

              <div className="space-y-4">
                {/* Tabla Items */}
                <div className="border-t border-b border-dashed border-gray-200 py-4 space-y-3">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm">
                      <div className="flex gap-3">
                        <span className="font-bold text-gray-900 w-6 text-center">{item.quantity}</span>
                        <span className="text-gray-600 font-medium max-w-[150px] leading-tight">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">{(item.price * item.quantity * selectedSale.exchangeRate).toFixed(2)} Bs</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totales */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase">Subtotal USD</span>
                    <span className="text-sm font-bold text-gray-900">${selectedSale.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase">Tasa de Cambio</span>
                    <span className="text-sm font-bold text-gray-900">{selectedSale.exchangeRate.toFixed(2)} Bs/$</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                    <span className="text-base font-black text-gray-900 uppercase">Total Pagado</span>
                    <span className="text-xl font-black text-indigo-600">{(selectedSale.total * selectedSale.exchangeRate).toFixed(2)} Bs</span>
                  </div>
                </div>

                {/* Método de Pago */}
                <div className="bg-gray-50 p-3 rounded-xl flex items-center justify-between mt-4">
                  <span className="text-xs font-bold text-gray-500 uppercase">Método</span>
                  <span className="text-xs font-black uppercase text-gray-900 flex items-center gap-2">
                    {selectedSale.paymentMethod === 'Cash' ? <Banknote className="w-4 h-4 text-emerald-500" /> :
                      selectedSale.paymentMethod === 'Credit' ? <Wallet className="w-4 h-4 text-orange-500" /> :
                        <CreditCard className="w-4 h-4 text-blue-500" />}
                    {selectedSale.paymentMethod === 'Cash' ? 'Efectivo' :
                      selectedSale.paymentMethod === 'PagoMovil' ? 'Pago Móvil' :
                        selectedSale.paymentMethod === 'Credit' ? 'Crédito' : 'Tarjeta'}
                  </span>
                </div>

                {selectedSale.paymentMethod === 'Credit' && (
                  <div className="bg-orange-50 p-3 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-600 uppercase">Cliente</span>
                    <span className="text-xs font-black uppercase text-orange-800">
                      {getCustomerName(selectedSale.customerId)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Acciones */}
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                {/* Botón Corregir (Editar) */}
                <button
                  type="button"
                  onClick={handleEdit}
                  className="w-full py-4 border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Edit className="w-4 h-4" /> Corregir
                </button>

                {/* Botón Anular (Eliminar) */}
                <button
                  type="button"
                  onClick={handleVoid}
                  className="w-full py-4 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scale-up { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-scale-up { animation: scale-up 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
      `}</style>
    </>
  );
};

export default VentasCaja;