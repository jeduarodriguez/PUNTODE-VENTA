import React, { useState, useEffect, useCallback } from 'react';
import { Product, TreasuryTransaction } from '../types';
import { Search, Plus, Minus, Trash2, ShoppingCart, Wallet, CreditCard, X, RefreshCw, TrendingUp, Smartphone, Banknote, Check, ArrowLeft, ShoppingBag, Calculator, DollarSign, Tag, ChevronRight, Edit, ChevronLeft, Calendar } from '../constants';

interface PurchasePOSProps {
    products: Product[];
    exchangeRate: number;
    onClose: () => void;
    onPurchase: (items: { product: Product; quantity: number; costPrice: number }[], method: 'Cash' | 'Transfer' | 'PagoMovil' | 'Card' | 'PointOfSale') => void;
    onAddProduct?: (product: Product) => void;
}

interface CartItem {
    product: Product;
    quantity: number;
    costPrice: number;
}

const PurchasePOS: React.FC<PurchasePOSProps> = ({ products, exchangeRate, onClose, onPurchase, onAddProduct }) => {
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

        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => item.product.id === product.id 
                    ? { ...item, quantity: item.quantity + 1 } 
                    : item
                );
            }
            return [...prev, { product, quantity: 1, costPrice: product.costPrice }];
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

    const calculateTotal = () => cart.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);

    const initiatePurchase = (method: 'Cash' | 'Transfer' | 'PagoMovil' | 'Card' | 'PointOfSale') => {
        if (cart.length === 0) return;
        onPurchase(cart, method);
        setCart([]);
    };

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalBs = calculateTotal() * exchangeRate;
    const tenderedBs = parseFloat(tenderedAmount) || 0;
    const changeBs = tenderedBs - totalBs;

    const handleAddProduct = () => {
        const product: Product = {
            id: `temp_${Date.now()}`,
            name: newProductName,
            category: newProductCategory,
            price: newProductPrice,
            costPrice: newProductPrice,
            stock: newProductStock,
            sellingMode: 'simple'
        };

        onAddProduct?.(product);
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
                            className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors active:scale-95 border border-red-100 shrink-0"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar producto..."
                                className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-base font-bold text-gray-900 outline-none focus:border-indigo-500 transition-all placeholder:text-gray-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 p-1 hover:bg-gray-200 rounded-full">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            <button 
                                onClick={() => setShowAddProductModal(true)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-20 lg:pb-0">
                    <div className="flex flex-col gap-2">
                        {filteredProducts.map(product => {
                            const qtyInCart = cart.find(i => i.product.id === product.id)?.quantity || 0;
                            const newStock = getProductStock(product);
                            return (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="flex items-center gap-3 p-2 rounded-xl border-2 transition-all active:scale-[0.98] bg-white border-gray-50 hover:border-indigo-100 shadow-sm relative overflow-hidden"
                                >
                                    <div className="flex flex-col items-center w-12 shrink-0">
                                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-black text-base ${qtyInCart > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                            {newStock}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 text-left px-2">
                                        <h3 className="font-bold text-gray-900 text-base truncate">{product.name}</h3>
                                        <p className="text-xs font-bold text-gray-400 uppercase">{product.category}</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); qtyInCart > 0 && updateQuantity(product.id, -1); }}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-lg transition-colors ${qtyInCart > 0 ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 text-gray-300'}`}
                                        >
                                            −
                                        </button>
                                        
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-base ${qtyInCart > 0 ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-300'}`}>
                                            {qtyInCart}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end w-22 shrink-0">
                                        <p className="font-black text-gray-900 text-lg leading-none">Bs {(product.costPrice * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })}</p>
                                        <p className="text-xs font-bold text-indigo-400 mt-0.5">${product.costPrice.toFixed(2)}</p>
                                    </div>
                                </button>
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
                                    <div key={item.product.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 text-sm truncate leading-tight">{item.product.name}</h4>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{item.product.category}</p>
                                        </div>

                                        <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 shadow-sm border border-gray-200">
                                            <button 
                                                onClick={() => updateQuantity(item.product.id, -1)}
                                                className="w-6 h-6 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-6 text-center font-black text-xs">{item.quantity}</span>
                                            <button 
                                                onClick={() => updateQuantity(item.product.id, 1)}
                                                className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>

                                        <div className="flex flex-col items-end w-22 shrink-0">
                                            <p className="font-bold text-gray-900 text-sm leading-tight">Bs {(item.costPrice * item.quantity * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })}</p>
                                            <p className="text-[9px] font-bold text-indigo-400">${(item.costPrice * item.quantity).toFixed(2)}</p>
                                        </div>

                                        <button 
                                            onClick={() => {
                                                const newPrice = prompt(`Precio de compra para ${item.product.name}:`, item.costPrice.toFixed(2));
                                                if (newPrice && !isNaN(parseFloat(newPrice)) && parseFloat(newPrice) > 0) {
                                                    setCart(prev => prev.map(cartItem => 
                                                        cartItem.product.id === item.product.id 
                                                            ? { ...cartItem, costPrice: parseFloat(newPrice), price: parseFloat(newPrice) }
                                                            : cartItem
                                                    ));
                                                }
                                            }}
                                            className="p-1.5 bg-blue-50 text-blue-400 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
                                        >
                                            <Edit className="w-3 h-3" />
                                        </button>

                                        <button 
                                            onClick={() => removeFromCart(item.product.id)}
                                            className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition-colors shrink-0"
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
                                <span className="text-xl font-black text-white leading-none">Bs {(calculateTotal() * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })}</span>
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
                                    <div key={item.product.id} className="flex items-center gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 text-sm truncate">{item.product.name}</h4>
                                            <p className="text-xs font-bold text-gray-400 uppercase">{item.product.category}</p>
                                        </div>

                                        <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
                                            <button 
                                                onClick={() => updateQuantity(item.product.id, -1)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                                            <button 
                                                onClick={() => updateQuantity(item.product.id, 1)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex flex-col items-end w-24 shrink-0">
                                            <p className="font-black text-gray-900">Bs {(item.costPrice * item.quantity * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })}</p>
                                            <p className="text-xs font-bold text-indigo-400">${(item.costPrice * item.quantity).toFixed(2)}</p>
                                        </div>

                                        <button 
                                            onClick={() => {
                                                const newPrice = prompt(`Precio de compra para ${item.product.name}:`, item.costPrice.toFixed(2));
                                                if (newPrice && !isNaN(parseFloat(newPrice)) && parseFloat(newPrice) > 0) {
                                                    setCart(prev => prev.map(cartItem => 
                                                        cartItem.product.id === item.product.id 
                                                            ? { ...cartItem, costPrice: parseFloat(newPrice), price: parseFloat(newPrice) }
                                                            : cartItem
                                                    ));
                                                }
                                            }}
                                            className="p-2 bg-blue-50 text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>

                                        <button 
                                            onClick={() => removeFromCart(item.product.id)}
                                            className="p-2 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Total</span>
                                <span className="text-2xl font-black text-white">Bs {(calculateTotal() * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Referencia</span>
                                <span className="text-sm font-black text-indigo-200">${calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button
                                disabled={cart.length === 0}
                                onClick={() => initiatePurchase('Cash')}
                                className="p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-100 active:scale-95"
                            >
                                <Banknote className="w-6 h-6" />
                                <span className="text-xs font-black uppercase">Efectivo</span>
                            </button>

                            <button
                                disabled={cart.length === 0}
                                onClick={() => initiatePurchase('PagoMovil')}
                                className="p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-blue-100 active:scale-95"
                            >
                                <Smartphone className="w-6 h-6" />
                                <span className="text-xs font-black uppercase">Pago Móvil</span>
                            </button>
                            
                            <button
                                disabled={cart.length === 0}
                                onClick={() => initiatePurchase('Card')}
                                className="p-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 active:scale-95"
                            >
                                <CreditCard className="w-6 h-6" />
                                <span className="text-xs font-black uppercase">Tarjeta</span>
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
                    <span className="font-bold">{(calculateTotal() * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</span>
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
                                <p className="text-xl font-black text-indigo-600">{(newProductPrice * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })} Bs</p>
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
        </div>
    );
};

export default PurchasePOS;
