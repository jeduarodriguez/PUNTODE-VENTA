
import React, { useState } from 'react';
import { Customer, Sale, CartItem, Worker, BusinessDebt, ExchangeRateRecord } from '../types';
import { Plus, Trash2, Edit, Search, UserPlus, Wallet, AlertCircle, ChevronDown, ChevronUp, History, ShoppingBag, CheckCircle2, Banknote, Smartphone, CreditCard, X, ArrowRight, Calendar, Briefcase, DollarSign, Users, Tag, Clock, Check } from '../constants';

interface CustomersProps {
  customers: Customer[];
  workers: Worker[];
  sales: Sale[];
  exchangeRate: number;
  businessDebts: BusinessDebt[];
  rateHistory: ExchangeRateRecord[];
  onAdd: (customer: Customer) => void;
  onUpdate: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onDebtPayment: (customerId: string, amount: number, method: 'Cash' | 'Card' | 'PagoMovil', rate?: number) => void;
  onAddWorker: (worker: Worker) => void;
  onUpdateWorker: (worker: Worker) => void;
  onDeleteWorker: (id: string) => void;
  onWorkerDebtPayment: (workerId: string, amount: number, method: 'Cash' | 'Card' | 'PagoMovil', rate?: number) => void;
  onAddBusinessDebt: (debt: BusinessDebt) => void;
  onPayBusinessDebt: (debtId: string, amount: number, method: 'Cash' | 'Transfer' | 'PagoMovil') => void;
  onUpdateBusinessDebt: (debt: BusinessDebt) => void;
  onDeleteBusinessDebt: (id: string) => void;
}

