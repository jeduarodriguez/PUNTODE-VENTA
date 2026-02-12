
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import POS from './components/POS';
import Inventory from './components/Inventory';
import VentasCaja from './components/Reports';
import Customers from './components/Customers';
import Settings from './components/Settings';
import RateModal from './components/RateModal';
import Treasury from './components/Treasury';
import Dashboard from './components/Dashboard';
import { Product, Sale, View, Customer, ExchangeRateRecord, CartItem, TreasuryTransaction } from './types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_SALES, INITIAL_RATE_HISTORY, INITIAL_TREASURY, CheckCircle2, Settings as SettingsIcon, Smartphone, Share as ShareIcon, DollarSign, Plus, X, ShoppingCart, Package, Users, Banknote, Landmark, PieChart } from './constants';
// Cambiamos el servicio a Supabase
import { syncPath, saveData, deleteData, updateBatch } from './services/supabaseService';

const App: React.FC = () => {
  const [view, setView] = useState<View>('reports');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [treasuryTransactions, setTreasuryTransactions] = useState<TreasuryTransaction[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [rateHistory, setRateHistory] = useState<ExchangeRateRecord[]>([]);
  const [categories, setCategories] = useState<string[]>(['Todas', 'Bebidas', 'Panadería', 'Comida', 'Snacks']);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const [pendingCart, setPendingCart] = useState<CartItem[]>([]);
  const [showIosInstallModal, setShowIosInstallModal] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);

  const handleCartLoaded = useCallback(() => {
    setPendingCart([]);
  }, []);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isApp = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIosDevice && !isApp) {
      const lastPrompt = localStorage.getItem('pointy_ios_prompt');
      const now = Date.now();
      if (!lastPrompt || now - parseInt(lastPrompt) > 86400000) {
        setTimeout(() => setShowIosInstallModal(true), 3000);
      }
    }

    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // --- SINCRONIZACIÓN CON SUPABASE ---
    const unsubProducts = syncPath('products', (data) => {
      setProducts(data ? Object.values(data).filter(Boolean) as Product[] : []);
    });

    const unsubCustomers = syncPath('customers', (data) => {
      setCustomers(data ? Object.values(data).filter(Boolean) as Customer[] : []);
    });

    const unsubSales = syncPath('sales', (data) => {
      setSales(data ? Object.values(data).filter(Boolean) as Sale[] : []);
    });

    const unsubTreasury = syncPath('treasury', (data) => {
      setTreasuryTransactions(data ? Object.values(data).filter(Boolean) as TreasuryTransaction[] : []);
    });

    const unsubRate = syncPath('settings/exchangeRate', (data) => {
      if (data) setExchangeRate(data);
      else setExchangeRate(47.90);
    });

    const unsubHistory = syncPath('rate_history', (data) => {
      setRateHistory(data ? Object.values(data).filter(Boolean) as ExchangeRateRecord[] : []);
    });

    const unsubCategories = syncPath('settings/categories', (data) => {
      if (data && Array.isArray(data)) setCategories(data);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      unsubProducts(); unsubCustomers(); unsubSales(); unsubTreasury(); unsubRate(); unsubHistory(); unsubCategories();
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') setInstallPrompt(null);
    });
  };

  const closeIosPrompt = () => {
    setShowIosInstallModal(false);
    localStorage.setItem('pointy_ios_prompt', Date.now().toString());
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSale = async (sale: Sale) => {
    const updates: any = {};
    const saleWithRate = { ...sale, exchangeRate };

    // Preparar actualizaciones de stock
    const updatedProducts = [...products];
    sale.items.forEach(item => {
      const pIndex = updatedProducts.findIndex(prod => prod.id === item.id);
      if (pIndex !== -1) {
        const p = { ...updatedProducts[pIndex], stock: Math.max(0, updatedProducts[pIndex].stock - item.quantity) };
        updatedProducts[pIndex] = p;
        updates[`products/${p.id}`] = p;
      }
    });

    // Preparar actualización de cliente (si es crédito)
    const updatedCustomers = [...customers];
    if (sale.paymentMethod === 'Credit' && sale.customerId) {
      const cIndex = updatedCustomers.findIndex(cust => cust.id === sale.customerId);
      if (cIndex !== -1) {
        const c = { ...updatedCustomers[cIndex], balance: (updatedCustomers[cIndex].balance || 0) + sale.total };
        updatedCustomers[cIndex] = c;
        updates[`customers/${c.id}`] = c;
      }
    }

    updates[`sales/${sale.id}`] = saleWithRate;

    // --- ACTUALIZACIÓN OPTIMISTA ---
    setProducts(updatedProducts);
    setCustomers(updatedCustomers);
    setSales(prev => [...prev, saleWithRate]);
    setView('reports');

    try {
      await updateBatch(updates);
      showNotification(`Venta guardada: $${sale.total.toFixed(2)}`);
    } catch (error) {
      showNotification('Error al guardar', 'error');
      // Podríamos revertir el estado aquí si fuera crítico, 
      // pero usualmente la reconexión de Supabase lo arreglará.
    }
  };

  const handleVoidSale = async (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    const updates: any = {};

    // Revertir stock
    const updatedProducts = [...products];
    sale.items.forEach(item => {
      if (item.id === 'debt_payment') return;
      const pIndex = updatedProducts.findIndex(prod => prod.id === item.id);
      if (pIndex !== -1) {
        const p = { ...updatedProducts[pIndex], stock: updatedProducts[pIndex].stock + item.quantity };
        updatedProducts[pIndex] = p;
        updates[`products/${p.id}`] = p;
      }
    });

    // Revertir saldo de cliente
    const updatedCustomers = [...customers];
    if (sale.paymentMethod === 'Credit' && sale.customerId) {
      const cIndex = updatedCustomers.findIndex(cust => cust.id === sale.customerId);
      if (cIndex !== -1) {
        const c = { ...updatedCustomers[cIndex], balance: Math.max(0, (updatedCustomers[cIndex].balance || 0) - sale.total) };
        updatedCustomers[cIndex] = c;
        updates[`customers/${c.id}`] = c;
      }
    }

    updates[`sales/${saleId}`] = null;

    // --- ACTUALIZACIÓN OPTIMISTA ---
    setProducts(updatedProducts);
    setCustomers(updatedCustomers);
    setSales(prev => prev.filter(s => s.id !== saleId));

    try {
      await updateBatch(updates);
      showNotification('Venta anulada');
    } catch (error) {
      showNotification('Error', 'error');
    }
  };

  const handleEditSale = async (sale: Sale) => {
    const itemsToRestore = sale.items.filter(i => i.id !== 'debt_payment').map(i => ({ ...i }));
    if (itemsToRestore.length > 0) {
      setPendingCart(itemsToRestore);
      await handleVoidSale(sale.id);
      setView('pos');
      showNotification('Cargado para corrección');
    }
  };

  const handleDebtPayment = async (customerId: string, amount: number, method: 'Cash' | 'Card' | 'PagoMovil') => {
    const paymentSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      items: [{ id: 'debt_payment', name: 'Abono de Deuda', category: 'Pagos', price: amount, costPrice: 0, stock: 1, quantity: 1 }],
      total: amount,
      exchangeRate,
      paymentMethod: method,
      customerId
    };

    const updates: any = {};
    updates[`sales/${paymentSale.id}`] = paymentSale;

    // Actualizar saldo de cliente
    const updatedCustomers = [...customers];
    const cIndex = updatedCustomers.findIndex(cust => cust.id === customerId);
    if (cIndex !== -1) {
      const c = { ...updatedCustomers[cIndex], balance: Math.max(0, (updatedCustomers[cIndex].balance || 0) - amount) };
      updatedCustomers[cIndex] = c;
      updates[`customers/${customerId}`] = c;
    }

    // --- ACTUALIZACIÓN OPTIMISTA ---
    setCustomers(updatedCustomers);
    setSales(prev => [...prev, paymentSale]);

    try {
      await updateBatch(updates);
      showNotification(`Pago registrado: $${amount.toFixed(2)}`);
    } catch (e) {
      showNotification('Error', 'error');
    }
  };

  const handleRestock = async (transaction: TreasuryTransaction, items: { productId: string, quantity: number, cost: number, newPrice?: number }[]) => {
    const updates: any = {};
    const updatedProducts = [...products];

    updates[`treasury/${transaction.id}`] = transaction;

    items.forEach(item => {
      const pIndex = updatedProducts.findIndex(p => p.id === item.productId);
      if (pIndex !== -1) {
        const product = updatedProducts[pIndex];
        const newProduct = { ...product };
        newProduct.stock = product.stock + item.quantity;
        if (item.cost > 0) newProduct.costPrice = item.cost;
        if (item.newPrice && item.newPrice > 0) newProduct.price = item.newPrice;
        updatedProducts[pIndex] = newProduct;
        updates[`products/${product.id}`] = newProduct;
      }
    });

    // --- ACTUALIZACIÓN OPTIMISTA ---
    setTreasuryTransactions(prev => [...prev, transaction]);
    setProducts(updatedProducts);

    try {
      await updateBatch(updates);
      showNotification(`Compra registrada: $${transaction.amount.toFixed(2)}`);
    } catch (e) {
      showNotification('Error al registrar compra', 'error');
    }
  };

  const handleAddTreasuryTransaction = async (t: TreasuryTransaction) => {
    // Actualización optimista
    setTreasuryTransactions(prev => [...prev, t]);
    await saveData(`treasury/${t.id}`, t);
  };

  const handleDeleteTreasuryTransaction = async (id: string) => {
    // Actualización optimista
    setTreasuryTransactions(prev => prev.filter(t => t.id !== id));
    await deleteData(`treasury/${id}`);
  };

  const handleUpdateExchangeRate = async (rate: number) => {
    // Actualización optimista: actualizar el estado local inmediatamente
    setExchangeRate(rate);
    // Guardar en Supabase
    await saveData('settings/exchangeRate', rate);
  };

  const handleUpdateRateHistory = async (record: ExchangeRateRecord) => {
    // Actualización optimista: actualizar el estado local inmediatamente
    setRateHistory(prev => {
      const exists = prev.find(r => r.id === record.id);
      if (exists) {
        // Actualizar registro existente
        return prev.map(r => r.id === record.id ? record : r);
      } else {
        // Agregar nuevo registro
        return [...prev, record];
      }
    });
    // Guardar en Supabase
    await saveData(`rate_history/${record.id}`, record);
  };

  const handleDeleteRateHistory = async (id: string) => {
    // Actualización optimista: eliminar del estado local inmediatamente
    setRateHistory(prev => prev.filter(r => r.id !== id));
    // Eliminar de Supabase
    await deleteData(`rate_history/${id}`);
  };

  // --- PRODUCTOS OPTIMISTAS ---
  const handleProductAdd = async (p: Product) => {
    setProducts(prev => [...prev, p]);
    const success = await saveData(`products/${p.id}`, p);
    if (success) showNotification('Producto agregado a la nube');
    else showNotification('Error al guardar en la nube (Verifica conexión)', 'error');
  };

  const handleProductUpdate = async (p: Product) => {
    const oldProducts = [...products];
    setProducts(prev => prev.map(prod => prod.id === p.id ? p : prod));
    const success = await saveData(`products/${p.id}`, p);
    if (success) showNotification('Producto actualizado');
    else {
      showNotification('Error al actualizar en la nube', 'error');
      setProducts(oldProducts); // Revertir si falla
    }
  };

  const handleProductDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    const oldProducts = [...products];
    setProducts(prev => prev.filter(p => p.id !== id));
    try {
      await deleteData(`products/${id}`);
      showNotification('Producto eliminado');
    } catch (e) {
      showNotification('Error al eliminar producto', 'error');
      setProducts(oldProducts);
    }
  };

  // --- CLIENTES OPTIMISTAS ---
  const handleCustomerAdd = async (c: Customer) => {
    setCustomers(prev => [...prev, c]);
    const success = await saveData(`customers/${c.id}`, c);
    if (success) showNotification('Cliente guardado');
    else showNotification('Error al guardar cliente', 'error');
  };

  const handleCustomerUpdate = async (c: Customer) => {
    setCustomers(prev => prev.map(cust => cust.id === c.id ? c : cust));
    const success = await saveData(`customers/${c.id}`, c);
    if (success) showNotification('Cliente actualizado');
    else showNotification('Error al actualizar cliente', 'error');
  };

  const handleCustomerDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    setCustomers(prev => prev.filter(c => c.id !== id));
    await deleteData(`customers/${id}`);
    showNotification('Cliente eliminado');
  };

  const handleAddCategory = async (cat: string) => {
    if (!categories.includes(cat)) {
      const newCats = [...categories, cat];
      setCategories(newCats);
      await saveData('settings/categories', newCats);
    }
  };

  const handlePurchaseProducts = async (items: { product: Product; quantity: number; costPrice: number }[], method: 'Cash' | 'Transfer' | 'PagoMovil' | 'Card' | 'PointOfSale') => {
    const now = Date.now();
    const totalUsd = items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    const totalBs = totalUsd * exchangeRate;

    const transaction: TreasuryTransaction = {
      id: `purchase_${now}`,
      timestamp: now,
      type: 'expense',
      category: 'Inventario',
      description: items.map(i => `${i.quantity} ${i.product.name}`).join(', '),
      amount: totalUsd,
      amountBs: totalBs,
      exchangeRate: exchangeRate,
      method: method
    };

    await handleAddTreasuryTransaction(transaction);

    const updatedProducts = [...products];
    for (const item of items) {
      const productIndex = updatedProducts.findIndex(p => p.id === item.product.id);
      if (productIndex >= 0) {
        updatedProducts[productIndex] = {
          ...updatedProducts[productIndex],
          stock: updatedProducts[productIndex].stock + item.quantity
        };
      }
    }
    setProducts(updatedProducts);

    for (const item of items) {
      await saveData(`products/${item.product.id}`, {
        ...item.product,
        stock: item.product.stock + item.quantity
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row pb-0 md:pb-0 safe-area-top">
      <Sidebar activeView={view} onViewChange={setView} />
      <main className="flex-1 md:ml-64 relative flex flex-col h-[100dvh] overflow-hidden">

        {installPrompt && (
          <div className="bg-indigo-600 text-white p-3 flex items-center justify-between animate-fade-in z-50">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5" />
              <p className="text-xs font-black uppercase">Instala Pointy en tu pantalla</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setInstallPrompt(null)} className="px-3 py-1.5 text-xs font-bold bg-white/10 rounded-lg">Cerrar</button>
              <button onClick={handleInstallClick} className="px-4 py-1.5 text-xs font-black bg-white text-indigo-600 rounded-lg shadow-sm">Instalar</button>
            </div>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto p-4 md:p-8 ${view === 'pos' ? 'pb-0' : 'pb-24 md:pb-8'}`}>
          {/* Header removed on mobile to maximize space, kept only for larger screens or hidden if preferred */}
          <div className="hidden md:flex items-center justify-between mb-8 sticky top-0 z-30 pt-2 pb-2 bg-gray-50/95 backdrop-blur-sm">
            <div className="flex flex-col">
              <h1 className="text-3xl font-black text-gray-900">Pointy</h1>
              <span className="text-indigo-600 font-black text-xs uppercase">POS CLOUD</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-xs uppercase bg-white text-indigo-600 border border-indigo-50 shadow-sm active:scale-95 transition-all"
              >
                <div className="bg-indigo-100 p-1 rounded-full"><DollarSign className="w-3 h-3" /></div>
                <span>{exchangeRate.toFixed(2)} Bs</span>
              </button>

              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-3 bg-white text-gray-600 border border-gray-200 rounded-2xl shadow-sm hover:bg-gray-100 active:scale-95 transition-all"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {view === 'dashboard' && <Dashboard sales={sales} products={products} customers={customers} exchangeRate={exchangeRate} />}
          {view === 'reports' && <VentasCaja sales={sales} products={products} customers={customers} exchangeRate={exchangeRate} treasuryTransactions={treasuryTransactions} onOpenPOS={() => setView('pos')} onVoidSale={handleVoidSale} onEditSale={handleEditSale} onAddTreasuryTransaction={handleAddTreasuryTransaction} onOpenRateModal={() => setIsRateModalOpen(true)} onPurchaseProducts={handlePurchaseProducts} onAddProduct={handleProductAdd} />}
          {view === 'inventory' && <Inventory products={products} exchangeRate={exchangeRate} categories={categories} onAdd={handleProductAdd} onUpdate={handleProductUpdate} onDelete={handleProductDelete} onAddCategory={handleAddCategory} />}
          {view === 'customers' && <Customers customers={customers} sales={sales} exchangeRate={exchangeRate} onAdd={handleCustomerAdd} onUpdate={handleCustomerUpdate} onDelete={handleCustomerDelete} onDebtPayment={handleDebtPayment} />}
          {view === 'treasury' && <Treasury transactions={treasuryTransactions} sales={sales} products={products} customers={customers} exchangeRate={exchangeRate} rateHistory={rateHistory} onAddTransaction={handleAddTreasuryTransaction} onDeleteTransaction={handleDeleteTreasuryTransaction} onRestock={handleRestock} />}
          {view === 'settings' && <div className="p-4 bg-white rounded-3xl shadow-sm border border-gray-100">Panel de Configuración Integrado</div>}
        </div>

        {view === 'pos' && <div className="absolute inset-0 bg-gray-50 z-20"><POS products={products} customers={customers} exchangeRate={exchangeRate} onSale={handleSale} onUpdateRate={handleUpdateExchangeRate} onAddCustomer={handleCustomerAdd} onBackToDashboard={() => setView('reports')} initialCart={pendingCart} onCartLoaded={handleCartLoaded} /></div>}

        <RateModal
          isOpen={isRateModalOpen}
          onClose={() => setIsRateModalOpen(false)}
          currentRate={exchangeRate}
          rateHistory={rateHistory}
          onUpdateRate={handleUpdateExchangeRate}
          onHistoryUpdate={handleUpdateRateHistory}
          onHistoryDelete={handleDeleteRateHistory}
        />

        <Settings
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          products={products}
          customers={customers}
          sales={sales}
          onImport={() => { }}
          onReset={() => {
            if (confirm('¿Borrar TODOS los datos de la aplicación?')) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          autoSync={false}
          onToggleAutoSync={() => { }}
          installApp={installPrompt ? handleInstallClick : undefined}
        />

        {notification && <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up bg-gray-900 text-white`}><CheckCircle2 className="w-5 h-5 text-emerald-400" /><span className="font-bold text-sm">{notification.message}</span></div>}

        {showIosInstallModal && (
          <div className="fixed inset-x-0 bottom-0 z-[110] p-4 flex justify-center animate-slide-up">
            <div className="bg-white rounded-[2rem] shadow-2xl p-6 border border-gray-100 w-full max-w-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase">Instalar App</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Sigue estos pasos en tu iPhone</p>
                  </div>
                </div>
                <button onClick={closeIosPrompt} className="text-gray-400 p-1"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl">
                  <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-black text-indigo-600">1</div>
                  <p className="text-xs font-bold text-gray-600">Toca el botón <span className="inline-flex bg-white p-1 rounded border shadow-sm mx-1"><ShareIcon className="w-3 h-3 text-blue-500" /></span> de Safari.</p>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl">
                  <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-black text-indigo-600">2</div>
                  <p className="text-xs font-bold text-gray-600">Selecciona <span className="font-black text-gray-900 uppercase text-[10px]">"Añadir a pantalla de inicio"</span>.</p>
                </div>
              </div>
              <button onClick={closeIosPrompt} className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">Entendido</button>
            </div>
          </div>
        )}
      </main>

      {/* Barra de navegación inferior para móviles */}
      {view !== 'pos' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 md:hidden z-50 safe-area-bottom">
          <div className="flex items-center justify-around px-2 py-2">
            {/* Estadísticas (Dashboard) */}
            <button
              onClick={() => setView('dashboard')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${view === 'dashboard'
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-gray-500'
                }`}
            >
              <PieChart className="w-5 h-5" />
              <span className="text-[10px] font-bold">Estadísticas</span>
            </button>

            {/* Balance */}
            <button
              onClick={() => setView('reports')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${view === 'reports'
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-gray-500'
                }`}
            >
              <Banknote className="w-5 h-5" />
              <span className="text-[10px] font-bold">Balance</span>
            </button>

            {/* Inventario */}
            <button
              onClick={() => setView('inventory')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${view === 'inventory'
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-gray-500'
                }`}
            >
              <Package className="w-5 h-5" />
              <span className="text-[10px] font-bold">Stock</span>
            </button>

            {/* Clientes */}
            <button
              onClick={() => setView('customers')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${view === 'customers'
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-gray-500'
                }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-bold">Clientes</span>
            </button>

            {/* Ajustes */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${isSettingsModalOpen ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              <SettingsIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold">Ajustes</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default App;