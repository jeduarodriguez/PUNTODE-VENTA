
import React, { useState, useEffect } from 'react';
import { TreasuryTransaction, ExchangeRateRecord, Customer, Sale, Product } from '../types';
import { Landmark, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Plus, Filter, Calendar, Briefcase, Truck, Users, CreditCard, ShoppingBag, Search, X, Check, FileText, Smartphone, Banknote, Clock, ChevronDown, ChevronUp, RefreshCw, Calculator as CalculatorIcon, Divide, Hash, Edit, Trash2, LayoutGrid, Tag, Scale, Wallet, ShoppingCart, ArrowRight, DollarSign, Package, AlertTriangle, Save, ChevronLeft, Minus, UserPlus } from '../constants';
import { syncPath, saveData } from '../services/supabaseService';

interface TreasuryProps {
    transactions: TreasuryTransaction[];
    exchangeRate: number;
    rateHistory?: ExchangeRateRecord[];
    customers?: Customer[];
    sales?: Sale[];
    products?: Product[];
    onAddTransaction: (transaction: TreasuryTransaction) => void;
    onDeleteTransaction?: (id: string) => void;
    onRestock?: (transaction: TreasuryTransaction, items: { productId: string, quantity: number, cost: number, newPrice?: number }[]) => void;
}

interface PurchaseItem {
    productId: string;
    product: Product;
    quantity: number;
    cost: number; // Costo en USD
    updatePrice: boolean;
    newPrice: number; // PVP en USD
}

