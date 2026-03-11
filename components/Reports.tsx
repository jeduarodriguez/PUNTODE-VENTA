import React, { useState, useEffect } from 'react';
import { Sale, Customer, TreasuryTransaction, Product, ExchangeRateRecord, BusinessDebt, Worker } from '../types';
import { Wallet, Banknote, Smartphone, CreditCard, Search, Calendar, ChevronDown, ShoppingCart, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Trash2, Edit, X, Users, Banknote as BanknoteIcon, LayoutGrid, List, Clock, Plus } from '../constants';
import PurchasePOS from './PurchasePOS';
import { syncPath } from '../services/supabaseService';

type ViewMode = 'list' | 'grid';

interface ReportsProps {
    sales: Sale[];
    products: Product[];
    customers?: Customer[];
    workers?: Worker[];
    businessDebts?: BusinessDebt[];
    exchangeRate: number;
    treasuryTransactions?: TreasuryTransaction[];
    rateHistory?: ExchangeRateRecord[];
    categories?: string[];
    incomeCategories?: string[];
    expenseCategories?: string[];
    onAddCategory?: (category: string) => void;
    onDeleteCategory?: (category: string) => void;
    onAddIncomeCategory?: (category: string) => void;
    onDeleteIncomeCategory?: (category: string) => void;
    onAddExpenseCategory?: (category: string) => void;
    onDeleteExpenseCategory?: (category: string) => void;
    onOpenPOS: () => void;
    onVoidSale: (saleId: string) => void;
    onEditSale: (sale: Sale) => void;
    onAddTreasuryTransaction: (t: TreasuryTransaction) => void;
    onOpenRateModal?: () => void;
    onPurchaseProducts: (items: { product: Product; quantity: number; costPrice: number; costPriceBs?: number; rateAtPurchase?: number }[], method: 'Cash' | 'Transfer' | 'PagoMovil' | 'Card' | 'PointOfSale') => void;
    onAddProduct: (product: Product) => void;
    onUpdateProduct?: (product: Product) => void;
    onUpdateTreasuryTransaction?: (t: TreasuryTransaction) => void;
    onDeleteTreasuryTransaction?: (id: string) => void;
    onClearAllTreasury?: () => void;
    onOpenWorkers?: () => void;
    onGoToInventory?: () => void;
    onGoToInventoryWithProduct?: (product: Product) => void;
    onReturnFromInventory?: () => void;
    shouldShowPurchasePOS?: boolean;
    onClosePurchasePOS?: () => void;
    purchaseCart?: any[];
    onPurchaseCartChange?: (cart: any[]) => void;
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';
type PaymentMethod = 'Cash' | 'Card' | 'PagoMovil';

const VentasCaja: React.FC<ReportsProps> = ({ 
    sales, 
    products = [], 
    customers = [], 
    workers = [], 
    businessDebts = [], 
    exchangeRate, 
    treasuryTransactions = [], 
    rateHistory = [], 
    categories = [], 
    incomeCategories = [],
    expenseCategories = [],
    onAddCategory, 
    onDeleteCategory, 
    onAddIncomeCategory,
    onDeleteIncomeCategory,
    onAddExpenseCategory,
    onDeleteExpenseCategory,
    onOpenPOS, 
    onVoidSale, 
    onEditSale, 
    onAddTreasuryTransaction, 
    onOpenRateModal, 
    onPurchaseProducts, 
    onAddProduct, 
    onUpdateProduct, 
    onUpdateTreasuryTransaction, 
    onDeleteTreasuryTransaction, 
    onClearAllTreasury, 
    onOpenWorkers, 
    onGoToInventory, 
    onGoToInventoryWithProduct, 
    onReturnFromInventory, 
    shouldShowPurchasePOS, 
    onClosePurchasePOS, 
    purchaseCart, 
    onPurchaseCartChange 
}) => {
    const [editingTransaction, setEditingTransaction] = useState<TreasuryTransaction | null>(null);
    const [activeDetail, setActiveDetail] = useState<PaymentMethod | null>(null);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showExpenseTypeModal, setShowExpenseTypeModal] = useState(false);
    const [showPurchasePOS, setShowPurchasePOS] = useState(false);

    useEffect(() => {
        if (onReturnFromInventory) {
            onReturnFromInventory();
        }
    }, [onReturnFromInventory]);

    useEffect(() => {
        if (shouldShowPurchasePOS) {
            setShowPurchasePOS(true);
        }
    }, [shouldShowPurchasePOS]);

