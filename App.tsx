import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import POS from './components/POS';
import Inventory from './components/Inventory';
import VentasCaja from './components/Reports';
import Customers from './components/Customers';
import Settings from './components/Settings';
import { Product, Sale, View, Customer, ExchangeRateRecord, CartItem } from './types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_SALES, CheckCircle2, ShoppingCart, Package, Users, BarChart3, Settings as SettingsIcon, Cloud, CloudOff, AlertCircle, Globe, Smartphone, QrCode, AlertTriangle, Download, X, Calendar, TrendingUp, Banknote, Share, Plus } from './constants';
import { syncPath, saveData, deleteData, updateBatch, isCloudEnabled } from './services/supabaseService';

const App: React.FC = () => {
  const [view, setView] = useState<View>('reports');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [rateHistory, setRateHistory] = useState<ExchangeRateRecord[]>([]);
  const [isSynced, setIsSynced] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showPortBanner, setShowPortBanner] = useState(true);

  // State for restoring cart when editing a sale
  const [pendingCart, setPendingCart] = useState<CartItem[]>([]);

  // Estado para el modal rápido de tasa en el header
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [tempRate, setTempRate] = useState('');

  // iOS Install Instructions State
  const [showIosInstallModal, setShowIosInstallModal] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Detección de entorno restringido
  const isRestrictedEnv = typeof window !== 'undefined' &&
    (window.location.hostname.includes('usercontent.goog') || window.location.hostname.includes('github.dev'));

  const handleCartLoaded = useCallback(() => {
    setPendingCart([]);
  }, []);

  useEffect(() => {
    // Detect iOS and Standalone mode
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isApp = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

    setIsIos(isIosDevice);
    setIsStandalone(isApp);

    // Escuchar evento para instalar PWA (Android/Chrome)
    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // Cargar Productos (Con Seed)
    const unsubProducts = syncPath('products', (data) => {
      if (data) {
        setProducts(Object.values(data).filter(Boolean) as Product[]); // Filter nulls
      } else {
        const initialMap = INITIAL_PRODUCTS.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        saveData('products', initialMap);
        setProducts(INITIAL_PRODUCTS);
      }
      setIsSynced(true);
    });

    // Cargar Clientes (Con Seed)
    const unsubCustomers = syncPath('customers', (data) => {
      if (data) {
        setCustomers(Object.values(data).filter(Boolean) as Customer[]); // Filter nulls
      } else {
        const initialMap = INITIAL_CUSTOMERS.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
        saveData('customers', initialMap);
        setCustomers(INITIAL_CUSTOMERS);
      }
    });

    // Cargar Ventas (Con Seed)
    const unsubSales = syncPath('sales', (data) => {
      if (data) {
        setSales(Object.values(data).filter(Boolean) as Sale[]); // Filter nulls
      } else {
        // ACTUALIZAR FECHAS DE VENTAS INICIALES A "HOY" PARA DEMO
        const now = Date.now();
        const updatedSales = INITIAL_SALES.map((s, index) => ({
          ...s,
          timestamp: now - (index * 3600000) // Hace 0 horas, 1 hora, etc.
        }));
        const initialMap = updatedSales.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
        saveData('sales', initialMap);
        setSales(updatedSales);
      }
    });

    const unsubRate = syncPath('settings/exchangeRate', (data) => {
      if (data) setExchangeRate(data);
      else setExchangeRate(40);
    });

    // SEED BALANCES IF EMPTY (DEMO)
    const unsubMercantil = syncPath('settings/mercantilBalance', (data) => {
      if (data === null || data === undefined) {
        saveData('settings/mercantilBalance', 15400.00); // Semilla de Banco
      }
    });

    const unsubEfectivo = syncPath('settings/efectivoBalance', (data) => {
      if (data === null || data === undefined) {
        saveData('settings/efectivoBalance', 8200.00); // Semilla de Efectivo en Bóveda
      }
    });

    const unsubHistory = syncPath('settings/rateHistory', (data) => {
      if (data) setRateHistory(Object.values(data).filter(Boolean) as ExchangeRateRecord[]);
      else setRateHistory([]);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      unsubProducts();
      unsubCustomers();
      unsubSales();
      unsubRate();
      unsubHistory();
      unsubMercantil();
      unsubEfectivo();
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSale = async (sale: Sale) => {
    const updates: any = {};
    const saleWithRate = { ...sale, exchangeRate };

    // 1. Actualizar Stock
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity);
        const updatedProduct = { ...product, stock: newStock };
        updates[`products/${product.id}`] = updatedProduct;
      }
    });

    // 2. Si es Crédito, Actualizar Balance del Cliente
    if (sale.paymentMethod === 'Credit' && sale.customerId) {
      const customer = customers.find(c => c.id === sale.customerId);
      if (customer) {
        const currentBalance = customer.balance || 0;
        const updatedCustomer = { ...customer, balance: currentBalance + sale.total };
        updates[`customers/${sale.customerId}`] = updatedCustomer;
      }
    }

    // 3. Guardar la Venta
    updates[`sales/${sale.id}`] = saleWithRate;

    try {
      await updateBatch(updates);
      showNotification(`Venta guardada: $${sale.total.toFixed(2)}`);
      setView('reports'); // Return to dashboard after sale
    } catch (error) {
      showNotification('Error al guardar la venta', 'error');
    }
  };

  const handleVoidSale = async (saleId: string) => {
    const saleToVoid = sales.find(s => s.id === saleId);
    if (!saleToVoid) {
      showNotification('Venta no encontrada', 'error');
      return;
    }

    const updates: any = {};

    // 1. Restaurar Stock
    saleToVoid.items.forEach(item => {
      if (item.id === 'debt_payment') return; // Skip debt payments
      const product = products.find(p => p.id === item.id);
      if (product) {
        const restoredStock = product.stock + item.quantity;
        const updatedProduct = { ...product, stock: restoredStock };
        updates[`products/${product.id}`] = updatedProduct;
      }
    });

    // 2. Si fue Crédito, Restaurar Balance del Cliente (Restar la deuda)
    if (saleToVoid.paymentMethod === 'Credit' && saleToVoid.customerId) {
      const customer = customers.find(c => c.id === saleToVoid.customerId);
      if (customer) {
        const newBalance = Math.max(0, customer.balance - saleToVoid.total);
        const updatedCustomer = { ...customer, balance: newBalance };
        updates[`customers/${saleToVoid.customerId}`] = updatedCustomer;
      }
    }

    // 3. Si fue un PAGO de deuda, Restaurar la deuda (Sumar la deuda)
    if (saleToVoid.items.length === 1 && saleToVoid.items[0].id === 'debt_payment' && saleToVoid.customerId) {
      const customer = customers.find(c => c.id === saleToVoid.customerId);
      if (customer) {
        const newBalance = customer.balance + saleToVoid.total;
        const updatedCustomer = { ...customer, balance: newBalance };
        updates[`customers/${saleToVoid.customerId}`] = updatedCustomer;
      }
    }

    // 4. Eliminar la venta (null removes it)
    updates[`sales/${saleId}`] = null;

    try {
      await updateBatch(updates);
      // Actualizar estado local inmediatamente para evitar lag
      setSales(prev => prev.filter(s => s.id !== saleId));
      showNotification('Venta anulada correctamente');
    } catch (error) {
      showNotification('Error al anular venta', 'error');
      console.error(error);
    }
  };

  const handleEditSale = async (sale: Sale) => {
    // 1. Cargar los items en el carrito pendiente (Deep Clone)
    const itemsToRestore = sale.items
      .filter(i => i.id !== 'debt_payment')
      .map(i => ({ ...i }));

    if (itemsToRestore.length > 0) {
      // Establecer carrito ANTES de anular para asegurar la transición de datos
      setPendingCart(itemsToRestore);

      // 2. Anular la venta original (Devolver stock y dinero)
      await handleVoidSale(sale.id);

      // 3. Ir al POS
      setView('pos');
      showNotification('Venta cargada para corrección', 'success');
    } else {
      showNotification('No se pueden editar pagos de deuda', 'error');
    }
  };

  const handleDebtPayment = async (customerId: string, amount: number, method: 'Cash' | 'Card' | 'PagoMovil') => {
    const paymentSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      items: [{
        id: 'debt_payment',
        name: 'Abono de Deuda / Pago Total',
        category: 'Pagos',
        price: amount,
        costPrice: 0,
        stock: 1,
        quantity: 1
      }],
      total: amount,
      exchangeRate: exchangeRate,
      paymentMethod: method,
      customerId: customerId
    };

    const updates: any = {};
    updates[`sales/${paymentSale.id}`] = paymentSale;

    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      const newBalance = Math.max(0, customer.balance - amount);
      const updatedCustomer = { ...customer, balance: newBalance };
      updates[`customers/${customerId}`] = updatedCustomer;
    }

    try {
      await updateBatch(updates);
      showNotification(`Pago registrado (${method}): $${amount.toFixed(2)}`);
    } catch (error) {
      showNotification('Error al registrar el pago', 'error');
    }
  };

  const handleExchangeRateChange = (rate: number) => {
    saveData('settings/exchangeRate', rate);
    const newRecord: ExchangeRateRecord = {
      id: Date.now().toString(),
      rate: rate,
      timestamp: Date.now()
    };
    saveData(`settings/rateHistory/${newRecord.id}`, newRecord);
    showNotification(`Tasa actualizada: ${rate} Bs.`);
  };

  const handleQuickRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(tempRate);
    if (rate > 0) {
      handleExchangeRateChange(rate);
      setIsRateModalOpen(false);
    }
  };

  const handleHistoryUpdate = (record: ExchangeRateRecord) => {
    saveData(`settings/rateHistory/${record.id}`, record);
    showNotification("Registro histórico actualizado");
  };

  const handleHistoryDelete = (id: string) => {
    deleteData(`settings/rateHistory/${id}`);
    showNotification("Registro eliminado");
  };

  const addProduct = (product: Product) => saveData(`products/${product.id}`, product);
  const updateProduct = (product: Product) => saveData(`products/${product.id}`, product);
  const deleteProduct = (id: string) => deleteData(`products/${id}`);
  const addCustomer = (customer: Customer) => saveData(`customers/${customer.id}`, customer);
  const updateCustomer = (customer: Customer) => saveData(`customers/${customer.id}`, customer);
  const deleteCustomer = (id: string) => deleteData(`customers/${id}`);

  const handleImport = (data: any) => {
    const updates: any = {};
    if (data.products) Object.values(data.products).forEach((p: any) => updates[`products/${p.id}`] = p);
    if (data.customers) Object.values(data.customers).forEach((c: any) => updates[`customers/${c.id}`] = c);
    if (data.sales) Object.values(data.sales).forEach((s: any) => updates[`sales/${s.id}`] = s);
    updateBatch(updates);
    showNotification("Datos importados con éxito");
  };

  const today = new Date().toLocaleDateString('es-ES');
  const sortedHistory = [...rateHistory].sort((a, b) => b.timestamp - a.timestamp);
  const lastRecord = sortedHistory[0];
  const lastRecordDate = lastRecord ? new Date(lastRecord.timestamp).toLocaleDateString('es-ES') : '';
  const isRateOutdated = lastRecordDate !== today;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row pb-20 md:pb-0">
      <Sidebar activeView={view} onViewChange={setView} />

      <main className="flex-1 md:ml-64 relative flex flex-col h-screen overflow-hidden">
        {isRestrictedEnv && showPortBanner && (
          <div className="bg-orange-600 text-white px-4 py-2 text-[10px] md:text-xs font-bold flex items-center justify-between animate-pulse shadow-md relative z-50">
            <div className="flex items-center gap-2 mx-auto">
              <AlertTriangle className="w-4 h-4" />
              <span>PARA ACCESO MÓVIL: Ve a "Ports" y cambia el puerto 3000 a "Public".</span>
            </div>
            <button onClick={() => setShowPortBanner(false)} className="bg-black/20 p-1 rounded hover:bg-black/40"><X className="w-3 h-3" /></button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {view !== 'pos' && (
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <h1 className="text-3xl font-black text-gray-900 md:hidden">Pointy</h1>
                <span className="text-indigo-600 font-black text-xs uppercase tracking-widest md:hidden">POS INTELIGENTE</span>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                {/* Install Button for Android/Chrome */}
                {installPrompt && (
                  <button
                    onClick={handleInstallClick}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-gray-200 active:scale-95 transition-all animate-bounce-subtle"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Instalar</span>
                    <span className="sm:hidden">App</span>
                  </button>
                )}

                {/* Install Instruction Button for iOS */}
                {isIos && !isStandalone && (
                  <button
                    onClick={() => setShowIosInstallModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-gray-200 active:scale-95 transition-all animate-bounce-subtle"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Instalar</span>
                    <span className="sm:hidden">App</span>
                  </button>
                )}

                {/* Quick Rate Button */}
                <button
                  onClick={() => { setIsRateModalOpen(true); setTempRate(exchangeRate.toString()); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${isRateOutdated ? 'bg-red-50 text-red-500 border-red-100 animate-pulse' : 'bg-white text-indigo-600 border-indigo-50 shadow-sm'}`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>{exchangeRate.toFixed(2)} Bs</span>
                </button>

                {/* Cloud Status */}
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${isSynced ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                  {isSynced ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isSynced ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Views */}
          {view === 'reports' && (
            <VentasCaja
              sales={sales}
              customers={customers}
              exchangeRate={exchangeRate}
              onOpenPOS={() => setView('pos')}
              onVoidSale={handleVoidSale}
              onEditSale={handleEditSale}
            />
          )}

          {view === 'inventory' && (
            <Inventory
              products={products}
              onAdd={addProduct}
              onUpdate={updateProduct}
              onDelete={deleteProduct}
            />
          )}

          {view === 'customers' && (
            <Customers
              customers={customers}
              sales={sales}
              exchangeRate={exchangeRate}
              onAdd={addCustomer}
              onUpdate={updateCustomer}
              onDelete={deleteCustomer}
              onDebtPayment={handleDebtPayment}
            />
          )}

          {view === 'settings' && (
            <Settings
              products={products}
              customers={customers}
              sales={sales}
              exchangeRate={exchangeRate}
              rateHistory={rateHistory}
              onExchangeRateChange={handleExchangeRateChange}
              onHistoryUpdate={handleHistoryUpdate}
              onHistoryDelete={handleHistoryDelete}
              onImport={handleImport}
              onReset={() => {
                if (confirm("¿Borrar TODOS los datos?")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
            />
          )}
        </div>

        {/* POS View - Full Height Overlay Style */}
        {view === 'pos' && (
          <div className="absolute inset-0 bg-gray-50 z-20 flex flex-col">
            <POS
              products={products}
              customers={customers}
              exchangeRate={exchangeRate}
              onSale={handleSale}
              onUpdateRate={handleExchangeRateChange}
              onAddCustomer={addCustomer}
              onBackToDashboard={() => setView('reports')}
              initialCart={pendingCart}
              onCartLoaded={handleCartLoaded}
            />
          </div>
        )}

        {/* Quick Rate Modal */}
        {isRateModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white p-6 rounded-[2rem] shadow-2xl w-full max-w-xs animate-scale-up">
              <h3 className="text-lg font-black text-gray-900 mb-1 text-center">Tasa del Día</h3>
              <p className="text-xs text-gray-400 text-center mb-4 font-bold uppercase tracking-widest">Actualizar valor BCV</p>
              <form onSubmit={handleQuickRateSubmit}>
                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-300">Bs.</span>
                  <input
                    autoFocus
                    type="number"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-xl text-center outline-none focus:border-indigo-500"
                    value={tempRate}
                    onChange={(e) => setTempRate(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsRateModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs">Cancelar</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* iOS Install Instructions Modal */}
        {showIosInstallModal && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in" onClick={() => setShowIosInstallModal(false)}>
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowIosInstallModal(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200">
                <X className="w-5 h-5" />
              </button>

              <Smartphone className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-black text-gray-900 mb-2">Instalar en iPhone</h3>
              <p className="text-sm text-gray-500 mb-6">Para instalar Pointy en tu inicio, sigue estos pasos:</p>

              <div className="space-y-4 text-left">
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                  <Share className="w-6 h-6 text-blue-500 shrink-0" />
                  <span className="text-sm font-bold text-gray-700">1. Toca el botón <span className="text-blue-500">Compartir</span> en la barra inferior de Safari.</span>
                </div>
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                  <Plus className="w-6 h-6 text-gray-900 shrink-0 border-2 border-gray-900 rounded-md p-0.5" />
                  <span className="text-sm font-bold text-gray-700">2. Selecciona <span className="text-gray-900">"Agregar a Inicio"</span> en la lista de opciones.</span>
                </div>
              </div>

              <button onClick={() => setShowIosInstallModal(false)} className="mt-8 w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-xs">
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* Notifications Toast */}
        {notification && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up ${notification.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-white" />}
            <span className="font-bold text-sm">{notification.message}</span>
          </div>
        )}
      </main>

      {/* MOBILE NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-2 pb-safe md:hidden z-30 flex justify-around items-center">
        <button
          onClick={() => setView('reports')}
          className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${view === 'reports' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <Banknote className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase">Caja</span>
        </button>

        <button
          onClick={() => setView('inventory')}
          className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${view === 'inventory' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase">Inventario</span>
        </button>

        <button
          onClick={() => setView('customers')}
          className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${view === 'customers' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase">Clientes</span>
        </button>

        <button
          onClick={() => setView('settings')}
          className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${view === 'settings' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase">Ajustes</span>
        </button>
      </div>

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle { animation: bounce-subtle 2s infinite; }
      `}</style>
    </div>
  );
};

export default App;