const Customers: React.FC<CustomersProps> = ({ customers, workers, sales, exchangeRate, businessDebts, rateHistory, onAdd, onUpdate, onDelete, onDebtPayment, onAddWorker, onUpdateWorker, onDeleteWorker, onWorkerDebtPayment, onAddBusinessDebt, onPayBusinessDebt, onUpdateBusinessDebt, onDeleteBusinessDebt }) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'workers' | 'debts'>('customers');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Nuevo estado para el Modal de Historial
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  // Estados para el Modal de Pago
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmountUsd, setPaymentAmountUsd] = useState<string>('');

  // Función para obtener la tasa del día o la más reciente
  const getTodayRate = (): number => {
    if (!rateHistory || rateHistory.length === 0) return exchangeRate;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const sortedRates = [...rateHistory].sort((a, b) => b.timestamp - a.timestamp);
    const todayRate = sortedRates.find(r => {
      const rateDate = new Date(r.timestamp);
      const rateDateStart = new Date(rateDate.getFullYear(), rateDate.getMonth(), rateDate.getDate()).getTime();
      return rateDateStart === todayStart;
    });
    if (todayRate) return todayRate.rate;
    return sortedRates[0]?.rate || exchangeRate;
  };

  const todayRate = getTodayRate();

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    balance: 0
  });

  // Estados para Trabajadores
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');
  const [historyWorker, setHistoryWorker] = useState<Worker | null>(null);
  const [isWorkerPaymentModalOpen, setIsWorkerPaymentModalOpen] = useState(false);
  const [paymentWorker, setPaymentWorker] = useState<Worker | null>(null);
  const [workerPaymentAmountUsd, setWorkerPaymentAmountUsd] = useState<string>('');
  const [payrollPaymentAmountUsd, setPayrollPaymentAmountUsd] = useState<string>('');

  const [workerFormData, setWorkerFormData] = useState<Partial<Worker>>({
    name: '',
    position: '',
    salary: 0,
    payDay: 'Lunes',
    balance: 0
  });

  // Estados para Nómina
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [isPayrollPaymentModalOpen, setIsPayrollPaymentModalOpen] = useState(false);
  const [payrollMethod, setPayrollMethod] = useState<'Cash' | 'Transfer' | 'PagoMovil'>('Cash');

  // Estados para Deudas del Negocio
  const [debtSearchTerm, setDebtSearchTerm] = useState('');
  const [isDebtPaymentModalOpen, setIsDebtPaymentModalOpen] = useState(false);
  const [payingDebt, setPayingDebt] = useState<BusinessDebt | null>(null);
  const [debtPaymentMethod, setDebtPaymentMethod] = useState<'Cash' | 'Transfer' | 'PagoMovil'>('Cash');
  const [debtPaymentAmount, setDebtPaymentAmount] = useState(0);
  const [editingDebt, setEditingDebt] = useState<BusinessDebt | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<BusinessDebt | null>(null);
  const [deleteProductsToo, setDeleteProductsToo] = useState(false);

  const openPayrollModal = () => {
    setSelectedWorkers([]);
    setIsPayrollModalOpen(true);
  };

  const toggleWorkerSelection = (workerId: string) => {
    setSelectedWorkers(prev => 
      prev.includes(workerId) 
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const calculatePayrollTotal = () => {
    return selectedWorkers.reduce((total, id) => {
      const worker = workers.find(w => w.id === id);
      if (worker) {
        return total + Math.max(0, worker.salary - worker.balance);
      }
      return total;
    }, 0);
  };

  const handleProcessPayroll = (method: 'Cash' | 'Transfer' | 'PagoMovil') => {
    selectedWorkers.forEach(workerId => {
      const worker = workers.find(w => w.id === workerId);
      if (worker) {
        const amountToPay = Math.max(0, worker.salary - worker.balance);
        if (amountToPay > 0) {
          onWorkerDebtPayment(workerId, worker.balance, method, todayRate);
        }
      }
    });
    setIsPayrollModalOpen(false);
    setIsPayrollPaymentModalOpen(false);
    setSelectedWorkers([]);
  };

  // Funciones para Deudas del Negocio
  const getRateForDate = (dateStr: string): number => {
    if (!rateHistory || rateHistory.length === 0) return exchangeRate;
    const targetDate = new Date(dateStr + 'T00:00:00').getTime();
    const sortedRates = [...rateHistory].sort((a, b) => b.timestamp - a.timestamp);
    const exactMatch = sortedRates.find(r => {
      const rateDate = new Date(r.timestamp);
      const rateDateStr = `${rateDate.getFullYear()}-${String(rateDate.getMonth() + 1).padStart(2, '0')}-${String(rateDate.getDate()).padStart(2, '0')}`;
      return rateDateStr === dateStr;
    });
    if (exactMatch) return exactMatch.rate;
    const closestRate = sortedRates.find(r => r.timestamp < targetDate);
    if (closestRate) return closestRate.rate;
    return sortedRates[0]?.rate || exchangeRate;
  };

  const getCurrentDebtAmountBs = (debt: BusinessDebt): number => {
    if (!debt) return 0;
    const currentRate = getLatestRate();
    if (debt.currencyType === 'usd') {
      return (debt.amountUsd || 0) * currentRate;
    }
    return debt.amountBs || 0;
  };

  const getDebtReferenceUsd = (debt: BusinessDebt): number => {
    return debt.amountUsd || 0;
  };

  const getLatestRate = (): number => {
    if (!rateHistory || rateHistory.length === 0) return exchangeRate;
    const sortedRates = [...rateHistory].sort((a, b) => b.timestamp - a.timestamp);
    return sortedRates[0]?.rate || exchangeRate;
  };

  const getDebtRate = (debt: BusinessDebt): number => {
    return getLatestRate();
  };

  const openDebtPaymentModal = (debt: BusinessDebt) => {
    setPayingDebt(debt);
    setDebtPaymentAmount(getCurrentDebtAmountBs(debt));
    setIsDebtPaymentModalOpen(true);
  };

  const handlePayDebt = () => {
    if (payingDebt && debtPaymentAmount > 0) {
      onPayBusinessDebt(payingDebt.id, debtPaymentAmount, debtPaymentMethod);
      setIsDebtPaymentModalOpen(false);
      setPayingDebt(null);
      setDebtPaymentAmount(0);
    }
  };

  const confirmDeleteDebt = () => {
    if (debtToDelete) {
      onDeleteBusinessDebt(debtToDelete.id);
      setDebtToDelete(null);
      setDeleteProductsToo(false);
    }
  };

  const filteredDebts = businessDebts
    .filter(d => d && d.title)
    .filter(d => d.title.toLowerCase().includes(debtSearchTerm.toLowerCase()))
    .filter(d => !d.isPaid)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const totalUnpaidDebts = filteredDebts
    .reduce((sum, d) => sum + getCurrentDebtAmountBs(d), 0);

  const totalUnpaidDebtsUsd = filteredDebts
    .reduce((sum, d) => sum + getDebtReferenceUsd(d), 0);

  const totalCustomersDebt = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const totalCustomersDebtBs = totalCustomersDebt * exchangeRate;
  
  const totalWorkersDebt = workers.reduce((sum, w) => sum + Math.max(0, w.salary - (w.balance || 0)), 0);
  const totalWorkersDebtBs = totalWorkersDebt * exchangeRate;

  const filteredWorkers = workers
    .filter(w => w.name.toLowerCase().includes(workerSearchTerm.toLowerCase()) || w.position.toLowerCase().includes(workerSearchTerm.toLowerCase()))
    .sort((a, b) => {
      if (a.balance > 0 && b.balance <= 0) return -1;
      if (a.balance <= 0 && b.balance > 0) return 1;
      return a.name.localeCompare(b.name);
    });

  const handleWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWorker) {
      onUpdateWorker({ ...editingWorker, ...workerFormData } as Worker);
    } else {
      onAddWorker({
        ...workerFormData,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
        balance: 0
      } as Worker);
    }
    closeWorkerModal();
  };

  const openWorkerModal = (worker?: Worker) => {
    if (worker) {
      setEditingWorker(worker);
      setWorkerFormData(worker);
    } else {
      setEditingWorker(null);
      setWorkerFormData({ name: '', position: '', salary: 0, payDay: 'Lunes', balance: 0 });
    }
    setIsWorkerModalOpen(true);
  };

  const closeWorkerModal = () => setIsWorkerModalOpen(false);

  const handleInitiateWorkerPayment = (e: React.MouseEvent, worker: Worker) => {
    e.stopPropagation();
    if (worker.balance <= 0) return;
    setPaymentWorker(worker);
    setWorkerPaymentAmountUsd(worker.balance.toFixed(2));
    setIsWorkerPaymentModalOpen(true);
  };

  const handleProcessWorkerPayment = (method: 'Cash' | 'Card' | 'PagoMovil') => {
    if (paymentWorker) {
      const amountUsd = parseFloat(workerPaymentAmountUsd) || 0;
      if (amountUsd <= 0 || amountUsd > paymentWorker.balance) return;
      onWorkerDebtPayment(paymentWorker.id, amountUsd, method, todayRate);
      setIsWorkerPaymentModalOpen(false);
      setPaymentWorker(null);
      setWorkerPaymentAmountUsd('');
    }
  };

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
    setPaymentAmountUsd(customer.balance.toFixed(2));
    setIsPaymentModalOpen(true);
  };

  const handleProcessPayment = (method: 'Cash' | 'Card' | 'PagoMovil') => {
    if (paymentCustomer) {
        const amountUsd = parseFloat(paymentAmountUsd) || 0;
        if (amountUsd <= 0 || amountUsd > paymentCustomer.balance) return;
        onDebtPayment(paymentCustomer.id, amountUsd, method, todayRate);
        setIsPaymentModalOpen(false);
        setPaymentCustomer(null);
        setPaymentAmountUsd('');
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
                            <span className="text-3xl font-black text-white leading-tight">{debtBs.toLocaleString('es-CO', {minimumFractionDigits: 2}).replace(/\./g, ',')} Bs</span>
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
      {/* Resumen de Créditos */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setActiveTab('customers')} className={`p-4 rounded-2xl text-center transition-all active:scale-95 ${activeTab === 'customers' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white border-2 border-gray-100'}`}>
          <p className="text-xs font-bold opacity-70">Clientes</p>
          <p className="text-lg font-black mt-1">Bs {(totalCustomersDebtBs).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
        </button>
        <button onClick={() => setActiveTab('workers')} className={`p-4 rounded-2xl text-center transition-all active:scale-95 ${activeTab === 'workers' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border-2 border-gray-100'}`}>
          <p className="text-xs font-bold opacity-70">Empleados</p>
          <p className="text-lg font-black mt-1">Bs {(totalWorkersDebtBs).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
        </button>
        <button onClick={() => setActiveTab('debts')} className={`p-4 rounded-2xl text-center transition-all active:scale-95 ${activeTab === 'debts' ? 'bg-red-500 text-white shadow-lg' : 'bg-white border-2 border-gray-100'}`}>
          <p className="text-xs font-bold opacity-70">Pendiente</p>
          <p className="text-lg font-black mt-1">Bs {(totalUnpaidDebts).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
          <p className="text-xs font-bold opacity-70">${totalUnpaidDebtsUsd.toFixed(2)}</p>
        </button>
      </div>

      {/* Tabs para Clientes, Trabajadores y Deudas */}
      <div className="flex bg-gray-100 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'customers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          <Users className="w-4 h-4" />
          Clientes
        </button>
        <button
          onClick={() => setActiveTab('workers')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'workers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          <Briefcase className="w-4 h-4" />
          Trabajadores
        </button>
        <button
          onClick={() => setActiveTab('debts')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'debts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          <Clock className="w-4 h-4" />
          Deudas
        </button>
      </div>

      {/* Header y Buscador */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm sticky top-0 z-10">
        <div>
           <h2 className="text-2xl font-black text-gray-800">
             {activeTab === 'customers' ? 'Clientes' : activeTab === 'workers' ? 'Trabajadores' : 'Deudas del Negocio'}
           </h2>
            <p className="text-xs text-gray-400 font-medium">
              {activeTab === 'customers' ? 'Gestiona clientes' : activeTab === 'workers' ? 'Gestiona trabajadores' : `Total pendiente: Bs ${totalUnpaidDebts.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
            </p>
        </div>
        
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={activeTab === 'customers' ? "Buscar por nombre..." : activeTab === 'workers' ? "Buscar trabajador..." : "Buscar deuda..."}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-black font-bold text-sm focus:border-indigo-500 outline-none transition-colors"
              value={activeTab === 'customers' ? searchTerm : activeTab === 'workers' ? workerSearchTerm : debtSearchTerm}
              onChange={(e) => activeTab === 'customers' ? setSearchTerm(e.target.value) : activeTab === 'workers' ? setWorkerSearchTerm(e.target.value) : setDebtSearchTerm(e.target.value)}
            />
          </div>
          {activeTab !== 'debts' && (
            <button
              onClick={() => activeTab === 'customers' ? openModal() : openPayrollModal()}
              className="bg-gray-900 text-white px-4 py-2 rounded-2xl text-sm font-black shadow-lg hover:bg-black transition-transform active:scale-95 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> <span className="hidden sm:inline">{activeTab === 'customers' ? 'Nuevo' : 'Pagar Nómina'}</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'debts' ? (
      <>
        {/* Lista de Deudas del Negocio */}
        <div className="grid grid-cols-1 gap-3">
          {filteredDebts.map(debt => {
            const currentAmountBs = getCurrentDebtAmountBs(debt) || 0;
            const debtUsd = getDebtReferenceUsd(debt);
            const debtRate = getDebtRate(debt);
            const isBs = (debt.currencyType || 'bs') === 'bs';
            const date = debt.timestamp ? new Date(debt.timestamp) : new Date();
            const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

            return (
              <div 
                key={debt.id} 
                className={`bg-white p-4 rounded-2xl border-2 flex items-center gap-3 ${debt.isPaid ? 'border-gray-100 opacity-60' : 'border-red-100'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${debt.isPaid ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-500'}`}>
                  {debt.isPaid ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                
                <div className="flex-1 min-w-0">
                 <div className=" flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900 truncate">{debt.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isBs ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      {(debt.currencyType || 'bs').toUpperCase()}
                    </span>
                 </div>
                  <p className="text-xs text-gray-400">{dateStr} • Tasa: {debtRate.toFixed(2)} Bs/$</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-black text-lg text-gray-900">
                    Bs {currentAmountBs.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400">
                    {isBs ? `$${debtUsd.toFixed(2)} ref` : `$${debt.amountUsd?.toFixed(2)}`}
                  </p>
                </div>

                {!debt.isPaid && (
                  <button
                    onClick={() => openDebtPaymentModal(debt)}
                    className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg hover:bg-emerald-600 transition-transform active:scale-95 shrink-0"
                  >
                    Pagar
                  </button>
                )}

                <button
                  onClick={() => setDebtToDelete(debt)}
                  className="bg-red-100 text-red-500 p-2 rounded-xl hover:bg-red-200 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {filteredDebts.length === 0 && (
            <div className="py-12 text-center flex flex-col items-center justify-center opacity-30 gap-2">
              <Clock className="w-10 h-10" />
              <p className="text-xs font-black uppercase tracking-widest">No hay deudas registradas</p>
            </div>
          )}
        </div>
      </>
      ) : activeTab === 'customers' ? (
      <>
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
                <div className="flex items-center gap-4">
                    {customer.balance > 0 ? (
                        <>
                            {/* Centro: Deuda en dólares */}
                            <div className="text-center shrink-0 min-w-[60px]">
                                <span className="block text-[10px] font-bold text-gray-400">USD</span>
                                <span className="block text-base font-black text-gray-700">${customer.balance.toFixed(2)}</span>
                            </div>
                            {/* Derecha: Deuda en bolívares - más grande */}
                            <div className="text-right shrink-0 min-w-[90px]">
                                <span className="block text-[10px] font-bold text-gray-400">Bs</span>
                                <span className="block text-xl font-black text-red-600">{debtBs.toLocaleString('es-CO', {maximumFractionDigits: 2}).replace(/\./g, ',')}</span>
                            </div>
                        </>
                    ) : (
                        <div className="text-emerald-500 font-black text-xs bg-emerald-50 px-3 py-2 rounded-xl">
                            SIN DEUDA
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
      </>
      ) : (
      <>
      {/* Grid de Trabajadores */}
      <div className="grid grid-cols-1 gap-3">
        {filteredWorkers.map(worker => {
          const debtBs = worker.balance * exchangeRate;

          return (
            <div 
              key={worker.id} 
              onClick={() => setHistoryWorker(worker)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-orange-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group active:scale-[0.99]"
            >
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm transition-colors ${worker.balance > 0 ? 'bg-orange-50 text-orange-500 group-hover:bg-orange-100' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'}`}>
                      {worker.name.charAt(0)}
                   </div>
                   
                   <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm leading-tight truncate group-hover:text-orange-600 transition-colors">{worker.name}</h3>
                      <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">{worker.position}</p>
                   </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Centro: Deuda pendiente */}
                    <div className="text-center shrink-0 min-w-[70px]">
                        {worker.balance > 0 ? (
                            <>
                                <span className="block text-[10px] font-bold text-gray-400">Deuda</span>
                                <span className="block text-sm font-black text-red-500">${worker.balance.toFixed(2)}</span>
                            </>
                        ) : (
                            <>
                                <span className="block text-[10px] font-bold text-gray-400">Deuda</span>
                                <span className="block text-sm font-bold text-emerald-500">$0.00</span>
                            </>
                        )}
                    </div>

                    {/* Derecha: Sueldo a cobrar */}
                    <div className="text-right shrink-0 min-w-[80px]">
                        <span className="block text-[10px] font-bold text-gray-400">A Cobrar</span>
                        <span className={`block text-lg font-black ${worker.salary - worker.balance > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                            ${Math.max(0, worker.salary - worker.balance).toFixed(2)}
                        </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
                </div>
              </div>

              <div className="hidden group-hover:flex border-t border-gray-50 bg-gray-50/50 p-2 gap-2 justify-end animate-fade-in">
                  <button onClick={(e) => { e.stopPropagation(); openWorkerModal(worker); }} className="p-2 text-indigo-600 hover:bg-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors">
                      <Edit className="w-3 h-3"/> Editar
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteWorker(worker.id); }} className="p-2 text-red-500 hover:bg-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors">
                      <Trash2 className="w-3 h-3"/> Eliminar
                  </button>
              </div>
            </div>
          );
        })}
      </div>

      </>
      )}

      {/* Modal de Historial de Trabajador */}
      {historyWorker && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full h-[90vh] sm:max-w-lg sm:h-[600px] sm:max-h-[90vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-orange-900 to-gray-800 p-6 text-white shrink-0">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-black leading-none">{historyWorker.name}</h2>
                                <p className="text-orange-200 font-medium mt-1">{historyWorker.position}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { openWorkerModal(historyWorker); setHistoryWorker(null); }} className="p-2 bg-white/10 rounded-full text-white/70 hover:bg-white/20">
                                    <Edit className="w-5 h-5"/>
                                </button>
                                <button onClick={() => { if(confirm('¿Eliminar este trabajador?')) { onDeleteWorker(historyWorker.id); setHistoryWorker(null); }}} className="p-2 bg-white/10 rounded-full text-white/70 hover:bg-white/20">
                                    <Trash2 className="w-5 h-5"/>
                                </button>
                                <button onClick={() => setHistoryWorker(null)} className="p-2 bg-white/10 rounded-full text-white/70 hover:bg-white/20">
                                    <X className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>

                        {/* Info del trabajador */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-orange-300 uppercase">Salario</p>
                                <p className="text-lg font-black">${historyWorker.salary.toFixed(2)}</p>
                            </div>
                            <div className="w-px h-8 bg-white/20"></div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-orange-300 uppercase">Día Pago</p>
                                <p className="text-lg font-black">{historyWorker.payDay}</p>
                            </div>
                            <div className="w-px h-8 bg-white/20"></div>
                            <button 
                                onClick={() => { setPaymentWorker(historyWorker); setPayrollPaymentAmountUsd(''); setIsPayrollPaymentModalOpen(true); }}
                                className="bg-orange-600 text-white px-3 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-orange-500 active:scale-95 transition-all"
                            >
                                Pago Nómina
                            </button>
                        </div>

                        {/* Deuda en Bolivares */}
                        <div className="bg-white/10 rounded-2xl p-4 flex items-center justify-between">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-orange-300 uppercase">Deuda</p>
                                <p className="text-xl font-black">${sales.filter(s => s.customerId === historyWorker.id && s.paymentMethod === 'Credit').reduce((sum, s) => sum + s.total, 0).toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-orange-300 uppercase">Bolivares</p>
                                <p className="text-xl font-black">{((sales.filter(s => s.customerId === historyWorker.id && s.paymentMethod === 'Credit').reduce((sum, s) => sum + s.total, 0)) * exchangeRate).toLocaleString('es-CO', {maximumFractionDigits: 2}).replace(/\./g, ',')}</p>
                            </div>
                            {sales.filter(s => s.customerId === historyWorker.id && s.paymentMethod === 'Credit').reduce((sum, s) => sum + s.total, 0) > 0 ? (
                                <button 
                                    onClick={(e) => handleInitiateWorkerPayment(e, historyWorker)}
                                    className="py-3 px-4 bg-orange-600 text-white rounded-xl font-bold text-sm uppercase shadow-lg hover:bg-orange-500 active:scale-95 transition-all"
                                >
                                    Pago Deuda
                                </button>
                            ) : (
                                <div className="py-3 px-4 bg-emerald-500/20 text-emerald-300 rounded-xl font-bold text-xs">
                                    Sin Deuda
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Botones de acción - compactos */}
                    <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-gray-50">
                        {/* Historial de compras */}
                        <div className="pt-3 border-t border-gray-200">
                            <h4 className="text-xs font-black text-gray-500 uppercase mb-2">Historial de Compras</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {console.log('All sales with customerId:', sales.filter(s => s.customerId).map(s => ({id: s.id, customerId: s.customerId, total: s.total})))}
                                {sales.filter(s => s.customerId === historyWorker.id).length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-2">Sin compras a crédito</p>
                                ) : (
                                    sales.filter(s => s.customerId === historyWorker.id).slice(0, 10).map(sale => (
                                        <div key={sale.id} className="flex justify-between items-center bg-white p-2 rounded-lg text-xs">
                                            <span className="text-gray-600 truncate flex-1">
                                                {sale.items.map(i => i.name).join(', ')}
                                            </span>
                                            <span className="font-bold text-orange-600 ml-2">${sale.total.toFixed(2)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Modal Editar/Crear Trabajador */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[70] animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-slide-up overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-extrabold text-black">{editingWorker ? 'Editar' : 'Nuevo'} Trabajador</h3>
              <button onClick={closeWorkerModal} className="text-gray-400 text-3xl">&times;</button>
            </div>
            <form onSubmit={handleWorkerSubmit} className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-800 uppercase tracking-tighter">Nombre Completo</label>
                  <input
                    required
                    placeholder="Ej. Juan Pérez"
                    className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-orange-500 text-black font-bold placeholder:text-gray-300"
                    value={workerFormData.name}
                    onChange={e => setWorkerFormData({ ...workerFormData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-800 uppercase tracking-tighter">Cargo / Posición</label>
                  <input
                    required
                    placeholder="Ej. Vendedor, Cocinero, etc."
                    className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-orange-500 text-black font-bold placeholder:text-gray-300"
                    value={workerFormData.position}
                    onChange={e => setWorkerFormData({ ...workerFormData, position: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-800 uppercase tracking-tighter">Salario Semanal (USD)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="0.00"
                    className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-orange-500 text-black font-bold placeholder:text-gray-300"
                    value={workerFormData.salary}
                    onChange={e => setWorkerFormData({ ...workerFormData, salary: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-800 uppercase tracking-tighter">Día de Pago</label>
                  <select
                    required
                    className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-orange-500 text-black font-bold"
                    value={workerFormData.payDay}
                    onChange={e => setWorkerFormData({ ...workerFormData, payDay: e.target.value })}
                  >
                    <option value="Lunes">Lunes</option>
                    <option value="Martes">Martes</option>
                    <option value="Miercoles">Miercoles</option>
                    <option value="Jueves">Jueves</option>
                    <option value="Viernes">Viernes</option>
                    <option value="Sabado">Sabado</option>
                    <option value="Domingo">Domingo</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black shadow-lg hover:bg-orange-700 active:scale-95 transition-all"
              >
                {editingWorker ? 'Actualizar' : 'Guardar Trabajador'}
              </button>
            </form>
          </div>
        </div>
      )}

      <>
      {/* MODAL DE PAGO DE DEUDA DE TRABAJADOR */}
      {isWorkerPaymentModalOpen && paymentWorker && (() => {
        const workerDebt = sales.filter(s => s.customerId === paymentWorker.id && s.paymentMethod === 'Credit').reduce((sum, s) => sum + s.total, 0);
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[80] backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up">
                  <div className="p-6 bg-gradient-to-br from-orange-900 to-gray-800 text-white text-center relative">
                      <button onClick={() => setIsWorkerPaymentModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-5 h-5"/></button>
                      <h3 className="text-lg font-black mb-1">Pagar Deuda</h3>
                      <p className="text-orange-200 text-xs font-medium uppercase tracking-widest">{paymentWorker.name}</p>
                      
                      <div className="mt-4 mb-2">
                          <span className="text-3xl font-black block tracking-tight">
                              {(paymentWorker.balance * todayRate).toLocaleString('es-CO', { maximumFractionDigits: 0 })} Bs
                          </span>
                          <span className="text-orange-200/60 font-bold text-sm block mt-1">
                              Deuda total: ${paymentWorker.balance.toFixed(2)} (Tasa: {todayRate.toFixed(2)} Bs/$)
                          </span>
                      </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Monto a pagar (USD)</label>
                          <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                              <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  max={paymentWorker.balance}
                                  value={workerPaymentAmountUsd}
                                  onChange={(e) => setWorkerPaymentAmountUsd(e.target.value)}
                                  className="w-full pl-8 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-xl font-black text-gray-900 outline-none focus:border-orange-500"
                                  placeholder="0.00"
                              />
                          </div>
                          <div className="flex gap-2 mt-2">
                              <button
                                  onClick={() => setWorkerPaymentAmountUsd((paymentWorker.balance * 0.25).toFixed(2))}
                                  className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200"
                              >
                                  25%
                              </button>
                              <button
                                  onClick={() => setWorkerPaymentAmountUsd((paymentWorker.balance * 0.5).toFixed(2))}
                                  className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200"
                              >
                                  50%
                              </button>
                              <button
                                  onClick={() => setWorkerPaymentAmountUsd((paymentWorker.balance * 0.75).toFixed(2))}
                                  className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200"
                              >
                                  75%
                              </button>
                              <button
                                  onClick={() => setWorkerPaymentAmountUsd(paymentWorker.balance.toFixed(2))}
                                  className="flex-1 py-2 bg-orange-100 text-orange-600 text-xs font-bold rounded-lg hover:bg-orange-200"
                              >
                                  100%
                              </button>
                          </div>
                      </div>

                      {(parseFloat(workerPaymentAmountUsd) || 0) > 0 && (
                          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center">
                              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Monto a pagar</p>
                              <p className="text-2xl font-black text-emerald-700">
                                  ${parseFloat(workerPaymentAmountUsd).toFixed(2)} = {(parseFloat(workerPaymentAmountUsd) * todayRate).toLocaleString('es-CO', { maximumFractionDigits: 0 })} Bs
                              </p>
                          </div>
                      )}

                      <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Método de Pago</p>
                      
                      <div className="space-y-3">
                          <button 
                            onClick={() => handleProcessWorkerPayment('Cash')}
                            disabled={!workerPaymentAmountUsd || parseFloat(workerPaymentAmountUsd) <= 0}
                            className="w-full py-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <div className="bg-emerald-200 text-emerald-700 p-2 rounded-xl group-hover:scale-110 transition-transform">
                                  <Banknote className="w-5 h-5" />
                              </div>
                              <span className="font-black text-sm">EFECTIVO</span>
                          </button>

                          <button 
                            onClick={() => handleProcessWorkerPayment('PagoMovil')}
                            disabled={!workerPaymentAmountUsd || parseFloat(workerPaymentAmountUsd) <= 0}
                            className="w-full py-4 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <div className="bg-blue-200 text-blue-700 p-2 rounded-xl group-hover:scale-110 transition-transform">
                                  <Smartphone className="w-5 h-5" />
                              </div>
                              <span className="font-black text-sm">PAGO MÓVIL</span>
                          </button>

                          <button 
                            onClick={() => handleProcessWorkerPayment('Card')}
                            disabled={!workerPaymentAmountUsd || parseFloat(workerPaymentAmountUsd) <= 0}
                            className="w-full py-4 bg-purple-50 hover:bg-purple-100 border border-purple-100 text-purple-700 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <div className="bg-purple-200 text-purple-700 p-2 rounded-xl group-hover:scale-110 transition-transform">
                                  <ArrowRight className="w-5 h-5" />
                              </div>
                              <span className="font-black text-sm">TRANSFERENCIA</span>
                          </button>
                      </div>
                  </div>
              </div>
          </div>
        );
      })()}

      {isPayrollPaymentModalOpen && paymentWorker && (() => {
        const workerDebt = sales.filter(s => s.customerId === paymentWorker.id && s.paymentMethod === 'Credit').reduce((sum, s) => sum + s.total, 0);
        const maxPayment = Math.min(paymentWorker.salary, workerDebt);
        const remainingDebt = workerDebt - maxPayment;
        
        return (
          <>
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[80] backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up">
                  <div className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white text-center relative">
                      <button onClick={() => setIsPayrollPaymentModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-5 h-5"/></button>
                      <h3 className="text-lg font-black mb-1">Pagar Nómina</h3>
                      <p className="text-gray-300 text-xs font-medium uppercase tracking-widest">{paymentWorker.name}</p>
                      
                      <div className="mt-4 mb-2">
                          <span className="text-3xl font-black block tracking-tight">
                              {(paymentWorker.salary * todayRate).toLocaleString('es-CO', { maximumFractionDigits: 0 })} Bs
                          </span>
                          <span className="text-gray-400 font-bold text-sm block mt-1">
                              Salario: ${paymentWorker.salary.toFixed(2)} (Tasa: {todayRate.toFixed(2)} Bs/$)
                          </span>
                      </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {workerDebt > paymentWorker.salary && (
                          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                              <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Atención: Deuda mayor al salario</p>
                              <p className="text-sm text-red-500">
                                  La deuda (${workerDebt.toFixed(2)}) excede el salario (${paymentWorker.salary.toFixed(2)}). 
                                  El excedente de <span className="font-black">${(workerDebt - paymentWorker.salary).toFixed(2)}</span> quedará como deuda pendiente.
                              </p>
                          </div>
                      )}

                      <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Deuda actual:</span>
                              <span className="font-bold text-red-500">${workerDebt.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Monto a deducir:</span>
                              <span className="font-bold text-orange-600">${payrollPaymentAmountUsd ? parseFloat(payrollPaymentAmountUsd).toFixed(2) : maxPayment.toFixed(2)}</span>
                          </div>
                          {remainingDebt > 0 && (
                              <div className="flex justify-between text-sm border-t pt-2">
                                  <span className="text-gray-500">Deuda restante:</span>
                                  <span className="font-bold text-red-400">${remainingDebt.toFixed(2)}</span>
                              </div>
                          )}
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Monto a deducir (USD)</label>
                          <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                              <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  max={maxPayment}
                                  value={payrollPaymentAmountUsd}
                                  onChange={(e) => setPayrollPaymentAmountUsd(e.target.value)}
                                  className="w-full pl-8 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-xl font-black text-gray-900 outline-none focus:border-orange-500"
                                  placeholder="0.00"
                              />
                          </div>
                          <div className="flex gap-2 mt-2">
                              <button
                                  onClick={() => setPayrollPaymentAmountUsd((maxPayment * 0.25).toFixed(2))}
                                  className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200"
                              >
                                  25%
                              </button>
                              <button
                                  onClick={() => setPayrollPaymentAmountUsd((maxPayment * 0.5).toFixed(2))}
                                  className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200"
                              >
                                  50%
                              </button>
                              <button
                                  onClick={() => setPayrollPaymentAmountUsd((maxPayment * 0.75).toFixed(2))}
                                  className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200"
                              >
                                  75%
                              </button>
                              <button
                                  onClick={() => setPayrollPaymentAmountUsd(maxPayment.toFixed(2))}
                                  className="flex-1 py-2 bg-orange-100 text-orange-600 text-xs font-bold rounded-lg hover:bg-orange-200"
                              >
                                  100%
                              </button>
                          </div>
                      </div>

                      {(parseFloat(payrollPaymentAmountUsd) || maxPayment) > 0 && (
                          <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl text-center">
                              <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">A deducir de nómina</p>
                              <p className="text-2xl font-black text-orange-700">
                                  ${(parseFloat(payrollPaymentAmountUsd) || maxPayment).toFixed(2)} = {((parseFloat(payrollPaymentAmountUsd) || maxPayment) * todayRate).toLocaleString('es-CO', { maximumFractionDigits: 0 })} Bs
                              </p>
                          </div>
                      )}

                      <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Método de Pago</p>
                      
                      <div className="space-y-3">
                          <button 
                            onClick={() => { 
                                const amountToPay = parseFloat(payrollPaymentAmountUsd) || maxPayment;
                                if (amountToPay > 0) {
                                    onWorkerDebtPayment(paymentWorker.id, amountToPay, 'Cash', todayRate);
                                    setIsPayrollPaymentModalOpen(false);
                                    setPayrollPaymentAmountUsd('');
                                }
                            }}
                            disabled={!payrollPaymentAmountUsd && maxPayment <= 0}
                            className="w-full py-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <Banknote className="w-5 h-5" /><span className="font-black text-sm">EFECTIVO</span>
                          </button>
                          <button 
                            onClick={() => { 
                                const amountToPay = parseFloat(payrollPaymentAmountUsd) || maxPayment;
                                if (amountToPay > 0) {
                                    onWorkerDebtPayment(paymentWorker.id, amountToPay, 'PagoMovil', todayRate);
                                    setIsPayrollPaymentModalOpen(false);
                                    setPayrollPaymentAmountUsd('');
                                }
                            }}
                            disabled={!payrollPaymentAmountUsd && maxPayment <= 0}
                            className="w-full py-4 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <Smartphone className="w-5 h-5" /><span className="font-black text-sm">PAGO MÓVIL</span>
                          </button>
                          <button 
                            onClick={() => { 
                                const amountToPay = parseFloat(payrollPaymentAmountUsd) || maxPayment;
                                if (amountToPay > 0) {
                                    onWorkerDebtPayment(paymentWorker.id, amountToPay, 'Card', todayRate);
                                    setIsPayrollPaymentModalOpen(false);
                                    setPayrollPaymentAmountUsd('');
                                }
                            }}
                            disabled={!payrollPaymentAmountUsd && maxPayment <= 0}
                            className="w-full py-4 bg-purple-50 hover:bg-purple-100 border border-purple-100 text-purple-700 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <ArrowRight className="w-5 h-5" /><span className="font-black text-sm">TRANSFERENCIA</span>
                          </button>
                          
                          <div className="border-t border-gray-200 pt-3 mt-2">
                              <button 
                                onClick={() => { 
                                    setIsPayrollPaymentModalOpen(false);
                                    setPayrollPaymentAmountUsd('');
                                }}
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 group"
                              >
                                  <Calendar className="w-4 h-4" /><span className="font-bold text-xs">Pasar para próxima semana</span>
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          </>
        );
      })()}

      {/* MODAL DE HISTORIAL */}
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
                      
                      <div className="mt-4 mb-2">
                          <span className="text-3xl font-black block tracking-tight">
                              {(paymentCustomer.balance * todayRate).toLocaleString('es-CO', { maximumFractionDigits: 0 })} Bs
                          </span>
                          <span className="text-white/60 font-bold text-sm block mt-1">
                              Deuda total: ${paymentCustomer.balance.toFixed(2)} (Tasa: {todayRate.toFixed(2)} Bs/$)
                          </span>
                      </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Monto a pagar (USD)</label>
                          <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                              <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  max={paymentCustomer.balance}
                                  value={paymentAmountUsd}
                                  onChange={(e) => setPaymentAmountUsd(e.target.value)}
                                  className="w-full pl-8 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-xl font-black text-gray-900 outline-none focus:border-indigo-500"
                                  placeholder="0.00"
                              />
                          </div>
                          <div className="flex gap-2 mt-2">
                              <button
                                  onClick={() => setPaymentAmountUsd((paymentCustomer.balance * 0.25).toFixed(2))}
                                  className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200"
                              >
                                  25%
                              </button>
                              <button
                                  onClick={() => setPaymentAmountUsd((paymentCustomer.balance * 0.5).toFixed(2))}
                                  className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200"
                              >
                                  50%
                              </button>
                              <button
                                  onClick={() => setPaymentAmountUsd((paymentCustomer.balance * 0.75).toFixed(2))}
                                  className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200"
                              >
                                  75%
                              </button>
                              <button
                                  onClick={() => setPaymentAmountUsd(paymentCustomer.balance.toFixed(2))}
                                  className="flex-1 py-2 bg-indigo-100 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-200"
                              >
                                  100%
                              </button>
                          </div>
                      </div>

                      {(parseFloat(paymentAmountUsd) || 0) > 0 && (
                          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center">
                              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Monto a pagar</p>
                              <p className="text-2xl font-black text-emerald-700">
                                  ${parseFloat(paymentAmountUsd).toFixed(2)} = {(parseFloat(paymentAmountUsd) * todayRate).toLocaleString('es-CO', { maximumFractionDigits: 0 })} Bs
                              </p>
                          </div>
                      )}

                      <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Método de Pago</p>
                      
                      <div className="space-y-3">
                          <button 
                            onClick={() => handleProcessPayment('Cash')}
                            disabled={!paymentAmountUsd || parseFloat(paymentAmountUsd) <= 0}
                            className="w-full py-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <div className="bg-emerald-200 text-emerald-700 p-2 rounded-xl group-hover:scale-110 transition-transform">
                                  <Banknote className="w-5 h-5" />
                              </div>
                              <span className="font-black text-sm">EFECTIVO</span>
                          </button>

                          <button 
                            onClick={() => handleProcessPayment('PagoMovil')}
                            disabled={!paymentAmountUsd || parseFloat(paymentAmountUsd) <= 0}
                            className="w-full py-4 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <div className="bg-blue-200 text-blue-700 p-2 rounded-xl group-hover:scale-110 transition-transform">
                                  <Smartphone className="w-5 h-5" />
                              </div>
                              <span className="font-black text-sm">PAGO MÓVIL</span>
                          </button>

                          <button 
                            onClick={() => handleProcessPayment('Card')}
                            disabled={!paymentAmountUsd || parseFloat(paymentAmountUsd) <= 0}
                            className="w-full py-4 bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-700 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* MODAL DE PAGO DE DEUDAS */}
      {isDebtPaymentModalOpen && payingDebt && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsDebtPaymentModalOpen(false)}>
              <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="text-xl font-black text-gray-900">Pagar Deuda</h3>
                      <button onClick={() => setIsDebtPaymentModalOpen(false)} className="text-gray-400 hover:text-black">
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  <div className="p-6 space-y-4">
                      <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
                          <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Deuda</p>
                          <p className="text-2xl font-black text-gray-900">{payingDebt.title}</p>
                          <p className="text-lg font-bold text-gray-600 mt-1">
                              Bs {getCurrentDebtAmountBs(payingDebt).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                          </p>
                          {(payingDebt.currencyType || 'bs') === 'usd' && (
                              <p className="text-xs font-bold text-gray-400">${payingDebt.amountUsd.toFixed(2)} USD</p>
                          )}
                      </div>

                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Monto a Pagar (Bs)</label>
                          <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Bs</span>
                              <input
                                  type="number"
                                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-2xl bg-gray-50 text-xl font-bold text-gray-900 focus:border-emerald-500 outline-none"
                                  value={debtPaymentAmount}
                                  onChange={(e) => setDebtPaymentAmount(parseFloat(e.target.value) || 0)}
                              />
                          </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-2xl">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Método de Pago</p>
                          <div className="grid grid-cols-3 gap-2">
                              <button
                                  onClick={() => setDebtPaymentMethod('Cash')}
                                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${debtPaymentMethod === 'Cash' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-100 text-gray-500'}`}
                              >
                                  <Banknote className="w-5 h-5" />
                                  <span className="text-[10px] font-bold">Efectivo</span>
                              </button>
                              <button
                                  onClick={() => setDebtPaymentMethod('Transfer')}
                                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${debtPaymentMethod === 'Transfer' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-100 text-gray-500'}`}
                              >
                                  <Wallet className="w-5 h-5" />
                                  <span className="text-[10px] font-bold">Transfer</span>
                              </button>
                              <button
                                  onClick={() => setDebtPaymentMethod('PagoMovil')}
                                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${debtPaymentMethod === 'PagoMovil' ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-gray-100 text-gray-500'}`}
                              >
                                  <Smartphone className="w-5 h-5" />
                                  <span className="text-[10px] font-bold">Pago Móvil</span>
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 pt-0 flex gap-3">
                      <button
                          onClick={() => setIsDebtPaymentModalOpen(false)}
                          className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all"
                      >
                          Cancelar
                      </button>
                      <button
                          onClick={handlePayDebt}
                          disabled={debtPaymentAmount <= 0}
                          className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:shadow-none"
                      >
                          Confirmar Pago
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DE ELIMINAR DEUDA */}
      {debtToDelete && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDebtToDelete(null)}>
              <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50">
                      <div>
                          <h3 className="text-xl font-black text-red-900">Eliminar Deuda</h3>
                          <p className="text-xs font-bold text-red-600">Esta acción no se puede deshacer</p>
                      </div>
                      <button onClick={() => setDebtToDelete(null)} className="text-gray-400 hover:text-black">
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  <div className="p-6 space-y-4">
                      <div className="bg-gray-50 p-4 rounded-2xl">
                          <p className="text-sm font-bold text-gray-600">Deuda: <span className="text-gray-900">{debtToDelete.title}</span></p>
                          <p className="text-lg font-black text-gray-900 mt-2">Bs {getCurrentDebtAmountBs(debtToDelete).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                          <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  checked={deleteProductsToo}
                                  onChange={(e) => setDeleteProductsToo(e.target.checked)}
                                  className="w-5 h-5 rounded text-amber-600"
                              />
                              <span className="text-sm font-bold text-amber-800">
                                  También eliminar los productos del inventario
                              </span>
                          </label>
                          <p className="text-xs text-amber-600 mt-2">
                              Si compraste productos con esta deuda, se eliminarán del inventario.
                          </p>
                      </div>
                  </div>

                  <div className="p-6 pt-0 flex gap-3">
                      <button
                          onClick={() => setDebtToDelete(null)}
                          className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all"
                      >
                          Cancelar
                      </button>
                      <button
                          onClick={confirmDeleteDebt}
                          className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all"
                      >
                          Eliminar
                      </button>
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
    </>
    </div>
  );
};

export default Customers;