const Treasury: React.FC<TreasuryProps> = ({ transactions, exchangeRate, rateHistory = [], customers = [], sales = [], products = [], onAddTransaction, onDeleteTransaction, onRestock }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // --- Purchase Flow States ---
    const [isRestockMode, setIsRestockMode] = useState(false); // Modo Pantalla Completa
    const [showCartMobile, setShowCartMobile] = useState(false); // Drawer en móvil
    const [isReviewOrderOpen, setIsReviewOrderOpen] = useState(false); // Modal Checkout (Carrito)

    const [productSearch, setProductSearch] = useState('');
    const [purchaseCart, setPurchaseCart] = useState<PurchaseItem[]>([]);
    const [purchaseRate, setPurchaseRate] = useState(exchangeRate.toString());

    // Estados Modales Específicos de Compra
    const [isEditCostOpen, setIsEditCostOpen] = useState(false);
    const [editingCostItem, setEditingCostItem] = useState<PurchaseItem | null>(null);
    const [costInBsInput, setCostInBsInput] = useState('');

    const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
    const [supplierName, setSupplierName] = useState('');

    const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
    const [newProductData, setNewProductData] = useState<Partial<Product>>({ name: '', costPrice: 0, price: 0, category: 'General' });

    // Filtros Balance
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Estados Formulario Manual (Balance)
    const [amountInBs, setAmountInBs] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [transactionRate, setTransactionRate] = useState<string>(exchangeRate.toString());

    const [formData, setFormData] = useState<Partial<TreasuryTransaction>>({
        type: 'expense',
        category: 'Proveedores',
        description: '',
        method: 'Cash'
    });

    // Inicializar fecha y hora
    useEffect(() => {
        if (isModalOpen && !editingId) {
            const now = new Date();
            setSelectedDate(now.toISOString().split('T')[0]);
            setSelectedTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
            setTransactionRate(exchangeRate.toString());
            setAmountInBs('');
            setFormData(prev => ({ ...prev, type: 'expense', category: 'Proveedores', description: '', method: 'Cash' }));
        }
    }, [isModalOpen, editingId, exchangeRate]);

    // Sincronizar tasa de compra inicial
    useEffect(() => {
        if (!isRestockMode) setPurchaseRate(exchangeRate.toString());
    }, [exchangeRate, isRestockMode]);

    // --- Handlers para Transacciones Manuales ---
    const handleEdit = (transaction: TreasuryTransaction) => {
        setEditingId(transaction.id);
        setFormData({
            type: transaction.type,
            category: transaction.category,
            description: transaction.description,
            method: transaction.method
        });
        setAmountInBs(transaction.amountBs.toString());
        setTransactionRate(transaction.exchangeRate.toString());

        const date = new Date(transaction.timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        setSelectedDate(`${year}-${month}-${day}`);

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setSelectedTime(`${hours}:${minutes}`);

        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const bsVal = parseFloat(amountInBs);
        const rateVal = parseFloat(transactionRate);

        if (!bsVal || !rateVal) return;

        const usdVal = bsVal / rateVal;

        let timestamp = Date.now();
        if (selectedDate && selectedTime) {
            const dt = new Date(`${selectedDate}T${selectedTime}`);
            if (!isNaN(dt.getTime())) timestamp = dt.getTime();
        }

        const transaction: TreasuryTransaction = {
            id: editingId || `manual_${Date.now()}`,
            timestamp,
            type: formData.type as 'income' | 'expense',
            category: formData.category || 'Otros',
            description: formData.description || 'Movimiento Manual',
            amount: usdVal,
            amountBs: bsVal,
            exchangeRate: rateVal,
            method: (formData.method as any) || 'Cash'
        };

        onAddTransaction(transaction);
        setIsModalOpen(false);
        setEditingId(null);
    };

    const handleDelete = () => {
        if (editingId && onDeleteTransaction) {
            if (window.confirm('¿Eliminar este registro?')) {
                onDeleteTransaction(editingId);
                setIsModalOpen(false);
                setEditingId(null);
            }
        }
    };

    // --- Purchase Logic ---
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

    const addToPurchaseCart = (product: Product) => {
        setPurchaseCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
                return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, {
                productId: product.id,
                product,
                quantity: 1,
                cost: product.costPrice,
                updatePrice: false,
                newPrice: product.price
            }];
        });
    };

    const removeFromPurchaseCart = (productId: string) => {
        setPurchaseCart(prev => prev.filter(i => i.productId !== productId));
    };

    const updatePurchaseItem = (productId: string, updates: Partial<PurchaseItem>) => {
        setPurchaseCart(prev => prev.map(item => {
            if (item.productId === productId) return { ...item, ...updates };
            return item;
        }));
    };

    const calculatePurchaseTotal = () => {
        return purchaseCart.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    };

    // --- NEW PRODUCT LOGIC ---
    const handleAddNewProduct = () => {
        const newId = `prod_${Date.now()}`;
        const newProduct: Product = {
            id: newId,
            name: newProductData.name || 'Nuevo Producto',
            category: newProductData.category || 'General',
            costPrice: Number(newProductData.costPrice) || 0,
            price: Number(newProductData.price) || 0,
            stock: 0, // Se sumará al comprar
            sellingMode: 'simple',
            image: ''
        };

        // Guardamos en DB inmediatamente (pero con stock 0)
        saveData(`products/${newId}`, newProduct);

        // Lo agregamos al carrito
        addToPurchaseCart(newProduct);

        setIsNewProductModalOpen(false);
        setNewProductData({ name: '', costPrice: 0, price: 0, category: 'General' });
        setProductSearch(''); // Limpiar búsqueda para verlo
    };

    // --- EDIT COST LOGIC ---
    const openEditCost = (item: PurchaseItem) => {
        setEditingCostItem(item);
        // Calcular Bs actual basado en tasa de compra
        const currentBs = item.cost * (parseFloat(purchaseRate) || exchangeRate);
        setCostInBsInput(currentBs.toFixed(2));
        setIsEditCostOpen(true);
    };

    const saveCostEdit = () => {
        if (!editingCostItem) return;
        const bsValue = parseFloat(costInBsInput) || 0;
        const rate = parseFloat(purchaseRate) || 1;
        const newCostUsd = bsValue / rate;

        updatePurchaseItem(editingCostItem.productId, { cost: newCostUsd });
        setIsEditCostOpen(false);
        setEditingCostItem(null);
    };

    // --- CHECKOUT LOGIC ---
    const initiatePurchase = (method: 'Cash' | 'Card' | 'PagoMovil' | 'Credit' | 'Transfer') => {
        if (purchaseCart.length === 0) return;

        if (method === 'Credit') {
            setIsCreditModalOpen(true);
            return;
        }
        processPurchase(method);
    };

    const processPurchase = (method: string, creditSupplier?: string) => {
        if (!onRestock) return;

        const totalCostUsd = calculatePurchaseTotal();
        const rate = parseFloat(purchaseRate) || exchangeRate;
        const totalCostBs = totalCostUsd * rate;

        let description = `Compra: ${purchaseCart.map(i => `${i.quantity} ${i.product.name}`).join(', ')}`;
        if (creditSupplier) description = `Compra a Crédito (${creditSupplier}): ${purchaseCart.map(i => `${i.quantity} ${i.product.name}`).join(', ')}`;

        const truncatedDesc = description.length > 100 ? description.substring(0, 97) + '...' : description;

        const transaction: TreasuryTransaction = {
            id: `purchase_${Date.now()}`,
            timestamp: Date.now(),
            type: 'expense',
            category: 'Proveedores',
            amount: totalCostUsd,
            amountBs: totalCostBs,
            exchangeRate: rate,
            description: truncatedDesc,
            method: method as any
        };

        const items = purchaseCart.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            cost: i.cost,
            newPrice: i.updatePrice ? i.newPrice : undefined
        }));

        onRestock(transaction, items);

        // Reset
        setIsReviewOrderOpen(false);
        setIsRestockMode(false);
        setIsCreditModalOpen(false);
        setPurchaseCart([]);
        setSupplierName('');
    };

    // --- BALANCE CALCULATIONS ---
    const manualTransactions = transactions.filter(t => t.category !== 'Ventas (Cierre)');
    const manualCashBalance = manualTransactions.reduce((acc, t) => {
        if (t.method === 'Cash') return acc + (t.type === 'income' ? t.amountBs : -t.amountBs);
        return acc;
    }, 0);
    const allSalesCash = sales.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + (s.total * s.exchangeRate), 0);
    const bankTransactions = transactions.filter(t => t.method !== 'Cash');
    const bankBalanceFromTxs = bankTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amountBs : -t.amountBs), 0);
    const allPagoMovilSales = sales.filter(s => s.paymentMethod === 'PagoMovil').reduce((sum, s) => sum + (s.total * s.exchangeRate), 0);
    const totalBankBs = bankBalanceFromTxs + allPagoMovilSales;
    const totalCashBs = manualCashBalance + allSalesCash;
    const cashBalanceRefUsd = totalCashBs / exchangeRate;
    const bankBalanceRefUsd = totalBankBs / exchangeRate;
    const totalReceivablesUsd = customers.reduce((sum, c) => sum + c.balance, 0);
    const totalReceivablesBs = totalReceivablesUsd * exchangeRate;

    // Calculos Flujo General (Totales)
    const totalIncomeBs = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amountBs, 0);
    const totalExpenseBs = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amountBs, 0);
    const netBalanceBs = totalIncomeBs - totalExpenseBs;

    const totalIncomeUsd = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpenseUsd = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const netBalanceUsd = totalIncomeUsd - totalExpenseUsd;

    // Filtered List Logic
    const filteredTransactions = transactions
        .filter(t => {
            const matchesType = filterType === 'all' ? true : t.type === filterType;
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesType && matchesSearch;
        })
        .sort((a, b) => b.timestamp - a.timestamp);

    // Helper for Balance Icons
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Ventas (Cierre)': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
            case 'Proveedores': return <Truck className="w-4 h-4 text-blue-500" />;
            case 'Nómina': return <Users className="w-4 h-4 text-orange-500" />;
            default: return <FileText className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-4 pb-24">
            {/* --- VISTA PRINCIPAL (BALANCE) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {/* Cards Balance - Banco/Efectivo/Deuda (RESTAURADO A 3 COLUMNAS HORIZONTALES SIEMPRE) */}
                <div className="bg-indigo-900 rounded-[2rem] shadow-xl text-white relative overflow-hidden flex flex-row h-auto min-h-[140px]">
                    {/* Banco */}
                    <div className="flex-1 p-2 md:p-4 flex flex-col items-center justify-center text-center border-r border-indigo-800/50 z-10">
                        <div className="flex items-center gap-1 md:gap-2 mb-2">
                            <div className="p-1.5 bg-indigo-800 rounded-lg text-indigo-200"><Smartphone className="w-3 h-3 md:w-4 md:h-4" /></div>
                            <span className="text-[10px] md:text-xs font-black text-indigo-200 uppercase tracking-widest">Banco</span>
                        </div>
                        <p className="text-lg md:text-3xl font-black text-white leading-none break-all">{totalBankBs.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-xs">Bs</span></p>
                        <p className="text-[10px] font-bold text-indigo-300 mt-1">Ref: ${bankBalanceRefUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    </div>

                    {/* Efectivo */}
                    <div className="flex-1 p-2 md:p-4 flex flex-col items-center justify-center text-center border-r border-indigo-800/50 z-10">
                        <div className="flex items-center gap-1 md:gap-2 mb-2">
                            <div className="p-1.5 bg-emerald-900/50 rounded-lg text-emerald-400"><Banknote className="w-3 h-3 md:w-4 md:h-4" /></div>
                            <span className="text-[10px] md:text-xs font-black text-emerald-200 uppercase tracking-widest">Efectivo</span>
                        </div>
                        <p className="text-lg md:text-3xl font-black text-white leading-none break-all">{totalCashBs.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-xs">Bs</span></p>
                        <p className="text-[10px] font-bold text-emerald-300 mt-1">Ref: ${cashBalanceRefUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    </div>

                    {/* Deuda */}
                    <div className="flex-1 p-2 md:p-4 flex flex-col items-center justify-center text-center z-10 bg-indigo-800/20">
                        <div className="flex items-center gap-1 md:gap-2 mb-2">
                            <div className="p-1.5 bg-orange-500/20 rounded-lg text-orange-400"><Users className="w-3 h-3 md:w-4 md:h-4" /></div>
                            <span className="text-[10px] md:text-xs font-black text-orange-300 uppercase tracking-widest">Por Cobrar</span>
                        </div>
                        <p className="text-lg md:text-3xl font-black text-white leading-none break-all">{totalReceivablesBs.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-xs">Bs</span></p>
                        <p className="text-[10px] font-bold text-orange-300/80 mt-1">Ref: ${totalReceivablesUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* Tarjeta Resumen Flujo (MODIFICADA: MAS DELGADA) */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm flex overflow-hidden h-auto min-h-[100px] select-none">
                    {/* INCOME */}
                    <div onClick={() => setFilterType(filterType === 'income' ? 'all' : 'income')} className={`flex-1 py-2 px-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-emerald-100 hover:bg-emerald-200 ${filterType === 'income' ? 'ring-4 ring-emerald-500 ring-inset' : ''}`}>
                        <ArrowUp className="w-5 h-5 mb-0.5 text-emerald-700" />
                        <p className="text-2xl md:text-3xl font-black text-emerald-800 leading-none">+{totalIncomeBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p>
                        <p className="text-xs text-emerald-700 font-bold mt-0.5">${totalIncomeUsd.toFixed(0)}</p>
                    </div>

                    {/* NET (Middle - Smaller) */}
                    <div className="w-20 p-1 flex flex-col items-center justify-center text-center border-x border-gray-100 bg-white z-10">
                        <Scale className="w-4 h-4 mb-1 text-blue-500" />
                        <p className={`text-sm font-black leading-none ${netBalanceBs >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>{netBalanceBs > 0 ? '+' : ''}{netBalanceBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p>
                    </div>

                    {/* EXPENSE */}
                    <div onClick={() => setFilterType(filterType === 'expense' ? 'all' : 'expense')} className={`flex-1 py-2 px-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-red-100 hover:bg-red-200 ${filterType === 'expense' ? 'ring-4 ring-red-500 ring-inset' : ''}`}>
                        <ArrowDown className="w-5 h-5 mb-0.5 text-red-700" />
                        <p className="text-2xl md:text-3xl font-black text-red-800 leading-none">-{totalExpenseBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p>
                        <p className="text-xs text-red-700 font-bold mt-0.5">${totalExpenseUsd.toFixed(0)}</p>
                    </div>
                </div>
            </div>

            {/* Lista Transacciones */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredTransactions.map(t => (
                        <div key={t.id} onClick={() => handleEdit(t)} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {getCategoryIcon(t.category)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{t.description}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{new Date(t.timestamp).toLocaleDateString()} • {t.method}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'}{t.amountBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })} Bs</p>
                                <p className="text-[10px] text-gray-400 font-bold">${t.amount.toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Botones Flotantes */}
            <div className="fixed bottom-24 right-4 md:bottom-10 md:right-10 z-40 flex flex-col gap-3">
                <button onClick={() => setIsRestockMode(true)} className="bg-indigo-600 text-white w-14 h-14 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center group relative">
                    <Truck className="w-6 h-6" />
                    <span className="absolute right-full mr-2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Comprar</span>
                </button>
                <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="bg-gray-900 text-white w-14 h-14 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center group relative">
                    <Plus className="w-7 h-7" />
                    <span className="absolute right-full mr-2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Manual</span>
                </button>
            </div>

            {/* --- MÓDULO DE COMPRAS (FULL SCREEN - POS STYLE) --- */}
            {isRestockMode && (
                <div className="fixed inset-0 bg-gray-50 z-[100] flex flex-col md:flex-row animate-fade-in">

                    {/* HEADER SUPERIOR SOLO MÓVIL: Carrito / Total (Para no estorbar abajo) */}
                    <div className="md:hidden p-4 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm z-20">
                        <div>
                            <h3 className="font-black text-gray-900 text-sm uppercase">Comprar Stock</h3>
                            <p className="text-[10px] text-gray-400 font-bold">Selecciona productos</p>
                        </div>
                        {/* Botón Carrito Flotante (Arriba en móvil) */}
                        <button
                            onClick={() => setIsReviewOrderOpen(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${purchaseCart.length > 0 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
                        >
                            <ShoppingCart className="w-5 h-5" />
                            {purchaseCart.length > 0 && <span className="font-black text-xs">{(calculatePurchaseTotal() * parseFloat(purchaseRate)).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</span>}
                        </button>
                    </div>

                    {/* IZQUIERDA: LISTA DE PRODUCTOS (Estilo POS) */}
                    <div className="flex-1 flex flex-col overflow-hidden relative pb-20 md:pb-0">

                        {/* Lista de Productos */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24">
                            {filteredProducts.map(product => {
                                const inCart = purchaseCart.find(i => i.productId === product.id);
                                const qty = inCart ? inCart.quantity : 0;
                                const costBs = product.costPrice * parseFloat(purchaseRate);

                                return (
                                    <div
                                        key={product.id}
                                        onMouseDown={(e) => {
                                            // IMPORTANTE: preventDefault evita que el input pierda el foco al hacer clic en el item
                                            e.preventDefault();
                                            addToPurchaseCart(product);
                                        }}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-[0.98] cursor-pointer ${qty > 0 ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500' : 'bg-white border-gray-100 hover:border-indigo-100 shadow-sm'}`}
                                    >
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900 text-sm leading-tight">{product.name}</h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">{product.category} • Stock: {product.stock}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-gray-900 text-sm">{costBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })} Bs</p>
                                            <p className="text-[10px] font-bold text-gray-400">Ref: ${product.costPrice.toFixed(2)}</p>
                                        </div>
                                        {qty > 0 && (
                                            <div className="bg-indigo-600 text-white w-8 h-8 flex items-center justify-center rounded-full text-xs font-black shadow-sm shrink-0">
                                                {qty}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Espacio extra al final para scroll */}
                            <div className="h-20 md:hidden"></div>
                        </div>

                        {/* BARRA INFERIOR FIJA: BUSQUEDA + CONTROLES */}
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-30 flex items-center gap-2 safe-area-bottom">
                            {/* Botón Cancelar */}
                            <button
                                onClick={() => setIsRestockMode(false)}
                                className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 active:scale-95 border border-red-100 shadow-sm"
                                title="Cancelar Compra"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {/* Botón Nuevo Producto */}
                            <button
                                onClick={() => setIsNewProductModalOpen(true)}
                                className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 active:scale-95 border border-emerald-100 shadow-sm"
                                title="Nuevo Producto"
                            >
                                <Plus className="w-6 h-6" />
                            </button>

                            {/* Input Búsqueda */}
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Buscar producto..."
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* DERECHA: CARRITO DE COMPRAS (Estilo POS - Visible en Desktop) */}
                    {purchaseCart.length > 0 && (
                        <>
                            <div className={`fixed inset-0 z-[110] bg-white/95 backdrop-blur-xl md:static md:w-96 md:border-l md:border-gray-200 md:shadow-xl transition-transform duration-300 flex flex-col ${isReviewOrderOpen || window.innerWidth >= 768 ? 'translate-y-0' : 'translate-y-full'}`}>
                                {/* Mobile Handle / Header */}
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 md:bg-white">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                                            <ShoppingCart className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900">Orden de Compra</h3>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Tasa:</span>
                                                <input
                                                    className="w-12 bg-transparent text-xs font-black text-indigo-600 outline-none border-b border-indigo-200"
                                                    value={purchaseRate}
                                                    onChange={(e) => setPurchaseRate(e.target.value)}
                                                />
                                                <span className="text-[10px] font-bold text-gray-400">Bs/$</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsReviewOrderOpen(false)} className="md:hidden p-2 text-gray-400"><ChevronDown className="w-6 h-6" /></button>
                                </div>

                                {/* Lista Items Carrito */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {purchaseCart.map(item => {
                                        const costBs = item.cost * parseFloat(purchaseRate);
                                        return (
                                            <div key={item.productId} className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm flex items-center justify-between gap-3">
                                                {/* Izquierda: Nombre */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-900 text-xs leading-tight line-clamp-2">{item.product.name}</h4>
                                                </div>

                                                {/* Centro: Cantidad (Manual y Botones) */}
                                                <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-200 shrink-0">
                                                    <button
                                                        onClick={() => updatePurchaseItem(item.productId, { quantity: Math.max(0, item.quantity - 1) })}
                                                        className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-gray-500 shadow-sm border border-gray-100 active:scale-90 transition-transform"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        className="w-10 text-center bg-transparent font-black text-sm outline-none appearance-none m-0 text-gray-900"
                                                        value={item.quantity === 0 ? '' : item.quantity}
                                                        placeholder="0"
                                                        onChange={(e) => {
                                                            const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                            updatePurchaseItem(item.productId, { quantity: isNaN(val) ? 0 : val });
                                                        }}
                                                        onFocus={(e) => e.target.select()}
                                                    />
                                                    <button
                                                        onClick={() => updatePurchaseItem(item.productId, { quantity: item.quantity + 1 })}
                                                        className="w-8 h-8 flex items-center justify-center bg-gray-900 text-white rounded-lg shadow-sm active:scale-90 transition-transform"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                {/* Derecha: Precio y Editar */}
                                                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm leading-none">{(costBs * item.quantity).toLocaleString('es-VE', { maximumFractionDigits: 2 })} Bs</p>
                                                        <p className="text-[10px] font-bold text-gray-400">Ref: ${(item.cost * item.quantity).toFixed(2)}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => openEditCost(item)}
                                                        className="px-2 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                                    >
                                                        <Edit className="w-3 h-3" /> Editar
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Footer Totales y Botones */}
                                <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Orden</span>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-gray-900">{(calculatePurchaseTotal() * parseFloat(purchaseRate)).toLocaleString('es-VE')} Bs</p>
                                            <p className="text-[10px] font-bold text-gray-400">Ref: ${calculatePurchaseTotal().toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => initiatePurchase('Cash')} className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold text-[10px] uppercase flex flex-col items-center gap-1 active:scale-95">
                                            <Banknote className="w-4 h-4" /> Efectivo
                                        </button>
                                        <button onClick={() => initiatePurchase('PagoMovil')} className="p-3 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl font-bold text-[10px] uppercase flex flex-col items-center gap-1 active:scale-95">
                                            <Smartphone className="w-4 h-4" /> Pago Móvil
                                        </button>
                                        <button onClick={() => initiatePurchase('Card')} className="p-3 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-bold text-[10px] uppercase flex flex-col items-center gap-1 active:scale-95">
                                            <CreditCard className="w-4 h-4" /> Tarjeta
                                        </button>
                                        <button onClick={() => initiatePurchase('Credit')} className="p-3 bg-orange-50 text-orange-700 border border-orange-100 rounded-xl font-bold text-[10px] uppercase flex flex-col items-center gap-1 active:scale-95">
                                            <Wallet className="w-4 h-4" /> Crédito
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* --- MODALES AUXILIARES --- */}

            {/* 1. Modal Nuevo Producto Rápido */}
            {isNewProductModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-scale-up">
                        <h3 className="font-black text-lg text-gray-900 mb-4">Nuevo Producto</h3>
                        <div className="space-y-3">
                            <input
                                autoFocus
                                placeholder="Nombre del Producto"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none"
                                value={newProductData.name}
                                onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Costo ($)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none"
                                        value={newProductData.costPrice || ''}
                                        onChange={(e) => setNewProductData({ ...newProductData, costPrice: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Venta ($)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none"
                                        value={newProductData.price || ''}
                                        onChange={(e) => setNewProductData({ ...newProductData, price: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <button onClick={handleAddNewProduct} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-lg mt-2">Agregar al Carrito</button>
                            <button onClick={() => setIsNewProductModalOpen(false)} className="w-full py-3 text-gray-400 font-bold text-xs uppercase">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Modal Editar Costo en Bs */}
            {isEditCostOpen && editingCostItem && (
                <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-scale-up text-center">
                        <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-3">
                            <Edit className="w-6 h-6" />
                        </div>
                        <h3 className="font-black text-lg text-gray-900 mb-1">Editar Costo</h3>
                        <p className="text-xs text-gray-400 font-bold mb-4">{editingCostItem.product.name}</p>

                        <div className="relative mb-4">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Bs</span>
                            <input
                                autoFocus
                                type="number"
                                className="w-full pl-10 pr-4 py-4 bg-gray-50 border-2 border-indigo-100 rounded-2xl text-2xl font-black text-gray-900 text-center outline-none focus:bg-white focus:border-indigo-500 transition-colors"
                                value={costInBsInput}
                                onChange={(e) => setCostInBsInput(e.target.value)}
                            />
                        </div>

                        <div className="bg-gray-50 p-2 rounded-xl mb-4">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Nuevo Costo USD (Calculado)</p>
                            <p className="text-lg font-black text-indigo-600">${(parseFloat(costInBsInput || '0') / parseFloat(purchaseRate)).toFixed(2)}</p>
                        </div>

                        <button onClick={saveCostEdit} className="w-full py-3 bg-gray-900 text-white rounded-xl font-black uppercase text-xs shadow-lg">Actualizar</button>
                        <button onClick={() => setIsEditCostOpen(false)} className="w-full py-3 text-gray-400 font-bold text-xs uppercase mt-1">Cancelar</button>
                    </div>
                </div>
            )}

            {/* 3. Modal Crédito (Proveedor) */}
            {isCreditModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-scale-up">
                        <h3 className="font-black text-lg text-gray-900 mb-4 flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-orange-500" /> Compra a Crédito
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nombre del Proveedor / Fiado por</label>
                                <input
                                    autoFocus
                                    placeholder="Ej. Distribuidora Polar"
                                    className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500"
                                    value={supplierName}
                                    onChange={(e) => setSupplierName(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => processPurchase('Credit', supplierName || 'Proveedor Desconocido')}
                                disabled={!supplierName.trim()}
                                className="w-full py-4 bg-orange-500 text-white rounded-xl font-black uppercase text-xs shadow-lg disabled:opacity-50 disabled:shadow-none"
                            >
                                Confirmar Deuda
                            </button>
                            <button onClick={() => setIsCreditModalOpen(false)} className="w-full py-3 text-gray-400 font-bold text-xs uppercase">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL MANUAL TRADICIONAL (Mantenido para gastos generales) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md animate-scale-up shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-2xl font-black text-gray-900">{editingId ? 'Editar' : 'Registrar'}</h3>
                            <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 rounded-xl">
                                <button type="button" onClick={() => setFormData({ ...formData, type: 'income' })} className={`py-3 rounded-lg text-xs font-black uppercase transition-all ${formData.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Ingreso</button>
                                <button type="button" onClick={() => setFormData({ ...formData, type: 'expense' })} className={`py-3 rounded-lg text-xs font-black uppercase transition-all ${formData.type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}>Egreso</button>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Monto en Bolívares</label>
                                <div className="relative flex gap-2">
                                    <div className="relative flex-1">
                                        <input autoFocus={!editingId} type="number" step="0.01" placeholder="0.00" className="w-full pl-4 pr-12 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xl font-black text-gray-900 outline-none focus:border-indigo-500" value={amountInBs} onChange={(e) => setAmountInBs(e.target.value)} />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">Bs</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center bg-white border-2 border-indigo-50 rounded-2xl px-3 min-w-[80px] shadow-sm">
                                        <span className="text-[8px] font-bold text-gray-400 uppercase leading-none">Ref USD</span>
                                        <span className="text-sm font-black text-indigo-600 leading-none mt-0.5">${(parseFloat(amountInBs || '0') / parseFloat(transactionRate || '1')).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción</label>
                                <input placeholder="Ej. Pago Internet" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-indigo-500" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div className="flex gap-3">
                                {editingId && <button type="button" onClick={handleDelete} className="px-5 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase"><Trash2 className="w-5 h-5" /></button>}
                                <button type="submit" className={`flex-1 py-4 rounded-2xl font-black uppercase text-xs shadow-xl text-white ${formData.type === 'income' ? 'bg-emerald-600' : 'bg-red-600'}`}>{editingId ? 'Guardar' : 'Registrar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-up { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes bounce-in { 0% { transform: scale(0); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-up { animation: scale-up 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
        </div>
    );
};

export default Treasury;
