
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import POS from './components/POS';
import Inventory from './components/Inventory';
import VentasCaja from './components/Reports';
import Customers from './components/Customers';
import Settings from './components/Settings';
import RateModal from './components/RateModal';
import Dashboard from './components/Dashboard';
import { Product, Sale, View, Customer, ExchangeRateRecord, CartItem, TreasuryTransaction, Worker, BusinessDebt } from './types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_SALES, INITIAL_RATE_HISTORY, INITIAL_TREASURY, CheckCircle2, Settings as SettingsIcon, Smartphone, Share as ShareIcon, DollarSign, Plus, X, ShoppingCart, Package, Users, Banknote, Landmark, PieChart } from './constants';
// Cambiamos el servicio a Supabase
import { syncPath, saveData, deleteData, updateBatch, clearAllTreasuryTransactions, clearAllSales, clearAllData } from './services/supabaseService';

const App: React.FC = () => {
  const [view, setView] = useState<View>(() => {
    const saved = localStorage.getItem('pointy_last_view');
    return (saved as View) || 'reports';
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [businessDebts, setBusinessDebts] = useState<BusinessDebt[]>([]);

  useEffect(() => {
    localStorage.setItem('pointy_last_view', view);
  }, [view]);

  useEffect(() => {
    const handleBackButton = (e: PopStateEvent) => {
      if (view !== 'reports') {
        e.preventDefault();
        setView('reports');
      }
    };
    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [view]);

  // Helpers para compatibilidad de propiedades
  const getProductProps = (p: Product) => ({
    sellingMode: p.selling_mode ?? (p as any).sellingMode ?? 'simple',
    unitsPerPackage: p.units_per_package ?? (p as any).unitsPerPackage ?? 0,
    remainingUnits: p.remaining_units ?? (p as any).remainingUnits ?? 0,
    pricePerUnit: p.price_per_unit ?? (p as any).pricePerUnit ?? 0,
    stock: p.stock
  });
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

    const unsubWorkers = syncPath('workers', (data) => {
      console.log('🔄 Workers sync:', data);
      setWorkers(data ? Object.values(data).filter(Boolean) as Worker[] : []);
    });

    const unsubBusinessDebts = syncPath('businessdebts', (data) => {
      const debts = data ? Object.values(data).filter(Boolean) : [];
      const transformedDebts = debts.map((d: any) => ({
        id: d.id,
        timestamp: d.timestamp,
        title: d.title,
        amountUsd: d.amount_usd ?? d.amountUsd,
        amountBs: d.amount_bs ?? d.amountBs,
        currencyType: d.currency_type ?? d.currencyType,
        rateAtCreation: d.rate_at_creation ?? d.rateAtCreation,
        isPaid: d.is_paid ?? d.isPaid,
        paidAt: d.paid_at ?? d.paidAt,
        paidAmount: d.paid_amount ?? d.paidAmount,
        paidMethod: d.paid_method ?? d.paidMethod,
        notes: d.notes
      }));
      setBusinessDebts(transformedDebts as BusinessDebt[]);
    });

    const unsubSales = syncPath('sales', (data) => {
      console.log('📥 Sales loaded:', data);
      setSales(data ? Object.values(data).filter(Boolean) as Sale[] : []);
    });

    const unsubTreasury = syncPath('treasury', (data) => {
      setTreasuryTransactions(data ? Object.values(data).filter(Boolean) as TreasuryTransaction[] : []);
    });

    const unsubRate = syncPath('settings/exchangeRate', (data) => {
      console.log('📥 Rate loaded from settings:', data);
      if (data) setExchangeRate(data);
      else setExchangeRate(47.90);
    });

    const unsubHistory = syncPath('rate_history', (data) => {
      const history = data ? Object.values(data).filter(Boolean) as ExchangeRateRecord[] : [];
      setRateHistory(history);

      if (history.length > 0) {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const sortedRates = [...history].sort((a, b) => b.timestamp - a.timestamp);

        const todayRate = sortedRates.find(r => {
          const rateDate = new Date(r.timestamp);
          const rateDateStart = new Date(rateDate.getFullYear(), rateDate.getMonth(), rateDate.getDate()).getTime();
          return rateDateStart === todayStart;
        });

        if (todayRate) {
          setExchangeRate(todayRate.rate);
        } else {
          const closestRate = sortedRates[0];
          if (closestRate) {
            setExchangeRate(closestRate.rate);
          }
        }
      }
    });

    const unsubCategories = syncPath('settings/categories', (data) => {
      if (data && Array.isArray(data)) setCategories(data);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      unsubProducts(); unsubCustomers(); unsubWorkers(); unsubBusinessDebts(); unsubSales(); unsubTreasury(); unsubRate(); unsubHistory(); unsubCategories();
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
    console.log('💰 Sale received:', sale);
    const updates: any = {};
    const saleWithRate = { ...sale, exchangeRate };
    console.log('💰 Sale with rate:', saleWithRate);

    // Preparar actualizaciones de stock
    const updatedProducts = [...products];
    sale.items.forEach(item => {
      const isUnitSale = item.id && item.id.endsWith('-unit');
      const productId = isUnitSale ? item.id.replace('-unit', '') : item.id;
      const pIndex = updatedProducts.findIndex(prod => prod.id === productId);

      if (pIndex !== -1) {
        const product = updatedProducts[pIndex];
        const { sellingMode, unitsPerPackage, remainingUnits } = getProductProps(product);

        if (sellingMode === 'package' && isUnitSale) {
          // Venta por unidad de producto paquete
          let qtyNeeded = item.quantity;
          let newRemainingUnits = remainingUnits;
          let newStock = product.stock;

          // Primero usar las unidades sueltas
          if (newRemainingUnits >= qtyNeeded) {
            newRemainingUnits -= qtyNeeded;
            qtyNeeded = 0;
          } else {
            qtyNeeded -= newRemainingUnits;
            newRemainingUnits = 0;
          }

          // Si necesita más, abrir paquetes
          if (qtyNeeded > 0 && newStock > 0) {
            const packagesToOpen = Math.min(Math.ceil(qtyNeeded / (unitsPerPackage || 1)), newStock);
            newStock -= packagesToOpen;
            const unitsFromPackages = packagesToOpen * (unitsPerPackage || 0);
            newRemainingUnits += unitsFromPackages;
            qtyNeeded -= unitsFromPackages;
          }

          const p = {
            ...product,
            stock: Math.max(0, newStock),
            remaining_units: Math.max(0, newRemainingUnits)
          };
          updatedProducts[pIndex] = p;
          updates[`products/${productId}`] = p;
        } else {
          // Venta normal (simple o peso)
          const p = {
            ...product,
            stock: Math.max(0, product.stock - item.quantity)
          };
          updatedProducts[pIndex] = p;
          updates[`products/${productId}`] = p;
        }
      }
    });

    // Preparar actualización de cliente (si es crédito)
    const updatedCustomers = [...customers];
    if (sale.paymentMethod === 'Credit' && sale.customerId) {
      console.log('💳 Processing credit sale for customerId:', sale.customerId);

      const cIndex = updatedCustomers.findIndex(cust => cust.id === sale.customerId);
      if (cIndex !== -1) {
        const c = { ...updatedCustomers[cIndex], balance: (updatedCustomers[cIndex].balance || 0) + sale.total };
        updatedCustomers[cIndex] = c;
        updates[`customers/${c.id}`] = c;
      }

      // También verificar si es un trabajador
      const wIndex = workers.findIndex(w => w.id === sale.customerId);
      if (wIndex !== -1) {
        const worker = workers[wIndex];
        const updatedWorker = { ...worker, balance: (worker.balance || 0) + sale.total };
        updates[`workers/${worker.id}`] = updatedWorker;
        setWorkers(prev => prev.map(w => w.id === worker.id ? updatedWorker : w));
      }
    }

    updates[`sales/${sale.id}`] = saleWithRate;

    // Registrar ingreso en treasury (excepto ventas a crédito)
    if (sale.paymentMethod !== 'Credit') {
      const totalBs = sale.total * sale.exchangeRate;
      const treasuryTransaction: TreasuryTransaction = {
        id: `sale_${sale.id}`,
        timestamp: sale.timestamp,
        type: 'income',
        category: 'Ventas',
        description: sale.items.map(i => `${i.quantity} ${i.name}`).join(', '),
        amount: sale.total, // Referencia en USD
        amountBs: totalBs, // Monto real en Bs
        exchangeRate: sale.exchangeRate,
        method: sale.paymentMethod
      };
      updates[`treasury/${treasuryTransaction.id}`] = treasuryTransaction;
      // Actualización optimista
      setTreasuryTransactions(prev => [...prev, treasuryTransaction]);
    }

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
      if (item.id === 'debt_payment' || item.id === 'worker_debt_payment') return;

      const isUnitSale = item.id && item.id.endsWith('-unit');
      const productId = isUnitSale ? item.id.replace('-unit', '') : item.id;
      const pIndex = updatedProducts.findIndex(prod => prod.id === productId);

      if (pIndex !== -1) {
        const product = updatedProducts[pIndex];

        if (product.sellingMode === 'package' && isUnitSale) {
          // Anular venta por unidad - reintegrar a remainingUnits
          const qtyToReturn = item.quantity;
          const newRemainingUnits = (product.remainingUnits || 0) + qtyToReturn;
          const p = { ...product, remainingUnits: newRemainingUnits };
          updatedProducts[pIndex] = p;
          updates[`products/${productId}`] = p;
        } else {
          // Anulación normal - reintegrar al stock
          const p = { ...product, stock: product.stock + item.quantity };
          updatedProducts[pIndex] = p;
          updates[`products/${productId}`] = p;
        }
      }
    });

    // Revertir saldo de cliente o trabajador
    const updatedCustomers = [...customers];
    const updatedWorkers = [...workers];

    // Si la venta FUE a crédito, la anulación restaura el saldo restando la deuda
    if (sale.paymentMethod === 'Credit' && sale.customerId) {
      const cIndex = updatedCustomers.findIndex(cust => cust.id === sale.customerId);
      if (cIndex !== -1) {
        const c = { ...updatedCustomers[cIndex], balance: Math.max(0, (updatedCustomers[cIndex].balance || 0) - sale.total) };
        updatedCustomers[cIndex] = c;
        updates[`customers/${c.id}`] = c;
      } else {
        const wIndex = updatedWorkers.findIndex(w => w.id === sale.customerId);
        if (wIndex !== -1) {
          const w = { ...updatedWorkers[wIndex], balance: Math.max(0, (updatedWorkers[wIndex].balance || 0) - sale.total) };
          updatedWorkers[wIndex] = w;
          updates[`workers/${w.id}`] = w;
        }
      }
    }

    // Si la venta ERA EL PAGO DE UNA DEUDA, la anulación restaura el saldo SUMANDO la deuda
    const isDebtPayment = sale.items.some(i => i.id === 'debt_payment');
    const isWorkerDebtPayment = sale.items.some(i => i.id === 'worker_debt_payment');

    if ((isDebtPayment || isWorkerDebtPayment) && sale.customerId) {
      if (isDebtPayment) {
        const cIndex = updatedCustomers.findIndex(cust => cust.id === sale.customerId);
        if (cIndex !== -1) {
          const c = { ...updatedCustomers[cIndex], balance: (updatedCustomers[cIndex].balance || 0) + sale.total };
          updatedCustomers[cIndex] = c;
          updates[`customers/${c.id}`] = c;
        }
      } else if (isWorkerDebtPayment) {
        const wIndex = updatedWorkers.findIndex(w => w.id === sale.customerId);
        if (wIndex !== -1) {
          const w = { ...updatedWorkers[wIndex], balance: (updatedWorkers[wIndex].balance || 0) + sale.total };
          updatedWorkers[wIndex] = w;
          updates[`workers/${w.id}`] = w;
        }
      }
    }

    // Eliminar la venta
    updates[`sales/${saleId}`] = null;

    // Eliminar cualquier transacción de tesorería asociada a esta venta
    const transactionsToDelete = treasuryTransactions.filter(t =>
      t.id === `sale_${saleId}` ||
      t.id === `debt_payment_${saleId}` ||
      t.id === `worker_debt_payment_${saleId}`
    );

    transactionsToDelete.forEach(t => {
      updates[`treasury/${t.id}`] = null;
    });

    // --- ACTUALIZACIÓN OPTIMISTA ---
    setProducts(updatedProducts);
    setCustomers(updatedCustomers);
    setWorkers(updatedWorkers);
    setSales(prev => prev.filter(s => s.id !== saleId));
    setTreasuryTransactions(prev => prev.filter(t => !transactionsToDelete.includes(t)));

    try {
      await updateBatch(updates);
      showNotification('Venta anulada correctamente');
    } catch (e) {
      showNotification('Error', 'error');
    }
  };

  const handleAddBusinessDebt = (debt: BusinessDebt) => {
    setBusinessDebts(prev => [...prev, debt]);
    saveData(`businessdebts/${debt.id}`, debt);
    showNotification('Deuda registrada');
  };

  const handlePayBusinessDebt = async (debtId: string, amount: number, method: 'Cash' | 'Transfer' | 'PagoMovil') => {
    const debt = businessDebts.find(d => d.id === debtId);
    if (!debt) return;

    const updates: any = {};

    const paidAmount = debt.paidAmount || 0;
    const newPaidAmount = paidAmount + amount;
    const isFullyPaid = newPaidAmount >= getCurrentDebtAmountBs(debt);

    const updatedDebt: BusinessDebt = {
      ...debt,
      isPaid: isFullyPaid,
      paidAt: isFullyPaid ? Date.now() : debt.paidAt,
      paidAmount: newPaidAmount,
      paidMethod: method
    };

    updates[`businessdebts/${debtId}`] = updatedDebt;
    setBusinessDebts(prev => prev.map(d => d.id === debtId ? updatedDebt : d));

    const debtRate = debt.rateAtCreation || exchangeRate;
    const amountUsd = debt.currencyType === 'usd' ? debt.amountUsd : amount / debtRate;

    // Registrar egreso según método de pago (descuenta de las cuentas)
    const expenseTransaction: TreasuryTransaction = {
      id: `debt_expense_${debtId}_${Date.now()}`,
      timestamp: Date.now(),
      type: 'expense',
      category: method === 'Cash' ? 'Egresos Cash' : 'Egresos Transferencia',
      description: `Pago Deuda: ${debt.title}`,
      amount: amountUsd,
      amountBs: amount,
      exchangeRate: debtRate,
      method
    };
    updates[`treasury/${expenseTransaction.id}`] = expenseTransaction;
    setTreasuryTransactions(prev => [...prev, expenseTransaction]);

    try {
      await updateBatch(updates);
      showNotification(isFullyPaid ? 'Deuda pagada completamente' : 'Abono registrado');
    } catch (e) {
      showNotification('Error', 'error');
    }
  };

  const handleUpdateBusinessDebt = (debt: BusinessDebt) => {
    setBusinessDebts(prev => prev.map(d => d.id === debt.id ? debt : d));
    saveData(`businessdebts/${debt.id}`, debt);
  };

  const handleDeleteBusinessDebt = (id: string) => {
    setBusinessDebts(prev => prev.filter(d => d.id !== id));
    deleteData(`businessdebts/${id}`);

    // Eliminar transacciones relacionadas en treasury (las que tienen el ID de la deuda)
    const relatedTransactions = treasuryTransactions.filter(t =>
      t.description?.includes(id) || t.id?.includes(id)
    );
    relatedTransactions.forEach(t => {
      deleteData(`treasury/${t.id}`);
    });
    setTreasuryTransactions(prev => prev.filter(t =>
      !t.description?.includes(id) && !t.id?.includes(id)
    ));
  };

  const getCurrentDebtAmountBs = (debt: BusinessDebt): number => {
    if (debt.currencyType === 'bs') {
      return debt.amountBs;
    } else {
      return debt.amountUsd * exchangeRate;
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

  const handleDebtPayment = async (customerId: string, amount: number, method: 'Cash' | 'Card' | 'PagoMovil', rate?: number) => {
    const paymentRate = rate || exchangeRate;
    const paymentSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      items: [{ id: 'debt_payment', name: 'Abono de Deuda', category: 'Pagos', price: amount, cost_price: 0, costPrice: 0, stock: 1, quantity: 1 }],
      total: amount,
      exchangeRate: paymentRate,
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

    // Registrar ingreso en treasury por pago de deuda usando la tasa del día
    const totalBs = amount * paymentRate;
    const treasuryTransaction: TreasuryTransaction = {
      id: `debt_payment_${paymentSale.id}`,
      timestamp: paymentSale.timestamp,
      type: 'income',
      category: 'Cobros',
      description: 'Abono de Deuda',
      amount: amount,
      amountBs: totalBs,
      exchangeRate: paymentRate,
      method: method
    };
    updates[`treasury/${treasuryTransaction.id}`] = treasuryTransaction;
    setTreasuryTransactions(prev => [...prev, treasuryTransaction]);

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
    const transaction = treasuryTransactions.find(t => t.id === id);
    if (!transaction) return;

    const updates: any = {};

    // Si es una venta (id.startsWith('sale_')) - eliminar venta y revertir stock
    if (id.startsWith('sale_')) {
      const saleId = id.replace('sale_', '');
      const sale = sales.find(s => s.id === saleId);
      
      if (sale) {
        // Revertir stock de productos
        const updatedProducts = [...products];
        sale.items.forEach(item => {
          if (item.id === 'debt_payment') return;
          
          const isUnitSale = item.id && item.id.endsWith('-unit');
          const productId = isUnitSale ? item.id.replace('-unit', '') : item.id;
          const pIndex = updatedProducts.findIndex(p => p.id === productId);
          
          if (pIndex !== -1) {
            const product = updatedProducts[pIndex];
            const { sellingMode, unitsPerPackage, remainingUnits } = getProductProps(product);
            
            if (sellingMode === 'package' && isUnitSale) {
              // Devolver unidades sueltas
              let qtyToReturn = item.quantity;
              let newRemainingUnits = remainingUnits + qtyToReturn;
              updatedProducts[pIndex] = { ...product, remainingUnits: newRemainingUnits };
            } else if (sellingMode === 'package' && !isUnitSale) {
              // Devolver paquetes
              updatedProducts[pIndex] = { ...product, stock: product.stock + item.quantity };
            } else {
              // Venta simple o por peso
              updatedProducts[pIndex] = { ...product, stock: product.stock + item.quantity };
            }
          }
        });

        // Revertir balance de cliente si era crédito
        if (sale.paymentMethod === 'Credit' && sale.customerId) {
          const cIndex = customers.findIndex(c => c.id === sale.customerId);
          if (cIndex !== -1) {
            const c = { ...customers[cIndex], balance: (customers[cIndex].balance || 0) + sale.total };
            updates[`customers/${c.id}`] = c;
            setCustomers(prev => prev.map(cust => cust.id === c.id ? c : cust));
          }
          
          // También puede ser trabajador
          const wIndex = workers.findIndex(w => w.id === sale.customerId);
          if (wIndex !== -1) {
            const w = { ...workers[wIndex], balance: (workers[wIndex].balance || 0) + sale.total };
            updates[`workers/${w.id}`] = w;
            setWorkers(prev => prev.map(work => work.id === w.id ? w : work));
          }
        }

        // Eliminar la venta
        updates[`sales/${saleId}`] = null;
        setProducts(updatedProducts);
        setSales(prev => prev.filter(s => s.id !== saleId));
      }
    }

    // Si es pago de deuda de cliente (id.startsWith('debt_payment_'))
    if (id.startsWith('debt_payment_')) {
      const saleId = id.replace('debt_payment_', '');
      const sale = sales.find(s => s.id === saleId);
      
      if (sale?.customerId) {
        // Revertir el balance del cliente
        const cIndex = customers.findIndex(c => c.id === sale.customerId);
        if (cIndex !== -1) {
          const c = { ...customers[cIndex], balance: (customers[cIndex].balance || 0) + sale.total };
          updates[`customers/${c.id}`] = c;
          setCustomers(prev => prev.map(cust => cust.id === c.id ? c : cust));
        }
      }
    }

    // Si es pago de nómina (id.startsWith('worker_debt_payment_'))
    if (id.startsWith('worker_debt_payment_')) {
      const saleId = id.replace('worker_debt_payment_', '');
      const sale = sales.find(s => s.id === saleId);
      
      if (sale?.customerId) {
        // Revertir el balance del trabajador
        const wIndex = workers.findIndex(w => w.id === sale.customerId);
        if (wIndex !== -1) {
          const w = { ...workers[wIndex], balance: (workers[wIndex].balance || 0) + sale.total };
          updates[`workers/${w.id}`] = w;
          setWorkers(prev => prev.map(work => work.id === w.id ? w : work));
        }
      }
    }

    // Si es una compra de inventario (purchase_) o deuda (debt_) - revertir stock
    if ((id.startsWith('purchase_') || id.startsWith('debt_')) && transaction.purchaseItems && transaction.purchaseItems.length > 0) {
      const updatedProducts = [...products];
      
      transaction.purchaseItems.forEach(item => {
        const pIndex = updatedProducts.findIndex(p => p.id === item.productId);
        
        if (pIndex !== -1) {
          const product = updatedProducts[pIndex];
          // Restar la cantidad comprada del stock
          updatedProducts[pIndex] = { 
            ...product, 
            stock: Math.max(0, product.stock - item.quantity)
          };
          updates[`products/${item.productId}`] = updatedProducts[pIndex];
        }
      });
      
      setProducts(updatedProducts);
    }

    // Si es una deuda de negocio (debt_) - también eliminar la deuda
    if (id.startsWith('debt_')) {
      const debtId = id.replace('debt_', '');
      // Eliminar la deuda del negocio
      const debt = businessDebts.find(d => d.id === debtId);
      if (debt) {
        updates[`businessdebts/${debtId}`] = null;
        setBusinessDebts(prev => prev.filter(d => d.id !== debtId));
      }
    }

    // Actualización optimista - eliminar transacción
    setTreasuryTransactions(prev => prev.filter(t => t.id !== id));
    updates[`treasury/${id}`] = null;

    try {
      await updateBatch(updates);
      showNotification('Movimiento eliminado correctamente');
    } catch (e) {
      showNotification('Error al eliminar', 'error');
    }
  };

  const handleClearAllTreasuryTransactions = async () => {
    if (!window.confirm('¿Estás seguro de que quieres ELIMINAR TODOS los movimientos (tesorería y ventas)? Esta acción no se puede deshacer.')) return;
    await clearAllData();
    setTreasuryTransactions([]);
    setSales([]);
  };

  const handleUpdateTreasuryTransaction = async (updatedTransaction: TreasuryTransaction) => {
    // Actualización optimista
    setTreasuryTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
    await saveData(`treasury/${updatedTransaction.id}`, updatedTransaction);
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

  const handleWorkerAdd = async (w: Worker) => {
    setWorkers(prev => [...prev, w]);
    const success = await saveData(`workers/${w.id}`, w);
    if (success) showNotification('Trabajador guardado');
    else showNotification('Error al guardar trabajador', 'error');
  };

  const handleWorkerUpdate = async (w: Worker) => {
    setWorkers(prev => prev.map(worker => worker.id === w.id ? w : worker));
    const success = await saveData(`workers/${w.id}`, w);
    if (success) showNotification('Trabajador actualizado');
    else showNotification('Error al actualizar trabajador', 'error');
  };

  const handleWorkerDelete = async (id: string) => {
    if (!confirm('¿Eliminar este trabajador?')) return;
    setWorkers(prev => prev.filter(w => w.id !== id));
    await deleteData(`workers/${id}`);
    showNotification('Trabajador eliminado');
  };

  const handleWorkerDebtPayment = async (workerId: string, amount: number, method: 'Cash' | 'Card' | 'PagoMovil', rate?: number) => {
    const paymentRate = rate || exchangeRate;
    const paymentSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      items: [{ id: 'worker_debt_payment', name: 'Abono Deuda Trabajador', category: 'Pagos', price: amount, cost_price: 0, costPrice: 0, stock: 1, quantity: 1 }],
      total: amount,
      exchangeRate: paymentRate,
      paymentMethod: method,
      customerId: workerId
    };

    const updates: any = {};
    updates[`sales/${paymentSale.id}`] = paymentSale;

    const updatedWorkers = [...workers];
    const wIndex = updatedWorkers.findIndex(w => w.id === workerId);
    if (wIndex !== -1) {
      const w = { ...updatedWorkers[wIndex], balance: Math.max(0, (updatedWorkers[wIndex].balance || 0) - amount) };
      updatedWorkers[wIndex] = w;
      updates[`workers/${workerId}`] = w;
    }

    // Registrar ingreso en treasury por pago de deuda de trabajador usando la tasa del día
    const totalBs = amount * paymentRate;
    const treasuryTransaction: TreasuryTransaction = {
      id: `worker_debt_payment_${paymentSale.id}`,
      timestamp: paymentSale.timestamp,
      type: 'income',
      category: 'Cobros',
      description: 'Abono Deuda Trabajador',
      amount: amount,
      amountBs: totalBs,
      exchangeRate: paymentRate,
      method: method
    };
    updates[`treasury/${treasuryTransaction.id}`] = treasuryTransaction;
    setTreasuryTransactions(prev => [...prev, treasuryTransaction]);

    setWorkers(updatedWorkers);
    setSales(prev => [...prev, paymentSale]);

    try {
      await updateBatch(updates);
      showNotification(`Pago registrado: $${amount.toFixed(2)}`);
    } catch (e) {
      showNotification('Error', 'error');
    }
  };

  const handleProcessPayroll = async (workerId: string, amountToHandOver: number, amountToDeductDebt: number, method: 'Cash' | 'Card' | 'PagoMovil' | 'Transfer', rate?: number) => {
    const paymentRate = rate || exchangeRate;
    const updates: any = {};
    const updatedWorkers = [...workers];
    const wIndex = updatedWorkers.findIndex(w => w.id === workerId);
    if (wIndex === -1) return;

    const worker = updatedWorkers[wIndex];

    // 1. Registrar PAGO DE DEUDA (si hay)
    if (amountToDeductDebt > 0) {
      const paymentSale: Sale = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        items: [{ id: 'worker_debt_payment', name: 'Abono Deuda por Nómina', category: 'Pagos', price: amountToDeductDebt, cost_price: 0, costPrice: 0, stock: 1, quantity: 1 }],
        total: amountToDeductDebt,
        exchangeRate: paymentRate,
        paymentMethod: method as any,
        customerId: workerId
      };
      updates[`sales/${paymentSale.id}`] = paymentSale;

      worker.balance = Math.max(0, worker.balance - amountToDeductDebt);

      const incomeTransaction: TreasuryTransaction = {
        id: `worker_debt_payment_${paymentSale.id}`,
        timestamp: paymentSale.timestamp,
        type: 'income',
        category: 'Cobros',
        description: `Abono Deuda Nómina - ${worker.name}`,
        amount: amountToDeductDebt,
        amountBs: amountToDeductDebt * paymentRate,
        exchangeRate: paymentRate,
        method: method === 'Transfer' ? 'Transfer' : method as any
      };
      updates[`treasury/${incomeTransaction.id}`] = incomeTransaction;
      setTreasuryTransactions(prev => [...prev, incomeTransaction]);
      setSales(prev => [...prev, paymentSale]);
    }

    // 2. Registrar EGRESO por Pago de Nómina (Dinero en Mano)
    if (amountToHandOver > 0) {
      const expenseTransaction: TreasuryTransaction = {
        id: `payroll_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: Date.now(),
        type: 'expense',
        category: 'Nómina',
        description: `Pago Nómina - ${worker.name}`,
        amount: amountToHandOver,
        amountBs: amountToHandOver * paymentRate,
        exchangeRate: paymentRate,
        method: method === 'Transfer' ? 'Transfer' : method as any
      };
      updates[`treasury/${expenseTransaction.id}`] = expenseTransaction;
      setTreasuryTransactions(prev => [...prev, expenseTransaction]);
    }

    updatedWorkers[wIndex] = worker;
    updates[`workers/${workerId}`] = worker;
    setWorkers(updatedWorkers);

    try {
      await updateBatch(updates);
      showNotification(`Nómina procesada: ${worker.name}`);
    } catch (e) {
      showNotification('Error al procesar nómina', 'error');
    }
  };

  const handleAddCategory = async (cat: string) => {
    if (!categories.includes(cat)) {
      const newCats = [...categories, cat];
      setCategories(newCats);
      await saveData('settings/categories', newCats);
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    const newCats = categories.filter(c => c !== cat);
    setCategories(newCats);
    await saveData('settings/categories', newCats);
  };

  const handlePurchaseProducts = async (items: { product: Product; quantity: number; costPrice: number; costPriceBs?: number; rateAtPurchase?: number }[], method: 'Cash' | 'Transfer' | 'PagoMovil' | 'Card' | 'PointOfSale', businessDebt?: BusinessDebt) => {
    const now = Date.now();
    const totalUsd = items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    const totalBs = items.reduce((sum, item) => sum + ((item.costPriceBs || item.costPrice * exchangeRate) * item.quantity), 0);

    // Preparar items para guardar en la transacción (para poder revertir después)
    const purchaseItems = items.map(item => {
      const itemUnitsPerBulk = item.product.units_per_bulk ?? (item.product as any).unitsPerBulk ?? 0;
      const bulkQty = itemUnitsPerBulk > 0 ? itemUnitsPerBulk : 1;
      const unitCostUsd = item.costPrice / bulkQty;
      
      return {
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        costPrice: unitCostUsd,
        costPriceBs: item.costPriceBs || (unitCostUsd * exchangeRate)
      };
    });

    // Si hay deuda de negocio, registrar como pendiente (no descuenta de tesorería aún)
    if (businessDebt) {
      handleAddBusinessDebt(businessDebt);
      // Registrar en treasury como pendiente para que aparezca en movimientos
      const debtTransaction: TreasuryTransaction = {
        id: `debt_${now}`,
        timestamp: now,
        type: 'debt',
        category: 'Deuda Pendiente',
        description: businessDebt.title || 'Compra a crédito',
        amount: businessDebt.amountUsd,
        amountBs: businessDebt.amountBs,
        exchangeRate: exchangeRate,
        purchaseItems: purchaseItems,
        method: 'Credit'
      };
      await handleAddTreasuryTransaction(debtTransaction);
    } else {
      // Solo registrar gasto en tesorería si NO hay deuda
      const transaction: TreasuryTransaction = {
        id: `purchase_${now}`,
        timestamp: now,
        type: 'expense',
        category: 'Inventario',
        description: items.map(i => `${i.quantity} ${i.product.name}`).join(', '),
        amount: totalUsd,
        amountBs: totalBs,
        exchangeRate: exchangeRate,
        method: method,
        purchaseItems: purchaseItems
      };
      await handleAddTreasuryTransaction(transaction);
    }

    // Siempre actualizar el inventario
    const updatedProducts = [...products];
    for (const item of items) {
      const productIndex = updatedProducts.findIndex(p => p.id === item.product.id);
      const itemCostMode = (item.product as any).cost_mode || 'calculated';
      const itemUnitsPerBulk = item.product.units_per_bulk ?? (item.product as any).unitsPerBulk ?? 0;
      const bulkQty = itemUnitsPerBulk > 0 ? itemUnitsPerBulk : 1;

      // El costPrice en el carrito es SIEMPRE el costo por bulto completo.
      // Para guardar en el inventario necesitamos el costo UNITARIO.
      const unitCostUsd = item.costPrice / bulkQty;

      if (productIndex >= 0) {
        updatedProducts[productIndex] = {
          ...updatedProducts[productIndex],
          stock: updatedProducts[productIndex].stock + item.quantity,
          costPrice: unitCostUsd,
          cost_price: unitCostUsd,
          // En modo calculado: cost_bs es el costo unitario en Bs (item.costPriceBs ya es unitario)
          // En modo manual: no usamos cost_bs
          cost_bs: itemCostMode === 'calculated' ? (item.costPriceBs || 0) : 0,
          cost_date: itemCostMode === 'calculated' ? (item.product as any).cost_date || new Date().toISOString().split('T')[0] : '',
          cost_mode: itemCostMode
        };
      }
    }
    setProducts(updatedProducts);

    for (const item of items) {
      const itemCostMode = (item.product as any).cost_mode || 'calculated';
      const itemUnitsPerBulk = item.product.units_per_bulk ?? (item.product as any).unitsPerBulk ?? 0;
      const bulkQty = itemUnitsPerBulk > 0 ? itemUnitsPerBulk : 1;
      const unitCostUsd = item.costPrice / bulkQty;

      await saveData(`products/${item.product.id}`, {
        ...item.product,
        stock: item.product.stock + item.quantity,
        costPrice: unitCostUsd,
        cost_price: unitCostUsd,
        cost_bs: itemCostMode === 'calculated' ? (item.costPriceBs || 0) : 0,
        cost_date: itemCostMode === 'calculated' ? (item.product as any).cost_date || new Date().toISOString().split('T')[0] : '',
        cost_mode: itemCostMode
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
              <p className="text-xs font-black uppercase">Instala pointy Beta en tu pantalla</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setInstallPrompt(null)} className="px-3 py-1.5 text-xs font-bold bg-white/10 rounded-lg">Cerrar</button>
              <button onClick={handleInstallClick} className="px-4 py-1.5 text-xs font-black bg-white text-indigo-600 rounded-lg shadow-sm">Instalar</button>
            </div>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto p-4 md:p-8 ${view === 'pos' ? 'pb-0' : 'pb-24 md:pb-8'}`}>

          {view === 'dashboard' && <Dashboard sales={sales} products={products} customers={customers} exchangeRate={exchangeRate} />}
          {view === 'reports' && <VentasCaja sales={sales} products={products} customers={customers} workers={workers} businessDebts={businessDebts} exchangeRate={exchangeRate} rateHistory={rateHistory} treasuryTransactions={treasuryTransactions} categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} onOpenPOS={() => setView('pos')} onVoidSale={handleVoidSale} onEditSale={handleEditSale} onAddTreasuryTransaction={handleAddTreasuryTransaction} onUpdateTreasuryTransaction={handleUpdateTreasuryTransaction} onDeleteTreasuryTransaction={handleDeleteTreasuryTransaction} onClearAllTreasury={handleClearAllTreasuryTransactions} onOpenRateModal={() => setIsRateModalOpen(true)} onPurchaseProducts={handlePurchaseProducts} onAddProduct={handleProductAdd} onUpdateProduct={handleProductUpdate} onDebtPayment={handleDebtPayment} onWorkerDebtPayment={handleWorkerDebtPayment} onOpenWorkers={() => setView('customers')} onGoToInventory={() => setView('inventory')} />}
          {view === 'inventory' && <Inventory products={products} exchangeRate={exchangeRate} categories={categories} rateHistory={rateHistory} onAdd={handleProductAdd} onUpdate={handleProductUpdate} onDelete={handleProductDelete} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} />}
          {view === 'customers' && <Customers customers={customers} workers={workers} sales={sales} exchangeRate={exchangeRate} businessDebts={businessDebts} rateHistory={rateHistory} onAdd={handleCustomerAdd} onUpdate={handleCustomerUpdate} onDelete={handleCustomerDelete} onDebtPayment={handleDebtPayment} onAddWorker={handleWorkerAdd} onUpdateWorker={handleWorkerUpdate} onDeleteWorker={handleWorkerDelete} onWorkerDebtPayment={handleWorkerDebtPayment} onProcessPayroll={handleProcessPayroll} onAddBusinessDebt={handleAddBusinessDebt} onPayBusinessDebt={handlePayBusinessDebt} onUpdateBusinessDebt={handleUpdateBusinessDebt} onDeleteBusinessDebt={handleDeleteBusinessDebt} />}
          {view === 'settings' && <div className="p-4 bg-white rounded-3xl shadow-sm border border-gray-100">Panel de Configuración Integrado</div>}
        </div>

        {view === 'pos' && <div className="absolute inset-0 bg-gray-50 z-20"><POS products={products} customers={customers} workers={workers} exchangeRate={exchangeRate} rateHistory={rateHistory} onSale={handleSale} onUpdateRate={handleUpdateExchangeRate} onAddCustomer={handleCustomerAdd} onBackToDashboard={() => setView('reports')} initialCart={pendingCart} onCartLoaded={handleCartLoaded} /></div>}

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
              <span className="text-[10px] font-bold">Inventario</span>
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
              <span className="text-[10px] font-bold">Crédito</span>
            </button>

            {/* Estadísticas */}
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