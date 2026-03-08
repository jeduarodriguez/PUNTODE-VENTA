import React, { useState, useEffect, useMemo } from 'react';
import { Product, CartItem, Sale, Customer, Worker, ExchangeRateRecord } from '../types';
import { Search, Plus, Minus, Trash2, ShoppingCart, Users, Wallet, DollarSign, CreditCard, LayoutGrid, List, X, RefreshCw, TrendingUp, Smartphone, Banknote, UserPlus, Check, ArrowLeft, ShoppingBag, Calculator, Scale, Briefcase } from '../constants';

interface POSProps {
    products: Product[];
    customers: Customer[];
    workers: Worker[];
    exchangeRate: number;
    rateHistory?: ExchangeRateRecord[];
    onSale: (sale: Sale) => void;
    onUpdateRate: (rate: number) => void;
    onAddCustomer: (customer: Customer) => void;
    onBackToDashboard: () => void;
    initialCart?: CartItem[];
    onCartLoaded?: () => void;
}

const POS: React.FC<POSProps> = ({ products, customers, workers, exchangeRate, rateHistory = [], onSale, onUpdateRate, onAddCustomer, onBackToDashboard, initialCart, onCartLoaded }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCartMobile, setShowCartMobile] = useState(false);

    // Weight modal state
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [weightProduct, setWeightProduct] = useState<Product | null>(null);
    const [weightQuantity, setWeightQuantity] = useState('0.5');

    // Quick Rate Update State
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [tempRate, setTempRate] = useState(exchangeRate.toString());

    // Cash Payment / Change Calculator State
    const [isCashModalOpen, setIsCashModalOpen] = useState(false);
    const [tenderedAmount, setTenderedAmount] = useState('');

    // Credit Customer Selection State
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');

    // New Customer Form State
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '' });

    // Load initial cart if provided (Edit Mode)
    useEffect(() => {
        if (initialCart && initialCart.length > 0) {
            setCart(initialCart);
            if (onCartLoaded) onCartLoaded();
        }
    }, [initialCart, onCartLoaded]);

    // Sync tempRate when prop changes (from Settings or App state)
    useEffect(() => {
        setTempRate(exchangeRate.toString());
    }, [exchangeRate]);

    // Función para obtener la tasa del día
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

    const todayRate = useMemo(() => getTodayRate(), [rateHistory, exchangeRate]);

    // Generate display products with weight/package labels
    const displayProducts = useMemo(() => {
        const result: Array<Product & { displayVariant?: string }> = [];
        products.forEach(product => {
            const sellingMode = product.selling_mode ?? (product as any).sellingMode ?? 'simple';
            const unitsPerPackage = product.units_per_package ?? (product as any).unitsPerPackage ?? 0;
            const remainingUnits = product.remaining_units ?? (product as any).remainingUnits ?? 0;
            const pricePerUnit = product.price_per_unit ?? (product as any).pricePerUnit ?? 0;
            const measurementUnit = product.measurement_unit ?? (product as any).measurementUnit ?? 'kg';

            if (sellingMode === 'weight' && measurementUnit) {
                const unitLabel = measurementUnit === 'kg' ? 'Kg' : measurementUnit;
                result.push({ ...product, name: `${product.name} (${unitLabel})` });
            } else if (sellingMode === 'package' && unitsPerPackage > 0 && pricePerUnit > 0) {
                // Producto paquete (venta por paquete)
                result.push({ ...product, displayVariant: 'Paq' });
                const totalUnits = (product.stock * unitsPerPackage) + remainingUnits;
                // Producto virtual para venta por unidad
                result.push({
                    ...product,
                    id: `${product.id}-unit`,
                    price: pricePerUnit,
                    selling_mode: 'simple',
                    stock: totalUnits,
                    displayVariant: 'Und'
                });
            } else {
                result.push({ ...product, name: product.name });
            }
        });
        return result;
    }, [products]);

    const filteredProducts = displayProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const filteredClients = customers.filter(c =>
        (c.type === 'client' || !c.type) &&
        (c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
            c.phone.includes(customerSearchTerm))
    );

    const filteredWorkers = workers.filter(w =>
        w.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        w.position.toLowerCase().includes(customerSearchTerm.toLowerCase())
    );

    const addToCart = (product: Product) => {
        const sellingMode = product.selling_mode ?? (product as any).sellingMode ?? 'simple';

        // Open weight modal for weight products
        if (sellingMode === 'weight') {
            setWeightProduct(product);
            setWeightQuantity('0.5');
            setIsWeightModalOpen(true);
            return;
        }

        const currentInCart = cart.find(item => item.id === product.id)?.quantity || 0;
        if (currentInCart >= product.stock) return;

        if (navigator.vibrate) navigator.vibrate(50);

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const addWeightToCart = () => {
        if (!weightProduct) return;

        const qty = parseFloat(weightQuantity) || 0;
        if (qty <= 0 || qty > weightProduct.stock) return;

        if (navigator.vibrate) navigator.vibrate(50);

        setCart(prev => {
            const existing = prev.find(item => item.id === weightProduct.id);
            if (existing) {
                return prev.map(item => item.id === weightProduct.id ? { ...item, quantity: item.quantity + qty } : item);
            }
            return [...prev, { ...weightProduct, quantity: qty }];
        });

        setIsWeightModalOpen(false);
        setWeightProduct(null);
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQuantity = Math.max(1, Math.min(item.quantity + delta, item.stock));
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const calculateTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const initiateSale = (method: 'Cash' | 'Card' | 'Credit' | 'PagoMovil') => {
        if (cart.length === 0) return;

        if (method === 'Credit') {
            setIsCustomerModalOpen(true);
            return;
        }

        // For Cash, Card, PagoMovil -> Process immediately
        processSale(method);
    };

    const openCashCalculator = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (cart.length === 0) return;
        setTenderedAmount('');
        setIsCashModalOpen(true);
    };

    const processSale = (method: 'Cash' | 'Card' | 'Credit' | 'PagoMovil', customerId?: string) => {
        const sale: Sale = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            items: cart,
            total: calculateTotal(),
            exchangeRate: todayRate,
            paymentMethod: method,
            customerId: customerId
        };

        onSale(sale);
        setCart([]);
        setIsCustomerModalOpen(false);
        setIsCashModalOpen(false);
    };

    // Helper for mobile cart visibility
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Cash Calculation Helpers
    const totalBs = calculateTotal() * todayRate;
    const tenderedBs = parseFloat(tenderedAmount) || 0;
    const changeBs = tenderedBs - totalBs;
    const isSufficient = tenderedBs >= totalBs - 0.01; // Small epsilon for float logic

    const handleCreateCustomer = (e: React.FormEvent) => {
        e.preventDefault();
        const newCustomer: Customer = {
            id: Math.random().toString(36).substr(2, 9),
            name: newCustomerData.name,
            phone: newCustomerData.phone,
            balance: 0,
            createdAt: Date.now()
        };
        onAddCustomer(newCustomer);
        setIsCreatingCustomer(false);
        setNewCustomerData({ name: '', phone: '' });
        // Process sale immediately with new customer
        processSale('Credit', newCustomer.id);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-20px)] md:h-[calc(100vh-20px)] pt-2">

            {/* LEFT: Product Catalog */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">

                {/* Search Bar */}
                <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar producto..."
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-base font-bold text-gray-900 outline-none focus:border-indigo-500 transition-all placeholder:text-gray-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 p-1 hover:bg-gray-200 rounded-full">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Close Button Next to Search */}
                        <button
                            onClick={onBackToDashboard}
                            className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors active:scale-95 border border-red-100 shrink-0"
                            title="Cancelar Venta"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="ml-1">
                        </div>
                    </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-20 lg:pb-0">
                    <div className="flex flex-col gap-2">
                        {filteredProducts.map(product => {
                            const qtyInCart = cart.find(i => i.id === product.id)?.quantity || 0;

                            // Calcular stock disponible considerando el carrito
                            let currentStock = product.stock;
                            let displayStock = '';
                            let isOutOfStock = false;

                            const sellingMode = product.selling_mode ?? (product as any).sellingMode ?? 'simple';
                            const unitsPerPackage = product.units_per_package ?? (product as any).unitsPerPackage ?? 0;
                            const isUnitSale = product.id && product.id.endsWith('-unit');
                            const displayVariant = (product as any).displayVariant;

                            // Para productos paquete vendidos por unidad
                            if (sellingMode === 'package' && isUnitSale) {
                                const productId = product.id.replace('-unit', '');
                                const originalProduct = products.find(p => p.id === productId);
                                const unitsPerPkg = (originalProduct?.units_per_package ?? (originalProduct as any)?.unitsPerPackage ?? 0);
                                const remainingUnits = originalProduct?.remaining_units ?? (originalProduct as any)?.remainingUnits ?? 0;
                                const pkgStock = originalProduct?.stock ?? 0;

                                // Calcular unidades totales disponibles
                                const totalUnitsAvailable = (pkgStock * unitsPerPkg) + remainingUnits;
                                const unitsAfterCart = totalUnitsAvailable - qtyInCart;

                                if (unitsAfterCart <= 0) {
                                    isOutOfStock = true;
                                    displayStock = 'Agotado';
                                } else {
                                    const remainingPkgs = Math.floor(unitsAfterCart / unitsPerPkg);
                                    const remainingUnd = unitsAfterCart % unitsPerPkg;
                                    displayStock = `${remainingPkgs} Paq / ${remainingUnd} Und`;
                                }
                            } else if (displayVariant === 'Paq') {
                                // Producto paquete vendido por paquete - considerar también unidades en carrito
                                const unitsInCart = cart.find(i => i.id === `${product.id}-unit`)?.quantity || 0;
                                const unitsPerPkg = product.units_per_package ?? (product as any).unitsPerPackage ?? 0;
                                const remainingUnits = product.remaining_units ?? (product as any).remainingUnits ?? 0;

                                // Calcular unidades totales disponibles considerando both package and unit sales
                                const totalUnitsAvailable = (product.stock * unitsPerPkg) + remainingUnits;
                                const totalUnitsInCart = (qtyInCart * unitsPerPkg) + unitsInCart;
                                const unitsAfterCart = totalUnitsAvailable - totalUnitsInCart;

                                if (unitsAfterCart <= 0) {
                                    isOutOfStock = true;
                                    displayStock = 'Agotado';
                                } else {
                                    const remainingPkgs = Math.floor(unitsAfterCart / unitsPerPkg);
                                    const remainingUnd = unitsAfterCart % unitsPerPkg;
                                    displayStock = `${remainingPkgs} Paq / ${remainingUnd} Und`;
                                }
                            } else {
                                // Stock normal o para venta por peso
                                currentStock = Math.max(0, product.stock - qtyInCart);
                                if (currentStock === 0) {
                                    isOutOfStock = true;
                                    displayStock = 'Agotado';
                                } else {
                                    const unitLabel = sellingMode === 'weight' ? (product.measurement_unit ?? (product as any).measurementUnit ?? 'kg') : 'Unds.';
                                    displayStock = sellingMode === 'weight' ? `${currentStock}${unitLabel}` : `${currentStock} ${unitLabel}`;
                                }
                            }

                            return (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    disabled={isOutOfStock}
                                    className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all active:scale-[0.98] ${isOutOfStock ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-50 hover:border-indigo-100 shadow-sm'
                                        }`}
                                >
                                    <div className="flex-1 text-left min-w-0">
                                        <h3 className="font-bold text-gray-900 leading-tight truncate">
                                            {product.name}
                                            {sellingMode === 'package' && unitsPerPackage > 0 && <span className="text-indigo-600 ml-1">x{unitsPerPackage}</span>}
                                        </h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">
                                            {product.category}
                                            {(product as any).displayVariant && <span className="text-indigo-500 ml-1">({(product as any).displayVariant})</span>}
                                        </p>
                                    </div>

                                    {/* Stock Middle */}
                                    <div className="text-center w-14 shrink-0">
                                        <span className={`text-[9px] font-black ${isOutOfStock ? 'text-red-400' : 'text-gray-400'}`}>
                                            {displayStock}
                                        </span>
                                    </div>

                                    {/* Controles de cantidad */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        {qtyInCart > 0 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateQuantity(product.id, -1);
                                                }}
                                                className="w-7 h-7 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200 active:scale-95 transition-all"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                        )}
                                        {qtyInCart > 0 && (
                                            <span className="w-6 text-center text-xs font-black text-indigo-600">{qtyInCart}</span>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addToCart(product);
                                            }}
                                            disabled={isOutOfStock}
                                            className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-200 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>

                                    {/* Price Layout */}
                                    <div className="text-right flex flex-col items-end w-16 shrink-0">
                                        <p className="font-black text-gray-900 text-sm leading-none">{(product.price * todayRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')}</p>
                                        <p className="text-[7px] font-bold text-indigo-400 mt-0.5">${product.price.toFixed(2)}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT: Shopping Cart */}
            <div className={`fixed inset-0 z-50 lg:static lg:z-auto bg-white/95 backdrop-blur-xl lg:bg-white lg:backdrop-blur-none lg:w-96 lg:rounded-[2.5rem] lg:border-2 lg:border-gray-100 lg:shadow-xl transition-transform duration-300 flex flex-col ${showCartMobile ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>

                {/* Mobile Handle */}
                <div className="lg:hidden flex justify-center pt-3 pb-1" onClick={() => setShowCartMobile(false)}>
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                </div>

                <div className="p-6 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-gray-900">Carrito</h3>
                                    {/* Editable Rate Badge */}
                                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                                        <TrendingUp className="w-3 h-3 text-gray-500" />
                                        <input
                                            className="w-12 bg-transparent text-xs font-black text-gray-900 outline-none text-right p-0 border-none"
                                            type="number"
                                            value={tempRate}
                                            onChange={(e) => setTempRate(e.target.value)}
                                            onBlur={() => {
                                                const r = parseFloat(tempRate);
                                                if (r > 0) onUpdateRate(r);
                                                else setTempRate(exchangeRate.toString());
                                            }}
                                        />
                                        <span className="text-[10px] font-bold text-gray-400">Bs</span>
                                    </div>
                                </div>
                                <p className="text-xs font-medium text-gray-400">{cart.length} productos</p>
                            </div>
                        </div>
                        {cart.length > 0 && (
                            <button onClick={() => setCart([])} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-colors">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Header de Columnas */}
                    {cart.length > 0 && (
                        <div className="flex justify-between px-3 mb-2">
                            <span className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Producto</span>
                            <div className="flex gap-4">
                                <span className="text-[10px] font-black uppercase text-gray-300 tracking-widest text-center w-20">Cant</span>
                                <span className="text-[10px] font-black uppercase text-gray-300 tracking-widest text-right w-16">Subtotal</span>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-4">
                                <ShoppingBag className="w-16 h-16 text-gray-300" />
                                <p className="font-bold text-gray-400 text-sm">El carrito está vacío</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl group border border-transparent hover:border-gray-100 transition-colors">
                                    {/* Producto */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-gray-900 text-xs truncate max-w-[100px]">{item.name}</h4>
                                            <p className="text-[9px] font-bold text-gray-400">${item.price.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    {/* Controles + Subtotal */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 shadow-sm border border-gray-200">
                                            <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500">
                                                {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3" />}
                                            </button>
                                            <span className="font-black text-xs w-5 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-900 text-white shadow-sm">
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="text-right w-16">
                                            <p className="text-xs font-black text-gray-900">{(item.price * item.quantity * todayRate).toFixed(2)}</p>
                                            <p className="text-[9px] font-bold text-gray-400">${(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer Calculations */}
                    <div className="mt-6 space-y-4">
                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                            {/* Total BS - Arriba y Grande */}
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total BS</span>
                                <span className="text-xl font-black text-gray-900">{(calculateTotal() * todayRate).toFixed(2)} Bs</span>
                            </div>
                            {/* Total USD - Abajo y Pequeño */}
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ref USD</span>
                                <span className="text-sm font-black text-indigo-600">${calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {/* Botón Efectivo con opción de Calculadora */}
                            <div className="relative">
                                <button
                                    disabled={cart.length === 0}
                                    onClick={() => initiateSale('Cash')}
                                    className="w-full h-full p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-100 active:scale-95"
                                >
                                    <Banknote className="w-6 h-6" />
                                    <span className="text-[10px] font-black uppercase">Efectivo</span>
                                </button>
                                <button
                                    disabled={cart.length === 0}
                                    onClick={openCashCalculator}
                                    className="absolute top-1 right-1 p-3 bg-emerald-200/50 hover:bg-emerald-200 text-emerald-800 rounded-xl transition-colors disabled:opacity-0 active:scale-95"
                                    title="Calcular Vuelto"
                                >
                                    <Calculator className="w-5 h-5" />
                                </button>
                            </div>

                            <button
                                disabled={cart.length === 0}
                                onClick={() => initiateSale('PagoMovil')}
                                className="p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-blue-100 active:scale-95"
                            >
                                <Smartphone className="w-6 h-6" />
                                <span className="text-[10px] font-black uppercase">Pago Móvil</span>
                            </button>
                            <button
                                disabled={cart.length === 0}
                                onClick={() => initiateSale('Card')}
                                className="p-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 active:scale-95"
                            >
                                <CreditCard className="w-6 h-6" />
                                <span className="text-[10px] font-black uppercase">Tarjeta</span>
                            </button>
                            <button
                                disabled={cart.length === 0}
                                onClick={() => initiateSale('Credit')}
                                className="p-4 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-orange-100 active:scale-95"
                            >
                                <Wallet className="w-6 h-6" />
                                <span className="text-[10px] font-black uppercase">Crédito</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Action Button for Mobile Cart */}
            {!showCartMobile && totalItems > 0 && (
                <button
                    onClick={() => setShowCartMobile(true)}
                    className="lg:hidden fixed bottom-6 right-6 bg-gray-900 text-white p-4 rounded-full shadow-2xl shadow-indigo-500/30 flex items-center gap-2 z-40 animate-bounce-in"
                >
                    <div className="relative">
                        <ShoppingCart className="w-6 h-6" />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-gray-900">{totalItems}</span>
                    </div>
                    <span className="font-black pr-2">{(calculateTotal() * todayRate).toFixed(2)} Bs</span>
                </button>
            )}

            {/* MODAL DE PAGO EFECTIVO Y VUELTO */}
            {isCashModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up">
                        <div className="p-6 text-center border-b border-gray-100">
                            <h3 className="font-black text-gray-900 text-lg">Pago en Efectivo</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Calculadora de Vuelto</p>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Total Amount Display */}
                            <div className="text-center">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total a Pagar</p>
                                <p className="text-4xl font-black text-gray-900">{totalBs.toFixed(2)} Bs</p>
                                <p className="text-sm font-bold text-indigo-600 mt-1">${calculateTotal().toFixed(2)}</p>
                            </div>

                            {/* Input Tendered Amount */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Monto Recibido (Bs)</label>
                                <div className="relative">
                                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 w-6 h-6" />
                                    <input
                                        autoFocus
                                        type="number"
                                        step="0.01"
                                        value={tenderedAmount}
                                        onChange={(e) => setTenderedAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-2xl font-black text-gray-800 outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:text-gray-300"
                                    />
                                </div>
                            </div>

                            {/* Change Calculation */}
                            <div className={`p-4 rounded-2xl border-2 transition-all ${isSufficient ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                <div className="flex justify-between items-center">
                                    <span className={`text-xs font-black uppercase tracking-widest ${isSufficient ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {isSufficient ? 'Vuelto / Cambio' : 'Faltante'}
                                    </span>
                                    <span className={`text-2xl font-black ${isSufficient ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {Math.abs(changeBs).toFixed(2)} Bs
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsCashModalOpen(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl active:scale-95 transition-all hover:bg-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => processSale('Cash')}
                                    disabled={!isSufficient}
                                    className="flex-1 py-4 bg-gray-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Weight Product Modal */}
            {isWeightModalOpen && weightProduct && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up">
                        <div className="p-4 text-center border-b border-gray-100">
                            <h3 className="font-black text-gray-900 text-xl">{weightProduct.name}</h3>
                            <div className="flex items-center justify-center gap-4 mt-2">
                                <div className="text-left">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Stock</span>
                                    <p className="text-lg font-black text-gray-700">{weightProduct.stock}{weightProduct.measurementUnit || 'kg'}</p>
                                </div>
                                <div className="w-px h-8 bg-gray-200"></div>
                                <div className="text-right">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Precio</span>
                                    <p className="text-lg font-black text-purple-600">${weightProduct.price.toFixed(2)}/{weightProduct.measurementUnit || 'kg'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="bg-purple-50 p-5 rounded-2xl border-2 border-purple-200">
                                <div className="flex justify-center">
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <span className="text-[10px] font-bold text-purple-500 uppercase">Cantidad</span>
                                            <span className="text-[10px] font-bold text-purple-300">({weightProduct.measurementUnit || 'kg'})</span>
                                        </div>
                                        <input
                                            autoFocus
                                            type="text"
                                            inputMode="decimal"
                                            pattern="[0-9]*[.,]?[0-9]*"
                                            value={weightQuantity}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(',', '.');
                                                setWeightQuantity(val);
                                            }}
                                            className="w-48 bg-transparent text-7xl font-black text-purple-700 outline-none text-center"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-900 p-5 rounded-2xl">
                                <div className="flex justify-between items-center">
                                    <div className="text-left">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">USD</span>
                                        <p className="text-2xl font-black text-white">
                                            ${(parseFloat(weightQuantity || '0') * weightProduct.price).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">BS</span>
                                        <p className="text-2xl font-black text-white">
                                            {(parseFloat(weightQuantity || '0') * weightProduct.price * todayRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsWeightModalOpen(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl active:scale-95 transition-all hover:bg-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={addWeightToCart}
                                    disabled={!weightQuantity || parseFloat(weightQuantity) <= 0}
                                    className="flex-1 py-4 bg-purple-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> Agregar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Credit Sale Modal */}
            {isCustomerModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-black text-gray-900 text-lg">Crédito</h3>
                            <button onClick={() => setIsCustomerModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-6">
                            {!isCreatingCustomer ? (
                                <>
                                    <div className="relative mb-4">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            autoFocus
                                            placeholder="Buscar..."
                                            className="w-full pl-10 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                                            value={customerSearchTerm}
                                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    {filteredClients.length > 0 && (
                                        <>
                                            <div className="flex items-center justify-between mb-2 px-1">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Clientes</p>
                                                <p className="text-[10px] font-bold text-red-500">Por cobrar: ${customers.reduce((sum, c) => sum + c.balance, 0).toFixed(2)}</p>
                                            </div>
                                            <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                                                {filteredClients.map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => processSale('Credit', c.id)}
                                                        className="w-full p-3 text-left hover:bg-indigo-50 rounded-xl flex items-center justify-between group transition-colors bg-indigo-50/50 border border-indigo-100"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                                                            <p className="text-xs text-gray-400">{c.phone || 'Sin teléfono'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            {c.balance > 0 ? (
                                                                <span className="text-sm font-black text-red-500">${c.balance.toFixed(2)}</span>
                                                            ) : (
                                                                <span className="text-sm font-bold text-emerald-500">S/D</span>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {filteredWorkers.length > 0 && (
                                        <>
                                            <div className="flex items-center justify-between mb-2 px-1 mt-3">
                                                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Trabajadores</p>
                                                <p className="text-[10px] font-bold text-orange-600">Por pagar: ${workers.reduce((sum, w) => sum + Math.max(0, w.salary - w.balance), 0).toFixed(2)}</p>
                                            </div>
                                            <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                                                {filteredWorkers.map(w => (
                                                    <button
                                                        key={w.id}
                                                        onClick={() => processSale('Credit', w.id)}
                                                        className="w-full p-3 text-left hover:bg-orange-50 rounded-xl flex items-center justify-between group transition-colors bg-orange-50/50 border border-orange-100"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-gray-900 text-sm">{w.name}</p>
                                                            <p className="text-xs text-gray-400">{w.position}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            {w.balance > 0 ? (
                                                                <span className="text-sm font-black text-red-500">${w.balance.toFixed(2)}</span>
                                                            ) : (
                                                                <span className="text-sm font-bold text-emerald-500">S/D</span>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {filteredClients.length === 0 && filteredWorkers.length === 0 && (
                                        <p className="text-center text-xs text-gray-400 py-4">No se encontraron clientes</p>
                                    )}

                                    <button
                                        onClick={() => setIsCreatingCustomer(true)}
                                        className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 rounded-xl font-bold text-xs uppercase hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <UserPlus className="w-4 h-4" /> Nuevo Cliente
                                    </button>
                                </>
                            ) : (
                                <form onSubmit={handleCreateCustomer} className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2 text-indigo-600">
                                        <button type="button" onClick={() => setIsCreatingCustomer(false)}><ArrowLeft className="w-5 h-5" /></button>
                                        <span className="font-black text-sm uppercase">Nuevo Registro</span>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre</label>
                                        <input
                                            required
                                            autoFocus
                                            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                                            placeholder="Nombre del cliente"
                                            value={newCustomerData.name}
                                            onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono</label>
                                        <input
                                            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                                            placeholder="0412..."
                                            value={newCustomerData.phone}
                                            onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                                        />
                                    </div>

                                    <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">
                                        Guardar y Asignar
                                    </button>
                                </form>
                            )}
                        </div>
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
      `}</style>
        </div>
    );
};

export default POS;
