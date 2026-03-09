import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, TreasuryTransaction, ExchangeRateRecord, BusinessDebt } from '../types';
import { Search, Plus, Minus, Trash2, ShoppingCart, Wallet, CreditCard, X, RefreshCw, TrendingUp, Smartphone, Banknote, Check, ArrowLeft, ShoppingBag, Calculator, DollarSign, Tag, ChevronRight, Edit, ChevronLeft, Calendar, Package, Settings, Scale, Box, Layers, ChevronDown, Clock } from '../constants';

interface PurchasePOSProps {
    products: Product[];
    exchangeRate: number;
    rateHistory?: ExchangeRateRecord[];
    categories?: string[];
    onAddCategory?: (category: string) => void;
    onDeleteCategory?: (category: string) => void;
    onClose: () => void;
    onPurchase: (items: { product: Product; quantity: number; costPrice: number; costPriceBs?: number; rateAtPurchase?: number }[], method: 'Cash' | 'Transfer' | 'PagoMovil' | 'Card' | 'PointOfSale', businessDebt?: BusinessDebt) => void;
    onAddProduct?: (product: Product) => void;
    onUpdateProduct?: (product: Product) => void; // Actualiza producto en inventario directamente
    onOpenInventory?: () => void;
    initialCart?: { product: Product; quantity: number; costPrice: number; costPriceBs?: number; rateAtPurchase?: number }[];
}

interface CartItem {
    product: Product;
    quantity: number;
    costPrice?: number;
    cost_price?: number;
    costPriceBs?: number;
    rateAtPurchase?: number;
}

