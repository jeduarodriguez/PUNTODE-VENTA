
import React, { useState, useEffect } from 'react';
import { Product, CartItem, Sale, Customer } from '../types';
import { Search, Plus, Minus, Trash2, ShoppingCart, Users, Wallet, DollarSign, CreditCard, LayoutGrid, List, X, RefreshCw, TrendingUp, Smartphone, Banknote, UserPlus, Check, ArrowLeft, ShoppingBag } from '../constants';

interface POSProps {
  products: Product[];
  customers: Customer[];
  exchangeRate: number;
  onSale: (sale: Sale) => void;
  onUpdateRate: (rate: number) => void;
  onAddCustomer: (customer: Customer) => void;
  onBackToDashboard: () => void;
  initialCart?: CartItem[];
  onCartLoaded?: () => void;
}

const POS: React.FC<POSProps> = ({ products, customers, exchangeRate, onSale, onUpdateRate, onAddCustomer, onBackToDashboard, initialCart, onCartLoaded }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('list');
  
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

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    c.phone.includes(customerSearchTerm)
  );

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    if (navigator.vibrate) navigator.vibrate(50);

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
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

    if (method === 'Cash') {
        setTenderedAmount('');
        setIsCashModalOpen(true);
        return;
    }

    if (method === 'Credit') {
        setIsCustomerModalOpen(true);
        return;
    }

    // For other methods, process immediately
    processSale(method);
  };

  const processSale = (method: 'Cash' | 'Card' | 'Credit' | 'PagoMovil', customerId?: string) => {
    const sale: Sale = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      items: cart,
      total: calculateTotal(),
      exchangeRate: exchangeRate,
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
  const totalBs = calculateTotal() * exchangeRate;
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
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-60px)] md:h-[calc(100vh-60px)]">
      
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
                    <X className="w-4 h-4"/>
                </button>
                )}
            </div>

            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl shrink-0 h-full items-center">
                <button 
                    onClick={() => setDisplayMode('list')}
                    className={`p-3 rounded-xl transition-all ${displayMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}
                >
                    <List className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setDisplayMode('grid')}
                    className={`p-3 rounded-xl transition-all ${displayMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}
                >
                    <LayoutGrid className="w-5 h-5" />
                </button>
            </div>

            {/* Close Button Next to Search */}
            <button 
                onClick={onBackToDashboard}
                className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors active:scale-95 border border-red-100 shrink-0"
                title="Cancelar Venta"
            >
                <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Product Grid/List */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {displayMode === 'grid' ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map(product => {
                    // Calculamos cantidad en carrito
                    const qtyInCart = cart.find(i => i.id === product.id)?.quantity || 0;
                    
                    return (
                        <button
                            key={product.id}
                            onClick={() => addToCart(product)}
                            disabled={product.stock === 0}
                            className={`relative p-4 rounded-[2rem] text-left transition-all active:scale-95 group overflow-hidden border-2 flex flex-col justify-between ${
                                product.stock === 0 ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-md'
                            }`}
                        >
                            {/* Quantity Badge in Grid */}
                            {qtyInCart > 0 && (
                                <div className="absolute top-3 right-3 bg-indigo-600 text-white w-7 h-7 flex items-center justify-center rounded-full text-xs font-black shadow-lg border-2 border-white z-20 animate-bounce-in">
                                    {qtyInCart}
                                </div>
                            )}

                            <div>
                                <div className="aspect-square rounded-2xl bg-gray-100 mb-3 relative overflow-hidden">
                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover mix-blend-multiply" />
                                    {product.stock === 0 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">Agotado</span>
                                        </div>
                                    )}
                                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black shadow-sm text-gray-700">
                                        Stock: {product.stock}
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-800 text-sm leading-tight mb-2 line-clamp-2 min-h-[2.5em]">{product.name}</h3>
                            </div>
                            
                            {/* Updated Price Layout for Grid */}
                            <div className="flex flex-col">
                                <p className="text-indigo-600 font-black text-lg leading-none">${product.price.toFixed(2)}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">{(product.price * exchangeRate).toFixed(2)} Bs</p>
                            </div>
                        </button>
                    );
                })}
             </div>
          ) : (
              <div className="flex flex-col gap-2">
                 {filteredProducts.map(product => {
                    const qtyInCart = cart.find(i => i.id === product.id)?.quantity || 0;
                    
                    return (
                        <button
                            key={product.id}
                            onClick={() => addToCart(product)}
                            disabled={product.stock === 0}
                            className={`flex items-center gap-4 p-3 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                                product.stock === 0 ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-50 hover:border-indigo-100 shadow-sm'
                            }`}
                        >
                            <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0 relative">
                                <img src={product.image} className="w-full h-full object-cover" />
                                {/* Quantity Badge in List */}
                                {qtyInCart > 0 && (
                                    <div className="absolute top-0 right-0 bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-bl-lg text-xs font-black shadow-sm">
                                        {qtyInCart}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="font-bold text-gray-900 leading-tight">{product.name}</h3>
                                <p className="text-xs text-gray-400 font-medium">{product.stock} Unds.</p>
                            </div>
                            
                            {/* Updated Price Layout for List - Removed Plus Button */}
                            <div className="text-right flex flex-col items-end">
                                 <p className="font-black text-indigo-600 text-lg leading-none">${product.price.toFixed(2)}</p>
                                 <p className="text-xs font-bold text-gray-400 mt-1">{(product.price * exchangeRate).toFixed(2)} Bs</p>
                            </div>
                        </button>
                    );
                 })}
              </div>
          )}
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
                        <h3 className="text-lg font-black text-gray-900">Carrito</h3>
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
                                <div className="w-10 h-10 bg-white rounded-xl overflow-hidden shadow-sm shrink-0">
                                    <img src={item.image} className="w-full h-full object-cover" />
                                </div>
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
                                    <p className="text-xs font-black text-gray-900">{(item.price * item.quantity * exchangeRate).toFixed(2)}</p>
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
                        <span className="text-xl font-black text-gray-900">{(calculateTotal() * exchangeRate).toFixed(2)} Bs</span>
                    </div>
                    {/* Total USD - Abajo y Pequeño */}
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ref USD</span>
                        <span className="text-sm font-black text-indigo-600">${calculateTotal().toFixed(2)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button 
                        disabled={cart.length === 0}
                        onClick={() => initiateSale('Cash')}
                        className="p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-100 active:scale-95"
                    >
                        <Banknote className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase">Efectivo</span>
                    </button>
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
             <span className="font-black pr-2">{(calculateTotal() * exchangeRate).toFixed(2)} Bs</span>
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
                          <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 w-6 h-6"/>
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

      {/* Credit Sale Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-black text-gray-900 text-lg">Asignar a Cliente</h3>
                 <button onClick={() => setIsCustomerModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
             </div>
             
             <div className="p-6">
                {!isCreatingCustomer ? (
                    <>
                        <div className="relative mb-4">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                           <input 
                              autoFocus
                              placeholder="Buscar cliente..." 
                              className="w-full pl-10 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                              value={customerSearchTerm}
                              onChange={(e) => setCustomerSearchTerm(e.target.value)}
                           />
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                            {filteredCustomers.map(c => (
                                <button 
                                    key={c.id} 
                                    onClick={() => processSale('Credit', c.id)}
                                    className="w-full p-3 text-left hover:bg-indigo-50 rounded-xl flex items-center justify-between group transition-colors"
                                >
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                                        <p className="text-xs text-gray-400">{c.phone || 'Sin teléfono'}</p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 text-indigo-600">
                                        <ArrowLeft className="w-4 h-4 rotate-180" />
                                    </div>
                                </button>
                            ))}
                            {filteredCustomers.length === 0 && (
                                <p className="text-center text-xs text-gray-400 py-4">No se encontraron clientes</p>
                            )}
                        </div>

                        <button 
                            onClick={() => setIsCreatingCustomer(true)}
                            className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 rounded-xl font-bold text-xs uppercase hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" /> Crear Nuevo Cliente
                        </button>
                    </>
                ) : (
                    <form onSubmit={handleCreateCustomer} className="space-y-4">
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nombre</label>
                            <input 
                                required
                                autoFocus
                                className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 mt-1"
                                value={newCustomerData.name}
                                onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono</label>
                            <input 
                                className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 mt-1"
                                value={newCustomerData.phone}
                                onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setIsCreatingCustomer(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm">Cancelar</button>
                            <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg">Guardar y Asignar</button>
                        </div>
                    </form>
                )}
             </div>
          </div>
        </div>
      )}
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes bounce-in {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      `}</style>
    </div>
  );
};

export default POS;
