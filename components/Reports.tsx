import React, { useState } from 'react';
import { Sale, Customer, TreasuryTransaction, Product } from '../types';
import { Wallet, Banknote, Smartphone, CreditCard, Search, Calendar, ChevronDown, ShoppingCart, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Trash2, Edit } from '../constants';
import PurchasePOS from './PurchasePOS';
import { syncPath } from '../services/supabaseService';

interface ReportsProps {
    sales: Sale[];
    products: Product[];
    customers?: Customer[];
    exchangeRate: number;
    treasuryTransactions?: TreasuryTransaction[];
    onOpenPOS: () => void;
    onVoidSale: (saleId: string) => void;
    onEditSale: (sale: Sale) => void;
    onAddTreasuryTransaction: (t: TreasuryTransaction) => void;
    onOpenRateModal?: () => void;
    onPurchaseProducts: (items: { product: Product; quantity: number; costPrice: number }[], method: 'Cash' | 'Transfer' | 'PagoMovil' | 'Card' | 'PointOfSale') => void;
    onAddProduct: (product: Product) => void;
    onUpdateTreasuryTransaction?: (t: TreasuryTransaction) => void;
    onDeleteTreasuryTransaction?: (id: string) => void;
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';
type PaymentMethod = 'Cash' | 'Card' | 'PagoMovil';

const VentasCaja: React.FC<ReportsProps> = ({ sales, products = [], customers = [], exchangeRate, treasuryTransactions = [], onOpenPOS, onVoidSale, onEditSale, onAddTreasuryTransaction, onOpenRateModal, onPurchaseProducts, onAddProduct, onUpdateTreasuryTransaction, onDeleteTreasuryTransaction }) => {
    const [activeDetail, setActiveDetail] = useState<PaymentMethod | null>(null);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showExpenseTypeModal, setShowExpenseTypeModal] = useState(false);
    const [showPurchasePOS, setShowPurchasePOS] = useState(false);
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDescription, setExpenseDescription] = useState('');
       const [expenseCategory, setExpenseCategory] = useState<string>('Otros');
    const [expenseMethod, setExpenseMethod] = useState<'Cash' | 'Transfer' | 'PagoMovil' | 'Card'>('Cash');
    const [expenseMethodLabel, setExpenseMethodLabel] = useState<'Bs' | '$'>('$');
    const [dateFilter, setDateFilter] = useState<DateFilter>('today');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<TreasuryTransaction | null>(null);
    const [quickNavOffset, setQuickNavOffset] = useState(0);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editDate, setEditDate] = useState<string>('');
    const [editAmount, setEditAmount] = useState<string>('');

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
            currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + (quickNavOffset * 7));
            const currentWeekEnd = new Date(currentWeekStart);
            currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
            return [{
                label: `${fullDays[currentWeekStart.getDay()]} ${currentWeekStart.getDate().toString().padStart(2, '0')}/${(currentWeekStart.getMonth() + 1).toString().padStart(2, '0')} - ${fullDays[currentWeekEnd.getDay()]} ${currentWeekEnd.getDate().toString().padStart(2, '0')}/${(currentWeekEnd.getMonth() + 1).toString().padStart(2, '0')}`,
                startDate: new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate()).getTime(),
                endDate: new Date(currentWeekEnd.getFullYear(), currentWeekEnd.getMonth(), currentWeekEnd.getDate()).getTime()
            }];
        } else if (dateFilter === 'month') {
            const currentMonthDate = new Date(now.getFullYear(), now.getMonth() + (quickNavOffset * 3), 1);
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
            currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + (quickNavOffset * 7));
            const weekTime = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate()).getTime();
            return weekTime < today;
        } else if (dateFilter === 'month') {
            const currentMonthDate = new Date(now.getFullYear(), now.getMonth() + (quickNavOffset * 3), 1);
            const monthTime = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1).getTime();
            return monthTime < now.getTime();
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
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
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

    const getDisplayedExchangeRate = () => {
        if (dateFilter === 'today') {
            const daySales = sales.filter(s => s.timestamp >= filterStart && s.timestamp <= filterEnd);
            if (daySales.length > 0) {
                return daySales[0].exchangeRate;
            }
        }
        return exchangeRate;
    };

    const currentSales = sales.filter(s => s.timestamp >= filterStart && s.timestamp <= filterEnd).sort((a, b) => b.timestamp - a.timestamp);
    const currentTransactions = treasuryTransactions.filter(t => t.timestamp >= filterStart && t.timestamp <= filterEnd).sort((a, b) => b.timestamp - a.timestamp);
    
    const allMovements = [
        ...currentSales.map(s => ({ type: 'sale' as const, data: s })),
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

    const salesCashBs = currentSales.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + (s.total * s.exchangeRate), 0);
    const salesCardBs = currentSales.filter(s => s.paymentMethod === 'Card').reduce((sum, s) => sum + (s.total * s.exchangeRate), 0);
    const salesPagoMovilBs = currentSales.filter(s => s.paymentMethod === 'PagoMovil').reduce((sum, s) => sum + (s.total * s.exchangeRate), 0);
    const totalSalesBs = salesCashBs + salesCardBs + salesPagoMovilBs;
    const totalSalesBsFiltered = currentSales.filter(s => s.paymentMethod !== 'Credit').reduce((sum, s) => sum + (s.total * s.exchangeRate), 0);
    const expensesBs = treasuryTransactions.filter(t => t.type === 'expense' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amountBs, 0);
    const incomeBs = treasuryTransactions.filter(t => t.type === 'income' && t.timestamp >= filterStart && t.timestamp <= filterEnd).reduce((sum, t) => sum + t.amountBs, 0);
    const bankTransactions = treasuryTransactions.filter(t => t.method !== 'Cash');
    const bankBalanceFromTxs = bankTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amountBs : -t.amountBs), 0);
    const allPagoMovilBs = sales.filter(s => s.paymentMethod === 'PagoMovil').reduce((acc, s) => acc + (s.total * s.exchangeRate), 0);
    const mercantilGlobalBalance = bankBalanceFromTxs + allPagoMovilBs;

    const handleAddExpense = () => {
        const amount = parseFloat(expenseAmount);
        if (!amount || isNaN(amount) || amount <= 0) return;
        const now = Date.now();
        const amountInBs = expenseMethodLabel === '$' ? amount * exchangeRate : amount;
        const transaction: TreasuryTransaction = {
            id: `expense_${now}`,
            timestamp: now,
            type: 'expense',
            category: expenseCategory as any,
            description: expenseDescription || `Gasto: ${expenseCategory}`,
            amount: expenseMethodLabel === '$' ? amount : amount / exchangeRate,
            amountBs: amountInBs,
            exchangeRate: exchangeRate,
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
            currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + (quickNavOffset * 7));
            const currentWeekEnd = new Date(currentWeekStart);
            currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
            return `${shortDays[currentWeekStart.getDay()]} ${currentWeekStart.getDate()} - ${shortDays[currentWeekEnd.getDay()]} ${currentWeekEnd.getDate()} ${shortMonths[currentWeekEnd.getMonth()]}`;
        } else if (dateFilter === 'month') {
            const currentMonthDate = new Date(now.getFullYear(), now.getMonth() + (quickNavOffset * 3), 1);
            return fullMonths[currentMonthDate.getMonth()];
        }
        return '';
    };

    const getDetailSales = () => {
        if (!activeDetail) return [];
        return currentSales.filter(s => s.paymentMethod === activeDetail);
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
        return customers.find(c => c.id === customerId)?.name || 'Cliente';
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
                                                    <p className="text-lg font-black text-gray-900">{(sale.total * sale.exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p>
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
                <div className="bg-indigo-900 text-white p-3 rounded-xl shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between gap-2 relative z-10">
                        <button onClick={onOpenRateModal} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-all shrink-0">
                            <span className="text-xs font-bold">BCV</span>
                            <span className="text-xs font-bold">{getDisplayedExchangeRate().toFixed(2)}</span>
                        </button>
                        <div className="relative flex-1 max-w-[50%]">
                            <button onClick={() => setShowSearchInput(true)} className="w-full bg-white/10 px-3 py-1.5 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
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
                                                setSelectedTransaction(item.data);
                                            }
                                        }} 
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                item.type === 'sale' 
                                                    ? (item.data.paymentMethod === 'Cash' ? 'bg-emerald-100 text-emerald-600' : item.data.paymentMethod === 'Credit' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600')
                                                    : (item.data.type === 'expense' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600')
                                            }`}>
                                                {item.type === 'sale' ? (
                                                    item.data.paymentMethod === 'Cash' ? <Banknote className="w-4 h-4" /> : 
                                                    item.data.paymentMethod === 'Credit' ? <Wallet className="w-4 h-4" /> : 
                                                    item.data.paymentMethod === 'PagoMovil' ? <Smartphone className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />
                                                ) : (
                                                    item.data.type === 'expense' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />
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
                                        <span className={`text-xs font-black ${item.type === 'sale' ? 'text-gray-900' : (item.data.type === 'expense' ? 'text-red-600' : 'text-emerald-600')}`}>
                                            {item.type === 'sale' 
                                                ? `${(item.data.total * item.data.exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs`
                                                : `${item.data.type === 'expense' ? '-' : '+'}${item.data.amountBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs`
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

                <div className="flex items-center justify-between gap-2 px-2">
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

                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-100 border-2 border-emerald-200 rounded-xl p-3 flex flex-col items-center">
                        <div className="flex items-center gap-1 mb-1">
                            <TrendingUp className="w-3 h-3 text-emerald-600" />
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider">Ingresos</span>
                        </div>
                        <p className="text-lg font-black text-emerald-800 leading-none">+{(totalSalesBsFiltered + incomeBs).toLocaleString('es-VE', { maximumFractionDigits: 0 })}</p>
                        <p className="text-[9px] font-bold text-emerald-500">${((totalSalesBsFiltered + incomeBs) / getDisplayedExchangeRate()).toFixed(2)}</p>
                    </div>

                    <div className={`border-2 rounded-xl p-3 flex flex-col items-center ${
                        (totalSalesBsFiltered + incomeBs - expensesBs) >= 0 
                            ? 'bg-indigo-100 border-indigo-200' 
                            : 'bg-orange-100 border-orange-200'
                    }`}>
                        <div className="flex items-center gap-1 mb-1 justify-center">
                            <span className={`text-[8px] font-black uppercase tracking-wider ${
                                (totalSalesBsFiltered + incomeBs - expensesBs) >= 0 
                                    ? 'text-indigo-600' 
                                    : 'text-orange-600'
                            }`}>Balance</span>
                        </div>
                        <p className={`text-lg font-black leading-none ${
                            (totalSalesBsFiltered + incomeBs - expensesBs) >= 0 
                                ? 'text-indigo-800' 
                                : 'text-orange-800'
                        }`}>
                            {(totalSalesBsFiltered + incomeBs - expensesBs) >= 0 ? '+' : ''}
                            {(totalSalesBsFiltered + incomeBs - expensesBs).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                        </p>
                        <p className={`text-[9px] font-bold text-center ${
                            (totalSalesBsFiltered + incomeBs - expensesBs) >= 0 
                                ? 'text-indigo-500' 
                                : 'text-orange-500'
                        }`}>
                            ${((totalSalesBsFiltered + incomeBs - expensesBs) / getDisplayedExchangeRate()).toFixed(2)}
                        </p>
                    </div>

                    <div className="bg-red-100 border-2 border-red-200 rounded-xl p-3 flex flex-col items-center">
                        <div className="flex items-center gap-1 mb-1">
                            <span className="text-[8px] font-black text-red-600 uppercase tracking-wider">Egresos</span>
                            <TrendingDown className="w-3 h-3 text-red-600" />
                        </div>
                        <p className="text-lg font-black text-red-800 leading-none">-{expensesBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })}</p>
                        <p className="text-[9px] font-bold text-red-500">${(expensesBs / getDisplayedExchangeRate()).toFixed(2)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2">
                    <div onClick={() => setActiveDetail('Cash')} className="bg-emerald-500 hover:bg-emerald-600 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-1.5 mb-1 text-emerald-100"><Banknote className="w-3 h-3" /><span className="text-[8px] font-black uppercase tracking-wider text-white">Efectivo</span></div>
                        <p className="text-sm font-black text-white truncate">{salesCashBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p>
                        <p className="text-[9px] text-emerald-200">${(salesCashBs / getDisplayedExchangeRate()).toFixed(2)}</p>
                    </div>
                    <div onClick={() => setActiveDetail('PagoMovil')} className="bg-purple-500 hover:bg-purple-600 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-1.5 mb-1 text-purple-100"><Smartphone className="w-3 h-3" /><span className="text-[8px] font-black uppercase tracking-wider text-white">Pago Movil</span></div>
                        <p className="text-sm font-black text-white truncate">{salesPagoMovilBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p>
                        <p className="text-[9px] text-purple-200">${(salesPagoMovilBs / getDisplayedExchangeRate()).toFixed(2)}</p>
                    </div>
                    <div onClick={() => setActiveDetail('Card')} className="bg-blue-500 hover:bg-blue-600 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-1.5 mb-1 text-blue-100"><CreditCard className="w-3 h-3" /><span className="text-[8px] font-black uppercase tracking-wider text-white">Punto</span></div>
                        <p className="text-sm font-black text-white truncate">{salesCardBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p>
                        <p className="text-[9px] text-blue-200">${(salesCardBs / getDisplayedExchangeRate()).toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
                <div className="mb-4">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Movimientos</h3>
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
                                                        <p className="text-base font-black text-gray-900">{(s.total * s.exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p>
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
                                                    {isExpense ? '-' : '+'}{t.amountBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
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

            <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:w-80 z-30 flex gap-3 pb-6">
                <button onClick={() => setShowExpenseTypeModal(true)} className="flex-1 bg-white text-red-600 px-4 py-3 rounded-full shadow-xl border border-red-200 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Wallet className="w-5 h-5" />
                    <span className="text-sm font-black uppercase">Gastos</span>
                </button>
                <button onClick={() => setShowPurchasePOS(true)} className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-full shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    <span className="text-sm font-black uppercase">Inventario</span>
                </button>
                <button onClick={onOpenPOS} className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-full shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    <span className="text-sm font-black uppercase">Ventas</span>
                </button>
            </div>

            {showPurchasePOS && (
                <PurchasePOS
                    products={products}
                    exchangeRate={exchangeRate}
                    onClose={() => setShowPurchasePOS(false)}
                    onPurchase={onPurchaseProducts}
                    onAddProduct={onAddProduct}
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
                                <div className="mt-3 bg-white/60 p-3 rounded-xl"><p className="text-xs text-gray-500 uppercase font-bold">Total</p><p className="text-2xl font-black text-gray-900">{total.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</p></div>
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
                                            <div className="text-right"><p className="text-sm font-black text-gray-900">{(sale.total * sale.exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p></div>
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

            {showExpenseTypeModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm">
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-black text-gray-900">Tipo de Gasto</h3>
                        </div>
                        <div className="space-y-3">
                            <button 
                                onClick={() => { setShowExpenseTypeModal(false); setShowExpenseModal(true); }} 
                                className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <Wallet className="w-5 h-5" />
                                Gasto por Categoría
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

            {showExpenseModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm">
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-black text-gray-900">Gasto</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-orange-300">{expenseMethodLabel}</span>
                                <input autoFocus type="number" placeholder="0.00" className="w-full pl-10 pr-20 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-center font-bold text-lg" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
                                <button onClick={() => setExpenseMethodLabel(prev => prev === '$' ? 'Bs' : '$')} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">{expenseMethodLabel === '$' ? '$→Bs' : 'Bs→$'}</button>
                            </div>
                            <input type="text" placeholder="Descripcion" className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm" value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} />
                            <div className="grid grid-cols-3 gap-2">
                                {['Inventario', 'Servicios', 'Otros'].map(cat => (
                                    <button key={cat} onClick={() => setExpenseCategory(cat)} className={`py-2 text-xs font-bold rounded-lg ${expenseCategory === cat ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{cat}</button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <button onClick={() => setShowExpenseModal(false)} className="py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm">Cancelar</button>
                            <button onClick={handleAddExpense} className="py-3 bg-orange-500 text-white rounded-xl font-bold text-sm">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VentasCaja;
