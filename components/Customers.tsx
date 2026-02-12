
import React, { useState } from 'react';
import { Customer, Sale, CartItem } from '../types';
import { Plus, Trash2, Edit, Search, UserPlus, Wallet, AlertCircle, ChevronDown, ChevronUp, History, ShoppingBag, CheckCircle2, Banknote, Smartphone, CreditCard, X, ArrowRight, Calendar } from '../constants';

interface CustomersProps {
  customers: Customer[];
  sales: Sale[];
  exchangeRate: number;
  onAdd: (customer: Customer) => void;
  onUpdate: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onDebtPayment: (customerId: string, amount: number, method: 'Cash' | 'Card' | 'PagoMovil') => void;
}

const Customers: React.FC<CustomersProps> = ({ customers, sales, exchangeRate, onAdd, onUpdate, onDelete, onDebtPayment }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Nuevo estado para el Modal de Historial
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  // Estados para el Modal de Pago
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    balance: 0
  });

  // Ordenar clientes: Primero los que deben dinero, luego alfabéticamente
  const filteredCustomers = customers
    .filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    )
    .sort((a, b) => {
      if (a.balance > 0 && b.balance <= 0) return -1;
      if (a.balance <= 0 && b.balance > 0) return 1;
      return a.name.localeCompare(b.name);
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      onUpdate({ ...editingCustomer, ...formData } as Customer);
    } else {
      onAdd({
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
        balance: 0
      } as Customer);
    }
    closeModal();
  };

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', balance: 0 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleInitiatePayment = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    if (customer.balance <= 0) return;
    setPaymentCustomer(customer);
    setIsPaymentModalOpen(true);
  };

  const handleProcessPayment = (method: 'Cash' | 'Card' | 'PagoMovil') => {
    if (paymentCustomer) {
        onDebtPayment(paymentCustomer.id, paymentCustomer.balance, method);
        setIsPaymentModalOpen(false);
        setPaymentCustomer(null);
        // Opcional: Cerrar también el historial si se pagó todo, o dejarlo abierto para ver el registro
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
        case 'Cash': return <Banknote className="w-3 h-3"/>;
        case 'PagoMovil': return <Smartphone className="w-3 h-3"/>;
        case 'Card': return <CreditCard className="w-3 h-3"/>;
        case 'Credit': return <Wallet className="w-3 h-3"/>;
        default: return <ShoppingBag className="w-3 h-3"/>;
    }
  };

  const getMethodName = (method: string) => {
      switch (method) {
          case 'Cash': return 'Efectivo';
          case 'PagoMovil': return 'Pago Móvil';
          case 'Card': return 'Tarjeta';
          case 'Credit': return 'Crédito';
          default: return method;
      }
  };

  // Helper para renderizar el contenido del historial (se usa dentro del modal)
  const renderHistoryContent = () => {
    if (!historyCustomer) return null;

    // Buscamos la versión más reciente del cliente en las props por si el saldo cambió
    const activeCustomer = customers.find(c => c.id === historyCustomer.id) || historyCustomer;
    const debtBs = activeCustomer.balance * exchangeRate;
    
    const customerSales = sales
        .filter(s => s.customerId === activeCustomer.id)
        .sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header del Modal */}
            <div className="bg-white p-6 border-b border-gray-100 shadow-sm z-10 sticky top-0">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 leading-none">{activeCustomer.name}</h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">{activeCustomer.phone || 'Sin teléfono'}</p>
                    </div>
                    <button onClick={() => setHistoryCustomer(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                {/* Tarjeta de Saldo */}
                <div className="flex items-center justify-between bg-gray-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Deuda Total</p>
                        <div className="flex flex-col">
                            {/* CAMBIO: Bolívares Grande, Dólares Pequeño */}
                            <span className="text-3xl font-black text-white leading-tight">{debtBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs</span>
                            <span className="text-emerald-400 font-bold text-sm">Ref: ${activeCustomer.balance.toFixed(2)}</span>
                        </div>
                    </div>
                    {activeCustomer.balance > 0 ? (
                         <button 
                            onClick={(e) => handleInitiatePayment(e, activeCustomer)}
                            className="relative z-10 bg-emerald-600 text-white px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Wallet className="w-4 h-4"/> Pagar
                         </button>
                    ) : (
                        <div className="relative z-10 flex items-center gap-2 text-emerald-400 bg-white/10 px-3 py-2 rounded-xl">
                            <CheckCircle2 className="w-5 h-5"/>
                            <span className="font-bold text-xs uppercase">Solvente</span>
                        </div>
                    )}
                    
                    {/* Decoración de fondo */}
                    <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-12 pointer-events-none"/>
                </div>
            </div>

            {/* Lista de Movimientos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2 px-2">
                    <History className="w-4 h-4 text-indigo-600"/>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Historial de Movimientos</h3>
                </div>

                {customerSales.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center opacity-50">
                        <History className="w-12 h-12 text-gray-300 mb-2"/>
                        <p className="text-sm font-medium text-gray-400">Sin movimientos registrados</p>
                    </div>
                ) : (
                    customerSales.map(sale => {
                        const saleExchangeRate = sale.exchangeRate || 1;
                        const totalBs = sale.total * saleExchangeRate;
                        const isDebtPayment = sale.paymentMethod !== 'Credit';

                        return (
                            <div key={sale.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5 text-gray-400 mb-0.5">
                                            <Calendar className="w-3 h-3"/>
                                            <span className="text-[10px] font-black uppercase">Fecha</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-800">
                                            {new Date(sale.timestamp).toLocaleDateString()} <span className="text-gray-300 mx-1">|</span> {new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 justify-end">
                                            <span className={`text-base font-black ${!isDebtPayment ? 'text-orange-500' : 'text-emerald-600'}`}>
                                                ${sale.total.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 justify-end mt-0.5">
                                            <span className="text-[10px] font-bold text-gray-400">{totalBs.toFixed(2)} Bs</span>
                                            <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 font-mono">@{saleExchangeRate}</span>
                                        </div>
                                        
                                        {/* Badge de Método de Pago (Solo si es pago) */}
                                        {isDebtPayment && (
                                            <div className="flex items-center gap-1 justify-end mt-1.5">
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                    {getMethodIcon(sale.paymentMethod)}
                                                    {getMethodName(sale.paymentMethod)}
                                                </span>
                                            </div>
                                        )}
                                        {/* CAMBIO: Se eliminó el badge de "Crédito" para una vista más limpia */}
                                    </div>
                                </div>
                                
                                {/* Detalles de productos */}
                                <div className="space-y-2 bg-gray-50/50 p-3 rounded-xl">
                                    {sale.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded text-[10px] min-w-[24px] text-center">{item.quantity}x</span>
                                                <span className="text-gray-700 font-semibold">{item.name}</span>
                                            </div>
                                            <span className="text-gray-400 font-mono font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header y Buscador */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm sticky top-0 z-10">
        <div>
           <h2 className="text-2xl font-black text-gray-800">Clientes</h2>
           <p className="text-xs text-gray-400 font-medium">Gestiona deudas e historial</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-black font-bold text-sm focus:border-indigo-500 outline-none transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => openModal()}
            className="bg-gray-900 text-white px-4 py-2 rounded-2xl text-sm font-black shadow-lg hover:bg-black transition-transform active:scale-95 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Grid de Clientes Compacto */}
      <div className="grid grid-cols-1 gap-3">
        {filteredCustomers.map(customer => {
          const debtBs = customer.balance * exchangeRate;

          return (
            <div 
              key={customer.id} 
              onClick={() => setHistoryCustomer(customer)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group active:scale-[0.99]"
            >
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                   {/* Avatar Compacto */}
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm shrink-0 transition-colors ${customer.balance > 0 ? 'bg-red-50 text-red-500 group-hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'}`}>
                      {customer.name.charAt(0)}
                   </div>
                   
                   <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm leading-tight truncate group-hover:text-indigo-600 transition-colors">{customer.name}</h3>
                      <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">{customer.phone || 'Sin teléfono'}</p>
                   </div>
                </div>

                {/* Info Derecha */}
                <div className="flex items-center gap-3">
                    {customer.balance > 0 ? (
                        <div className="text-right shrink-0">
                            {/* CAMBIO: Bolívares Grande, Dólares Pequeño */}
                            <span className="block text-sm font-black text-red-600 leading-none">{debtBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs</span>
                            <span className="block text-[10px] font-bold text-gray-400 leading-none mt-1">Ref: ${customer.balance.toFixed(2)}</span>
                        </div>
                    ) : (
                        <div className="text-emerald-500 font-black text-[10px] bg-emerald-50 px-2 py-1 rounded-lg">
                            SOLVENTE
                        </div>
                    )}
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                </div>
              </div>

              {/* Acciones Rápidas (Solo visibles en hover desktop, o siempre accesibles dentro del modal) */}
              <div className="hidden group-hover:flex border-t border-gray-50 bg-gray-50/50 p-2 gap-2 justify-end animate-fade-in">
                  <button onClick={(e) => { e.stopPropagation(); openModal(customer); }} className="p-2 text-indigo-600 hover:bg-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors">
                      <Edit className="w-3 h-3"/> Editar
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(customer.id); }} className="p-2 text-red-500 hover:bg-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors">
                      <Trash2 className="w-3 h-3"/> Eliminar
                  </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE HISTORIAL (NUEVO) */}
      {historyCustomer && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full sm:max-w-lg h-[85vh] sm:h-[800px] sm:max-h-[90vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up">
                {renderHistoryContent()}
            </div>
        </div>
      )}

      {/* Modal Editar/Crear Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[70] animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-slide-up overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-extrabold text-black">{editingCustomer ? 'Editar' : 'Nuevo'} Cliente</h3>
              <button onClick={closeModal} className="text-gray-400 text-3xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-800 uppercase tracking-tighter">Nombre Completo</label>
                  <input
                    required
                    placeholder="Ej. Juan Pérez"
                    className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500 text-black font-bold placeholder:text-gray-300"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-800 uppercase tracking-tighter">Teléfono de Contacto (Opcional)</label>
                  <input
                    type="tel"
                    placeholder="0412..."
                    className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none text-black font-bold placeholder:text-gray-300"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
              >
                {editingCustomer ? 'Actualizar' : 'Guardar Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PAGO DE DEUDA */}
      {isPaymentModalOpen && paymentCustomer && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[80] backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up">
                  <div className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white text-center relative">
                      <button onClick={() => setIsPaymentModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-5 h-5"/></button>
                      <h3 className="text-lg font-black mb-1">Cobrar Deuda</h3>
                      <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">{paymentCustomer.name}</p>
                      
                      <div className="mt-6 mb-2">
                          <span className="text-4xl font-black block tracking-tight">
                              {(paymentCustomer.balance * exchangeRate).toFixed(2)} Bs
                          </span>
                          <span className="text-white/60 font-bold text-sm block mt-1">
                              Ref: ${paymentCustomer.balance.toFixed(2)}
                          </span>
                      </div>
                  </div>
                  
                  <div className="p-6">
                      <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Seleccione Método de Pago</p>
                      
                      <div className="space-y-3">
                          <button 
                            onClick={() => handleProcessPayment('Cash')}
                            className="w-full py-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group"
                          >
                              <div className="bg-emerald-200 text-emerald-700 p-2 rounded-xl group-hover:scale-110 transition-transform">
                                  <Banknote className="w-5 h-5" />
                              </div>
                              <span className="font-black text-sm">EFECTIVO</span>
                          </button>

                          <button 
                            onClick={() => handleProcessPayment('PagoMovil')}
                            className="w-full py-4 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group"
                          >
                              <div className="bg-blue-200 text-blue-700 p-2 rounded-xl group-hover:scale-110 transition-transform">
                                  <Smartphone className="w-5 h-5" />
                              </div>
                              <span className="font-black text-sm">PAGO MÓVIL</span>
                          </button>

                          <button 
                            onClick={() => handleProcessPayment('Card')}
                            className="w-full py-4 bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-700 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group"
                          >
                              <div className="bg-gray-200 text-gray-700 p-2 rounded-xl group-hover:scale-110 transition-transform">
                                  <CreditCard className="w-5 h-5" />
                              </div>
                              <span className="font-black text-sm">TARJETA</span>
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.2s ease-out forwards; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        @keyframes scale-up { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scale-up { animation: scale-up 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default Customers;
