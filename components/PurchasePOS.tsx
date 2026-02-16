import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, TreasuryTransaction, ExchangeRateRecord } from '../types';
import { Search, Plus, Minus, Trash2, ShoppingCart, Wallet, CreditCard, X, RefreshCw, TrendingUp, Smartphone, Banknote, Check, ArrowLeft, ShoppingBag, Calculator, DollarSign, Tag, ChevronRight, Edit, ChevronLeft, Calendar, Package } from '../constants';

interface PurchasePOSProps {
    products: Product[];
    exchangeRate: number;
    rateHistory?: ExchangeRateRecord[];
    onClose: () => void;
    onPurchase: (items: { product: Product; quantity: number; costPrice: number; costPriceBs?: number; rateAtPurchase?: number }[], method: 'Cash' | 'Transfer' | 'PagoMovil' | 'Card' | 'PointOfSale') => void;
    onAddProduct?: (product: Product) => void;
    onOpenInventory?: () => void;
}

interface CartItem {
    product: Product;
    quantity: number;
    costPrice?: number;
    cost_price?: number;
    costPriceBs?: number;
    rateAtPurchase?: number;
}

const PurchasePOS: React.FC<PurchasePOSProps> = ({ products, exchangeRate, rateHistory = [], onClose, onPurchase, onAddProduct, onOpenInventory }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCartMobile, setShowCartMobile] = useState(false);
    const [tempRate, setTempRate] = useState(exchangeRate.toString());
    const [tenderedAmount, setTenderedAmount] = useState('');
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductCategory, setNewProductCategory] = useState('Bebidas');
    const [newProductStock, setNewProductStock] = useState(1);
    const [newProductPrice, setNewProductPrice] = useState(0);
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [useCustomDate, setUseCustomDate] = useState(false);

    // Helpers para compatibilidad
    const getCostPrice = (p: Product | CartItem) => p.cost_price ?? p.costPrice ?? 0;
    const getCostMode = (p: Product | CartItem) => (p as any).cost_mode ?? (p as any).costMode ?? 'calculated';
    const getCostBs = (p: Product | CartItem) => (p as any).cost_bs ?? (p as any).costBs ?? 0;
    const getCostDate = (p: Product | CartItem) => (p as any).cost_date ?? (p as any).costDate ?? '';
    const getSellingMode = (p: Product) => p.selling_mode ?? p.sellingMode ?? 'simple';
    const getPricePerUnit = (p: Product) => p.price_per_unit ?? p.pricePerUnit ?? 0;

    // Modal de edición de precio
    const [editingPriceItem, setEditingPriceItem] = useState<CartItem | null>(null);
    const [editCostBs, setEditCostBs] = useState(0);
    const [editCostDate, setEditCostDate] = useState(new Date().toISOString().split('T')[0]);
    const [editPrice, setEditPrice] = useState(0);
    const [editPricePerUnit, setEditPricePerUnit] = useState(0);
    const [editCustomRate, setEditCustomRate] = useState<number | null>(null);

    const getEditRateForDate = (dateStr: string): number => {
        if (editCustomRate !== null) return editCustomRate;
        if (!rateHistory || rateHistory.length === 0) return exchangeRate;
        const targetDate = new Date(dateStr).getTime();
        const dayStart = new Date(dateStr).setHours(0, 0, 0, 0);
        const sortedRates = [...rateHistory].sort((a, b) => b.timestamp - a.timestamp);
        const rateOnDate = sortedRates.find(r => r.timestamp <= dayStart);
        if (rateOnDate) return rateOnDate.rate;
        return sortedRates[0]?.rate || exchangeRate;
    };

    const editRate = useMemo(() => getEditRateForDate(editCostDate), [editCostDate, editCustomRate, rateHistory]);
    const editCalculatedCostUsd = editRate > 0 ? editCostBs / editRate : 0;

    const getRateForDate = (dateStr: string): number => {
        if (!rateHistory || rateHistory.length === 0) return exchangeRate;
        const targetDate = new Date(dateStr).getTime();
        const dayStart = new Date(dateStr).setHours(0, 0, 0, 0);
        const sortedRates = [...rateHistory].sort((a, b) => b.timestamp - a.timestamp);
        const rateOnDate = sortedRates.find(r => r.timestamp <= dayStart);
        if (rateOnDate) return rateOnDate.rate;
        return sortedRates[0]?.rate || exchangeRate;
    };

    const currentRate = useMemo(() => getRateForDate(purchaseDate), [purchaseDate, rateHistory]);

    useEffect(() => {
        window.history.pushState({ purchasePOS: true }, '');
        
        const handleBackButton = () => {
            onClose();
        };

        window.addEventListener('popstate', handleBackButton);
        return () => {
            window.removeEventListener('popstate', handleBackButton);
        };
    }, []);

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addToCart = (product: Product, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (navigator.vibrate) navigator.vibrate(50);

        // Calcular costo según el modo guardado
        const costMode = getCostMode(product);
        let finalCostUsd = 0;
        let costPriceBs = 0;

        if (costMode === 'calculated') {
            // Usar cost_bs guardado con la tasa actual
            const savedCostBs = getCostBs(product);
            costPriceBs = savedCostBs;
            finalCostUsd = currentRate > 0 ? savedCostBs / currentRate : 0;
        } else {
            // Modo manual: usar costo guardado directamente
            finalCostUsd = getCostPrice(product);
            costPriceBs = finalCostUsd * currentRate;
        }
        
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => item.product.id === product.id 
                    ? { ...item, quantity: item.quantity + 1 } 
                    : item
                );
            }
            return [...prev, { product, quantity: 1, costPrice: finalCostUsd, costPriceBs, rateAtPurchase: currentRate }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQuantity = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const getProductStock = (product: Product) => {
        const inCart = cart.find(i => i.product.id === product.id)?.quantity || 0;
        return product.stock + inCart;
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const openEditPriceModal = (item: CartItem) => {
        setEditingPriceItem(item);
        const costBsValue = item.costPriceBs || item.costPrice * exchangeRate;
        setEditCostBs(costBsValue);
        setEditCostDate(new Date().toISOString().split('T')[0]);
        setEditPrice(item.product.price || 0);
        setEditPricePerUnit(item.product.pricePerUnit || 0);
        setEditCustomRate(null);
    };

    const closeEditPriceModal = () => {
        setEditingPriceItem(null);
    };

    const saveEditPrice = () => {
        if (!editingPriceItem) return;
        
        const newCostUsd = editCalculatedCostUsd;
        
        setCart(prev => prev.map(cartItem => {
            if (cartItem.product.id === editingPriceItem.product.id) {
                return {
                    ...cartItem,
                    costPrice: newCostUsd,
                    costPriceBs: editCostBs,
                    rateAtPurchase: editRate,
                    product: {
                        ...cartItem.product,
                        price: editPrice,
                        pricePerUnit: editPricePerUnit
                    }
                };
            }
            return cartItem;
        }));
        
        closeEditPriceModal();
    };

    const calculateTotal = () => cart.reduce((sum, item) => {
        const itemRate = item.rateAtPurchase || exchangeRate;
        const priceBs = item.costPriceBs || item.costPrice * itemRate;
        const priceUsd = itemRate > 0 ? priceBs / itemRate : item.costPrice;
        return sum + (priceUsd * item.quantity);
    }, 0);

    const totalBs = cart.reduce((sum, item) => {
        const itemRate = item.rateAtPurchase || exchangeRate;
        return sum + ((item.costPriceBs || item.costPrice * itemRate) * item.quantity);
    }, 0);
    const tenderedBs = parseFloat(tenderedAmount) || 0;
    const changeBs = tenderedBs - totalBs;

    const initiatePurchase = (method: 'Cash' | 'Transfer' | 'PagoMovil' | 'Card' | 'PointOfSale') => {
        if (cart.length === 0) return;
        onPurchase(cart, method);
        setCart([]);
    };

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleAddProduct = () => {
        const product: Product = {
            id: `temp_${Date.now()}`,
            name: newProductName,
            category: newProductCategory,
            price: newProductPrice,
            cost_price: 0,
            costPrice: newProductPrice,
            stock: newProductStock,
            sellingMode: 'simple'
        };

        onAddProduct?.(product);
        
        setTimeout(() => {
            const newProduct = products.find(p => p.name === newProductName);
            if (newProduct) {
                addToCart(newProduct);
            }
        }, 100);
        
        setShowAddProductModal(false);
        setNewProductName('');
        setNewProductCategory('Bebidas');
        setNewProductStock(1);
        setNewProductPrice(0);
    };

    return (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col lg:flex-row gap-4">
            {/* LEFT: Product Catalog */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                {/* Search Bar */}
                <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors active:scale-95 border border-red-100 shrink-0"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="w-full pl-10 pr-10 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-indigo-500 transition-all placeholder:text-gray-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 p-1">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <button 
                            onClick={() => setShowAddProductModal(true)}
                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shrink-0"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-20 lg:pb-0">
                    <div className="flex flex-col gap-1.5">
                        {filteredProducts.map(product => {
                            const qtyInCart = cart.find(i => i.product.id === product.id)?.quantity || 0;
                            const newStock = getProductStock(product);
                            const costMode = getCostMode(product);
                            let displayCostBs = 0;
                            let displayCostUsd = 0;
                            let displayDate = '';
                            let displayRate = 0;
                            
                            if (costMode === 'calculated') {
                                displayCostBs = getCostBs(product);
                                const savedCostDate = getCostDate(product);
                                if (savedCostDate) {
                                    displayDate = savedCostDate;
                                    displayRate = getRateForDate(savedCostDate);
                                    displayCostUsd = displayRate > 0 ? displayCostBs / displayRate : 0;
                                } else {
                                    const today = new Date();
                                    displayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                    displayRate = currentRate;
                                    displayCostUsd = displayRate > 0 ? displayCostBs / displayRate : 0;
                                }
                            } else {
                                displayCostUsd = getCostPrice(product);
                                displayCostBs = displayCostUsd * currentRate;
                                const today = new Date();
                                displayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                displayRate = currentRate;
                            }
                            
                            const formatDate = (dateStr: string) => {
                                if (!dateStr) return '';
                                const parts = dateStr.split('-');
                                if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
                                return dateStr;
                            };
                            
                            return (
                                <div
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="flex items-center gap-2 p-2 rounded-lg border transition-all active:scale-[0.98] bg-white border-gray-100 cursor-pointer"
                                >
                                    <div className={`w-8 h-8 rounded flex items-center justify-center font-black text-xs ${qtyInCart > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                        {newStock}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-base text-gray-900 truncate">{product.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-sm font-bold text-gray-800">Bs {displayCostBs.toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',').replace('.', ',')}</p>
                                            <p className="text-sm font-bold text-indigo-400">{formatDate(displayDate)}</p>
                                            <p className="text-sm font-bold text-gray-400">${displayCostUsd.toFixed(3)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        {qtyInCart > 0 && (
                                            <>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, -1); }}
                                                    className="w-7 h-7 flex items-center justify-center rounded font-black text-lg bg-red-100 text-red-500"
                                                >
                                                    −
                                                </button>
                                                <div 
                                                    className="w-10 h-7 rounded flex items-center justify-center font-black text-sm bg-indigo-600 text-white cursor-text"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const input = e.currentTarget.querySelector('input');
                                                        input?.focus();
                                                    }}
                                                >
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="w-full h-full text-center bg-transparent outline-none text-white font-black"
                                                        value={qtyInCart}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            const val = parseInt(e.target.value) || 0;
                                                            if (val === 0) {
                                                                removeFromCart(product.id);
                                                            } else {
                                                                const diff = val - qtyInCart;
                                                                if (diff > 0) {
                                                                    for (let i = 0; i < diff; i++) addToCart(product);
                                                                } else {
                                                                    for (let i = 0; i < Math.abs(diff); i++) updateQuantity(product.id, -1);
                                                                }
                                                            }
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT: Shopping Cart */}
            <div className={`fixed inset-0 z-50 lg:static lg:z-auto bg-white/95 backdrop-blur-xl lg:bg-white lg:backdrop-blur-none lg:w-96 lg:rounded-[2.5rem] lg:border-2 lg:border-gray-100 lg:shadow-xl transition-transform duration-300 flex flex-col ${showCartMobile ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>

                <div className="lg:hidden flex justify-center pt-3 pb-1" onClick={() => setShowCartMobile(false)}>
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                </div>

                <div className="p-4 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowCartMobile(false)}
                                className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                            <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1.5 rounded-lg border border-indigo-100">
                                <Calendar className="w-4 h-4 text-indigo-500" />
                                <input 
                                    type="date" 
                                    value={purchaseDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        setPurchaseDate(e.target.value);
                                        setUseCustomDate(true);
                                    }}
                                    className="bg-transparent text-xs font-bold text-indigo-600 outline-none cursor-pointer w-20"
                                />
                            </div>
                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1.5 rounded-lg border border-gray-200">
                                <span className="text-[10px] font-bold text-gray-400">BCV</span>
                                <input
                                    className="w-14 bg-transparent text-xs font-black text-gray-900 outline-none text-right p-0 border-none"
                                    type="number"
                                    value={tempRate}
                                    onChange={(e) => setTempRate(e.target.value)}
                                />
                                <span className="text-[10px] font-bold text-gray-400">Bs</span>
                            </div>
                        </div>
                        {cart.length > 0 && (
                            <button onClick={() => setCart([])} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-colors">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-4">
                                <ShoppingBag className="w-16 h-16 text-gray-300" />
                                <p className="font-bold text-gray-400 text-sm">El carrito está vacío</p>
                            </div>
                        ) : (
                            cart.map(item => {
                                const originalProduct = products.find(p => p.id === item.product.id);
                                const lastInventoryPrice = originalProduct?.costPrice || item.costPrice;
                                const isUsingLastPrice = item.costPrice === lastInventoryPrice;
                                return (
                                    <div key={item.product.id} className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button 
                                                onClick={() => updateQuantity(item.product.id, -1)}
                                                className="w-5 h-5 flex items-center justify-center rounded bg-red-50 text-red-500"
                                            >
                                                <Minus className="w-2.5 h-2.5" />
                                            </button>
                                            <span className="w-4 text-center font-black text-xs">{item.quantity}</span>
                                            <button 
                                                onClick={() => updateQuantity(item.product.id, 1)}
                                                className="w-5 h-5 flex items-center justify-center rounded bg-emerald-50 text-emerald-600"
                                            >
                                                <Plus className="w-2.5 h-2.5" />
                                            </button>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-xs text-gray-900 truncate leading-tight">{item.product.name}</h4>
                                            <p className="text-[8px] font-bold text-gray-400">Bs {((item.costPriceBs || item.costPrice * exchangeRate) * item.quantity).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                                        </div>

                                        <button 
                                            onClick={() => openEditPriceModal(item)}
                                            className="p-1 bg-blue-50 text-blue-400 rounded shrink-0"
                                        >
                                            <Edit className="w-3 h-3" />
                                        </button>

                                        <button 
                                            onClick={() => removeFromCart(item.product.id)}
                                            className="p-1 bg-red-50 text-red-400 rounded shrink-0"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="mt-3 space-y-2">
                        <div className="bg-indigo-600 p-3 rounded-xl shadow-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Total</span>
                                <span className="text-xl font-black text-white leading-none">Bs {(calculateTotal() * exchangeRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Referencia</span>
                                <span className="text-xs font-black text-indigo-200">${calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button
                                disabled={cart.length === 0}
                                onClick={() => initiatePurchase('Cash')}
                                className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-100 active:scale-95"
                            >
                                <Banknote className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase">Efectivo</span>
                            </button>

                            <button
                                disabled={cart.length === 0}
                                onClick={() => initiatePurchase('PagoMovil')}
                                className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not--100 active:allowed border border-bluescale-95"
                            >
                                <Smartphone className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase">Pago Móvil</span>
                            </button>
                            
                            <button
                                disabled={cart.length === 0}
                                onClick={() => initiatePurchase('Card')}
                                className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 active:scale-95"
                            >
                                <CreditCard className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase">Tarjeta</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {!showCartMobile && totalItems > 0 && (
                <button
                    onClick={() => setShowCartMobile(true)}
                    className="lg:hidden fixed bottom-6 right-6 bg-gray-900 text-white p-4 rounded-full shadow-2xl shadow-indigo-500/30 flex items-center gap-2 z-40 animate-bounce-in"
                >
                    <div className="relative">
                        <ShoppingCart className="w-6 h-6" />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-black">
                            {totalItems}
                        </span>
                    </div>
                    <span className="font-bold">{(calculateTotal() * exchangeRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs</span>
                </button>
            )}

            {showAddProductModal && (
                <div className="fixed inset-0 bg-white z-[110] flex flex-col animate-fade-in">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                        <h3 className="text-xl font-black text-gray-900">Nuevo Producto</h3>
                        <button onClick={() => setShowAddProductModal(false)} className="text-gray-400 text-3xl font-light hover:text-black">
                            &times;
                        </button>
                    </div>
                    
                    <form onSubmit={(e) => { e.preventDefault(); handleAddProduct(); }} className="p-6 space-y-6 overflow-y-auto flex-1">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nombre</label>
                            <input
                                type="text"
                                placeholder="Nombre del producto"
                                className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all text-sm font-bold text-gray-900"
                                value={newProductName}
                                onChange={(e) => setNewProductName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoría</label>
                            <select
                                className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none text-sm font-bold text-gray-900"
                                value={newProductCategory}
                                onChange={(e) => setNewProductCategory(e.target.value)}
                            >
                                <option value="Bebidas">Bebidas</option>
                                <option value="Panadería">Panadería</option>
                                <option value="Comida">Comida</option>
                                <option value="Snacks">Snacks</option>
                                <option value="Otros">Otros</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Stock</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none text-sm font-bold text-gray-900"
                                    value={newProductStock}
                                    onChange={(e) => setNewProductStock(parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Precio $</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none text-sm font-bold text-gray-900"
                                    value={newProductPrice || ''}
                                    onChange={(e) => setNewProductPrice(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        {newProductPrice > 0 && (
                            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Referencia en Bs</p>
                                <p className="text-xl font-black text-indigo-600">{(newProductPrice * exchangeRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs</p>
                            </div>
                        )}

                        <div className="pt-4 flex gap-3 mt-auto">
                            <button
                                type="button"
                                onClick={() => setShowAddProductModal(false)}
                                className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={!newProductName || newProductPrice <= 0}
                                className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL EDITAR PRECIO */}
            {editingPriceItem && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full sm:max-w-lg h-[85vh] sm:h-auto sm:max-h-[90vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up">
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                            <div>
                                <h3 className="text-base sm:text-lg font-black text-gray-900">Editar Precios</h3>
                                <p className="text-xs font-bold text-gray-400">{editingPriceItem.product.name}</p>
                            </div>
                            <button onClick={closeEditPriceModal} className="text-gray-400 hover:text-black p-1">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); saveEditPrice(); }} className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            {/* COSTO */}
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-3 space-y-2">
                                <label className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1">Costo</label>
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Bs</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full pl-10 pr-3 py-2.5 border-2 border-red-200 rounded-xl bg-white focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-red-400"
                                            value={editCostBs || ''}
                                            placeholder="0.00"
                                            onChange={e => setEditCostBs(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="w-24 bg-red-100 border border-red-300 rounded-xl px-3 py-2.5 flex flex-col items-center justify-center">
                                        <span className="text-[7px] font-bold text-red-500 uppercase">USD</span>
                                        <span className="text-sm font-black text-red-700">${editCalculatedCostUsd.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="date"
                                            className="w-full px-2 py-2 border-2 border-red-200 rounded-lg bg-white outline-none text-[10px] font-bold text-gray-700 focus:border-red-400"
                                            value={editCostDate}
                                            onChange={e => setEditCostDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1 bg-orange-100 border border-orange-200 rounded-lg px-2 py-2 flex flex-col items-center justify-center">
                                        <span className="text-[7px] font-bold text-orange-500 uppercase">Tasa</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full bg-transparent text-center text-xs font-black text-orange-700 outline-none"
                                            value={editCustomRate !== null ? editCustomRate : editRate.toFixed(2)}
                                            onChange={e => setEditCustomRate(e.target.value ? parseFloat(e.target.value) : null)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* PRECIO DE VENTA */}
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 space-y-2">
                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1 mb-2 block">Venta</label>
                                <div className="flex gap-3">
                                    <div className="flex-1 space-y-2">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-full pl-10 pr-3 py-2.5 border-2 border-emerald-200 rounded-xl bg-white focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-emerald-400"
                                                value={editPrice || ''}
                                                placeholder="0.00"
                                                onChange={e => setEditPrice(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="bg-emerald-100 border border-emerald-300 rounded-xl px-3 py-2 flex justify-between items-center">
                                            <span className="text-[8px] font-bold text-emerald-600 uppercase">Bolivares</span>
                                            <span className="text-sm font-black text-emerald-800">
                                                {((editPrice || 0) * exchangeRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PRECIO POR UNIDAD (solo para paquetes) */}
                            {editingPriceItem.product.sellingMode === 'package' && (
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 space-y-2">
                                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-1 mb-2 block">Precio x Unidad</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full pl-10 pr-3 py-2.5 border-2 border-blue-200 rounded-xl bg-white focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-blue-400"
                                            value={editPricePerUnit || ''}
                                            placeholder="0.00"
                                            onChange={e => setEditPricePerUnit(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="bg-blue-100 border border-blue-300 rounded-xl px-3 py-2 flex justify-between items-center">
                                        <span className="text-[8px] font-bold text-blue-600 uppercase">Bolivares</span>
                                        <span className="text-sm font-black text-blue-800">
                                            {((editPricePerUnit || 0) * exchangeRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 flex gap-3 mt-auto">
                                {onOpenInventory && (
                                    <button
                                        type="button"
                                        onClick={() => { closeEditPriceModal(); onOpenInventory(); }}
                                        className="flex-1 py-3 border-2 border-blue-200 bg-blue-50 text-blue-600 rounded-2xl font-bold text-xs hover:bg-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Package className="w-4 h-4" />
                                        Editar en Inventario
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={closeEditPriceModal}
                                    className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchasePOS;