    const handleClosePurchasePOS = () => {
        setShowPurchasePOS(false);
        onClosePurchasePOS?.();
    };
    const [showVentasMenu, setShowVentasMenu] = useState(false);
    const [ventasOption, setVentasOption] = useState<'pos' | 'income' | 'recharge' | null>(null);
    const [incomeAmount, setIncomeAmount] = useState('');
    const [incomeRate, setIncomeRate] = useState('');
    const [incomeCategory, setIncomeCategory] = useState('Otros');
    const [incomeDescription, setIncomeDescription] = useState('');
    const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [rechargeFee, setRechargeFee] = useState('');
    const [rechargeMethod, setRechargeMethod] = useState<'Cash' | 'PagoMovil'>('Cash');
    const [rechargeReference, setRechargeReference] = useState('');
    const [rechargeDate, setRechargeDate] = useState(new Date().toISOString().split('T')[0]);
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseCategory, setExpenseCategory] = useState<string>('Otros');
    const [expenseMethod, setExpenseMethod] = useState<'Cash' | 'Transfer' | 'PagoMovil' | 'Card'>('Cash');
    const [expenseMethodLabel, setExpenseMethodLabel] = useState<'Bs' | '$'>('$');
    const [dateFilter, setDateFilter] = useState<DateFilter>(() => {
      const saved = localStorage.getItem('pointy_date_filter');
      return (saved as DateFilter) || 'today';
    });
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    useEffect(() => {
      localStorage.setItem('pointy_date_filter', dateFilter);
    }, [dateFilter]);
    const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<TreasuryTransaction | null>(null);

    // --- ESTADOS PARA TESORERÍA UNIFICADA ---
    const [isTreasuryModalOpen, setIsTreasuryModalOpen] = useState(false);
    const [treasuryType, setTreasuryType] = useState<'income' | 'expense'>('income');
    const [treasuryAmount, setTreasuryAmount] = useState('');
    const [treasuryDescription, setTreasuryDescription] = useState('');
    const [treasuryCategory, setTreasuryCategory] = useState<string>('Otros');
    const [treasuryMethod, setTreasuryMethod] = useState<TreasuryTransaction['method']>('Cash');
    const [treasuryCurrency, setTreasuryCurrency] = useState<'Bs' | '$'>('$');
    const [treasuryDate, setTreasuryDate] = useState(new Date().toISOString().split('T')[0]);
    const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const getRateForDate = (dateStr: string) => {
        if (!dateStr) return exchangeRate;
        const targetDate = new Date(dateStr + 'T12:00:00').getTime();
        const sortedHistory = [...rateHistory].sort((a, b) => b.timestamp - a.timestamp);
        const match = sortedHistory.find(r => {
            const rDate = new Date(r.timestamp);
            return new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate()).getTime() <= targetDate;
        });
        return match ? match.rate : (sortedHistory[sortedHistory.length - 1]?.rate || exchangeRate);
    };

    const currentRateForSelectedDate = getRateForDate(treasuryDate);

    const handleOpenTreasury = (type: 'income' | 'expense') => {
        setTreasuryType(type);
        setTreasuryAmount('');
        setTreasuryDescription('');
        setTreasuryCategory('Otros');
        setTreasuryMethod('Cash');
        setTreasuryCurrency('$');
        setTreasuryDate(new Date().toISOString().split('T')[0]);
        setIsTreasuryModalOpen(true);
        setShowVentasMenu(false);
        setShowExpenseTypeModal(false);
    };

    const handleSaveTreasuryAction = () => {
        const amount = parseFloat(treasuryAmount);
        if (!amount || amount <= 0) return;

        const timestamp = new Date(treasuryDate + 'T12:00:00').getTime();
        const rate = getRateForDate(treasuryDate);
        
        const amountUsd = treasuryCurrency === '$' ? amount : amount / rate;
        const amountBs = treasuryCurrency === 'Bs' ? amount : amount * rate;

        const transaction: TreasuryTransaction = {
            id: `${treasuryType}_${Date.now()}`,
            timestamp,
            type: treasuryType,
            category: treasuryCategory,
            description: treasuryDescription || `${treasuryType === 'income' ? 'Ingreso' : 'Egreso'}: ${treasuryCategory}`,
            amount: amountUsd,
            amountBs: amountBs,
            exchangeRate: rate,
            method: treasuryMethod
        };

        onAddTreasuryTransaction(transaction);
        setIsTreasuryModalOpen(false);
    };

    const handleAddReportCategory = () => {
        if (!newCategoryName.trim()) return;
        if (treasuryType === 'income') {
            onAddIncomeCategory?.(newCategoryName);
        } else {
            onAddExpenseCategory?.(newCategoryName);
        }
        setNewCategoryName('');
        setShowAddCategoryInput(false);
    };
    const [quickNavOffset, setQuickNavOffset] = useState(0);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editDate, setEditDate] = useState<string>('');
    const [editAmount, setEditAmount] = useState<string>('');
    const [editTransactionAmount, setEditTransactionAmount] = useState<string>('');
    const [editTransactionDescription, setEditTransactionDescription] = useState<string>('');
    const [editTransactionDate, setEditTransactionDate] = useState<string>('');
    const [editTransactionRate, setEditTransactionRate] = useState<string>('');
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('reports_view') as ViewMode) || 'list');

    useEffect(() => { localStorage.setItem('reports_view', viewMode); }, [viewMode]);

    const daysOfWeek = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

    const getSelectedDate = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        if (dateFilter === 'today') {
            const targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + quickNavOffset);
            const targetTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
            if (targetTime > today) return now;
            return targetDate;
        }
        return now;
    };

    const getQuickNavItems = () => {
        const now = new Date();
        const fullMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const fullDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        if (dateFilter === 'today') {
            const currentDate = new Date(now);
            currentDate.setDate(currentDate.getDate() + quickNavOffset);
            return [{
                label: `${fullDays[currentDate.getDay()]} ${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`,
                date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime()
            }];
        } else if (dateFilter === 'week') {
            const currentWeekStart = new Date(now);
            const dayOfWeek = currentWeekStart.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            currentWeekStart.setDate(currentWeekStart.getDate() + mondayOffset + (quickNavOffset * 7));
            const currentWeekEnd = new Date(currentWeekStart);
            currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
            return [{
                label: `${fullDays[currentWeekStart.getDay()]} ${currentWeekStart.getDate().toString().padStart(2, '0')}/${(currentWeekStart.getMonth() + 1).toString().padStart(2, '0')} - ${fullDays[currentWeekEnd.getDay()]} ${currentWeekEnd.getDate().toString().padStart(2, '0')}/${(currentWeekEnd.getMonth() + 1).toString().padStart(2, '0')}`,
                startDate: new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate()).getTime(),
                endDate: new Date(currentWeekEnd.getFullYear(), currentWeekEnd.getMonth(), currentWeekEnd.getDate()).getTime()
            }];
        } else if (dateFilter === 'month') {
            const currentMonthDate = new Date(now.getFullYear(), now.getMonth() + quickNavOffset, 1);
            return [{
                label: fullMonths[currentMonthDate.getMonth()],
                month: currentMonthDate.getMonth(),
                year: currentMonthDate.getFullYear()
            }];
        }
        return [];
    };

    const getTodayString = () => {
        return new Date().toISOString().split('T')[0];
    };

    const canNavigateForward = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        if (dateFilter === 'today') {
            const targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + quickNavOffset);
            const targetTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
            return targetTime < today;
        } else if (dateFilter === 'week') {
            const currentWeekStart = new Date(now);
            const dayOfWeek = currentWeekStart.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            currentWeekStart.setDate(currentWeekStart.getDate() + mondayOffset + (quickNavOffset * 7));
            const weekTime = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate()).getTime();
            return weekTime < today;
        }
        return false;
    };

    const getFilterRange = () => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        if (dateFilter === 'custom') {
            const start = customStartDate ? new Date(customStartDate).getTime() : startOfToday;
            const end = customEndDate ? new Date(customEndDate).getTime() + (24 * 60 * 60 * 1000) - 1 : Infinity;
            return { start, end };
        }

        const selectedDate = getSelectedDate();
        const selectedStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();

        switch (dateFilter) {
            case 'today': return { start: selectedStart, end: selectedStart + (24 * 60 * 60 * 1000) - 1 };
            case 'week': {
                const weekStart = new Date(selectedDate);
                const dayOfWeek = weekStart.getDay();
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                weekStart.setDate(weekStart.getDate() + mondayOffset);
                const start = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
                const end = start + (7 * 24 * 60 * 60 * 1000) - 1;
                return { start, end };
            }
            case 'month': {
                const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getTime();
                const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getTime();
                return { start: monthStart, end: monthEnd };
            }
        }
    };

    const { start: filterStart, end: filterEnd } = getFilterRange();

    const getTodayRate = (): number => {
        if (!rateHistory || rateHistory.length === 0) return exchangeRate;
        
        // Ordenar por timestamp descendente y devolver la tasa más reciente
        const sortedRates = [...rateHistory].sort((a, b) => b.timestamp - a.timestamp);
        
        // Devolver siempre la tasa más reciente registrada
        return sortedRates[0]?.rate || exchangeRate;
    };

    const getDisplayedExchangeRate = () => {
        return getTodayRate();
    };

    const currentSales = sales.filter(s => s.timestamp >= filterStart && s.timestamp <= filterEnd).sort((a, b) => b.timestamp - a.timestamp);
    const currentTransactions = treasuryTransactions.filter(t => t.timestamp >= filterStart && t.timestamp <= filterEnd).sort((a, b) => b.timestamp - a.timestamp);
    
    // Filtrar ventas que ya tienen transacción de tesorería (evitar duplicación)
    // Incluye ventas normales (sale_), pagos de deuda de clientes (debt_payment_) y trabajadores (worker_debt_payment_)
    const salesWithTreasury = new Set([
        ...currentTransactions.filter(t => t.id.startsWith('sale_')).map(t => t.id.replace('sale_', '')),
        ...currentTransactions.filter(t => t.id.startsWith('debt_payment_')).map(t => t.id.replace('debt_payment_', '')),
        ...currentTransactions.filter(t => t.id.startsWith('worker_debt_payment_')).map(t => t.id.replace('worker_debt_payment_', ''))
    ]);
    const salesOnly = currentSales.filter(s => !salesWithTreasury.has(s.id));
    
    const allMovements = [
        ...salesOnly.map(s => ({ type: 'sale' as const, data: s })),
        ...currentTransactions.map(t => ({ type: 'transaction' as const, data: t }))
    ].sort((a, b) => {
        const aTime = a.type === 'sale' ? a.data.timestamp : a.data.timestamp;
        const bTime = b.type === 'sale' ? b.data.timestamp : b.data.timestamp;
        return bTime - aTime;
    });

    const filteredMovements = allMovements.filter(item => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        
        if (item.type === 'sale') {
            const s = item.data;
            const totalBs = (s.total * s.exchangeRate).toFixed(2);
            const matchesItems = s.items.some(i => i.name.toLowerCase().includes(term));
            const matchesAmount = totalBs.includes(term);
            return matchesItems || matchesAmount;
        } else {
            const t = item.data;
            const matchesDesc = t.description.toLowerCase().includes(term);
            const matchesAmount = t.amountBs.toFixed(2).includes(term);
            return matchesDesc || matchesAmount;
        }
    });

    const salesCashBs = treasuryTransactions.filter(t => t.type === 'income' && t.method === 'Cash' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amountBs, 0);
    const salesPagoMovilBs = treasuryTransactions.filter(t => t.type === 'income' && t.method === 'PagoMovil' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amountBs, 0);
    const salesCardBs = treasuryTransactions.filter(t => t.type === 'income' && (t.method === 'Card' || t.method === 'PointOfSale') && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amountBs, 0);
    const salesCashUsd = treasuryTransactions.filter(t => t.type === 'income' && t.method === 'Cash' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amount, 0);
    const salesPagoMovilUsd = treasuryTransactions.filter(t => t.type === 'income' && t.method === 'PagoMovil' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amount, 0);
    const salesCardUsd = treasuryTransactions.filter(t => t.type === 'income' && (t.method === 'Card' || t.method === 'PointOfSale') && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amount, 0);
    const totalSalesBs = salesCashBs + salesCardBs + salesPagoMovilBs;
    const totalSalesBsFiltered = treasuryTransactions.filter(t => t.type === 'income' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amountBs, 0);
    const totalSalesUsdFiltered = treasuryTransactions.filter(t => t.type === 'income' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amount, 0);
    const expensesBs = treasuryTransactions.filter(t => t.type === 'expense' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amountBs, 0);
    const expensesUsd = treasuryTransactions.filter(t => t.type === 'expense' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amount, 0);
    const incomeBs = treasuryTransactions.filter(t => t.type === 'income' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amountBs, 0);
    const incomeUsd = treasuryTransactions.filter(t => t.type === 'income' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amount, 0);
    const netBalanceUsd = totalSalesUsdFiltered - expensesUsd;
    const bankTransactions = treasuryTransactions.filter(t => t.method !== 'Cash');
    const bankBalanceFromTxs = bankTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amountBs : -t.amountBs), 0);
    
    // Calcular balances TOTALES acumulados (no solo del filtro)
    const efectivoIngresosTotal = treasuryTransactions.filter(t => t.type === 'income' && t.method === 'Cash').reduce((sum, t) => sum + t.amountBs, 0);
    const efectivoGastosTotal = treasuryTransactions.filter(t => t.type === 'expense' && t.method === 'Cash').reduce((sum, t) => sum + t.amountBs, 0);
    const efectivoBalanceTotal = efectivoIngresosTotal - efectivoGastosTotal;
    const efectivoUsdTotal = exchangeRate > 0 ? efectivoBalanceTotal / exchangeRate : 0;
    
    const bancoIngresosTotal = treasuryTransactions.filter(t => t.type === 'income' && t.method !== 'Cash').reduce((sum, t) => sum + t.amountBs, 0);
    const bancoGastosTotal = treasuryTransactions.filter(t => t.type === 'expense' && t.method !== 'Cash').reduce((sum, t) => sum + t.amountBs, 0);
    const bancoBalanceTotal = bancoIngresosTotal - bancoGastosTotal;
    const bancoUsdTotal = exchangeRate > 0 ? bancoBalanceTotal / exchangeRate : 0;
    
    // Calcular balances por método de pago (solo del filtro)
    const efectivoIngresos = treasuryTransactions.filter(t => t.type === 'income' && t.method === 'Cash' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amountBs, 0);
    const efectivoGastos = treasuryTransactions.filter(t => t.type === 'expense' && t.method === 'Cash' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amountBs, 0);
    const efectivoBalance = efectivoIngresos - efectivoGastos;
    
    const bancoIngresos = treasuryTransactions.filter(t => t.type === 'income' && t.method !== 'Cash' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amountBs, 0);
    const bancoGastos = treasuryTransactions.filter(t => t.type === 'expense' && t.method !== 'Cash' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amountBs, 0);
    const bancoBalance = bancoIngresos - bancoGastos;

    // Créditos del período
    const creditSales = treasuryTransactions.filter(t => t.type === 'income' && t.method === 'Credit' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amount, 0);

    // Calcular DEUDAS POR COBRAR (clientes + trabajadores)
    const customerDebtTotal = customers?.reduce((sum, c) => sum + (c.balance || 0), 0) || 0;
    const workerDebtTotal = workers?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0;
    const totalPorCobrar = customerDebtTotal + workerDebtTotal;
    const porCobrarBs = totalPorCobrar * exchangeRate;

    // Calcular DEUDAS POR PAGAR (businessDebts + salarios trabajadores)
    const unpaidBusinessDebts = businessDebts?.filter(d => !d.isPaid) || [];
    
    // Deuda en Bs (se mantiene fija en Bs)
    const deudaBsEnBs = unpaidBusinessDebts
        .filter(d => d.currencyType === 'bs')
        .reduce((sum, d) => sum + d.amountBs, 0);
    
    // Deuda en USD (se convierte a Bs con tasa actual)
    const deudaUsdEnBs = unpaidBusinessDebts
        .filter(d => d.currencyType === 'usd')
        .reduce((sum, d) => sum + (d.amountUsd * exchangeRate), 0);
    
    // Total deuda negocio en Bs
    const deudaNegocioBs = deudaBsEnBs + deudaUsdEnBs;
    
    // Total deuda negocio en USD (ambas convertidas a USD con tasa actual para referencia)
    const deudaBsEnUsd = exchangeRate > 0 ? deudaBsEnBs / exchangeRate : 0;
    const deudaUsdEnUsd = unpaidBusinessDebts
        .filter(d => d.currencyType === 'usd')
        .reduce((sum, d) => sum + d.amountUsd, 0);
    const deudaNegocioUsd = deudaBsEnUsd + deudaUsdEnUsd;
    
    // Agregar salarios de trabajadores (en USD, convertir a Bs con tasa actual)
    const totalSalarios = workers?.reduce((sum, w) => sum + (w.salary || 0), 0) || 0;
    const totalSalariosBs = totalSalarios * exchangeRate;
    
    const deudaPorPagarTotalBs = deudaNegocioBs + totalSalariosBs;
    const deudaPorPagarTotalUsd = deudaNegocioUsd + totalSalarios;

    const handleAddExpense = () => {
        const amount = parseFloat(expenseAmount);
        if (!amount || isNaN(amount) || amount <= 0) return;
        
        // Si hay una transacción siendo editada, eliminarla primero
        if (editingTransaction && onDeleteTreasuryTransaction) {
            onDeleteTreasuryTransaction(editingTransaction.id);
            setEditingTransaction(null);
        }
        
        const now = Date.now();
        const currentRate = exchangeRate;
        const amountInBs = expenseMethodLabel === '$' ? amount * currentRate : amount;
        const transaction: TreasuryTransaction = {
            id: `expense_${now}`,
            timestamp: now,
            type: 'expense',
            category: expenseCategory as any,
            description: expenseDescription || `Gasto: ${expenseCategory}`,
            amount: expenseMethodLabel === '$' ? amount : amount / currentRate,
            amountBs: amountInBs,
            exchangeRate: currentRate,
            method: expenseMethod
        };
        onAddTreasuryTransaction(transaction);
        setShowExpenseModal(false);
        setExpenseAmount('');
        setExpenseDescription('');
        setExpenseCategory('Otros');
        setExpenseMethod('Cash');
        setExpenseMethodLabel('$');
    };

    const getSaleDescription = (sale: Sale) => {
        if (sale.items.length === 0) return "Venta sin items";
        return sale.items.map(item => item.id === 'debt_payment' ? item.name : `${item.quantity} ${item.name}`).join(', ');
    };

    const handleVoid = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedSale) return;
        if (window.confirm("Eliminar esta venta?")) {
            onVoidSale(selectedSale.id);
            setSelectedSale(null);
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedSale) return;
        if (window.confirm("Se anulara para corregir. Continuar?")) {
            onEditSale(selectedSale);
            setSelectedSale(null);
        }
    };

    const handleOpenTransactionEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedTransaction) return;
        setEditingTransactionId(selectedTransaction.id);
        setEditTransactionAmount(selectedTransaction.amount.toString());
        setEditTransactionDescription(selectedTransaction.description);
        // Cargar fecha y tasa guardadas
        const transDate = new Date(selectedTransaction.timestamp);
        setEditTransactionDate(transDate.toISOString().split('T')[0]);
        setEditTransactionRate(selectedTransaction.exchangeRate.toString());
        // Cerrar modal de visualización y abrir el de edición
        setSelectedTransaction(null);
    };

    const handleSaveTransactionEdit = () => {
        if (!editTransactionDate || !editingTransactionId || !onUpdateTreasuryTransaction) return;
        
        // Buscar la transacción original en treasuryTransactions
        const originalTransaction = treasuryTransactions.find(t => t.id === editingTransactionId);
        if (!originalTransaction) return;
        
        const newAmount = parseFloat(editTransactionAmount.replace(',', '.'));
        const newRate = parseFloat(editTransactionRate.replace(',', '.'));
        if (isNaN(newAmount) || newAmount <= 0 || isNaN(newRate) || newRate <= 0) return;
        
        const newTimestamp = new Date(editTransactionDate + 'T12:00:00').getTime();
        
        // Crear transacción con los valores editados - preservar tipo original
        const updatedTransaction: TreasuryTransaction = {
            ...originalTransaction,
            timestamp: newTimestamp,
            amount: newAmount,
            exchangeRate: newRate,
            amountBs: newAmount * newRate, // Recalcular amountBs correctamente
            description: editTransactionDescription
        };
        
        onUpdateTreasuryTransaction(updatedTransaction);
        
        // Limpiar estados
        setEditingTransactionId(null);
        setEditTransactionDate('');
        setEditTransactionAmount('');
        setEditTransactionDescription('');
        setEditTransactionRate('');
    };

    const handleDeleteTransaction = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedTransaction || !onDeleteTreasuryTransaction) return;
        if (window.confirm("Eliminar este movimiento?")) {
            onDeleteTreasuryTransaction(selectedTransaction.id);
            setSelectedTransaction(null);
        }
    };

    const getCurrentFilterDate = () => {
        const now = new Date();
        const shortDays = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
        const shortMonths = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const fullMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        if (dateFilter === 'today') {
            const currentDate = new Date(now);
            currentDate.setDate(currentDate.getDate() + quickNavOffset);
            return `${shortDays[currentDate.getDay()]} ${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
        } else if (dateFilter === 'week') {
            const currentWeekStart = new Date(now);
            const dayOfWeek = currentWeekStart.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            currentWeekStart.setDate(currentWeekStart.getDate() + mondayOffset + (quickNavOffset * 7));
            const currentWeekEnd = new Date(currentWeekStart);
            currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
            return `${shortDays[currentWeekStart.getDay()]} ${currentWeekStart.getDate()} - ${shortDays[currentWeekEnd.getDay()]} ${currentWeekEnd.getDate()} ${shortMonths[currentWeekEnd.getMonth()]}`;
        } else if (dateFilter === 'month') {
            const currentMonthDate = new Date(now.getFullYear(), now.getMonth() + quickNavOffset, 1);
            return fullMonths[currentMonthDate.getMonth()];
        }
        return '';
    };

    const getDetailSales = () => {
        if (!activeDetail) return [];
        return currentSales.filter(s => 
            s.paymentMethod === activeDetail && 
            s.timestamp >= filterStart && 
            s.timestamp <= filterEnd
        );
    };

    const getMethodInfo = (method: PaymentMethod) => {
        switch (method) {
            case 'Cash': return { label: 'Efectivo', color: 'emerald', icon: Banknote };
            case 'Card': return { label: 'Punto', color: 'blue', icon: CreditCard };
            case 'PagoMovil': return { label: 'Pago Movil', color: 'purple', icon: Smartphone };
        }
    };

    const getCustomerName = (customerId?: string) => {
        if (!customerId) return 'Cliente';
        const customer = customers.find(c => c.id === customerId);
        if (customer) return customer.name;
        const worker = workers?.find(w => w.id === customerId);
        return worker?.name || 'Cliente';
    };

    return (
        <div className="space-y-3 pb-24 animate-fade-in relative">
            {showSearchInput && (
                <div className="fixed inset-0 z-[80] bg-white flex flex-col">
                    <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-gray-50">
                        <button onClick={() => setShowSearchInput(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex-1 flex items-center bg-gray-100 rounded-xl px-3 py-2">
                            <Search className="w-4 h-4 text-gray-400 mr-2" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar movimientos..."
                                className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 text-sm font-bold outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="p-1 hover:bg-gray-200 rounded-full">
                                    <span className="w-4 h-4 flex items-center justify-center text-gray-500">×</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {currentSales.map(sale => {
                            const matchesSearch = !searchTerm || 
                                sale.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                (sale.total * sale.exchangeRate).toFixed(2).includes(searchTerm);
                            if (!matchesSearch) return null;
                            const isCash = sale.paymentMethod === 'Cash';
                            const isCredit = sale.paymentMethod === 'Credit';
                            return (
                                <div key={sale.id} onClick={() => { setSelectedSale(sale); setShowSearchInput(false); }} className="p-3 bg-gray-50 rounded-xl cursor-pointer active:scale-[0.99] transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isCash ? 'bg-emerald-100 text-emerald-600' : isCredit ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {isCash ? <Banknote className="w-6 h-6" /> : isCredit ? <Wallet className="w-6 h-6" /> : sale.paymentMethod === 'PagoMovil' ? <Smartphone className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-gray-800 truncate">{sale.items.some(i => i.id === 'debt_payment') ? "Pago de Deuda" : sale.items.map(i => `${i.quantity} ${i.name}`).join(', ')}</p>
                                                <p className="text-[10px] text-gray-400">{new Date(sale.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} • {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            {isCredit ? (
                                                <>
                                                    <p className="text-lg font-black text-orange-500">${sale.total.toFixed(2)}</p>
                                                    <p className="text-[9px] text-orange-300">Bs {(sale.total * sale.exchangeRate).toFixed(2)}</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-lg font-black text-gray-900">{(sale.total * sale.exchangeRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs</p>
                                                    <p className="text-[9px] text-gray-400">${sale.total.toFixed(2)}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {currentSales.filter(sale => {
                            return !searchTerm || 
                                sale.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                (sale.total * sale.exchangeRate).toFixed(2).includes(searchTerm);
                        }).length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 opacity-40">
                                <Search className="w-12 h-12 text-gray-300 mb-2" />
                                <p className="text-sm font-bold text-gray-400">Sin resultados</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {showSearchInput && (
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowSearchInput(false)}>
                        <div className="absolute top-12 left-0 right-0 bg-white shadow-2xl z-[70] flex flex-col max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-gray-50">
                                <Search className="w-4 h-4 text-gray-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Buscar movimiento..."
                                    className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 text-sm font-bold outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button onClick={() => setShowSearchInput(false)} className="p-1 bg-gray-200 rounded-full">
                                    <span className="w-4 h-4 flex items-center justify-center text-gray-500">×</span>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {filteredMovements.map((item) => (
                                    <div 
                                        key={item.type === 'sale' ? item.data.id : item.data.id} 
                                        onClick={() => {
                                            if (item.type === 'sale') {
                                                setSelectedSale(item.data);
                                                setShowSearchInput(false);
                                            } else {
                                                const t = item.data;
                                                // Según el tipo de transacción,abrir el flujo completo de edición
                                                if (t.type === 'expense' && t.category === 'Inventario') {
                                                    // Es compra de inventario - abrir PurchasePOS
                                                    setEditingTransaction(t);
                                                    setShowPurchasePOS(true);
                                                    setShowSearchInput(false);
                                                } else if (t.type === 'expense') {
                                                    // Es gasto - abrir modal de gasto
                                                    setExpenseAmount(t.amount.toString());
                                                    setExpenseDescription(t.description);
                                                    setExpenseCategory(t.category);
                                                    setExpenseMethod(t.method as any);
                                                    setShowExpenseModal(true);
                                                    setShowSearchInput(false);
                                                } else if (t.type === 'income') {
                                                    // Es ingreso/venta - abrir POS de ventas
                                                    onOpenPOS();
                                                    setShowSearchInput(false);
                                                } else if (t.type === 'debt') {
                                                    // Es deuda - abrir flujo de clientes
                                                    onOpenWorkers?.();
                                                    setShowSearchInput(false);
                                                }
                                            }
                                        }}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                item.type === 'sale' 
                                                    ? (item.data.paymentMethod === 'Cash' ? 'bg-emerald-100 text-emerald-600' : item.data.paymentMethod === 'Credit' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600')
                                                    : (item.data.type === 'expense' ? 'bg-red-100 text-red-600' : item.data.type === 'debt' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600')
                                            }`}>
                                                {item.type === 'sale' ? (
                                                    item.data.paymentMethod === 'Cash' ? <Banknote className="w-4 h-4" /> : 
                                                    item.data.paymentMethod === 'Credit' ? <Wallet className="w-4 h-4" /> : 
                                                    item.data.paymentMethod === 'PagoMovil' ? <Smartphone className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />
                                                ) : (
                                                    item.data.type === 'expense' ? <TrendingDown className="w-4 h-4" /> : item.data.type === 'debt' ? <Clock className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-gray-800 truncate">
                                                    {item.type === 'sale' 
                                                        ? (item.data.items.some(i => i.id === 'debt_payment') ? "Pago de Deuda" : item.data.items.map(i => `${i.quantity} ${i.name}`).join(', '))
                                                        : item.data.description
                                                    }
                                                </p>
                                                <p className="text-[10px] text-gray-400">{new Date(item.data.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-black ${item.type === 'sale' ? 'text-gray-900' : (item.data.type === 'expense' ? 'text-red-600' : item.data.type === 'debt' ? 'text-orange-600' : 'text-emerald-600')}`}>
                                            {item.type === 'sale' 
                                                ? `${(item.data.total * item.data.exchangeRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs`
                                                : `${item.data.type === 'expense' ? '-' : item.data.type === 'debt' ? '⏳' : '+'}${item.data.amountBs.toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs`
                                            }
                                        </span>
                                    </div>
                                ))}
                                {filteredMovements.length === 0 && (
                                    <div className="py-8 text-center opacity-40"><p className="text-xs font-bold text-gray-400">Sin resultados</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* BALANCE PRINCIPAL - 4 paneles en grid ARRIBA */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {/* EFECTIVO */}
                    <div className={`p-3 rounded-xl ${efectivoBalanceTotal >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Banknote className="w-4 h-4 text-white" />
                            <span className="text-[9px] font-black uppercase text-white">Efectivo</span>
                        </div>
                        <p className="text-lg font-black text-white text-center">{efectivoBalanceTotal >= 0 ? '' : '-'}{Math.abs(efectivoBalanceTotal).toLocaleString('es-CO', { maximumFractionDigits: 0 })} Bs</p>
                        <p className="text-xs font-bold text-white/80 text-center">${Math.abs(efectivoUsdTotal).toFixed(2)}</p>
                    </div>
                    
                    {/* BANCO */}
                    <div className={`p-3 rounded-xl ${bancoBalanceTotal >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <CreditCard className="w-4 h-4 text-white" />
                            <span className="text-[9px] font-black uppercase text-white">Banco</span>
                        </div>
                        <p className="text-lg font-black text-white text-center">{bancoBalanceTotal >= 0 ? '' : '-'}{Math.abs(bancoBalanceTotal).toLocaleString('es-CO', { maximumFractionDigits: 0 })} Bs</p>
                        <p className="text-xs font-bold text-white/80 text-center">${Math.abs(bancoUsdTotal).toFixed(2)}</p>
                    </div>
                    
                    {/* X COBRAR */}
                    <div className="p-3 rounded-xl bg-orange-500">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendingUp className="w-4 h-4 text-white" />
                            <span className="text-[9px] font-black uppercase text-white">X Cobrar</span>
                        </div>
                        <p className="text-lg font-black text-white text-center">${totalPorCobrar.toFixed(2)}</p>
                        <p className="text-xs font-bold text-white/80 text-center">{porCobrarBs.toLocaleString('es-CO', { maximumFractionDigits: 0 })} Bs</p>
                    </div>
                    
                    {/* X PAGAR */}
                    <div className="p-3 rounded-xl bg-red-600">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendingDown className="w-4 h-4 text-white" />
                            <span className="text-[9px] font-black uppercase text-white">X Pagar</span>
                        </div>
                        <p className="text-lg font-black text-white text-center">${deudaPorPagarTotalUsd.toFixed(2)}</p>
                        <p className="text-xs font-bold text-white/80 text-center">{deudaPorPagarTotalBs.toLocaleString('es-CO', { maximumFractionDigits: 0 })} Bs</p>
                        {deudaBsEnBs > 0 && (
                            <p className="text-[8px] font-bold text-white/60 text-center mt-0.5">
                                (Fija: Bs {deudaBsEnBs.toLocaleString('es-CO', { maximumFractionDigits: 0 })})
                            </p>
                        )}
                    </div>
                </div>

                {/* PANEL BCV Y FILTROS */}
                <div className="bg-indigo-900 text-white p-3 rounded-xl shadow-xl relative overflow-hidden mb-3">
                    <div className="flex items-center justify-between gap-2 relative z-10">
                        <button onClick={onOpenRateModal} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-all shrink-0">
                            <span className="text-xs font-bold">BCV</span>
                            <span className="text-xs font-bold">{getDisplayedExchangeRate().toFixed(2)}</span>
                        </button>
                        {onClearAllTreasury && (treasuryTransactions.length > 0 || sales.length > 0) && (
                            <button onClick={onClearAllTreasury} className="flex items-center gap-1 px-2 py-1.5 bg-red-500 hover:bg-red-400 text-white rounded-lg transition-all shrink-0" title="Limpiar movimientos">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                        <div className="relative">
                            <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-white/20 transition-colors">
                                <span className="text-xs font-bold truncate max-w-[60px]">
                                    {dateFilter === 'today' ? 'Día' : dateFilter === 'week' ? 'Semana' : dateFilter === 'month' ? 'Mes' : 'Personalizado'}
                                </span>
                                <ChevronDown className={`w-3 h-3 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showFilterDropdown && (
                                <div className="fixed inset-0 z-[60]" onClick={() => setShowFilterDropdown(false)}>
                                    <div className="absolute top-10 right-0 bg-white rounded-lg shadow-xl z-[70] w-32 p-1" onClick={(e) => e.stopPropagation()}>
                                        <div className="space-y-1">
                                            {[
                                                { value: 'today', label: 'Día' },
                                                { value: 'week', label: 'Semana' },
                                                { value: 'month', label: 'Mes' },
                                                { value: 'custom', label: 'Personalizado' }
                                            ].map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => {
                                                        if (opt.value === 'custom') {
                                                            setShowCustomDatePicker(true);
                                                            setShowFilterDropdown(false);
                                                        } else {
                                                            setDateFilter(opt.value as DateFilter);
                                                            setQuickNavOffset(0);
                                                            setShowFilterDropdown(false);
                                                        }
                                                    }}
                                                    className={`w-full px-3 py-2 text-xs font-bold rounded-md text-left transition-colors ${
                                                        dateFilter === opt.value
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {showCustomDatePicker && (
                                <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCustomDatePicker(false)}>
                                    <div className="bg-white rounded-xl p-4 w-full max-w-xs shadow-xl" onClick={(e) => e.stopPropagation()}>
                                        <h3 className="font-bold text-gray-900 mb-3 text-center text-sm">Rango de Fechas</h3>
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Desde</label>
                                                <input type="date" max={getTodayString()} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold mt-1" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Hasta</label>
                                                <input type="date" max={getTodayString()} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold mt-1" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            <button onClick={() => { setShowCustomDatePicker(false); setDateFilter('today'); setCustomStartDate(''); setCustomEndDate(''); }} className="py-2 bg-gray-100 text-gray-600 rounded-lg font-bold text-xs">Cancelar</button>
                                            <button onClick={() => { if (customStartDate && customEndDate) { setDateFilter('custom'); setQuickNavOffset(0); } setShowCustomDatePicker(false); }} className="py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs">Aplicar</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500 rounded-full blur-[40px] opacity-20 pointer-events-none"></div>
                </div>

                {/* NAVEGACION DE FECHAS */}
                <div className="flex items-center justify-between gap-2 px-2 mb-3">
                    <button onClick={() => setQuickNavOffset(prev => prev - 1)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <div className="flex-1 text-center">
                        {getQuickNavItems().map((item, idx) => (
                            <span key={idx} className="text-xs font-bold text-gray-700">{item.label}</span>
                        ))}
                    </div>
                    <button 
                        onClick={() => setQuickNavOffset(prev => prev + 1)} 
                        disabled={canNavigateForward()}
                        className={`p-1 rounded-lg transition-colors ${canNavigateForward() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                    >
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* BALANCE INGRESO/BALANCE/EGRESO */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-emerald-100 rounded-xl p-2 flex flex-col items-center">
                        <span className="text-[8px] font-black text-emerald-600 uppercase">Ingreso</span>
                        <p className="text-sm font-black text-emerald-800">+{totalSalesBsFiltered.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                        <p className="text-[9px] font-bold text-emerald-500">${totalSalesUsdFiltered.toFixed(2)}</p>
                    </div>

                    <div className={`rounded-xl p-2 flex flex-col items-center ${(totalSalesBsFiltered - expensesBs) >= 0 ? 'bg-indigo-100' : 'bg-orange-100'}`}>
                        <span className={`text-[8px] font-black uppercase ${(totalSalesBsFiltered - expensesBs) >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>Balance</span>
                        <p className={`text-sm font-black ${(totalSalesBsFiltered - expensesBs) >= 0 ? 'text-indigo-800' : 'text-orange-800'}`}>
                            {(totalSalesBsFiltered - expensesBs) >= 0 ? '+' : ''}{(totalSalesBsFiltered - expensesBs).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </p>
                        <p className={`text-[9px] font-bold ${netBalanceUsd >= 0 ? 'text-indigo-500' : 'text-orange-500'}`}>${netBalanceUsd.toFixed(2)}</p>
                    </div>

                    <div className="bg-red-100 rounded-xl p-2 flex flex-col items-center">
                        <span className="text-[8px] font-black text-red-600 uppercase">Egreso</span>
                        <p className="text-sm font-black text-red-800">-{expensesBs.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                        <p className="text-[9px] font-bold text-red-500">${expensesUsd.toFixed(2)}</p>
                    </div>
                </div>

                {/* METODOS DE PAGO */}
                <div className="grid grid-cols-2 gap-2">
                    <div onClick={() => setActiveDetail('Cash')} className="bg-emerald-100 hover:bg-emerald-200 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center">
                        <div className="flex items-center gap-1 mb-1 text-emerald-600"><Banknote className="w-4 h-4" /><span className="text-[10px] font-black uppercase text-emerald-600">Efectivo</span></div>
                        <p className="text-sm font-black text-emerald-800">{salesCashBs.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div onClick={() => setActiveDetail('PagoMovil')} className="bg-purple-100 hover:bg-purple-200 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center">
                        <div className="flex items-center gap-1 mb-1 text-purple-600"><Smartphone className="w-4 h-4" /><span className="text-[10px] font-black uppercase text-purple-600">Pago Móvil</span></div>
                        <p className="text-sm font-black text-purple-800">{salesPagoMovilBs.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div onClick={() => setActiveDetail('Card')} className="bg-blue-100 hover:bg-blue-200 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center">
                        <div className="flex items-center gap-1 mb-1 text-blue-600"><CreditCard className="w-4 h-4" /><span className="text-[10px] font-black uppercase text-blue-600">Punto</span></div>
                        <p className="text-sm font-black text-blue-800">{salesCardBs.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div onClick={() => setActiveDetail('Credit')} className="bg-orange-100 hover:bg-orange-200 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center">
                        <div className="flex items-center gap-1 mb-1 text-orange-600"><Wallet className="w-4 h-4" /><span className="text-[10px] font-black uppercase text-orange-600">Crédito</span></div>
                        <p className="text-sm font-black text-orange-800">${creditSales.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Movimientos</h3>
                    <button onClick={() => setShowSearchInput(true)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                        <Search className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
                <div className="space-y-2">
                    {allMovements.length === 0 ? (
                        <div className="py-8 text-center opacity-40"><p className="text-xs font-black uppercase text-gray-400">Sin movimientos</p></div>
                    ) : (
                        allMovements.map((item) => {
                            if (item.type === 'sale') {
                                const s = item.data;
                                const isCash = s.paymentMethod === 'Cash';
                                const isCredit = s.paymentMethod === 'Credit';
                                return (
                                    <div key={s.id} onClick={() => setSelectedSale(s)} className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer active:scale-[0.99]">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCash ? 'bg-emerald-100 text-emerald-600' : isCredit ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {isCash ? <Banknote className="w-5 h-5" /> : isCredit ? <Wallet className="w-5 h-5" /> : s.paymentMethod === 'PagoMovil' ? <Smartphone className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-gray-800 truncate">{s.items.some(i => i.id === 'debt_payment') ? "Pago de Deuda" : s.items.map(i => `${i.quantity} ${i.name}`).join(', ')}</p>
                                                    <p className="text-[10px] text-gray-400">{new Date(s.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} • {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                                {isCredit ? (
                                                    <>
                                                        <p className="text-base font-black text-orange-500">${s.total.toFixed(2)}</p>
                                                        <p className="text-[9px] text-orange-300">Bs {(s.total * s.exchangeRate).toFixed(2)}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-base font-black text-gray-900">{(s.total * s.exchangeRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs</p>
                                                        <p className="text-[9px] text-gray-400">${s.total.toFixed(2)}</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else {
                                const t = item.data;
                                const isExpense = t.type === 'expense';
                                return (
                                    <div key={t.id} onClick={() => setSelectedTransaction(t)} className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer active:scale-[0.99]">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isExpense ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {isExpense ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-gray-800 truncate">{t.description}</p>
                                                    <p className="text-[10px] text-gray-400">{new Date(t.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} • {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase">{t.category}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                                <p className={`text-base font-black ${isExpense ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {isExpense ? '-' : '+'}{t.amountBs.toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs
                                                </p>
                                                <p className="text-[9px] text-gray-400">${t.amount.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        })
                    )}
                </div>
            </div>

            {showPurchasePOS && (
                <PurchasePOS
                    products={products}
                    exchangeRate={exchangeRate}
                    rateHistory={rateHistory}
                    categories={categories}
                    onAddCategory={onAddCategory}
                    onDeleteCategory={onDeleteCategory}
                    onClose={() => {
                        handleClosePurchasePOS();
                        setEditingTransaction(null);
                    }}
                    onPurchase={(items, method, businessDebt) => {
                        // Si hay una transacción siendo editada, eliminarla primero
                        if (editingTransaction && onDeleteTreasuryTransaction) {
                            onDeleteTreasuryTransaction(editingTransaction.id);
                            setEditingTransaction(null);
                        }
                        onPurchaseProducts(items, method, businessDebt);
                        handleClosePurchasePOS();
                    }}
                    onAddProduct={onAddProduct}
                    onUpdateProduct={onUpdateProduct}
                    onOpenInventory={() => { onGoToInventory?.(); }}
                    onOpenInventoryWithProduct={(product) => { onGoToInventoryWithProduct?.(product); }}
                    initialCart={purchaseCart}
                    onCartChange={onPurchaseCartChange}
                />
            )}

            {activeDetail && (() => {
                const info = getMethodInfo(activeDetail);
                const total = activeDetail === 'Cash' ? salesCashBs : activeDetail === 'Card' ? salesCardBs : salesPagoMovilBs;
                return (
                    <div className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white w-full sm:max-w-lg h-[80vh] sm:h-auto sm:max-h-[90vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up">
                            <div className={`p-4 bg-${info.color}-50 border-b border-${info.color}-100`}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className={`bg-${info.color}-100 p-2 rounded-xl`}><info.icon className={`w-5 h-5 text-${info.color}-600`} /></div>
                                        <div><h3 className="text-lg font-black text-gray-900">{info.label}</h3></div>
                                    </div>
                                    <button onClick={() => setActiveDetail(null)} className="bg-white/50 p-2 rounded-full"><span className="w-5 h-5 flex items-center justify-center text-gray-900">×</span></button>
                                </div>
                                <div className="mt-3 bg-white/60 p-3 rounded-xl"><p className="text-xs text-gray-500 uppercase font-bold">Total</p><p className="text-2xl font-black text-gray-900">{total.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</p></div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
                                {getDetailSales().length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 opacity-40"><p className="text-xs font-black uppercase text-gray-400">Sin movimientos</p></div>
                                ) : (
                                    getDetailSales().map(sale => (
                                        <div key={sale.id} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0 rounded-xl hover:bg-gray-50">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-2 rounded-lg bg-${info.color}-50 text-${info.color}-600`}><info.icon className="w-4 h-4" /></div>
                                                <div><p className="text-xs font-bold text-gray-900">{sale.items.some(i => i.id === 'debt_payment') ? `Pago: ${getCustomerName(sale.customerId)}` : getSaleDescription(sale)}</p><p className="text-[10px] text-gray-400">{new Date(sale.timestamp).toLocaleTimeString()}</p></div>
                                            </div>
                                            <div className="text-right"><p className="text-sm font-black text-gray-900">{(sale.total * sale.exchangeRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs</p></div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {selectedSale && (
                <div onClick={() => setSelectedSale(null)} className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-start">
                            <div><h3 className="font-black text-gray-900 uppercase">Recibo</h3><p className="text-xs text-gray-500">{selectedSale.id.slice(-6)}</p></div>
                            <button onClick={() => setSelectedSale(null)} className="bg-white p-1 rounded-full text-gray-400">×</button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            <div className="text-center mb-4 text-xs text-gray-500">{new Date(selectedSale.timestamp).toLocaleDateString()} • {new Date(selectedSale.timestamp).toLocaleTimeString()}</div>
                            <div className="space-y-2 border-t border-b border-dashed border-gray-200 py-3">
                                {selectedSale.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <div className="flex gap-2"><span className="font-bold">{item.quantity}</span><span className="text-gray-600">{item.name}</span></div>
                                        <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-3 space-y-1">
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Total USD</span><span className="font-bold">${selectedSale.total.toFixed(2)}</span></div>
                                {selectedSale.paymentMethod === 'Credit' ? (
                                    <div className="flex justify-between pt-2 border-t border-gray-100"><span className="font-black text-orange-500 uppercase">Credito</span><span className="font-black text-orange-600">${selectedSale.total.toFixed(2)}</span></div>
                                ) : (
                                    <div className="flex justify-between pt-2 border-t border-gray-100"><span className="font-black text-gray-900 uppercase">Pagado</span><span className="font-black text-indigo-600">{(selectedSale.total * selectedSale.exchangeRate).toFixed(2)} Bs</span></div>
                                )}
                            </div>
                            <div className="mt-3 bg-gray-50 p-2 rounded-xl flex justify-between text-xs">
                                <span className="text-gray-500">Metodo</span>
                                <span className="font-bold">{selectedSale.paymentMethod === 'Cash' ? 'Efectivo' : selectedSale.paymentMethod === 'PagoMovil' ? 'Pago Movil' : selectedSale.paymentMethod === 'Credit' ? 'Credito' : 'Tarjeta'}</span>
                            </div>
                        </div>
                        <div className="p-3 border-t border-gray-100 bg-gray-50 grid grid-cols-2 gap-2">
                            <button onClick={handleEdit} className="py-3 bg-blue-50 text-blue-600 rounded-xl font-black uppercase text-xs">Corregir</button>
                            <button onClick={handleVoid} className="py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase text-xs">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedTransaction && (() => {
                const t = selectedTransaction;
                const isCompra = t.type === 'expense' && t.category === 'Inventario';
                const isGasto = t.type === 'expense' && t.category !== 'Inventario';
                const isVenta = t.type === 'income' && (t.category === 'Ventas' || t.id.startsWith('sale_'));
                const isCobro = t.type === 'income' && t.category === 'Cobros';
                const isRecarga = t.type === 'income' && t.category === 'Recargas';
                const isDeuda = t.type === 'debt';
                const isNomina = t.type === 'expense' && (t.category === 'Nómina' || t.category === 'Pago Nómina' || t.description?.includes('Nomina') || t.description?.includes('trabajador'));
                
                const getTypeLabel = () => {
                    if (isCompra) return 'COMPRA INVENTARIO';
                    if (isGasto) return 'GASTO';
                    if (isVenta) return 'VENTA';
                    if (isCobro) return 'COBRO';
                    if (isRecarga) return 'RECARGA';
                    if (isDeuda) return 'DEUDA PENDIENTE';
                    if (isNomina) return 'PAGO NÓMINA';
                    return t.type === 'expense' ? 'GASTO' : t.type === 'debt' ? 'DEUDA' : 'INGRESO';
                };
                
                return (
                <div onClick={() => setSelectedTransaction(null)} className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-fade-in">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className={`p-6 text-center ${
                            isCompra ? 'bg-emerald-600' : 
                            isVenta || isCobro || isRecarga ? 'bg-blue-600' :
                            isDeuda || isNomina ? 'bg-orange-500' : 
                            isGasto ? 'bg-red-500' : 'bg-gray-600'
                        }`}>
                            <button onClick={() => setSelectedTransaction(null)} className="absolute top-4 right-4 bg-white/20 p-2 rounded-full text-white">
                                <X className="w-6 h-6" />
                            </button>
                            <p className="text-xs font-bold text-white/80 uppercase tracking-widest">{getTypeLabel()}</p>
                            <h3 className="text-5xl font-black text-white mt-2">
                                {isGasto || isCompra || isNomina ? '-' : isDeuda ? '⏳' : '+'}
                                ${t.amount.toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-2xl font-bold text-white/90 mt-1">
                                {t.amountBs.toLocaleString('es-CO', { maximumFractionDigits: 0 })} Bs
                            </p>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="text-center pb-4 border-b border-gray-100">
                                <p className="text-base font-bold text-gray-700">
                                    {new Date(t.timestamp).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                                <p className="text-sm text-gray-400">{new Date(t.timestamp).toLocaleTimeString()}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-100 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Metodo</p>
                                    <p className="text-base font-bold text-gray-900 mt-1">
                                        {t.method === 'Cash' ? '💵 Efectivo' : 
                                         t.method === 'PagoMovil' ? '📱 Pago Móvil' : 
                                         t.method === 'Card' ? '💳 Tarjeta' :
                                         t.method === 'PointOfSale' ? '🏦 Punto de Venta' :
                                         t.method === 'Transfer' ? '🏧 Transferencia' :
                                         t.method === 'Credit' ? '📋 Crédito' : t.method}
                                    </p>
                                </div>
                                <div className="bg-gray-100 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tasa</p>
                                    <p className="text-lg font-black text-gray-900 mt-1">{t.exchangeRate.toLocaleString('es-CO', { maximumFractionDigits: 2 })} Bs/$</p>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-2xl">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Descripcion</p>
                                <p className="text-base font-bold text-gray-900 mt-1">{t.description || 'Sin descripción'}</p>
                            </div>

                            {isCompra && (
                                <div className="bg-emerald-50 p-4 rounded-2xl space-y-2">
                                    <div className="flex justify-between">
                                        <p className="text-xs font-bold text-emerald-600">Costo USD</p>
                                        <p className="text-base font-black text-emerald-700">${t.amount.toFixed(2)}</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-xs font-bold text-emerald-600">Costo Bs</p>
                                        <p className="text-base font-black text-emerald-700">{t.amountBs.toLocaleString('es-CO')} Bs</p>
                                    </div>
                                </div>
                            )}

                            {(isVenta || isCobro) && (
                                <div className="bg-blue-50 p-4 rounded-2xl space-y-2">
                                    <div className="flex justify-between">
                                        <p className="text-xs font-bold text-blue-600">Venta USD</p>
                                        <p className="text-base font-black text-blue-700">${t.amount.toFixed(2)}</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-xs font-bold text-blue-600">Venta Bs</p>
                                        <p className="text-base font-black text-blue-700">{t.amountBs.toLocaleString('es-CO')} Bs</p>
                                    </div>
                                </div>
                            )}

                            {isRecarga && (
                                <div className="bg-purple-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Tipo de Movimiento</p>
                                    <p className="text-base font-bold text-purple-700 mt-1">Recarga de Teléfono</p>
                                </div>
                            )}

                            {isDeuda && (
                                <div className="bg-orange-50 p-4 rounded-2xl space-y-2">
                                    <div className="flex justify-between">
                                        <p className="text-xs font-bold text-orange-600">Monto USD</p>
                                        <p className="text-base font-black text-orange-700">${t.amount.toFixed(2)}</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-xs font-bold text-orange-600">Monto Bs</p>
                                        <p className="text-base font-black text-orange-700">{t.amountBs.toLocaleString('es-CO')} Bs</p>
                                    </div>
                                </div>
                            )}

                            {isNomina && (
                                <div className="bg-orange-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Pago de Nómina</p>
                                    <p className="text-base font-bold text-orange-700 mt-1">Pago a trabajador</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
                            {isCompra && (
                                <button 
                                    onClick={() => {
                                        setEditingTransaction(t);
                                        setSelectedTransaction(null);
                                        setShowPurchasePOS(true);
                                    }}
                                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    Corregir Compra
                                </button>
                            )}
                            {isGasto && (
                                <button 
                                    onClick={() => {
                                        setExpenseAmount(t.amount.toString());
                                        setExpenseDescription(t.description);
                                        setExpenseCategory(t.category);
                                        setExpenseMethod(t.method as any);
                                        setSelectedTransaction(null);
                                        setShowExpenseModal(true);
                                    }}
                                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2"
                                >
                                    <Wallet className="w-5 h-5" />
                                    Corregir Gasto
                                </button>
                            )}
                            {(isVenta || isCobro) && (
                                <button 
                                    onClick={() => {
                                        setSelectedTransaction(null);
                                        onOpenPOS();
                                    }}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2"
                                >
                                    <TrendingUp className="w-5 h-5" />
                                    Corregir Venta
                                </button>
                            )}
                            {isDeuda && (
                                <button 
                                    onClick={() => {
                                        setSelectedTransaction(null);
                                        onOpenWorkers?.();
                                    }}
                                    className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2"
                                >
                                    <Clock className="w-5 h-5" />
                                    Ver Detalles Deuda
                                </button>
                            )}
                            {/* Botón único para corregir cualquier movimiento (fecha, tasa, monto, descripción) */}
                            <button 
                                onClick={handleOpenTransactionEdit} 
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2"
                            >
                                <Edit className="w-5 h-5" />
                                Corregir Movimiento
                            </button>
                            
                            {/* Botón para eliminar y revertir */}
                            <button 
                                onClick={handleDeleteTransaction} 
                                className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-5 h-5" />
                                Eliminar Movimiento
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}

            {showExpenseTypeModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm">
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-black text-gray-900">Egresos</h3>
                        </div>
                        <div className="space-y-3">
                            <button 
                                onClick={() => { setShowExpenseTypeModal(false); setShowPurchasePOS(true); }} 
                                className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                Comprar Productos (Inventario)
                            </button>
                            <button 
                                onClick={() => { setShowExpenseTypeModal(false); setShowExpenseModal(true); }} 
                                className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <Wallet className="w-5 h-5" />
                                Egresos
                            </button>
                            <button 
                                onClick={() => { setShowExpenseTypeModal(false); onOpenWorkers?.(); }} 
                                className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <BanknoteIcon className="w-5 h-5" />
                                Pagar Nómina
                            </button>
                        </div>
                        <div className="mt-4">
                            <button 
                                onClick={() => setShowExpenseTypeModal(false)} 
                                className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Egresos - Pantalla completa en móvil */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-white z-[110] flex flex-col">
                    {/* Header fijo */}
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white">
                        <h3 className="text-xl font-black text-orange-600">Nuevo Egreso</h3>
                        <button onClick={() => setShowExpenseModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-400">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Contenido scrolleable */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-5">
                            {/* Monto con Toggle de Moneda */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Monto</label>
                                <div className="relative mt-2">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-2xl text-orange-300">{expenseMethodLabel}</span>
                                    <input 
                                        autoFocus 
                                        type="number" 
                                        placeholder="0.00" 
                                        className="w-full pl-14 pr-28 py-5 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl text-center font-black text-3xl text-orange-600 outline-none" 
                                        value={expenseAmount} 
                                        onChange={(e) => setExpenseAmount(e.target.value)} 
                                    />
                                    <button 
                                        onClick={() => setExpenseMethodLabel(prev => prev === '$' ? 'Bs' : '$')} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-orange-500 bg-orange-50 px-4 py-2 rounded-xl shadow-sm"
                                    >
                                        {expenseMethodLabel === '$' ? '$→Bs' : 'Bs→$'}
                                    </button>
                                </div>
                                {expenseMethodLabel === '$' && (
                                    <p className="text-xs font-bold text-gray-400 mt-2 text-right">
                                        = Bs {(parseFloat(expenseAmount || '0') * exchangeRate).toLocaleString('es-CO', { maximumFractionDigits: 0 })} (Tasa: {exchangeRate})
                                    </p>
                                )}
                                {expenseMethodLabel === 'Bs' && (
                                    <p className="text-xs font-bold text-gray-400 mt-2 text-right">
                                        = $ {(parseFloat(expenseAmount || '0') / exchangeRate).toFixed(2)} (Tasa: {exchangeRate})
                                    </p>
                                )}
                            </div>

                            {/* Método de Pago */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Pagado con</label>
                                <select 
                                    value={expenseMethod} 
                                    onChange={e => setExpenseMethod(e.target.value as any)} 
                                    className="w-full p-4 bg-gray-50 rounded-xl text-base font-bold outline-none border-2 border-transparent focus:border-orange-300 mt-2"
                                >
                                    <option value="Cash">💵 Efectivo</option>
                                    <option value="Transfer">🏦 Transferencia</option>
                                    <option value="PagoMovil">📱 Pago Móvil</option>
                                    <option value="Card">💳 Punto de Venta</option>
                                </select>
                            </div>

                            {/* Fecha */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Fecha</label>
                                <input 
                                    type="date" 
                                    value={new Date().toISOString().split('T')[0]} 
                                    className="w-full p-4 bg-gray-50 rounded-xl text-base font-bold outline-none mt-2" 
                                />
                            </div>

                            {/* Categoría */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Categoría</label>
                                <select 
                                    value={expenseCategory} 
                                    onChange={e => setExpenseCategory(e.target.value)}
                                    className="w-full p-4 bg-gray-50 rounded-xl text-base font-bold outline-none border-2 border-transparent focus:border-orange-300 mt-2"
                                >
                                    {expenseCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Descripción</label>
                                <input 
                                    type="text" 
                                    placeholder="Detalles del gasto..." 
                                    className="w-full p-4 bg-gray-50 rounded-xl text-base font-bold outline-none mt-2" 
                                    value={expenseDescription}
                                    onChange={(e) => setExpenseDescription(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer fijo */}
                    <div className="p-4 border-t border-gray-100 bg-white">
                        <button 
                            onClick={handleAddExpense} 
                            className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black text-lg"
                        >
                            Guardar Egreso
                        </button>
                    </div>
                </div>
            )}

            {editingTransactionId && editTransactionDate && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm">
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-black text-gray-900">Editar Movimiento</h3>
                            <p className="text-xs text-gray-400 mt-1">Cambia fecha, tasa o monto</p>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Fecha */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Fecha</label>
                                <input 
                                    type="date" 
                                    className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold mt-1"
                                    value={editTransactionDate}
                                    onChange={(e) => setEditTransactionDate(e.target.value)}
                                />
                            </div>
                            
                            {/* Tasa */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Tasa BCV (Bs/$)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold mt-1"
                                    value={editTransactionRate}
                                    onChange={(e) => setEditTransactionRate(e.target.value)}
                                />
                            </div>
                            
                            {/* Monto USD */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Monto (USD)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold mt-1"
                                    value={editTransactionAmount}
                                    onChange={(e) => setEditTransactionAmount(e.target.value)}
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">
                                    = Bs {(parseFloat(editTransactionAmount || '0') * parseFloat(editTransactionRate || '0')).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            
                            {/* Descripción */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Descripción</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold mt-1"
                                    value={editTransactionDescription}
                                    onChange={(e) => setEditTransactionDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => {
                                    setEditingTransactionId(null);
                                    setEditTransactionDate('');
                                    setEditTransactionAmount('');
                                    setEditTransactionDescription('');
                                    setEditTransactionRate('');
                                }} 
                                className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveTransactionEdit} 
                                className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isTreasuryModalOpen && (
                <div className="fixed inset-0 bg-white z-[100] flex flex-col">
                    {/* Header fijo */}
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white">
                        <h3 className={`text-xl font-black ${treasuryType === 'income' ? 'text-blue-600' : 'text-orange-600'}`}>
                            {treasuryType === 'income' ? 'Ingreso' : 'Egreso'}
                        </h3>
                        <button onClick={() => setIsTreasuryModalOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Contenido scrolleable */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-5">
                            {/* Monto con Toggle de Moneda */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Monto</label>
                                <div className="relative mt-2">
                                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black text-2xl ${treasuryType === 'income' ? 'text-blue-300' : 'text-orange-300'}`}>
                                        {treasuryCurrency}
                                    </span>
                                    <input 
                                        autoFocus 
                                        type="number" 
                                        placeholder="0.00" 
                                        className={`w-full pl-14 pr-28 py-5 bg-gray-50 border-2 border-transparent focus:border-${treasuryType === 'income' ? 'blue' : 'orange'}-500 rounded-2xl text-center font-black text-3xl ${treasuryType === 'income' ? 'text-blue-600' : 'text-orange-600'} outline-none`}
                                        value={treasuryAmount} 
                                        onChange={(e) => setTreasuryAmount(e.target.value)} 
                                    />
                                    <button 
                                        onClick={() => setTreasuryCurrency(prev => prev === '$' ? 'Bs' : '$')} 
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold ${treasuryType === 'income' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'} px-4 py-2 rounded-xl shadow-sm active:scale-90`}
                                    >
                                        {treasuryCurrency === '$' ? '$→Bs' : 'Bs→$'}
                                    </button>
                                </div>
                                <div className="flex justify-between px-2 mt-2">
                                    <p className="text-[10px] font-bold text-gray-400">
                                        Ref: {treasuryCurrency === '$' 
                                            ? `Bs ${(parseFloat(treasuryAmount || '0') * currentRateForSelectedDate).toLocaleString('es-CO', { maximumFractionDigits: 0 })}` 
                                            : `$ ${(parseFloat(treasuryAmount || '0') / currentRateForSelectedDate).toFixed(2)}`}
                                    </p>
                                    <p className="text-[10px] font-black text-indigo-400">Tasa: {currentRateForSelectedDate.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Fecha y Método en columna para móvil */}
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha</label>
                                    <input 
                                        type="date" 
                                        value={treasuryDate} 
                                        onChange={e => setTreasuryDate(e.target.value)} 
                                        className="w-full p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-300 transition-all mt-1" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                        {treasuryType === 'income' ? 'Recibido por' : 'Pagado con'}
                                    </label>
                                    <select 
                                        value={treasuryMethod} 
                                        onChange={e => setTreasuryMethod(e.target.value as any)} 
                                        className="w-full p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-300 transition-all mt-1 appearance-none"
                                    >
                                        <option value="Cash">💵 Efectivo</option>
                                        <option value="Transfer">🏦 Transferencia</option>
                                        <option value="PagoMovil">📱 Pago Móvil</option>
                                        <option value="Card">💳 Punto de Venta</option>
                                    </select>
                                </div>
                            </div>

                            {/* Categoría - Select desplegable para móvil */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoría</label>
                                    <button 
                                        onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
                                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800"
                                    >
                                        {showAddCategoryInput ? 'Cerrar' : '+ Nueva'}
                                    </button>
                                </div>
                                
                                {showAddCategoryInput ? (
                                    <div className="flex gap-2 animate-fade-in mt-1">
                                        <input 
                                            autoFocus
                                            type="text" 
                                            placeholder="Nueva categoría..." 
                                            className="flex-1 p-3 bg-gray-50 rounded-xl text-xs font-bold border-2 border-indigo-100"
                                            value={newCategoryName}
                                            onChange={e => setNewCategoryName(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && handleAddReportCategory()}
                                        />
                                        <button onClick={handleAddReportCategory} className="p-3 bg-indigo-600 text-white rounded-xl shadow-md"><Plus className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Select nativo para móvil */}
                                        <div className="relative mt-1">
                                            <select 
                                                value={treasuryCategory} 
                                                onChange={e => setTreasuryCategory(e.target.value)}
                                                className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-300 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled>Seleccionar categoría</option>
                                                {(treasuryType === 'income' ? incomeCategories : expenseCategories).map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                        </div>
                                        
                                        {/* Botones de categorías frecuentes para acceso rápido */}
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {(treasuryType === 'income' ? incomeCategories : expenseCategories).slice(0, 4).map(cat => (
                                                <button 
                                                    key={cat}
                                                    onClick={() => setTreasuryCategory(cat)} 
                                                    className={`px-3 py-1.5 text-[9px] font-bold rounded-lg transition-all border ${
                                                        treasuryCategory === cat 
                                                            ? (treasuryType === 'income' ? 'bg-blue-600 text-white border-blue-600' : 'bg-orange-600 text-white border-orange-600') 
                                                            : 'bg-gray-50 text-gray-500 border-gray-100'
                                                    }`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                            {(treasuryType === 'income' ? incomeCategories : expenseCategories).length > 4 && (
                                                <span className="text-[9px] text-gray-400 self-center">+ más</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nota / Descripción</label>
                                <textarea 
                                    placeholder="Detalles adicionales..." 
                                    className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-indigo-300 transition-all mt-1 h-20 resize-none"
                                    value={treasuryDescription}
                                    onChange={e => setTreasuryDescription(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer fijo con botón guardar */}
                    <div className="p-4 border-t border-gray-100 bg-white">
                        <button 
                            onClick={handleSaveTreasuryAction} 
                            className={`w-full py-5 rounded-2xl font-black text-lg text-white ${
                                treasuryType === 'income' ? 'bg-blue-600' : 'bg-orange-600'
                            }`}
                        >
                            Guardar {treasuryType === 'income' ? 'Ingreso' : 'Egreso'}
                        </button>
                    </div>
                </div>
            )}

            {/* Botones Flotantes - Optimizado para móvil */}
            <div 
                className="fixed bottom-24 left-2 right-2 md:bottom-6 md:left-auto md:right-6 z-[60] flex justify-center gap-2 md:gap-4"
                style={{ pointerEvents: 'auto' }}
            >
                <button 
                    onClick={() => setShowVentasMenu(true)} 
                    className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center max-w-[45%]"
                >
                    <ShoppingCart className="w-5 h-5" />
                    <span className="text-sm font-black">Ventas</span>
                </button>
                <button 
                    onClick={() => setShowExpenseTypeModal(true)} 
                    className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center max-w-[45%]"
                >
                    <Wallet className="w-5 h-5" />
                    <span className="text-sm font-black">Gastos</span>
                </button>
            </div>

            {/* --- MENÚ DE VENTAS --- */}
            {showVentasMenu && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden">
                        <div className="p-6 pb-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-black text-gray-900">Ventas</h3>
                                <button onClick={() => { setShowVentasMenu(false); setVentasOption(null); }} className="p-2 text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        
                        {!ventasOption ? (
                            <div className="px-6 pb-6 space-y-3">
                                <button onClick={() => { setShowVentasMenu(false); onOpenPOS(); }} className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-6 py-5 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-colors">
                                    <ShoppingCart className="w-6 h-6" />
                                    Ventas del Inventario
                                </button>
                                <button onClick={() => handleOpenTreasury('income')} className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 px-6 py-5 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-colors">
                                    <TrendingUp className="w-6 h-6" />
                                    Ingresos
                                </button>
                                <button onClick={() => setVentasOption('recharge')} className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-6 py-5 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-colors">
                                    <Smartphone className="w-6 h-6" />
                                    Vender Recargas
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <button onClick={() => setVentasOption(null)} className="flex items-center gap-2 text-gray-500 mb-2">
                                    <ChevronLeft className="w-5 h-5" />
                                    <span className="text-sm font-bold">Volver</span>
                                </button>
                                
                                {/* Formulario Ingresos */}
                                {ventasOption === 'income' && (
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-black text-gray-900">Ingresos</h4>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Monto</label>
                                            <div className="relative mt-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-blue-300">{expenseMethodLabel}</span>
                                                <input 
                                                    autoFocus 
                                                    type="number" 
                                                    placeholder="0.00" 
                                                    className="w-full pl-10 pr-20 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-center font-bold text-lg text-blue-600 outline-none focus:ring-2 focus:ring-blue-500" 
                                                    value={incomeAmount} 
                                                    onChange={(e) => setIncomeAmount(e.target.value)} 
                                                />
                                                <button 
                                                    onClick={() => setExpenseMethodLabel(prev => prev === '$' ? 'Bs' : '$')} 
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded shadow-sm transition-all active:scale-90"
                                                >
                                                    {expenseMethodLabel === '$' ? '$→Bs' : 'Bs→$'}
                                                </button>
                                            </div>
                                            {expenseMethodLabel === '$' && (
                                                <p className="text-[10px] font-bold text-gray-400 mt-1 text-right">
                                                    = Bs {(parseFloat(incomeAmount || '0') * exchangeRate).toLocaleString('es-CO', { maximumFractionDigits: 0 })} (Tasa: {exchangeRate})
                                                </p>
                                            )}
                                            {expenseMethodLabel === 'Bs' && (
                                                <p className="text-[10px] font-bold text-gray-400 mt-1 text-right">
                                                    = $ {(parseFloat(incomeAmount || '0') / exchangeRate).toFixed(2)} (Tasa: {exchangeRate})
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Método de Cobro</label>
                                            <div className="flex gap-2 mt-1">
                                                {[
                                                    { id: 'Cash', label: 'Efectivo', color: 'emerald' },
                                                    { id: 'Transfer', label: 'Transf.', color: 'blue' },
                                                    { id: 'PagoMovil', label: 'P.Móvil', color: 'purple' }
                                                ].map((m) => (
                                                    <button
                                                        key={m.id}
                                                        onClick={() => setExpenseMethod(m.id as any)}
                                                        className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${
                                                            expenseMethod === m.id
                                                                ? `bg-${m.color}-600 text-white shadow-lg`
                                                                : 'bg-gray-100 text-gray-500'
                                                        }`}
                                                    >
                                                        {m.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Fecha</label>
                                            <input type="date" value={incomeDate} onChange={e => setIncomeDate(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold outline-none mt-1" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Categoría</label>
                                                <select value={incomeCategory} onChange={e => setIncomeCategory(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold outline-none mt-1">
                                                    <option value="Otros">Otros</option>
                                                    <option value="Ventas">Ventas</option>
                                                    <option value="Servicios">Servicios</option>
                                                    <option value="Intereses">Intereses</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Descripción</label>
                                                <input type="text" value={incomeDescription} onChange={e => setIncomeDescription(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold outline-none mt-1" placeholder="..." />
                                            </div>
                                        </div>
                                        <button onClick={() => {
                                            const amount = parseFloat(incomeAmount);
                                            if (amount > 0) {
                                                const timestamp = new Date(incomeDate + 'T12:00:00').getTime();
                                                const rateForDate = getRateForDate(incomeDate);
                                                const amountInUsd = expenseMethodLabel === '$' ? amount : amount / rateForDate;
                                                const amountInBs = expenseMethodLabel === 'Bs' ? amount : amount * rateForDate;
                                                onAddTreasuryTransaction({
                                                    id: `inc_${Date.now()}`,
                                                    type: 'income',
                                                    category: incomeCategory,
                                                    description: incomeDescription || incomeCategory,
                                                    amount: amountInUsd,
                                                    amountBs: amountInBs,
                                                    method: expenseMethod,
                                                    exchangeRate: rateForDate,
                                                    timestamp
                                                });
                                                setIncomeAmount('');
                                                setIncomeDescription('');
                                                 setVentasOption(null);
                                                 setShowVentasMenu(false);
                                                 setExpenseMethod('Cash');
                                                 setExpenseMethodLabel('$');
                                            }
                                        }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all mt-4">Guardar</button>
                                    </div>
                                )}

                                {/* Formulario Recargas */}
                                {ventasOption === 'recharge' && (
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-black text-gray-900">Vender Recarga</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Monto a Recargar</label>
                                                <input type="number" value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-lg font-black text-purple-600 outline-none" placeholder="0" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Tu Ganancia</label>
                                                <input type="number" value={rechargeFee} onChange={e => setRechargeFee(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-lg font-black text-emerald-600 outline-none" placeholder="0" />
                                            </div>
                                        </div>
                                        <div className="bg-purple-50 p-4 rounded-2xl">
                                            <p className="text-xs font-bold text-purple-600 uppercase mb-2">Resumen</p>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">Ganancia:</span>
                                                <span className="font-black text-emerald-600">+{rechargeFee || '0'} Bs</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Porcentaje:</span>
                                                <span className="font-black text-purple-600">
                                                    {rechargeAmount && parseFloat(rechargeAmount) > 0 && rechargeFee ? 
                                                        ((parseFloat(rechargeFee) / parseFloat(rechargeAmount)) * 100).toFixed(1) : '0'}%
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Método de Pago</label>
                                            <div className="flex gap-2 mt-2">
                                                <button onClick={() => setRechargeMethod('Cash')} className={`flex-1 py-3 rounded-xl font-bold text-sm ${rechargeMethod === 'Cash' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Efectivo</button>
                                                <button onClick={() => setRechargeMethod('PagoMovil')} className={`flex-1 py-3 rounded-xl font-bold text-sm ${rechargeMethod === 'PagoMovil' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Pago Móvil</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Referencia</label>
                                            <input type="text" value={rechargeReference} onChange={e => setRechargeReference(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold outline-none" placeholder="Número de teléfono" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Fecha</label>
                                            <input type="date" value={rechargeDate} onChange={e => setRechargeDate(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold outline-none" />
                                        </div>
                                        <button onClick={() => {
                                            const amount = parseFloat(rechargeAmount);
                                            const fee = parseFloat(rechargeFee);
                                            if (amount > 0 && fee > 0) {
                                                const timestamp = new Date(rechargeDate + 'T12:00:00').getTime();
                                                onAddTreasuryTransaction({
                                                    id: `rec_gas_${Date.now()}`,
                                                    type: 'expense',
                                                    category: 'Recargas',
                                                    description: `Recarga: ${rechargeReference}`,
                                                    amount: amount / exchangeRate,
                                                    amountBs: amount,
                                                    method: rechargeMethod,
                                                    exchangeRate: exchangeRate,
                                                    timestamp
                                                });
                                                onAddTreasuryTransaction({
                                                    id: `rec_inc_${Date.now()}`,
                                                    type: 'income',
                                                    category: 'Recargas',
                                                    description: `Ganancia recarga: ${rechargeReference}`,
                                                    amount: fee / exchangeRate,
                                                    amountBs: fee,
                                                    method: rechargeMethod,
                                                    exchangeRate: exchangeRate,
                                                    timestamp
                                                });
                                                setRechargeAmount('');
                                                setRechargeFee('');
                                                setRechargeReference('');
                                                setVentasOption(null);
                                                setShowVentasMenu(false);
                                            }
                                        }} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-lg shadow-lg">Guardar Recarga</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VentasCaja;