const PurchasePOS: React.FC<PurchasePOSProps> = ({ products, exchangeRate, rateHistory = [], categories = [], onAddCategory, onDeleteCategory, onClose, onPurchase, onAddProduct, onOpenInventory, initialCart }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCartMobile, setShowCartMobile] = useState(false);

    // Cargar initialCart si existe (para edición de compra)
    useEffect(() => {
        if (initialCart && initialCart.length > 0) {
            setCart(initialCart.map(item => ({
                product: item.product,
                quantity: item.quantity,
                costPrice: item.costPrice,
                costPriceBs: item.costPriceBs,
                rateAtPurchase: item.rateAtPurchase
            })));
        }
    }, [initialCart]);
    const [tempRate, setTempRate] = useState(exchangeRate.toString());
    const [tenderedAmount, setTenderedAmount] = useState('');
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductCategory, setNewProductCategory] = useState('Bebidas');
    const [newProductStock, setNewProductStock] = useState(0);
    const [newProductPrice, setNewProductPrice] = useState(0);
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [useCustomDate, setUseCustomDate] = useState(false);
    const [useCustomRate, setUseCustomRate] = useState(false);

    const [newProductCostBs, setNewProductCostBs] = useState(0);
    const [newProductCostDate, setNewProductCostDate] = useState(new Date().toISOString().split('T')[0]);
    const [newProductCostMode, setNewProductCostMode] = useState<'calculated' | 'manual'>('calculated');
    const [newProductManualCost, setNewProductManualCost] = useState(0);
    const [newProductSellingMode, setNewProductSellingMode] = useState<'simple' | 'weight' | 'package'>('simple');
    const [newProductUnitsPerPackage, setNewProductUnitsPerPackage] = useState(0);
    const [newProductPricePerUnit, setNewProductPricePerUnit] = useState(0);
    const [newProductMeasurementUnit, setNewProductMeasurementUnit] = useState('kg');
    const [showNewProductCategoryModal, setShowNewProductCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showNewProductVariantModal, setShowNewProductVariantModal] = useState(false);
    const [newProductPriceDisplay, setNewProductPriceDisplay] = useState('');
    const [newProductPricePerUnitDisplay, setNewProductPricePerUnitDisplay] = useState('');
    const [newProductManualCostDisplay, setNewProductManualCostDisplay] = useState('');
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [calcDisplay, setCalcDisplay] = useState('');
    const [calcResult, setCalcResult] = useState<number>(0);
    const [calcAccumulator, setCalcAccumulator] = useState<number>(0);

    // Estados para modal de deuda de crédito
    const [isCreditDebtModalOpen, setIsCreditDebtModalOpen] = useState(false);
    const [creditDebtTitle, setCreditDebtTitle] = useState('');
    const [creditDebtCurrencyType, setCreditDebtCurrencyType] = useState<'usd' | 'bs'>('bs');
    const [creditDebtAmount, setCreditDebtAmount] = useState(0);
    const [creditDebtAmountUsd, setCreditDebtAmountUsd] = useState(0);

    // Helpers para compatibilidad
    const getCostPrice = (p: Product | CartItem) => p.cost_price ?? p.costPrice ?? 0;
    const getCostMode = (p: Product | CartItem) => (p as any).cost_mode ?? (p as any).costMode ?? 'calculated';
    const getCostBs = (p: Product | CartItem) => (p as any).cost_bs ?? (p as any).costBs ?? 0;
    const getCostDate = (p: Product | CartItem) => (p as any).cost_date ?? (p as any).costDate ?? '';
    const getSellingMode = (p: Product) => p.selling_mode ?? p.sellingMode ?? 'simple';
    const getPricePerUnit = (p: Product) => p.price_per_unit ?? p.pricePerUnit ?? 0;

    // Modal de edición de precio
    const [editingPriceItem, setEditingPriceItem] = useState<CartItem | null>(null);
    const [editCostMode, setEditCostMode] = useState<'calculated' | 'manual'>('calculated');
    const [editCostBs, setEditCostBs] = useState(0);
    const [editCostBsDisplay, setEditCostBsDisplay] = useState('');
    const [editCostDate, setEditCostDate] = useState(new Date().toISOString().split('T')[0]);
    const [editPrice, setEditPrice] = useState(0);
    const [editPricePerUnit, setEditPricePerUnit] = useState(0);
    const [editCustomRate, setEditCustomRate] = useState<number | null>(null);
    const [editManualCost, setEditManualCost] = useState(0);
    const [editManualCostDisplay, setEditManualCostDisplay] = useState('');
    const [editUnitsPerBulk, setEditUnitsPerBulk] = useState(0);
    const [isEditCalculatorOpen, setIsEditCalculatorOpen] = useState(false);
    const [editCalcDisplay, setEditCalcDisplay] = useState('');
    const [editCalcResult, setEditCalcResult] = useState<number>(0);
    const [editCalcAccumulator, setEditCalcAccumulator] = useState<number>(0);

    const calculateEditResult = () => {
        if (!editCalcDisplay) return 0;
        try {
            if (editCalcDisplay.includes('%')) {
                const lastOpIndex = Math.max(
                    editCalcDisplay.lastIndexOf('+'),
                    editCalcDisplay.lastIndexOf('-'),
                    editCalcDisplay.lastIndexOf('*'),
                    editCalcDisplay.lastIndexOf('/')
                );
                if (lastOpIndex === -1) return parseFloat(editCalcDisplay) / 100;
                const baseNum = parseFloat(editCalcDisplay.substring(0, lastOpIndex));
                const percentNum = parseFloat(editCalcDisplay.substring(lastOpIndex + 1));
                const op = editCalcDisplay[lastOpIndex];
                const basePercent = (baseNum * percentNum) / 100;
                if (op === '+') return baseNum + basePercent;
                if (op === '-') return baseNum - basePercent;
                return baseNum * (percentNum / 100);
            }
            const result = Function('return ' + editCalcDisplay.replace(/×/g, '*'))();
            return result || 0;
        } catch { return 0; }
    };

    const handleEditCalcInput = (value: string) => {
        if (value === 'C') {
            setEditCalcDisplay('');
            setEditCalcResult(0);
            setEditCalcAccumulator(0);
        } else if (value === '=') {
            const result = calculateEditResult();
            setEditCalcResult(result);
            setEditCalcAccumulator(result);
        } else if (value === '%') {
            setEditCalcDisplay(prev => prev + value);
            const result = calculateEditResult();
            setEditCalcResult(result);
        } else {
            setEditCalcDisplay(prev => prev + value);
            const result = calculateEditResult();
            setEditCalcResult(result);
        }
    };

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
    const editDisplayRate = editCustomRate !== null ? editCustomRate : editRate;
    const bulkQty = editUnitsPerBulk || 1;
    const editCalculatedCostUsd = editDisplayRate > 0
        ? (editCostBs / bulkQty) / editDisplayRate
        : 0;
    const editFinalCostUsd = editCostMode === 'calculated' ? editCalculatedCostUsd : editManualCost;
    const editProfit = editPrice - editFinalCostUsd;
    const editMargin = editFinalCostUsd > 0 ? (editProfit / editFinalCostUsd) * 100 : 0;
    const editUnitsPerPackage = editingPriceItem?.product?.units_per_package ?? (editingPriceItem?.product as any)?.unitsPerPackage ?? 0;
    const editCostPerUnit = editUnitsPerPackage > 0 ? editFinalCostUsd / editUnitsPerPackage : 0;
    const editProfitPerUnit = editPricePerUnit - editCostPerUnit;
    const editMarginPerUnit = editCostPerUnit > 0 ? (editProfitPerUnit / editCostPerUnit) * 100 : 0;

    const getRateForDate = (dateStr: string): number => {
        if (!rateHistory || rateHistory.length === 0) return exchangeRate;

        const targetDate = new Date(dateStr + 'T00:00:00');
        const targetTime = targetDate.getTime();

        const sortedRates = [...rateHistory].sort((a, b) => b.timestamp - a.timestamp);

        const exactMatch = sortedRates.find(r => {
            const rateDate = new Date(r.timestamp);
            const rateDateStr = `${rateDate.getFullYear()}-${String(rateDate.getMonth() + 1).padStart(2, '0')}-${String(rateDate.getDate()).padStart(2, '0')}`;
            return rateDateStr === dateStr;
        });

        if (exactMatch) return exactMatch.rate;

        const closestRate = sortedRates.find(r => r.timestamp < targetTime);
        if (closestRate) return closestRate.rate;

        return sortedRates[0]?.rate || exchangeRate;
    };

    const getLatestRate = (): number => {
        if (!rateHistory || rateHistory.length === 0) return exchangeRate;
        const sortedRates = [...rateHistory].sort((a, b) => b.timestamp - a.timestamp);
        return sortedRates[0]?.rate || exchangeRate;
    };

    const latestRate = useMemo(() => getLatestRate(), [rateHistory]);
    const currentRate = useMemo(() => getRateForDate(purchaseDate), [purchaseDate, rateHistory]);
    // Para el carrito: si usa tasa manual, usar esa; si no, usar la tasa de la fecha seleccionada
    const activeRate = useCustomRate 
        ? parseFloat(tempRate) || currentRate 
        : currentRate;

    // useEffect para recalcular costos del carrito cuando cambia la fecha
    useEffect(() => {
        if (cart.length === 0) return;
        
        // Solo recalcular si NO se está usando tasa manual (porque el usuario está cambiando manualmente)
        if (useCustomRate) return;
        
        // Recalcular costos de productos en el carrito con la nueva tasa
        setCart(prevCart => prevCart.map(cartItem => {
            const product = cartItem.product;
            const costMode = getCostMode(product);
            const unitsPerBulk = product.units_per_bulk ?? (product as any).unitsPerBulk ?? 0;
            const bulkQty = unitsPerBulk > 0 ? unitsPerBulk : 1;
            
            if (costMode === 'calculated') {
                // Productos con costo en Bs: recalcular con la nueva tasa
                const costBs = getCostBs(product); // costo unitario en Bs
                const newCostUsd = activeRate > 0 ? costBs / activeRate : 0;
                const newCostBs = costBs;
                
                return {
                    ...cartItem,
                    costPrice: newCostUsd * bulkQty,
                    costPriceBs: newCostBs * bulkQty,
                    rateAtPurchase: activeRate
                };
            } else {
                // Productos con costo manual en $: mantener igual, solo actualizar el display en Bs
                const currentCostUsd = cartItem.costPrice / bulkQty;
                const newCostBs = currentCostUsd * activeRate;
                
                return {
                    ...cartItem,
                    costPriceBs: newCostBs * bulkQty,
                    rateAtPurchase: activeRate
                };
            }
        }));
    }, [purchaseDate, rateHistory, useCustomRate]);

    const newProductCalculatedCostUsd = currentRate > 0 ? newProductCostBs / currentRate : 0;
    const newProductFinalCost = newProductCostMode === 'calculated' ? newProductCalculatedCostUsd : newProductManualCost;
    const newProductProfit = newProductPrice - newProductFinalCost;
    const newProductMargin = newProductFinalCost > 0 ? (newProductProfit / newProductFinalCost) * 100 : 0;
    const newProductCostPerUnit = newProductUnitsPerPackage > 0 ? newProductFinalCost / newProductUnitsPerPackage : 0;
    const newProductProfitPerUnit = newProductPricePerUnit - newProductCostPerUnit;
    const newProductMarginPerUnit = newProductCostPerUnit > 0 ? (newProductProfitPerUnit / newProductCostPerUnit) * 100 : 0;
    const newProductProfitBs = newProductPrice * currentRate - newProductFinalCost * currentRate;

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

    const filteredProducts = products
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    const addToCart = (product: Product, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (navigator.vibrate) navigator.vibrate(50);

        // Calcular costo según el modo guardado
        const costMode = getCostMode(product);
        const unitsPerBulk = product.units_per_bulk ?? (product as any).unitsPerBulk ?? 0;
        let finalCostUsd = 0;
        let costPriceBs = 0;

        if (costMode === 'calculated') {
            // Usar cost_bs guardado con la tasa activa (ya es costo unitario)
            const savedCostBs = getCostBs(product);
            costPriceBs = savedCostBs;
            finalCostUsd = activeRate > 0 ? savedCostBs / activeRate : 0;
        } else {
            // Modo manual: usar costo guardado directamente (ya es costo unitario)
            finalCostUsd = getCostPrice(product);
            costPriceBs = finalCostUsd * activeRate;
        }

        // Si tiene bulto, el costo es por bulto completo
        const costPerBulk = unitsPerBulk > 0 ? finalCostUsd * unitsPerBulk : finalCostUsd;
        const costBsPerBulk = unitsPerBulk > 0 ? costPriceBs * unitsPerBulk : costPriceBs;

        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => item.product.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                );
            }
            return [...prev, { product, quantity: 1, costPrice: costPerBulk, costPriceBs: costBsPerBulk, rateAtPurchase: activeRate }];
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

    const updateQuantityDirect = (productId: string, newQty: number) => {
        if (newQty <= 0) {
            setCart(prev => prev.filter(item => item.product.id !== productId));
        } else {
            setCart(prev => prev.map(item => {
                if (item.product.id === productId) {
                    return { ...item, quantity: newQty };
                }
                return item;
            }));
        }
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
        const productCostMode = getCostMode(item.product);
        const productUnitsPerBulk = item.product.units_per_bulk ?? (item.product as any).unitsPerBulk ?? 0;
        const bulkQty = productUnitsPerBulk || 1;

        setEditCostMode(productCostMode);
        setEditUnitsPerBulk(productUnitsPerBulk);

        let costBsValue = 0;
        let savedRate = activeRate;

        if (productCostMode === 'calculated') {
            costBsValue = item.costPriceBs || getCostBs(item.product);
            savedRate = item.rateAtPurchase || activeRate;
            // Reconstruir el costo total del bulto
            setEditCostBs(costBsValue * bulkQty);
            setEditCostBsDisplay(costBsValue > 0 ? (costBsValue * bulkQty).toString() : '');
        } else {
            setEditCostBs(0);
            setEditCostBsDisplay('');
        }

        const productCostDate = item.product.cost_date || (item.product as any).costDate || '';
        setEditCostDate(productCostDate || new Date().toISOString().split('T')[0]);

        setEditPrice(item.product.price || 0);
        setEditPricePerUnit(getPricePerUnit(item.product));

        if (productCostMode === 'calculated' && savedRate) {
            setEditCustomRate(savedRate);
        } else {
            setEditCustomRate(null);
        }

        // En modo manual, mostrar costo UNITARIO (item.costPrice es por bulto, dividir entre bulkQty)
        const unitCostManual = bulkQty > 0 ? item.costPrice / bulkQty : item.costPrice;
        setEditManualCost(unitCostManual);
        setEditManualCostDisplay(unitCostManual > 0 ? unitCostManual.toFixed(3) : '');
    };

    const closeEditPriceModal = () => {
        setEditingPriceItem(null);
    };

    const saveEditPrice = () => {
        if (!editingPriceItem) return;

        const bulkQty = editUnitsPerBulk || 1;
        const unitCostUsd = editFinalCostUsd;
        const bulkCostUsd = unitCostUsd * bulkQty;
        const bulkCostBs = editCostMode === 'calculated' ? editCostBs : editManualCost * activeRate * bulkQty;

        // Producto actualizado con los nuevos valores
        const updatedProduct: Product = {
            ...editingPriceItem.product,
            price: editPrice,
            pricePerUnit: editPricePerUnit,
            units_per_bulk: editUnitsPerBulk,
            cost_price: unitCostUsd,
            costPrice: unitCostUsd,
            cost_mode: editCostMode,
            cost_bs: editCostMode === 'calculated' ? (editCostBs / bulkQty) : 0,
            cost_date: editCostMode === 'calculated' ? editCostDate : ''
        };

        // Actualizar en el inventario directamente
        if (onUpdateProduct) {
            onUpdateProduct(updatedProduct);
        }

        // Actualizar en el carrito
        setCart(prev => prev.map(cartItem => {
            if (cartItem.product.id === editingPriceItem.product.id) {
                return {
                    ...cartItem,
                    costPrice: bulkCostUsd,
                    costPriceBs: bulkCostBs,
                    rateAtPurchase: editDisplayRate,
                    product: updatedProduct
                };
            }
            return cartItem;
        }));

        closeEditPriceModal();
    };

    const calculateTotal = () => cart.reduce((sum, item) => {
        const costMode = getCostMode(item.product);
        const priceBs = costMode === 'calculated'
            ? (item.costPriceBs || 0)
            : item.costPrice * activeRate;
        const priceUsd = activeRate > 0 ? priceBs / activeRate : 0;
        return sum + (priceUsd * item.quantity);
    }, 0);

    const totalBs = cart.reduce((sum, item) => {
        // Para productos calculados usar costPriceBs guardado, para manuales recalcular siempre
        const costMode = getCostMode(item.product);
        const itemCostBs = costMode === 'calculated'
            ? (item.costPriceBs || 0)
            : item.costPrice * activeRate;
        return sum + (itemCostBs * item.quantity);
    }, 0);
    const tenderedBs = parseFloat(tenderedAmount) || 0;
    const changeBs = tenderedBs - totalBs;

    const initiatePurchase = (method: 'Cash' | 'Transfer' | 'PagoMovil' | 'Card' | 'PointOfSale') => {
        if (cart.length === 0) return;
        onPurchase(cart, method);
        setCart([]);
        onClose();
    };

    const openCreditDebtModal = () => {
        const totalBs = cart.reduce((sum, item) => {
            const costMode = getCostMode(item.product);
            const itemCostBs = costMode === 'calculated'
                ? (item.costPriceBs || 0)
                : item.costPrice * activeRate;
            return sum + (itemCostBs * item.quantity);
        }, 0);
        const totalUsd = activeRate > 0 ? totalBs / activeRate : 0;
        setCreditDebtAmount(totalBs);
        setCreditDebtAmountUsd(totalUsd);
        setCreditDebtTitle('');
        setCreditDebtCurrencyType('bs');
        setIsCreditDebtModalOpen(true);
    };

    const handleCreditDebtSubmit = () => {
        if (cart.length === 0) return;

        const debtData: BusinessDebt = {
            id: `debt_${Date.now()}`,
            timestamp: Date.now(),
            title: creditDebtTitle || 'Deuda de compra',
            amountUsd: creditDebtAmountUsd,
            amountBs: creditDebtAmount,
            currencyType: creditDebtCurrencyType,
            rateAtCreation: currentRate,
            isPaid: false,
            notes: ''
        };

        onPurchase(cart, 'Credit', debtData);
        setCart([]);
        setIsCreditDebtModalOpen(false);
        onClose();
    };

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleAddProduct = () => {
        const product: Product = {
            id: `prod_${Math.random().toString(36).substr(2, 9)}`,
            name: newProductName,
            category: newProductCategory,
            price: newProductPrice,
            costPrice: newProductFinalCost,
            cost_price: newProductFinalCost,
            stock: newProductStock,
            sellingMode: newProductSellingMode,
            measurementUnit: newProductMeasurementUnit,
            unitsPerPackage: newProductUnitsPerPackage,
            pricePerUnit: newProductPricePerUnit,
            remainingUnits: 0,
            cost_mode: newProductCostMode,
            cost_bs: newProductCostMode === 'calculated' ? newProductCostBs : 0,
            cost_date: newProductCostMode === 'calculated' ? newProductCostDate : ''
        };

        onAddProduct?.(product);

        setTimeout(() => {
            const newProduct = products.find(p => p.name === newProductName);
            if (newProduct) {
                addToCart(newProduct);
            } else {
                addToCart(product);
            }
        }, 100);

        setShowAddProductModal(false);
        resetNewProductForm();
    };

    const resetNewProductForm = () => {
        setNewProductName('');
        setNewProductCategory('Bebidas');
        setNewProductStock(0);
        setNewProductPrice(0);
        setNewProductPriceDisplay('');
        setNewProductPricePerUnitDisplay('');
        setNewProductManualCostDisplay('');
        setNewProductCostBs(0);
        setNewProductCostDate(new Date().toISOString().split('T')[0]);
        setNewProductCostMode('calculated');
        setNewProductManualCost(0);
        setNewProductSellingMode('simple');
        setNewProductUnitsPerPackage(0);
        setNewProductPricePerUnit(0);
        setNewProductMeasurementUnit('kg');
        setCalcDisplay('');
        setCalcResult(0);
        setCalcAccumulator(0);
    };

    const handleCalcInput = (value: string) => {
        if (value === '=') {
            const result = calculateResult();
            setCalcResult(result);
            setCalcDisplay(result.toString());
        } else if (value === 'C') {
            setCalcDisplay('');
            setCalcResult(0);
            setCalcAccumulator(0);
        } else if (value === '%') {
            try {
                if (calcDisplay.includes('+') || calcDisplay.includes('-') || calcDisplay.includes('*') || calcDisplay.includes('/')) {
                    const lastOpIndex = Math.max(
                        calcDisplay.lastIndexOf('+'),
                        calcDisplay.lastIndexOf('-'),
                        calcDisplay.lastIndexOf('*'),
                        calcDisplay.lastIndexOf('/')
                    );
                    const baseNum = parseFloat(calcDisplay.substring(0, lastOpIndex));
                    const percentNum = parseFloat(calcDisplay.substring(lastOpIndex + 1));
                    if (!isNaN(baseNum) && !isNaN(percentNum)) {
                        const result = baseNum + (baseNum * percentNum / 100);
                        setCalcResult(result);
                        setCalcDisplay(result.toString());
                    }
                }
            } catch { }
        } else {
            setCalcDisplay(prev => prev + value);
        }
    };

    const calculateResult = (): number => {
        try {
            let sanitized = calcDisplay;
            sanitized = sanitized.replace(/[^0-9+\-*/.]/g, '');
            if (!sanitized) return 0;
            const result = Function('"use strict"; return (' + sanitized + ')')();
            return typeof result === 'number' ? result : 0;
        } catch {
            return 0;
        }
    };

    const handleCreateCategory = () => {
        if (newCategoryName.trim()) {
            setNewProductCategory(newCategoryName.trim());
            setNewCategoryName('');
            setShowNewProductCategoryModal(false);
        }
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
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                            <input
                                type="text"
                                inputMode="search"
                                placeholder="Buscar productos..."
                                className="w-full pl-10 pr-10 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-indigo-500 transition-all placeholder:text-gray-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onBlur={() => {
                                    // Solo cerrar si hay término de búsqueda
                                    if (searchTerm) {
                                        // Mantener el teclado abierto si hay búsqueda
                                    }
                                }}
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
                            const unitsPerBulk = product.units_per_bulk ?? (product as any).unitsPerBulk ?? 0;
                            const hasBulkDisplay = unitsPerBulk > 1;
                            let displayCostBs = 0;      // costo unitario en Bs
                            let displayCostBsBulk = 0;  // costo por bulto en Bs
                            let displayCostUsd = 0;     // costo por bulto en USD (para display)
                            let displayDate = '';

                            if (costMode === 'calculated') {
                                // cost_bs guardado es el costo UNITARIO en Bs
                                const savedCostBs = getCostBs(product);
                                displayCostBs = savedCostBs;
                                displayCostBsBulk = hasBulkDisplay ? savedCostBs * unitsPerBulk : savedCostBs;
                                displayCostUsd = latestRate > 0 ? displayCostBsBulk / latestRate : 0;
                                // Mostrar la fecha guardada del inventario
                                displayDate = product.cost_date || (product as any).costDate || '';
                            } else {
                                // Modo manual: costo unitario en USD, convertir a Bs con tasa actual
                                const unitCostUsd = getCostPrice(product);
                                displayCostBs = unitCostUsd * latestRate;
                                displayCostBsBulk = hasBulkDisplay ? displayCostBs * unitsPerBulk : displayCostBs;
                                displayCostUsd = hasBulkDisplay ? unitCostUsd * unitsPerBulk : unitCostUsd;
                                displayDate = ''; // Manual no tiene fecha de tasa
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
                                    onClick={(e) => {
                                        e.preventDefault();
                                        addToCart(product);
                                    }}
                                    className="flex items-center gap-2 p-2 rounded-lg border transition-all active:scale-[0.98] bg-white border-gray-100 cursor-pointer"
                                >
                                    {/* LEFT: Name and Category/Date */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-base text-gray-900 truncate">
                                            {product.name}
                                            {unitsPerBulk > 1 && <span className="text-indigo-600 ml-1">x{unitsPerBulk}</span>}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-xs font-bold text-gray-400 uppercase truncate">{product.category}</p>
                                            <span className="text-gray-200">|</span>
                                            <p className={`text-xs font-bold ${costMode === 'manual' ? 'text-red-500' : 'text-indigo-400'}`}>
                                                {costMode === 'manual' ? `HOY ${new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' })}` : (displayDate ? formatDate(displayDate) : '')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* CENTER: Quantity Controls */}
                                    <div className="flex flex-col items-center gap-0.5 shrink-0 mx-1">
                                        {qtyInCart > 0 ? (
                                            <>
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm bg-indigo-600 text-white cursor-text"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const input = e.currentTarget.querySelector('input');
                                                        input?.focus();
                                                    }}
                                                >
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        className="w-full h-full text-center bg-transparent outline-none text-white font-black text-xs"
                                                        value={qtyInCart}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            const rawValue = e.target.value.replace(',', '.');
                                                            if (rawValue === '' || rawValue === '-') return;
                                                            const val = parseFloat(rawValue);
                                                            if (isNaN(val) || val <= 0) {
                                                                return;
                                                            } else {
                                                                const sellingMode = getSellingMode(product);
                                                                if (sellingMode === 'weight') {
                                                                    updateQuantityDirect(product.id, val);
                                                                } else {
                                                                    const intVal = Math.floor(val);
                                                                    const diff = intVal - Math.floor(qtyInCart);
                                                                    if (diff > 0) {
                                                                        for (let i = 0; i < diff; i++) addToCart(product);
                                                                    } else if (diff < 0) {
                                                                        for (let i = 0; i < Math.abs(diff); i++) updateQuantity(product.id, -1);
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, -1); }}
                                                    className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs bg-red-100 text-red-500"
                                                >
                                                    −
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                                                className="w-8 h-8 rounded-full flex items-center justify-center font-black text-lg bg-indigo-100 text-indigo-600"
                                            >
                                                +
                                            </button>
                                        )}
                                    </div>

                                    {/* RIGHT: Costs */}
                                    <div className="flex flex-col items-end shrink-0 min-w-[80px]">
                                        <p className="text-base font-bold text-gray-800">
                                            Bs {displayCostBsBulk.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                        </p>
                                        <p className="text-sm font-bold text-gray-400">${displayCostUsd.toFixed(2)}</p>
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
                        <button
                            onClick={() => setShowCartMobile(false)}
                            className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors shrink-0"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex-1 flex items-center gap-2 mx-2">
                            <div className="flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 flex-1">
                                <Calendar className="w-4 h-4 text-indigo-500" />
                                <input
                                    type="date"
                                    value={purchaseDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        setPurchaseDate(e.target.value);
                                        setUseCustomDate(true);
                                    }}
                                    className="bg-transparent text-xs font-bold text-indigo-600 outline-none cursor-pointer w-full"
                                />
                            </div>
                            <div className="flex items-center gap-1 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 flex-1">
                                <span className="text-[10px] font-bold text-gray-400">BCV</span>
                                <input
                                    className="w-20 bg-transparent text-sm font-black text-gray-900 outline-none text-right p-0 border-none"
                                    type="number"
                                    value={tempRate}
                                    onChange={(e) => {
                                        setTempRate(e.target.value);
                                        setUseCustomRate(true);
                                    }}
                                />
                            </div>
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
                                const unitsPerBulk = item.product.units_per_bulk ?? (item.product as any).unitsPerBulk ?? 0;
                                const hasBulk = unitsPerBulk > 1;
                                const itemCostBsList = item.costPriceBs || 0;
                                const itemTotalBs = itemCostBsList * item.quantity;
                                const sellingMode = getSellingMode(item.product);
                                const isWeight = sellingMode === 'weight';
                                
                                return (
                                    <div key={item.product.id} className="bg-white p-3 rounded-xl border-2 border-gray-100 shadow-sm">
                                        {/* Header: Nombre + Editar + Eliminar */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex-1 min-w-0 mr-2">
                                                <h4 className="font-black text-sm text-gray-900 truncate">
                                                    {item.product.name}
                                                    {hasBulk && <span className="text-indigo-600 ml-1">×{unitsPerBulk}</span>}
                                                </h4>
                                                <p className="text-xs text-gray-400">{item.product.category}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openEditPriceModal(item)}
                                                    className="p-2 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                                                    title="Editar costo"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => removeFromCart(item.product.id)}
                                                    className="p-2 bg-red-50 text-red-400 hover:bg-red-100 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Fila: Costo Unitario | Cantidad | Subtotal */}
                                        <div className="grid grid-cols-3 gap-2">
                                            {/* Costo Unitario Bs */}
                                            <div className="bg-gray-50 p-2 rounded-lg">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">Costo c/u</p>
                                                <p className="text-sm font-black text-red-600">Bs {itemCostBsList.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                                                <p className="text-[9px] font-bold text-indigo-500">${item.costPrice.toFixed(2)}</p>
                                            </div>

                                            {/* Cantidad */}
                                            <div className="bg-gray-50 p-2 rounded-lg">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase text-center">Cantidad</p>
                                                <div className="flex items-center justify-center gap-1 mt-1">
                                                    <button
                                                        onClick={() => updateQuantity(item.product.id, -1)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const rawValue = e.target.value.replace(',', '.');
                                                            if (rawValue === '' || rawValue === '-') return;
                                                            const val = parseFloat(rawValue);
                                                            if (isNaN(val)) return;
                                                            if (isWeight) {
                                                                updateQuantityDirect(item.product.id, val);
                                                            } else {
                                                                updateQuantityDirect(item.product.id, Math.max(1, Math.floor(val)));
                                                            }
                                                        }}
                                                        className="w-12 text-center font-black text-sm bg-white border border-gray-200 rounded py-0.5 text-gray-700"
                                                    />
                                                    <button
                                                        onClick={() => updateQuantity(item.product.id, 1)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Subtotal */}
                                            <div className="bg-indigo-50 p-2 rounded-lg">
                                                <p className="text-[9px] font-bold text-indigo-400 uppercase">Subtotal</p>
                                                <p className="text-base font-black text-indigo-700">Bs {itemTotalBs.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                                                <p className="text-[9px] font-bold text-indigo-500 text-right">$ {(item.costPrice * item.quantity).toFixed(2)}</p>
                                            </div>
                                        </div>

                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="mt-3 space-y-2">
                        <div className="bg-indigo-600 p-3 rounded-xl shadow-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Total</span>
                                <span className="text-xl font-black text-white leading-none">Bs {totalBs.toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Referencia</span>
                                <span className="text-xs font-black text-indigo-200">${calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
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

                            <button
                                disabled={cart.length === 0}
                                onClick={() => openCreditDebtModal()}
                                className="p-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-orange-100 active:scale-95"
                            >
                                <Clock className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase">Crédito</span>
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
                    <span className="font-bold">{totalBs.toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs</span>
                </button>
            )}

            {showAddProductModal && (
                <div className="fixed inset-0 bg-white z-[110] flex flex-col animate-fade-in overflow-hidden">
                    {showNewProductCategoryModal && (
                        <div className="absolute inset-0 bg-white z-30 flex flex-col animate-slide-up">
                            <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                                        <Tag className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900">Categoría</h3>
                                        <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Seleccionar o Crear</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowNewProductCategoryModal(false)} className="bg-white p-2 rounded-full text-emerald-600 shadow-sm">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2 w-full max-w-2xl mx-auto">
                                {(categories.length > 0 ? categories : ['Bebidas', 'Panadería', 'Comida', 'Snacks', 'Otros', 'Desayunos', 'Postres', 'Accesorios']).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => { setNewProductCategory(cat); setShowNewProductCategoryModal(false); }}
                                        className={`w-full p-3 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-[0.98] ${newProductCategory === cat ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'}`}
                                    >
                                        <span className="font-bold text-sm truncate">{cat}</span>
                                        <div className="flex items-center gap-1">
                                            {newProductCategory === cat && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                                            {categories.length > 0 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDeleteCategory?.(cat); }}
                                                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="p-6 w-full max-w-2xl mx-auto border-t border-gray-100 bg-gray-50">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Crear Nueva Categoría</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nombre de nueva categoría..."
                                        className="flex-1 p-4 bg-white border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-emerald-500 transition-all"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
                                    />
                                    <button
                                        onClick={handleCreateCategory}
                                        disabled={!newCategoryName.trim()}
                                        className="bg-gray-900 text-white p-4 rounded-2xl shadow-lg disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all"
                                    >
                                        <Plus className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showNewProductVariantModal && (
                        <div className="absolute inset-0 bg-white z-20 flex flex-col animate-slide-up">
                            <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                                        <Settings className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900">Características Especiales</h3>
                                        <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest">Configuración de Venta</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowNewProductVariantModal(false)} className="bg-white p-2 rounded-full text-indigo-600 shadow-sm">
                                    <Check className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6 flex-1 overflow-y-auto w-full max-w-2xl mx-auto">
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewProductSellingMode('simple')}
                                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${newProductSellingMode === 'simple' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                                    >
                                        <Package className="w-6 h-6" />
                                        <span className="text-[10px] font-black uppercase">Unidad</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewProductSellingMode('weight')}
                                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${newProductSellingMode === 'weight' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                                    >
                                        <Scale className="w-6 h-6" />
                                        <span className="text-[10px] font-black uppercase">Peso</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewProductSellingMode('package')}
                                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${newProductSellingMode === 'package' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                                    >
                                        <Box className="w-6 h-6" />
                                        <span className="text-[10px] font-black uppercase">Paquete</span>
                                    </button>
                                </div>
                                {newProductSellingMode === 'weight' && (
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                                        <h4 className="font-bold text-gray-900 text-sm">Venta por Peso / Volumen</h4>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Unidad de Medida</label>
                                            <select
                                                className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white outline-none text-sm font-bold text-gray-900"
                                                value={newProductMeasurementUnit}
                                                onChange={e => setNewProductMeasurementUnit(e.target.value)}
                                            >
                                                <option value="kg">Kilogramos (Kg)</option>
                                                <option value="g">Gramos (g)</option>
                                                <option value="l">Litros (L)</option>
                                                <option value="ml">Mililitros (ml)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                                {newProductSellingMode === 'package' && (
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                                        <h4 className="font-bold text-gray-900 text-sm">Venta por Paquete</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Unidades / Pack</label>
                                                <div className="relative">
                                                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                    <input
                                                        type="number"
                                                        placeholder="Ej. 12"
                                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white outline-none text-sm font-bold text-gray-900"
                                                        value={newProductUnitsPerPackage || ''}
                                                        onChange={e => setNewProductUnitsPerPackage(parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest px-1">Costo Unitario</label>
                                                <div className="w-full p-3 border-2 border-orange-100 bg-orange-50 rounded-xl flex items-center gap-2 h-[46px]">
                                                    <span className="text-sm font-black text-orange-700">${newProductCostPerUnit.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 w-full max-w-2xl mx-auto">
                                <button
                                    onClick={() => setShowNewProductVariantModal(false)}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
                                >
                                    Guardar Configuración
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="p-3 sm:p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                        <h3 className="text-base sm:text-lg font-black text-gray-900">Nuevo Producto</h3>
                        <button onClick={() => { setShowAddProductModal(false); resetNewProductForm(); }} className="text-gray-400 hover:text-black p-1">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleAddProduct(); }} className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 w-full max-w-2xl mx-auto touch-manipulation">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nombre del Producto</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ej. Café Molido 1kg"
                                    className="flex-1 p-3 sm:p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none text-sm font-bold text-gray-900"
                                    value={newProductName}
                                    onChange={(e) => setNewProductName(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewProductVariantModal(true)}
                                    className={`w-12 sm:w-14 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${newProductSellingMode !== 'simple' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500'}`}
                                >
                                    {newProductSellingMode === 'weight' ? <Scale className="w-5 h-5 sm:w-6 sm:h-6" /> : newProductSellingMode === 'package' ? <Box className="w-5 h-5 sm:w-6 sm:h-6" /> : <Settings className="w-5 h-5 sm:w-6 sm:h-6" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoría</label>
                                <button
                                    type="button"
                                    onClick={() => setShowNewProductCategoryModal(true)}
                                    className="w-full p-3 border-2 border-gray-100 rounded-2xl bg-gray-50 outline-none text-sm font-bold text-gray-900 focus:border-indigo-500 transition-all text-left flex items-center justify-between group active:scale-[0.98]"
                                >
                                    <span>{newProductCategory}</span>
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                                </button>
                            </div>
                            <div className="w-24 space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                                    {newProductSellingMode === 'weight' ? `Stock (${newProductMeasurementUnit})` : 'Stock'}
                                </label>
                                <input
                                    type="number"
                                    step={newProductSellingMode === 'weight' ? "0.01" : "1"}
                                    placeholder="0"
                                    className="w-full p-3 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-indigo-500 transition-all"
                                    value={newProductStock || ''}
                                    onChange={(e) => setNewProductStock(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-red-50 border border-red-100 rounded-2xl p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1">Costo</label>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[8px] font-bold ${newProductCostMode === 'calculated' ? 'text-red-500' : 'text-gray-400'}`}>Calculado</span>
                                            <button
                                                type="button"
                                                onClick={() => setNewProductCostMode(newProductCostMode === 'calculated' ? 'manual' : 'calculated')}
                                                className={`w-10 h-5 rounded-full transition-colors ${newProductCostMode === 'manual' ? 'bg-red-400' : 'bg-gray-300'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${newProductCostMode === 'manual' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                            </button>
                                            <span className={`text-[8px] font-bold ${newProductCostMode === 'manual' ? 'text-red-500' : 'text-gray-400'}`}>Manual</span>
                                        </div>
                                    </div>

                                    {newProductCostMode === 'calculated' ? (
                                        <>
                                            <div className="flex gap-2 items-center">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Bs</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full pl-10 pr-3 py-2.5 border-2 border-red-200 rounded-xl bg-white focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-red-400"
                                                        value={newProductCostBs || ''}
                                                        placeholder="0.00"
                                                        onChange={e => setNewProductCostBs(parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCalculatorOpen(true)}
                                                    className="w-10 h-10 bg-white border-2 border-red-200 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-all"
                                                    title="Calculadora"
                                                >
                                                    <Calculator className="w-5 h-5" />
                                                </button>
                                                <div className="w-24 bg-red-100 border border-red-300 rounded-xl px-3 py-2.5 flex flex-col items-center justify-center">
                                                    <span className="text-[7px] font-bold text-red-500 uppercase">USD</span>
                                                    <span className="text-sm font-black text-red-700">${newProductCalculatedCostUsd.toFixed(3)}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <input
                                                        type="date"
                                                        className="w-full px-2 py-2 border-2 border-red-200 rounded-lg bg-white outline-none text-[10px] font-bold text-gray-700 focus:border-red-400"
                                                        value={newProductCostDate}
                                                        onChange={e => setNewProductCostDate(e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex-1 bg-orange-100 border border-orange-200 rounded-lg px-2 py-2 flex flex-col items-center justify-center">
                                                    <span className="text-[7px] font-bold text-orange-500 uppercase">Tasa</span>
                                                    <span className="text-xs font-black text-orange-700">{latestRate.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex gap-2 items-center">
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    className="w-full pl-10 pr-3 py-2.5 border-2 border-red-200 rounded-xl bg-white focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-red-400"
                                                    value={newProductManualCostDisplay}
                                                    placeholder="0.00"
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setNewProductManualCostDisplay(val);
                                                        const normalized = val.replace(',', '.');
                                                        setNewProductManualCost(parseFloat(normalized) || 0);
                                                    }}
                                                />
                                            </div>
                                            <div className="w-28 bg-orange-100 border border-orange-200 rounded-xl px-3 py-2.5 flex flex-col items-center justify-center">
                                                <span className="text-[7px] font-bold text-orange-500 uppercase">Ref. Bs</span>
                                                <span className="text-sm font-black text-orange-700">{(newProductManualCost * currentRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3">
                                    <div className="flex gap-3 items-stretch">
                                        <div className="flex-1 flex flex-col">
                                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1 mb-2">Venta</label>
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    className="w-full pl-10 pr-3 py-2.5 border-2 border-emerald-200 rounded-xl bg-white focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-emerald-400 h-full"
                                                    value={newProductPriceDisplay}
                                                    placeholder="0.00"
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setNewProductPriceDisplay(val);
                                                        const normalized = val.replace(',', '.');
                                                        setNewProductPrice(parseFloat(normalized) || 0);
                                                    }}
                                                />
                                            </div>
                                            <div className="bg-emerald-100 border border-emerald-300 rounded-xl px-3 py-2 flex justify-between items-center mt-2">
                                                <span className="text-[8px] font-bold text-emerald-600 uppercase">Bolivares</span>
                                                <span className="text-sm font-black text-emerald-800">
                                                    {(newProductPrice * currentRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col">
                                            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1 mb-2">Rentabilidad</label>
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex justify-between items-center flex-1">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase">Ganancia</span>
                                                <span className={`text-sm font-bold ${newProductProfit > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                    ${newProductProfit.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex justify-between items-center mt-2 flex-1">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase">Margen</span>
                                                <span className={`text-sm font-bold ${newProductMargin >= 30 ? 'text-emerald-500' : newProductMargin > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                                                    {newProductMargin.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {newProductSellingMode === 'package' && (
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
                                    <div className="flex gap-3 items-stretch">
                                        <div className="flex-1 flex flex-col">
                                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1 mb-2">VENTA X UNIDAD</label>
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    className="w-full pl-10 pr-3 py-2.5 border-2 border-blue-200 rounded-xl bg-white focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-blue-400 h-full"
                                                    value={newProductPricePerUnitDisplay}
                                                    placeholder="0.00"
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setNewProductPricePerUnitDisplay(val);
                                                        const normalized = val.replace(',', '.');
                                                        setNewProductPricePerUnit(parseFloat(normalized) || 0);
                                                    }}
                                                />
                                            </div>
                                            <div className="bg-blue-100 border border-blue-300 rounded-xl px-3 py-2 flex justify-between items-center mt-2">
                                                <span className="text-[8px] font-bold text-blue-600 uppercase">Bolivares</span>
                                                <span className="text-sm font-black text-blue-800">
                                                    {(newProductPricePerUnit * currentRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col">
                                            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1 mb-2">Rentabilidad</label>
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex justify-between items-center flex-1">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase">Ganancia</span>
                                                <span className={`text-sm font-bold ${newProductProfitPerUnit > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                    ${newProductProfitPerUnit.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex justify-between items-center mt-2 flex-1">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase">Margen</span>
                                                <span className={`text-sm font-bold ${newProductMarginPerUnit >= 30 ? 'text-emerald-500' : newProductMarginPerUnit > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                                                    {newProductMarginPerUnit.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button
                                type="button"
                                onClick={() => { setShowAddProductModal(false); resetNewProductForm(); }}
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

                    {/* CALCULADORA POPUP */}
                    {isCalculatorOpen && (
                        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsCalculatorOpen(false)}>
                            <div className="bg-white rounded-2xl p-4 w-72 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-black text-gray-400 uppercase">Calculadora</span>
                                    <button onClick={() => setIsCalculatorOpen(false)} className="text-gray-400 hover:text-gray-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="bg-gray-900 rounded-xl p-4 mb-3">
                                    <div className="text-right text-white font-bold text-2xl truncate">{calcDisplay || '0'}</div>
                                    <div className="text-right text-emerald-400 font-black text-xl">= {calcResult.toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')}</div>
                                </div>

                                <div className="grid grid-cols-4 gap-3">
                                    <button onClick={() => handleCalcInput('C')} className="p-4 bg-red-100 rounded-xl font-bold text-red-700 hover:bg-red-200 text-lg">C</button>
                                    <button onClick={() => handleCalcInput('%')} className="p-4 bg-purple-100 rounded-xl font-bold text-purple-700 hover:bg-purple-200 text-lg">%</button>
                                    <button onClick={() => handleCalcInput('/')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">/</button>
                                    <button onClick={() => handleCalcInput('*')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">×</button>

                                    <button onClick={() => handleCalcInput('7')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">7</button>
                                    <button onClick={() => handleCalcInput('8')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">8</button>
                                    <button onClick={() => handleCalcInput('9')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">9</button>
                                    <button onClick={() => handleCalcInput('-')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">-</button>

                                    <button onClick={() => handleCalcInput('4')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">4</button>
                                    <button onClick={() => handleCalcInput('5')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">5</button>
                                    <button onClick={() => handleCalcInput('6')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">6</button>
                                    <button onClick={() => handleCalcInput('+')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">+</button>

                                    <button onClick={() => handleCalcInput('1')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">1</button>
                                    <button onClick={() => handleCalcInput('2')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">2</button>
                                    <button onClick={() => handleCalcInput('3')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">3</button>
                                    <button onClick={() => handleCalcInput('=')} className="p-4 bg-orange-100 rounded-xl font-bold text-orange-700 hover:bg-orange-200 text-lg row-span-2">=</button>

                                    <button onClick={() => handleCalcInput('0')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg col-span-2">0</button>
                                    <button onClick={() => handleCalcInput('.')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">.</button>
                                </div>

                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => {
                                            const result = calculateResult();
                                            const roundedResult = Math.round(result * 100) / 100;
                                            setNewProductCostBs(roundedResult);
                                            setIsCalculatorOpen(false);
                                            setCalcDisplay('');
                                            setCalcResult(0);
                                            setCalcAccumulator(0);
                                        }}
                                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700"
                                    >
                                        Insertar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1">Costo</label>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[8px] font-bold ${editCostMode === 'calculated' ? 'text-red-500' : 'text-gray-400'}`}>Calculado</span>
                                        <button
                                            type="button"
                                            onClick={() => setEditCostMode(editCostMode === 'calculated' ? 'manual' : 'calculated')}
                                            className={`w-10 h-5 rounded-full transition-colors ${editCostMode === 'manual' ? 'bg-red-400' : 'bg-gray-300'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${editCostMode === 'manual' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </button>
                                        <span className={`text-[8px] font-bold ${editCostMode === 'manual' ? 'text-red-500' : 'text-gray-400'}`}>Manual</span>
                                    </div>
                                </div>

                                {/* NUEVA ESTRUCTURA UNIFICADA CON INVENTARIO */}
                                <div className="flex flex-col gap-3">
                                    {/* FILA 1: COSTO BS/$ + CANTIDAD BULTO */}
                                    <div className="flex gap-2 items-start">
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[8px] font-black text-gray-400 uppercase px-1">
                                                {editCostMode === 'calculated' ? 'Costo Bs (Bulto Total)' : 'Costo $ (Unitario)'}
                                            </label>
                                            <div className="flex gap-2">
                                                {editCostMode === 'calculated' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditCalculatorOpen(true)}
                                                        className="w-11 h-11 bg-white border-2 border-red-200 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 transition-all shrink-0"
                                                    >
                                                        <Calculator className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                                                        {editCostMode === 'calculated' ? 'Bs' : '$'}
                                                    </span>
                                                    {editCostMode === 'calculated' ? (
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            className="w-full pl-10 pr-3 py-2.5 border-2 border-red-200 rounded-xl bg-white outline-none text-sm font-bold text-gray-900 focus:border-red-400"
                                                            value={editCostBsDisplay}
                                                            placeholder="0.00"
                                                            onChange={e => {
                                                                let val = e.target.value;
                                                                if (val !== '' && !/^[0-9]*[.,]?[0-9]*$/.test(val)) return;
                                                                setEditCostBsDisplay(val);
                                                                setEditCostBs(parseFloat(val.replace(',', '.')) || 0);
                                                            }}
                                                        />
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            className="w-full pl-10 pr-3 py-2.5 border-2 border-red-200 rounded-xl bg-white outline-none text-sm font-bold text-gray-900 focus:border-red-400"
                                                            value={editManualCostDisplay}
                                                            placeholder="0.00"
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setEditManualCostDisplay(val);
                                                                setEditManualCost(parseFloat(val.replace(',', '.')) || 0);
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-24 space-y-1">
                                            <label className="text-[8px] font-black text-gray-400 uppercase px-1">Und/Bulto</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="1"
                                                className="w-full p-2.5 border-2 border-red-200 rounded-xl bg-white outline-none text-sm font-bold text-gray-900 focus:border-red-400 text-center"
                                                value={editUnitsPerBulk || ''}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                    // Solo actualizar la cantidad - el costo NO cambia
                                                    setEditUnitsPerBulk(parseInt(val) || 0);
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* FILA 2: PANELES DE COSTO UNITARIO */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* PANEL 1: COSTO UNITARIO EN BS */}
                                        <div className="bg-red-100/50 border border-red-200 rounded-xl p-3">
                                            <div className="text-center">
                                                <span className="text-[8px] font-black text-red-500 uppercase block">Und Bs</span>
                                                <span className="text-lg font-black text-red-700">
                                                    {editCostMode === 'calculated'
                                                        ? `${(editCostBs / (editUnitsPerBulk || 1)).toFixed(2)} Bs`
                                                        : `${(editManualCost * activeRate).toFixed(2)} Bs`
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        {/* PANEL 2: COSTO POR PAQUETE USD */}
                                        <div className="bg-red-200/30 border-2 border-red-300 rounded-xl p-3">
                                            <div className="text-center">
                                                <span className="text-[8px] font-black text-red-600 uppercase block">Costo por paquete USD</span>
                                                <span className="text-lg font-black text-red-800">
                                                    ${editFinalCostUsd.toFixed(3)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* FILA 3: FECHA Y TASA (solo modo calculado) */}
                                    {editCostMode === 'calculated' && (
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <input
                                                    type="date"
                                                    className="w-full p-2 border-2 border-red-100 rounded-xl bg-white outline-none text-[10px] font-bold text-gray-700 focus:border-red-400"
                                                    value={editCostDate}
                                                    onChange={e => setEditCostDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="w-24 bg-orange-50 border border-orange-200 rounded-xl px-2 py-1 flex flex-col items-center justify-center">
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
                                    )}
                                    {/* Referencia Bs para modo manual */}
                                    {editCostMode === 'manual' && (
                                        <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex justify-between items-center">
                                            <span className="text-[8px] font-black text-orange-500 uppercase">Ref. Bolivares (hoy)</span>
                                            <span className="text-xs font-black text-orange-700">
                                                {(editManualCost * activeRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* PRECIO DE VENTA + RENTABILIDAD */}
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3">
                                <div className="flex gap-3 items-stretch">
                                    <div className="flex-1 flex flex-col">
                                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1 mb-2">Venta</label>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="w-full pl-10 pr-3 py-2.5 border-2 border-emerald-200 rounded-xl bg-white focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-emerald-400 h-full"
                                                value={editPrice || ''}
                                                placeholder="0.00"
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setEditPrice(parseFloat(val.replace(',', '.')) || 0);
                                                }}
                                            />
                                        </div>
                                        <div className="bg-emerald-100 border border-emerald-300 rounded-xl px-3 py-2 flex justify-between items-center mt-2">
                                            <span className="text-[8px] font-bold text-emerald-600 uppercase">Bolivares</span>
                                            <span className="text-sm font-black text-emerald-800">
                                                {((editPrice || 0) * latestRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col">
                                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1 mb-2">Rentabilidad</label>
                                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex justify-between items-center flex-1">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase">Ganancia</span>
                                            <span className={`text-sm font-bold ${editProfit > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                ${editProfit.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex justify-between items-center mt-2 flex-1">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase">Margen</span>
                                            <span className={`text-sm font-bold ${editMargin >= 30 ? 'text-emerald-500' : editMargin > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                                                {editMargin.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PRECIO POR UNIDAD (solo para paquetes) */}
                            {getSellingMode(editingPriceItem.product) === 'package' && (
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
                                    <div className="flex gap-3 items-stretch">
                                        <div className="flex-1 flex flex-col">
                                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1 mb-2">VENTA X UNIDAD</label>
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    className="w-full pl-10 pr-3 py-2.5 border-2 border-blue-200 rounded-xl bg-white focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-blue-400 h-full"
                                                    value={editPricePerUnit || ''}
                                                    placeholder="0.00"
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setEditPricePerUnit(parseFloat(val.replace(',', '.')) || 0);
                                                    }}
                                                />
                                            </div>
                                            <div className="bg-blue-100 border border-blue-300 rounded-xl px-3 py-2 flex justify-between items-center mt-2">
                                                <span className="text-[8px] font-bold text-blue-600 uppercase">Bolivares</span>
                                                <span className="text-sm font-black text-blue-800">
                                                    {((editPricePerUnit || 0) * latestRate).toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')} Bs
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col">
                                            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1 mb-2">Rentabilidad</label>
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex justify-between items-center flex-1">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase">Ganancia</span>
                                                <span className={`text-sm font-bold ${editProfitPerUnit > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                    ${editProfitPerUnit.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex justify-between items-center mt-2 flex-1">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase">Margen</span>
                                                <span className={`text-sm font-bold ${editMarginPerUnit >= 30 ? 'text-emerald-500' : editMarginPerUnit > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                                                    {editMarginPerUnit.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
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

                        {/* CALCULADORA POPUP */}
                        {isEditCalculatorOpen && (
                            <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsEditCalculatorOpen(false)}>
                                <div className="bg-white rounded-2xl p-4 w-72 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-black text-gray-400 uppercase">Calculadora</span>
                                        <button onClick={() => setIsEditCalculatorOpen(false)} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="bg-gray-900 rounded-xl p-4 mb-3">
                                        <div className="text-right text-white font-bold text-2xl truncate">{editCalcDisplay || '0'}</div>
                                        <div className="text-right text-emerald-400 font-black text-xl">= {editCalcResult.toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/\./g, ',')}</div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-3">
                                        <button onClick={() => handleEditCalcInput('C')} className="p-4 bg-red-100 rounded-xl font-bold text-red-700 hover:bg-red-200 text-lg">C</button>
                                        <button onClick={() => handleEditCalcInput('%')} className="p-4 bg-purple-100 rounded-xl font-bold text-purple-700 hover:bg-purple-200 text-lg">%</button>
                                        <button onClick={() => handleEditCalcInput('/')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">/</button>
                                        <button onClick={() => handleEditCalcInput('*')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">×</button>

                                        <button onClick={() => handleEditCalcInput('7')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">7</button>
                                        <button onClick={() => handleEditCalcInput('8')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">8</button>
                                        <button onClick={() => handleEditCalcInput('9')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">9</button>
                                        <button onClick={() => handleEditCalcInput('-')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">-</button>

                                        <button onClick={() => handleEditCalcInput('4')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">4</button>
                                        <button onClick={() => handleEditCalcInput('5')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">5</button>
                                        <button onClick={() => handleEditCalcInput('6')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">6</button>
                                        <button onClick={() => handleEditCalcInput('+')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">+</button>

                                        <button onClick={() => handleEditCalcInput('1')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">1</button>
                                        <button onClick={() => handleEditCalcInput('2')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">2</button>
                                        <button onClick={() => handleEditCalcInput('3')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">3</button>
                                        <button onClick={() => handleEditCalcInput('=')} className="p-4 bg-orange-100 rounded-xl font-bold text-orange-700 hover:bg-orange-200 text-lg row-span-2">=</button>

                                        <button onClick={() => handleEditCalcInput('0')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg col-span-2">0</button>
                                        <button onClick={() => handleEditCalcInput('.')} className="p-4 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 text-lg">.</button>
                                    </div>

                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => {
                                                const result = calculateEditResult();
                                                const roundedResult = Math.round(result * 100) / 100;
                                                setEditCostBs(roundedResult);
                                                setIsEditCalculatorOpen(false);
                                                setEditCalcDisplay('');
                                                setEditCalcResult(0);
                                                setEditCalcAccumulator(0);
                                            }}
                                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700"
                                        >
                                            Insertar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL DE DEUDA DE CRÉDITO - OPTIMIZADO MÓVIL */}
            {isCreditDebtModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center" onClick={() => setIsCreditDebtModalOpen(false)}>
                    <div className="bg-white w-full max-w-lg mx-auto rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up h-[92vh] sm:h-auto flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-orange-500 to-orange-600">
                            <div className="text-white">
                                <h3 className="text-lg sm:text-xl font-black">Deuda a Crédito</h3>
                                <p className="text-xs sm:text-sm font-medium opacity-90">Registrar compra pendiente</p>
                            </div>
                            <button onClick={() => setIsCreditDebtModalOpen(false)} className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                            {/* Total Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-900 p-4 rounded-2xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Total</span>
                                    <span className="text-lg sm:text-xl font-black text-white">Bs {totalBs.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div className="bg-orange-100 p-4 rounded-2xl">
                                    <span className="text-[10px] font-bold text-orange-600 uppercase block">Referencia</span>
                                    <span className="text-lg sm:text-xl font-black text-orange-700">${calculateTotal().toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Nota */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Título / Nota</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Compra de inventario"
                                    className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-gray-50 focus:bg-white focus:border-orange-500 outline-none text-base font-medium"
                                    value={creditDebtTitle}
                                    onChange={(e) => setCreditDebtTitle(e.target.value)}
                                />
                            </div>

                            {/* Tipo de Deuda */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo de Moneda</label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setCreditDebtCurrencyType('bs'); setCreditDebtAmount(totalBs); setCreditDebtAmountUsd(calculateTotal()); }}
                                        className={`flex-1 p-5 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all active:scale-95 ${creditDebtCurrencyType === 'bs' ? 'bg-orange-500 border-orange-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-600'}`}
                                    >
                                        <span className="text-2xl font-black">BS</span>
                                        <span className="text-xs font-medium">Bolivares</span>
                                    </button>
                                    <button
                                        onClick={() => { setCreditDebtCurrencyType('usd'); setCreditDebtAmountUsd(calculateTotal()); setCreditDebtAmount(calculateTotal() * currentRate); }}
                                        className={`flex-1 p-5 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all active:scale-95 ${creditDebtCurrencyType === 'usd' ? 'bg-blue-500 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-600'}`}
                                    >
                                        <span className="text-2xl font-black">USD</span>
                                        <span className="text-xs font-medium">Dólares</span>
                                    </button>
                                </div>
                            </div>

                            {/* Monto */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Monto en {creditDebtCurrencyType === 'bs' ? 'Bolivares' : 'Dólares'}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xl">
                                        {creditDebtCurrencyType === 'bs' ? 'Bs' : '$'}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full pl-14 pr-4 py-5 border-2 border-gray-200 rounded-2xl bg-gray-50 text-2xl font-bold text-gray-900 focus:border-orange-500 outline-none"
                                        value={creditDebtCurrencyType === 'bs' ? (creditDebtAmount ? creditDebtAmount.toFixed(2) : '') : (creditDebtAmountUsd ? creditDebtAmountUsd.toFixed(2) : '')}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            if (creditDebtCurrencyType === 'bs') {
                                                setCreditDebtAmount(val);
                                                setCreditDebtAmountUsd(currentRate > 0 ? val / currentRate : 0);
                                            } else {
                                                setCreditDebtAmountUsd(val);
                                                setCreditDebtAmount(val * currentRate);
                                            }
                                        }}
                                    />
                                </div>
                                <p className="text-sm font-medium text-gray-500 bg-gray-100 p-3 rounded-xl">
                                    {creditDebtCurrencyType === 'bs'
                                        ? `💡 Referencia: $${creditDebtAmountUsd.toFixed(2)} USD`
                                        : `💡 Referencia: Bs ${creditDebtAmount.toFixed(2)}`}
                                </p>
                            </div>

                            {/* Info */}
                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                                <p className="text-sm font-medium text-amber-800">
                                    {creditDebtCurrencyType === 'bs'
                                        ? '📌 La deuda se mantendrá en Bolivares sin variación.'
                                        : '📌 La deuda en Bolivares subirá automáticamente con la tasa del dólar.'}
                                </p>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-4 sm:p-6 pt-0 flex gap-3 safe-area-bottom">
                            <button
                                onClick={() => setIsCreditDebtModalOpen(false)}
                                className="flex-1 py-5 border-2 border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-all text-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreditDebtSubmit}
                                className="flex-1 py-5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-black shadow-lg hover:shadow-xl active:scale-95 transition-all text-lg"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchasePOS;
