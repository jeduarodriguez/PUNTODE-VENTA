
import React, { useState, useMemo } from 'react';
import { Product, ExchangeRateRecord } from '../types';
import { Plus, Trash2, Search, CATEGORIES, DollarSign, TrendingDown, Filter, ArrowUpDown, PiggyBank, ShoppingBag, TrendingUp, Package, Scale, Box, Layers, Settings, X, Check, Calculator, Divide, ArrowRight, ChevronDown, Tag, ChevronRight, Calendar } from '../constants';

type FilterStatus = 'all' | 'low-stock' | 'out-of-stock';
type FilterCategory = 'all' | string;
type FilterMode = 'all' | 'simple' | 'weight' | 'package';
type SortBy = 'name' | 'price-high' | 'price-low' | 'stock-high' | 'stock-low' | 'margin-high' | 'cost-high' | 'cost-low';

interface InventoryProps {
  products: Product[];
  exchangeRate: number;
  categories: string[];
  rateHistory: ExchangeRateRecord[];
  onAdd: (product: Product) => void;
  onUpdate: (product: Product) => void;
  onDelete: (id: string) => void;
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
}

const Inventory: React.FC<InventoryProps> = ({ products, exchangeRate, categories, rateHistory, onAdd, onUpdate, onDelete, onAddCategory, onDeleteCategory }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Estado para la ventana de configuración de variantes
  const [isVariantConfigOpen, setIsVariantConfigOpen] = useState(false);

  // Estados para el selector de categorías
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [modeFilter, setModeFilter] = useState<FilterMode>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: 'Bebidas',
    price: 0,
    cost_price: 0,
    stock: 0,
    description: '',
    image: '',
    selling_mode: 'simple',
    units_per_package: 0,
    price_per_unit: 0,
    remaining_units: 0,
    measurement_unit: 'kg'
  });

  // Helpers para compatibilidad con ambos formatos
  const getCostPrice = (p: Product | Partial<Product>) => p.costPrice ?? (p as any).cost_price ?? 0;
  const getCostMode = (p: Product | Partial<Product>) => p.cost_mode ?? (p as any).costMode ?? 'calculated';
  const getCostBs = (p: Product | Partial<Product>) => p.cost_bs ?? (p as any).costBs ?? 0;
  const getCostDate = (p: Product | Partial<Product>) => p.cost_date ?? (p as any).costDate ?? '';
  const getSellingMode = (p: Product | Partial<Product>) => p.selling_mode ?? (p as any).sellingMode ?? 'simple';
  const getMeasurementUnit = (p: Product | Partial<Product>) => p.measurement_unit ?? (p as any).measurementUnit ?? 'kg';
  const getUnitsPerPackage = (p: Product | Partial<Product>) => p.units_per_package ?? (p as any).unitsPerPackage ?? 0;
  const getPricePerUnit = (p: Product | Partial<Product>) => p.price_per_unit ?? (p as any).pricePerUnit ?? 0;
  const getRemainingUnits = (p: Product | Partial<Product> | null | undefined) => {
    if (!p) return 0;
    return p.remaining_units ?? (p as any).remainingUnits ?? 0;
  };

  const [costBs, setCostBs] = useState<number>(0);
  const [costDate, setCostDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [costMode, setCostMode] = useState<'calculated' | 'manual'>('calculated');
  const [manualCostUsd, setManualCostUsd] = useState<number>(0);

  // Calculadora
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('');
  const [calcResult, setCalcResult] = useState<number>(0);

  const handleCalcInput = (value: string) => {
    if (value === '=') {
      setCalcResult(calculateResult());
    } else {
      setCalcDisplay(prev => prev + value);
    }
  };

  const calculateResult = (): number => {
    try {
      const sanitized = calcDisplay.replace(/[^0-9+\-*/.]/g, '');
      if (!sanitized) return 0;
      const result = Function('"use strict"; return (' + sanitized + ')')();
      return typeof result === 'number' ? result : 0;
    } catch {
      return 0;
    }
  };

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

  const currentRate = useMemo(() => getRateForDate(costDate), [costDate, rateHistory]);
  const calculatedCostUsd = currentRate > 0 ? costBs / currentRate : 0;

  const totalCostValue = products.reduce((sum, p) => sum + ((p.cost_price ?? p.costPrice ?? 0) * p.stock), 0);
  const totalRetailValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const totalPotentialProfit = totalRetailValue - totalCostValue;
  const profitMarginPercent = totalRetailValue > 0 ? (totalPotentialProfit / totalRetailValue) * 100 : 0;

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ? true :
          statusFilter === 'low-stock' ? p.stock < 10 && p.stock > 0 :
            statusFilter === 'out-of-stock' ? p.stock === 0 : true;
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesMode = modeFilter === 'all' || (p.selling_mode || 'simple') === modeFilter;
      return matchesSearch && matchesStatus && matchesCategory && matchesMode;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'price-high': return b.price - a.price;
        case 'price-low': return a.price - a.price;
        case 'stock-high': return b.stock - a.stock;
        case 'stock-low': return a.stock - b.stock;
        case 'margin-high': return (b.price - b.costPrice) - (a.price - a.costPrice);
        case 'cost-high': return b.costPrice - a.costPrice;
        case 'cost-low': return a.costPrice - b.costPrice;
        default: return 0;
      }
    });

  // Generar lista extendida con productos virtuales de paquetes
  const extendedProducts = useMemo(() => {
    const result: Array<Product & { isVirtualUnit?: boolean; parentProduct?: Product }> = [...filteredProducts];
    
    filteredProducts.forEach(p => {
      const unitsPerPkg = p.units_per_package ?? (p as any).unitsPerPackage ?? 0;
      const pricePerU = p.price_per_unit ?? (p as any).pricePerUnit ?? 0;
      const sellingMode = p.selling_mode ?? (p as any).sellingMode ?? 'simple';
      
      if (sellingMode === 'package' && unitsPerPkg > 0 && pricePerU > 0) {
        const unitStock = p.stock * unitsPerPkg + (p.remaining_units ?? (p as any).remainingUnits ?? 0);
        const unitCost = (p.cost_price ?? (p as any).costPrice ?? 0) / unitsPerPkg;
        const unitProfit = pricePerU - unitCost;
        const unitMargin = pricePerU > 0 ? (unitProfit / pricePerU) * 100 : 0;
        
        const virtualProduct: Product & { isVirtualUnit: true; parentProduct: Product } = {
          ...p,
          id: `${p.id}_virtual`,
          name: p.name,
          category: p.category,
          price: pricePerU,
          cost_price: unitCost,
          stock: unitStock,
          selling_mode: 'simple',
          isVirtualUnit: true,
          parentProduct: p
        };
        result.push(virtualProduct);
      }
    });
    
    return result;
  }, [filteredProducts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let finalCost = 0;
      if (costMode === 'calculated') {
        if (costBs > 0 && currentRate > 0) {
          finalCost = costBs / currentRate;
        } else if (formData.costPrice) {
          finalCost = Number(formData.costPrice);
        }
      } else {
        finalCost = manualCostUsd || Number(formData.costPrice) || 0;
      }
      
      const sanitizedData: Product = {
        id: editingProduct?.id || `prod_${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name || 'Producto sin nombre',
        category: formData.category || 'Bebidas',
        price: Number(formData.price) || 0,
        costPrice: finalCost,
        stock: Number(formData.stock) || 0,
        description: formData.description || '',
        image: formData.image || `https://picsum.photos/seed/${Math.random()}/200`,
        sellingMode: formData.selling_mode || 'simple',
        measurementUnit: formData.measurement_unit,
        unitsPerPackage: Number(formData.units_per_package) || 0,
        pricePerUnit: Number(formData.price_per_unit) || 0,
        remainingUnits: getRemainingUnits(editingProduct),
        cost_mode: costMode,
        cost_bs: costMode === 'calculated' ? costBs : 0,
        cost_date: costMode === 'calculated' ? costDate : ''
      };

      if (editingProduct) {
        onUpdate(sanitizedData);
      } else {
        onAdd(sanitizedData);
      }
      closeModal();
    } catch (error) {
      console.error('Error guardando producto:', error);
      alert('Error al guardar producto');
    }
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      const existingCost = getCostPrice(product);
      setFormData({
        ...product,
        cost_price: existingCost,
        selling_mode: getSellingMode(product),
        measurement_unit: getMeasurementUnit(product),
        units_per_package: getUnitsPerPackage(product),
        price_per_unit: getPricePerUnit(product),
        remaining_units: getRemainingUnits(product)
      });
      
      // Cargar modo guardado o determinar si no existe
      const savedCostMode = getCostMode(product);
      const savedCostBs = getCostBs(product);
      const savedCostDate = getCostDate(product);
      
      setCostMode(savedCostMode);
      setManualCostUsd(existingCost);
      setCostBs(savedCostBs);
      
      // Usar fecha guardada o hoy si no existe
      if (savedCostDate) {
        setCostDate(savedCostDate);
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        setCostDate(`${year}-${month}-${day}`);
      }
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: 'Bebidas',
        price: 0,
        cost_price: 0,
        stock: 0,
        description: '',
        image: `https://picsum.photos/seed/${Math.random()}/200`,
        selling_mode: 'simple',
        units_per_package: 0,
        price_per_unit: 0,
        remaining_units: 0,
        measurement_unit: 'kg'
      });
      setCostMode('calculated');
      setCostBs(0);
      setManualCostUsd(0);
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setCostDate(`${year}-${month}-${day}`);
    }
    setIsVariantConfigOpen(false);
    setIsCategoryModalOpen(false);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // Manejador para crear nueva categoría
  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      const formattedName = newCategoryName.trim();
      onAddCategory(formattedName);
      setFormData({ ...formData, category: formattedName });
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
    }
  };

  const handleSelectCategory = (cat: string) => {
    setFormData({ ...formData, category: cat });
    setIsCategoryModalOpen(false);
  };

  // Helper para cálculos de variantes
  const getPackageCalculations = () => {
    const cost = costMode === 'calculated' ? calculatedCostUsd : manualCostUsd;
    const packageCost = cost || Number(formData.cost_price) || 0;
    const units = Number(formData.units_per_package) || 1;
    const unitSellPrice = Number(formData.price_per_unit) || 0;

    const unitCost = units > 0 ? packageCost / units : 0;
    const unitProfit = unitSellPrice - unitCost;
    const unitMargin = unitSellPrice > 0 ? (unitProfit / unitSellPrice) * 100 : 0;

    return { unitCost, unitProfit, unitMargin };
  };

  // Helper para cálculo principal - usa el costo USD calculado desde Bs
  const getMainCalculations = () => {
    const cost = costMode === 'calculated' ? calculatedCostUsd : manualCostUsd;
    const finalCost = cost || Number(formData.cost_price) || 0;
    const price = Number(formData.price) || 0;
    const profit = price - finalCost;
    const margin = finalCost > 0 ? (profit / finalCost) * 100 : 0;
    return { profit, margin };
  };

  const { profit, margin } = getMainCalculations();

  const getUnitPriceCalculations = () => {
    const cost = costMode === 'calculated' ? calculatedCostUsd : manualCostUsd;
    const finalCost = cost || Number(formData.cost_price) || 0;
    const unitsPerPackage = Number(formData.units_per_package) || 1;
    const costPerUnit = unitsPerPackage > 0 ? finalCost / unitsPerPackage : 0;
    const pricePerUnit = Number(formData.price_per_unit) || 0;
    const profitPerUnit = pricePerUnit - costPerUnit;
    const marginPerUnit = costPerUnit > 0 ? (profitPerUnit / costPerUnit) * 100 : 0;
    return { profitPerUnit, marginPerUnit, costPerUnit };
  };

  const { profitPerUnit, marginPerUnit } = getUnitPriceCalculations();

  return (
    <div className="space-y-4 pb-24">

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-2">
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
            <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
            <span className="text-[8px] font-black text-gray-400 uppercase truncate">Inversión</span>
          </div>
          <p className="text-sm sm:text-lg font-black text-gray-800 leading-tight">${totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
          <p className="text-[9px] font-bold text-gray-400 mt-1">{(totalCostValue * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
            <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-[8px] font-black text-gray-400 uppercase truncate">Valor</span>
          </div>
          <p className="text-sm sm:text-lg font-black text-gray-800 leading-tight">${totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
          <p className="text-[9px] font-bold text-gray-400 mt-1">{(totalRetailValue * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p>
        </div>
        <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100 text-white flex flex-col items-center text-center relative overflow-hidden">
          <div className="flex items-center gap-1.5 mb-0.5 relative z-10">
            <PiggyBank className="w-3 h-3 text-indigo-200 shrink-0" />
            <span className="text-[8px] font-black text-indigo-200 uppercase truncate">Utilidad</span>
          </div>
          <div className="flex flex-col items-center relative z-10">
            <p className="text-sm sm:text-lg font-black leading-tight">${totalPotentialProfit.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
            <div className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] font-black text-indigo-100 mt-1">
              {profitMarginPercent.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="BUSCAR PRODUCTO..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs shadow-sm text-gray-900 font-black uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          <select
            className="pl-3 pr-6 py-2 bg-white border border-gray-100 rounded-lg text-xs font-bold uppercase outline-none shadow-sm cursor-pointer text-gray-600 focus:border-indigo-500 whitespace-nowrap shrink-0"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">CATEGORÍAS</option>
            {categories.filter(c => c !== 'Todas').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            className="pl-2 pr-5 py-2 bg-white border border-gray-100 rounded-lg text-[8px] font-bold uppercase outline-none shadow-sm cursor-pointer text-gray-600 focus:border-indigo-500 whitespace-nowrap shrink-0"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as FilterMode)}
          >
            <option value="all">TIPO</option>
            <option value="simple">UND</option>
            <option value="weight">PESO</option>
            <option value="package">PACK</option>
          </select>

          <select
            className="pl-2 pr-5 py-2 bg-white border border-gray-100 rounded-lg text-[8px] font-bold uppercase outline-none shadow-sm cursor-pointer text-gray-600 focus:border-indigo-500 whitespace-nowrap shrink-0"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
          >
            <option value="all">ESTADO</option>
            <option value="low-stock">BAJO</option>
            <option value="out-of-stock">AGOT</option>
          </select>

          <select
            className="pl-2 pr-5 py-2 bg-white border border-gray-100 rounded-lg text-[8px] font-bold uppercase outline-none shadow-sm cursor-pointer text-gray-600 focus:border-indigo-500 whitespace-nowrap shrink-0"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
          >
            <option value="name">A-Z</option>
            <option value="price-high">$$$↑</option>
            <option value="price-low">$$$↓</option>
            <option value="cost-high">COST↑</option>
            <option value="cost-low">COST↓</option>
            <option value="margin-high">MARG</option>
            <option value="stock-high">STK↑</option>
            <option value="stock-low">STK↓</option>
          </select>
        </div>
      </div>

      {/* LISTA DE PRODUCTOS */}
      <div className="flex flex-col gap-2">
        {extendedProducts.map(product => {
          const productCostPrice = product.cost_price ?? product.costPrice ?? 0;
          const profit = product.price - productCostPrice;
          const margin = product.price > 0 ? (profit / product.price) * 100 : 0;
          const isLowStock = product.stock < 10;
          const isOutOfStock = product.stock === 0;
          const isPackage = (product.selling_mode || product.sellingMode) === 'package';
          const isWeight = (product.selling_mode || product.sellingMode) === 'weight';
          const isVirtualUnit = (product as any).isVirtualUnit;

          const handleClick = () => {
            if (isVirtualUnit && (product as any).parentProduct) {
              openModal((product as any).parentProduct);
            } else {
              openModal(product);
            }
          };

          return (
            <div
              key={product.id}
              onClick={handleClick}
              className={`bg-white p-3 rounded-2xl border border-gray-100 flex items-center gap-2 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] ${isVirtualUnit ? 'bg-blue-50/50 border-blue-100' : ''}`}
            >
              {/* 1. STOCK */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 relative ${isOutOfStock ? 'bg-red-50 border-red-100 text-red-500' : isLowStock ? 'bg-orange-50 border-orange-100 text-orange-500' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
                {isWeight ? (
                  <span className="font-black text-xs">{product.stock}{product.measurement_unit || product.measurementUnit || ''}</span>
                ) : (
                  <span className="font-black text-sm">{product.stock}</span>
                )}
                {isPackage && !isVirtualUnit && product.units_per_package && product.units_per_package > 0 && (
                  <div className={`absolute -top-1.5 -right-1.5 ${product.stock > 0 || (product.remaining_units || 0) > 0 ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-600'} text-[8px] font-black px-1 py-0.5 rounded-full shadow-sm`}>
                    {product.stock * product.units_per_package + (product.remaining_units || 0)}
                  </div>
                )}
              </div>

              {/* 2. NOMBRE + CATEGORIA */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-sm leading-tight truncate ${isVirtualUnit ? 'text-blue-700' : 'text-gray-800'}`}>{product.name}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                  {product.category}
                  {isVirtualUnit && <span className="text-blue-500 ml-1">(unidad)</span>}
                </p>
              </div>

              {/* 3. COSTO */}
              <div className="text-center min-w-[55px]">
                <span className="text-[7px] font-black text-gray-400 uppercase block">Costo</span>
                <span className="text-[10px] font-bold text-red-400">${productCostPrice.toFixed(2)}</span>
              </div>

              {/* 4. VENTA */}
              <div className="text-center min-w-[55px]">
                <span className="text-[7px] font-black text-gray-400 uppercase block">Venta</span>
                <span className="text-[10px] font-bold text-emerald-600">${product.price.toFixed(2)}</span>
              </div>

              {/* 5. GANANCIA */}
              <div className="text-center min-w-[50px]">
                <span className="text-[7px] font-black text-gray-400 uppercase block">Ganancia</span>
                <span className={`text-[10px] font-bold ${margin >= 30 ? 'text-emerald-500' : margin > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                  {margin.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
        {extendedProducts.length === 0 && (
          <div className="py-12 text-center flex flex-col items-center justify-center opacity-30 gap-2">
            <Package className="w-10 h-10" />
            <p className="text-xs font-black uppercase tracking-widest">Inventario Vacío</p>
          </div>
        )}
      </div>

      <button
        onClick={() => openModal()}
        className="fixed bottom-24 right-4 md:bottom-10 md:right-10 z-40 bg-gray-900 text-white w-14 h-14 rounded-full shadow-2xl shadow-gray-900/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
      >
        <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform" />
      </button>

      {/* MAIN MODAL - TAMAÑO GRANDE (FULL SCREEN) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-fade-in">

          {/* 1. CATEGORY SELECTION OVERLAY (Ventana detallada para Categorías) */}
          {isCategoryModalOpen && (
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
                <button onClick={() => setIsCategoryModalOpen(false)} className="bg-white p-2 rounded-full text-emerald-600 shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2 w-full max-w-4xl mx-auto">
                {categories.filter(c => c !== 'Todas').map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleSelectCategory(cat)}
                    className={`w-full p-3 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-[0.98] ${formData.category === cat ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'}`}
                  >
                    <span className="font-bold text-sm truncate">{cat}</span>
                    <div className="flex items-center gap-1">
                      {formData.category === cat && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat); }}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-6 w-full max-w-4xl mx-auto border-t border-gray-100 bg-gray-50">
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

          {/* 2. VARIANT CONFIGURATION OVERLAY (Ventana detallada dentro del modal) */}
          {isVariantConfigOpen && (
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
                <button onClick={() => setIsVariantConfigOpen(false)} className="bg-white p-2 rounded-full text-indigo-600 shadow-sm">
                  <Check className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto w-full max-w-4xl mx-auto">

                {/* Selector de Modo */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, selling_mode: 'simple' })}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.selling_mode === 'simple' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    <Package className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase">Unidad</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, selling_mode: 'weight' })}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.selling_mode === 'weight' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    <Scale className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase">Peso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, selling_mode: 'package' })}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.selling_mode === 'package' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    <Box className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase">Paquete</span>
                  </button>
                </div>

                {/* Configuración Dinámica */}
                {formData.selling_mode === 'weight' && (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4 animate-fade-in">
                    <h4 className="font-bold text-gray-900 text-sm">Venta por Peso / Volumen</h4>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Unidad de Medida</label>
                      <select
                        className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white outline-none text-sm font-bold text-gray-900"
                        value={formData.measurement_unit}
                        onChange={e => setFormData({ ...formData, measurementUnit: e.target.value as any })}
                      >
                        <option value="kg">Kilogramos (Kg)</option>
                        <option value="g">Gramos (g)</option>
                        <option value="l">Litros (L)</option>
                        <option value="ml">Mililitros (ml)</option>
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 bg-white p-3 rounded-xl border border-gray-100">
                      <InfoIcon className="inline w-3 h-3 mr-1" />
                      El precio principal será el precio por <b>1 {formData.measurement_unit}</b>.
                    </p>
                  </div>
                )}

                {formData.selling_mode === 'package' && (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4 animate-fade-in">
                    <h4 className="font-bold text-gray-900 text-sm">Venta por Paquete (Multi-precio)</h4>

                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Costo Total Paquete (Ref)</span>
                      <span className="text-sm font-black text-blue-900">${(costMode === 'calculated' ? calculatedCostUsd : manualCostUsd || Number(formData.cost_price) || 0).toFixed(2)}</span>
                    </div>

                    {/* Reorganización: Unidades y Costo Unitario en la misma fila */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Unidades / Pack</label>
                        <div className="relative">
                          <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="number"
                            placeholder="Ej. 12"
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white outline-none text-sm font-bold text-gray-900"
                            value={formData.units_per_package || ''}
                            onChange={e => setFormData({ ...formData, units_per_package: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      {/* Costo calculado al lado */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest px-1">Costo Unitario</label>
                        {(() => {
                          const { unitCost } = getPackageCalculations();
                          return (
                            <div className="w-full p-3 border-2 border-orange-100 bg-orange-50 rounded-xl flex items-center gap-2 h-[46px]">
                              <Divide className="w-4 h-4 text-orange-400" />
                              <span className="text-sm font-black text-orange-700">${unitCost.toFixed(2)}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* CÁLCULO DE RENTABILIDAD POR UNIDAD (Barra Horizontal) */}
                    {(() => {
                      const { unitProfit, unitMargin } = getPackageCalculations();
                      return (
                        <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-around shadow-sm mt-2">
                          <div className="text-center">
                            <p className="text-[9px] uppercase font-bold text-emerald-600">Ganancia/Unidad</p>
                            <p className="text-sm font-black text-emerald-700">+${unitProfit.toFixed(2)}</p>
                          </div>
                          <div className="w-px h-8 bg-gray-100"></div>
                          <div className="text-center">
                            <p className="text-[9px] uppercase font-bold text-blue-600">Margen %</p>
                            <p className="text-sm font-black text-blue-700">{unitMargin.toFixed(0)}%</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div className="p-6 w-full max-w-4xl mx-auto">
                <button
                  onClick={() => setIsVariantConfigOpen(false)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
                >
                  Guardar Configuración
                </button>
              </div>
            </div>
          )}

          <div className="p-3 sm:p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
            <h3 className="text-base sm:text-lg font-black text-gray-900">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
            <div className="flex items-center gap-2">
              {editingProduct && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(editingProduct.id);
                    closeModal();
                  }}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button onClick={closeModal} className="text-gray-400 hover:text-black p-1">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 w-full max-w-2xl mx-auto">
            {/* NOMBRE DEL PRODUCTO */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nombre del Producto</label>
              <div className="flex gap-2">
                <input
                  required
                  autoFocus={!editingProduct}
                  placeholder="Ej. Café Molido 1kg"
                  className="flex-1 p-3 sm:p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none text-sm font-bold text-gray-900"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setIsVariantConfigOpen(true)}
                  className={`w-12 sm:w-14 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${formData.selling_mode !== 'simple' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500'}`}
                  title="Cambiar tipo"
                >
                  {formData.selling_mode === 'weight' ? <Scale className="w-5 h-5 sm:w-6 sm:h-6" /> : formData.selling_mode === 'package' ? <Box className="w-5 h-5 sm:w-6 sm:h-6" /> : <Settings className="w-5 h-5 sm:w-6 sm:h-6" />}
                </button>
              </div>
            </div>

            {/* CATEGORÍA Y STOCK */}
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoría</label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="w-full p-3 border-2 border-gray-100 rounded-2xl bg-gray-50 outline-none text-sm font-bold text-gray-900 focus:border-indigo-500 transition-all text-left flex items-center justify-between group active:scale-[0.98]"
                >
                  <span>{formData.category}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                </button>
              </div>
              <div className="w-24 space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                  {formData.selling_mode === 'weight' ? `Stock (${formData.measurement_unit})` : 'Stock'}
                </label>
                <input
                  type="number"
                  step={formData.selling_mode === 'weight' ? "0.01" : "1"}
                  placeholder="0"
                  className="w-full p-3 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-indigo-500 transition-all"
                  value={formData.stock || ''}
                  onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* PRECIOS */}
            <div className="pt-2 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* COSTO */}
                <div className="bg-red-50 border border-red-100 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1">Costo</label>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-bold ${costMode === 'calculated' ? 'text-red-500' : 'text-gray-400'}`}>Calculado</span>
                      <button
                        type="button"
                        onClick={() => setCostMode(costMode === 'calculated' ? 'manual' : 'calculated')}
                        className={`w-10 h-5 rounded-full transition-colors ${costMode === 'manual' ? 'bg-red-400' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${costMode === 'manual' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                      <span className={`text-[8px] font-bold ${costMode === 'manual' ? 'text-red-500' : 'text-gray-400'}`}>Manual</span>
                    </div>
                  </div>
                  
                  {costMode === 'calculated' ? (
                    <>
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Bs</span>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full pl-10 pr-3 py-2.5 border-2 border-red-200 rounded-xl bg-white focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-red-400"
                            value={costBs || ''}
                            placeholder="0.00"
                            onChange={e => setCostBs(parseFloat(e.target.value) || 0)}
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
                          <span className="text-sm font-black text-red-700">${calculatedCostUsd.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="date"
                            className="w-full px-2 py-2 border-2 border-red-200 rounded-lg bg-white outline-none text-[10px] font-bold text-gray-700 focus:border-red-400"
                            value={costDate}
                            onChange={e => setCostDate(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 bg-orange-100 border border-orange-200 rounded-lg px-2 py-2 flex flex-col items-center justify-center">
                          <span className="text-[7px] font-bold text-orange-500 uppercase">Tasa</span>
                          <span className="text-xs font-black text-orange-700">{currentRate.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full pl-10 pr-3 py-2.5 border-2 border-red-200 rounded-xl bg-white focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-red-400"
                          value={manualCostUsd ? Number(manualCostUsd.toFixed(2)) : ''}
                          placeholder="0.00"
                          onChange={e => setManualCostUsd(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-28 bg-orange-100 border border-orange-200 rounded-xl px-3 py-2.5 flex flex-col items-center justify-center">
                        <span className="text-[7px] font-bold text-orange-500 uppercase">Ref. Bs</span>
                        <span className="text-sm font-black text-orange-700">{(manualCostUsd * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* VENTA + RENTABILIDAD UNIFICADO */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3">
                  <div className="flex gap-3 items-stretch">
                    {/* LADO IZQUIERDO: PRECIO */}
                    <div className="flex-1 flex flex-col">
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1 mb-2">Venta</label>
                      {/* $ */}
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full pl-10 pr-3 py-2.5 border-2 border-emerald-200 rounded-xl bg-white focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-emerald-400 h-full"
                          value={formData.price || ''}
                          placeholder="0.00"
                          onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      
                      {/* Bs calculado */}
                      <div className="bg-emerald-100 border border-emerald-300 rounded-xl px-3 py-2 flex justify-between items-center mt-2">
                        <span className="text-[8px] font-bold text-emerald-600 uppercase">Bolivares</span>
                        <span className="text-sm font-black text-emerald-800">
                          {((formData.price || 0) * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
                        </span>
                      </div>
                    </div>

                    {/* LADO DERECHO: RENTABILIDAD */}
                    <div className="flex-1 flex flex-col">
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1 mb-2">Rentabilidad</label>
                      
                      {/* Ganancia */}
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex justify-between items-center flex-1">
                        <span className="text-[8px] font-bold text-gray-400 uppercase">Ganancia</span>
                        <span className={`text-sm font-black ${profit > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                          ${profit.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Margen */}
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex justify-between items-center mt-2 flex-1">
                        <span className="text-[8px] font-bold text-gray-400 uppercase">Margen</span>
                        <span className={`text-sm font-black ${margin >= 30 ? 'text-emerald-500' : margin > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                          {margin.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PRECIO POR UNIDAD (solo para paquetes) */}
              {formData.selling_mode === 'package' && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
                  <div className="flex gap-3 items-stretch">
                    {/* LADO IZQUIERDO: PRECIO POR UNIDAD */}
                    <div className="flex-1 flex flex-col">
                      <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1 mb-2">Precio x Unidad</label>
                      {/* $ */}
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full pl-10 pr-3 py-2.5 border-2 border-blue-200 rounded-xl bg-white focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-blue-400 h-full"
                          value={formData.price_per_unit || ''}
                          placeholder="0.00"
                          onChange={e => setFormData({ ...formData, price_per_unit: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      
                      {/* Bs calculado */}
                      <div className="bg-blue-100 border border-blue-300 rounded-xl px-3 py-2 flex justify-between items-center mt-2">
                        <span className="text-[8px] font-bold text-blue-600 uppercase">Bolivares</span>
                        <span className="text-sm font-black text-blue-800">
                          {((formData.price_per_unit || 0) * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
                        </span>
                      </div>
                    </div>

                    {/* LADO DERECHO: RENTABILIDAD */}
                    <div className="flex-1 flex flex-col">
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1 mb-2">Rentabilidad</label>
                      
                      {/* Ganancia */}
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex justify-between items-center flex-1">
                        <span className="text-[8px] font-bold text-gray-400 uppercase">Ganancia</span>
                        <span className={`text-sm font-black ${profitPerUnit > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                          ${profitPerUnit.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Margen */}
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex justify-between items-center mt-2 flex-1">
                        <span className="text-[8px] font-bold text-gray-400 uppercase">Margen</span>
                        <span className={`text-sm font-black ${marginPerUnit >= 30 ? 'text-emerald-500' : marginPerUnit > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                          {marginPerUnit.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
              >
                {editingProduct ? 'Actualizar' : 'Guardar'}
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
                
                <div className="bg-gray-900 rounded-xl p-3 mb-3">
                  <div className="text-right text-white font-bold text-xl truncate">{calcDisplay || '0'}</div>
                  <div className="text-right text-emerald-400 font-black text-lg">= {calcResult.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {['7','8','9','/'].map(btn => (
                    <button key={btn} onClick={() => handleCalcInput(btn)} className="p-3 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 active:scale-95">{btn}</button>
                  ))}
                  {['4','5','6','*'].map(btn => (
                    <button key={btn} onClick={() => handleCalcInput(btn)} className="p-3 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 active:scale-95">{btn}</button>
                  ))}
                  {['1','2','3','-'].map(btn => (
                    <button key={btn} onClick={() => handleCalcInput(btn)} className="p-3 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 active:scale-95">{btn}</button>
                  ))}
                  {['0','00','.','+'].map(btn => (
                    <button key={btn} onClick={() => handleCalcInput(btn)} className="p-3 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 active:scale-95">{btn}</button>
                  ))}
                </div>

                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => { setCalcDisplay(''); setCalcResult(0); }}
                    className="flex-1 py-3 bg-red-100 text-red-600 rounded-xl font-bold text-sm hover:bg-red-200"
                  >
                    C
                  </button>
                  <button 
                    onClick={() => { 
                      const result = calculateResult();
                      setCostBs(prev => prev + result);
                      setIsCalculatorOpen(false);
                      setCalcDisplay('');
                      setCalcResult(0);
                    }}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700"
                  >
                    Sumar a Bs
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

// Simple Info Icon component locally
const InfoIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
);

export default Inventory;
