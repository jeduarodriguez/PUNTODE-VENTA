
import React, { useState } from 'react';
import { Product } from '../types';
import { Plus, Trash2, Edit, Search, CATEGORIES, DollarSign, TrendingDown, Filter, ArrowUpDown, PiggyBank, ShoppingBag, TrendingUp, Package, Scale, Box, Layers, Settings, X, Check, Calculator, Divide, ArrowRight, ChevronDown, Tag, ChevronRight } from '../constants';

interface InventoryProps {
  products: Product[];
  exchangeRate: number;
  categories: string[];
  onAdd: (product: Product) => void;
  onUpdate: (product: Product) => void;
  onDelete: (id: string) => void;
  onAddCategory: (category: string) => void;
}

type FilterStatus = 'all' | 'low-stock' | 'out-of-stock';
type SortBy = 'name' | 'price-high' | 'price-low' | 'stock-high' | 'stock-low' | 'margin-high';

const Inventory: React.FC<InventoryProps> = ({ products, exchangeRate, categories, onAdd, onUpdate, onDelete, onAddCategory }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Estado para la ventana de configuración de variantes
  const [isVariantConfigOpen, setIsVariantConfigOpen] = useState(false);

  // Estados para el selector de categorías
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: 'Bebidas',
    price: 0,
    costPrice: 0,
    stock: 0,
    description: '',
    image: '',
    sellingMode: 'simple',
    unitsPerPackage: 0,
    pricePerUnit: 0,
    measurementUnit: 'kg'
  });

  const totalCostValue = products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);
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
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'price-high': return b.price - a.price;
        case 'price-low': return a.price - b.price;
        case 'stock-high': return b.stock - a.stock;
        case 'stock-low': return a.stock - b.stock;
        case 'margin-high': return (b.price - b.costPrice) - (a.price - a.costPrice);
        default: return 0;
      }
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedData: Product = {
      id: editingProduct?.id || `prod_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name || 'Producto sin nombre',
      category: formData.category || 'Bebidas',
      price: Number(formData.price) || 0,
      costPrice: Number(formData.costPrice) || 0,
      stock: Number(formData.stock) || 0,
      description: formData.description || '',
      image: formData.image || `https://picsum.photos/seed/${Math.random()}/200`,
      sellingMode: formData.sellingMode || 'simple',
      measurementUnit: formData.measurementUnit,
      unitsPerPackage: Number(formData.unitsPerPackage) || 0,
      pricePerUnit: Number(formData.pricePerUnit) || 0
    };

    if (editingProduct) {
      onUpdate(sanitizedData);
    } else {
      onAdd(sanitizedData);
    }
    closeModal();
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        ...product,
        sellingMode: product.sellingMode || 'simple',
        measurementUnit: product.measurementUnit || 'kg',
        unitsPerPackage: product.unitsPerPackage || 0,
        pricePerUnit: product.pricePerUnit || 0
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: 'Bebidas',
        price: 0,
        costPrice: 0,
        stock: 0,
        description: '',
        image: `https://picsum.photos/seed/${Math.random()}/200`,
        sellingMode: 'simple',
        unitsPerPackage: 0,
        pricePerUnit: 0,
        measurementUnit: 'kg'
      });
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
    const packageCost = Number(formData.costPrice) || 0;
    const units = Number(formData.unitsPerPackage) || 1;
    const unitSellPrice = Number(formData.pricePerUnit) || 0;

    const unitCost = units > 0 ? packageCost / units : 0;
    const unitProfit = unitSellPrice - unitCost;
    const unitMargin = unitSellPrice > 0 ? (unitProfit / unitSellPrice) * 100 : 0;

    return { unitCost, unitProfit, unitMargin };
  };

  // Helper para cálculo principal
  const getMainCalculations = () => {
    const cost = Number(formData.costPrice) || 0;
    const price = Number(formData.price) || 0;
    const profit = price - cost;
    const margin = price > 0 ? (profit / price) * 100 : 0;
    return { profit, margin };
  };

  const { profit, margin } = getMainCalculations();

  return (
    <div className="space-y-4 pb-24">

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-2">
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
            <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
            <span className="text-[8px] font-black text-gray-400 uppercase truncate">Inversión</span>
          </div>
          <p className="text-sm sm:text-lg font-black text-gray-800 leading-tight">${totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
          <p className="text-[9px] font-bold text-gray-400 mt-1">{(totalCostValue * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
            <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-[8px] font-black text-gray-400 uppercase truncate">Valor Venta</span>
          </div>
          <p className="text-sm sm:text-lg font-black text-gray-800 leading-tight">${totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
          <p className="text-[9px] font-bold text-gray-400 mt-1">{(totalRetailValue * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p>
        </div>
        <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="flex items-center gap-1.5 mb-0.5 relative z-10">
            <PiggyBank className="w-3 h-3 text-indigo-200 shrink-0" />
            <span className="text-[8px] font-black text-indigo-200 uppercase truncate">Utilidad</span>
          </div>
          <div className="flex items-end justify-between relative z-10">
            <div>
              <p className="text-sm sm:text-lg font-black leading-tight">${totalPotentialProfit.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
              <p className="text-[9px] font-bold text-indigo-300 mt-1">{(totalPotentialProfit * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs</p>
            </div>
            <div className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] font-black text-indigo-100">
              {profitMarginPercent.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="BUSCAR PRODUCTO..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs shadow-sm text-gray-900 font-black uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <select
            className="pl-4 pr-8 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none shadow-sm cursor-pointer text-gray-600 focus:border-indigo-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
          >
            <option value="all">TODOS</option>
            <option value="low-stock">BAJO STOCK</option>
            <option value="out-of-stock">AGOTADOS</option>
          </select>

          <select
            className="pl-4 pr-8 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none shadow-sm cursor-pointer text-gray-600 focus:border-indigo-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
          >
            <option value="name">A-Z</option>
            <option value="price-high">PRECIO MAX</option>
            <option value="price-low">PRECIO MIN</option>
            <option value="margin-high">UTILIDAD</option>
            <option value="stock-high">STOCK MAX</option>
            <option value="stock-low">STOCK MIN</option>
          </select>
        </div>
      </div>

      {/* LISTA DE PRODUCTOS */}
      <div className="flex flex-col gap-2">
        {filteredProducts.map(product => {
          const profit = product.price - product.costPrice;
          const margin = product.price > 0 ? (profit / product.price) * 100 : 0;
          const isLowStock = product.stock < 10;
          const isOutOfStock = product.stock === 0;
          const isPackage = product.sellingMode === 'package';
          const isWeight = product.sellingMode === 'weight';

          return (
            <div
              key={product.id}
              onClick={() => openModal(product)}
              className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center gap-2 sm:gap-3 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
            >
              {/* STOCK/VARIANT ICON */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 relative ${isOutOfStock ? 'bg-red-50 border-red-100 text-red-500' : isLowStock ? 'bg-orange-50 border-orange-100 text-orange-500' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
                {/* Number always in center */}
                <span className="font-black text-lg">{product.stock}</span>

                {/* Icon Badge for Variants */}
                {(isWeight || isPackage) && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full border border-gray-100 flex items-center justify-center shadow-sm z-10">
                    {isWeight ? <Scale className="w-3 h-3 text-purple-500" /> : <Box className="w-3 h-3 text-blue-500" />}
                  </div>
                )}
              </div>

              {/* NOMBRE Y CATEGORIA */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-sm leading-tight truncate">{product.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">{product.category}</p>
                  {/* Badges de Variante */}
                  {isPackage && <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 rounded uppercase">Pack x{product.unitsPerPackage}</span>}
                  {isWeight && <span className="text-[8px] font-black bg-purple-50 text-purple-600 px-1.5 rounded uppercase">x {product.measurementUnit}</span>}
                </div>
              </div>

              {/* PRECIOS */}
              <div className="text-right flex flex-col items-end">
                {/* Precio Principal */}
                <p className="font-black text-sm text-indigo-700">${product.price.toFixed(2)}</p>

                {/* Precio Secundario (Unidad suelta o Costo) */}
                {isPackage && product.pricePerUnit ? (
                  <p className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1 rounded mt-0.5">Unidad: ${product.pricePerUnit.toFixed(2)}</p>
                ) : (
                  <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Costo: ${product.costPrice.toFixed(2)}</p>
                )}
              </div>

              {/* MARGEN */}
              <div className="bg-gray-50 rounded-lg p-1.5 min-w-[50px] text-center border border-gray-100 hidden sm:block">
                <p className={`text-[9px] font-bold ${margin >= 30 ? 'text-emerald-500' : margin > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                  {margin.toFixed(0)}%
                </p>
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
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

              <div className="flex-1 overflow-y-auto p-4 space-y-2 w-full max-w-4xl mx-auto">
                {categories.filter(c => c !== 'Todas').map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleSelectCategory(cat)}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-[0.98] ${formData.category === cat ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'}`}
                  >
                    <span className="font-bold text-sm">{cat}</span>
                    {formData.category === cat && <Check className="w-5 h-5 text-emerald-600" />}
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
                    onClick={() => setFormData({ ...formData, sellingMode: 'simple' })}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.sellingMode === 'simple' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    <Package className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase">Unidad</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, sellingMode: 'weight' })}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.sellingMode === 'weight' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    <Scale className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase">Peso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, sellingMode: 'package' })}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.sellingMode === 'package' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    <Box className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase">Paquete</span>
                  </button>
                </div>

                {/* Configuración Dinámica */}
                {formData.sellingMode === 'weight' && (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4 animate-fade-in">
                    <h4 className="font-bold text-gray-900 text-sm">Venta por Peso / Volumen</h4>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Unidad de Medida</label>
                      <select
                        className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white outline-none text-sm font-bold text-gray-900"
                        value={formData.measurementUnit}
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
                      El precio principal será el precio por <b>1 {formData.measurementUnit}</b>.
                    </p>
                  </div>
                )}

                {formData.sellingMode === 'package' && (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4 animate-fade-in">
                    <h4 className="font-bold text-gray-900 text-sm">Venta por Paquete (Multi-precio)</h4>

                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Costo Total Paquete (Ref)</span>
                      <span className="text-sm font-black text-blue-900">${Number(formData.costPrice || 0).toFixed(2)}</span>
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
                            value={formData.unitsPerPackage || ''}
                            onChange={e => setFormData({ ...formData, unitsPerPackage: parseInt(e.target.value) || 0 })}
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

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-1">Precio Venta (Unidad Suelta)</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full pl-8 pr-4 py-3 border-2 border-emerald-100 rounded-xl bg-white outline-none text-sm font-bold text-gray-900 focus:border-emerald-500"
                            value={formData.pricePerUnit || ''}
                            onChange={e => setFormData({ ...formData, pricePerUnit: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-3 flex flex-col justify-center min-w-[70px] text-right">
                          <span className="text-[8px] font-black text-emerald-300 uppercase">Bolívares</span>
                          <span className="text-xs font-black text-emerald-600 leading-none">
                            {((formData.pricePerUnit || 0) * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
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

          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
            <h3 className="text-xl font-black text-gray-900">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
            <button onClick={closeModal} className="text-gray-400 text-3xl font-light hover:text-black">&times;</button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 w-full max-w-4xl mx-auto">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nombre Comercial</label>
              <div className="flex gap-2">
                <input
                  required
                  autoFocus={!editingProduct} // Changed here
                  placeholder="Ej. Café Molido 1kg"
                  className="flex-1 p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all text-sm font-bold text-gray-900"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
                {/* BOTÓN DE VARIANTE */}
                <button
                  type="button"
                  onClick={() => setIsVariantConfigOpen(true)}
                  className={`w-14 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${formData.sellingMode !== 'simple' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500'}`}
                  title="Agregar variante / característica especial"
                >
                  {formData.sellingMode === 'weight' ? <Scale className="w-6 h-6" /> : formData.sellingMode === 'package' ? <Box className="w-6 h-6" /> : <Settings className="w-6 h-6" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoría</label>
                {/* TRIGGER PARA ABRIR MODAL DE CATEGORIA */}
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 outline-none text-sm font-bold text-gray-900 focus:border-indigo-500 transition-all text-left flex items-center justify-between group active:scale-[0.98]"
                >
                  <span>{formData.category}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                  {formData.sellingMode === 'weight' ? `Stock (${formData.measurementUnit})` : 'Stock Actual'}
                </label>
                <input
                  type="number"
                  step={formData.sellingMode === 'weight' ? "0.01" : "1"}
                  placeholder="0"
                  className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-indigo-500 transition-all"
                  value={formData.stock || ''}
                  onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Estructura de Costos</h4>
              </div>

              {/* FORCED 2-COLUMN LAYOUT FOR KEYBOARD OPTIMIZATION */}
              <div className="grid grid-cols-2 gap-3">
                {/* COLUMNA IZQUIERDA: INPUTS DE COSTO Y VENTA (Apilados) */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1 flex items-center gap-1">
                      Costo {formData.sellingMode === 'package' ? 'Paquete' : ''}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full pl-6 pr-2 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-indigo-500 transition-all"
                          value={formData.costPrice || ''}
                          placeholder="0.00"
                          onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-xl px-2 flex flex-col justify-center min-w-[60px] text-right shrink-0">
                        <span className="text-[8px] font-black text-red-300 uppercase">Bs</span>
                        <span className="text-[10px] font-black text-red-800 leading-none truncate">
                          {((formData.costPrice || 0) * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-1 flex items-center gap-1">
                      Venta {formData.sellingMode === 'package' ? 'Paquete' : ''}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full pl-6 pr-2 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 focus:bg-white outline-none text-sm font-bold text-gray-900 focus:border-indigo-500 transition-all"
                          value={formData.price || ''}
                          placeholder="0.00"
                          onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-2 flex flex-col justify-center min-w-[60px] text-right shrink-0">
                        <span className="text-[8px] font-black text-emerald-300 uppercase">Bs</span>
                        <span className="text-[10px] font-black text-emerald-600 leading-none truncate">
                          {((formData.price || 0) * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMNA DERECHA: PANEL RENTABILIDAD */}
                <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100 flex flex-col justify-center h-full">
                  <h5 className="text-center text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-2">
                    Rentabilidad
                  </h5>
                  <div className="flex flex-col items-center justify-center flex-1 gap-1">
                    {/* Utilidad */}
                    <div className="text-center">
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Ganancia</p>
                      <p className={`text-lg font-black ${profit > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>${profit.toFixed(2)}</p>
                    </div>

                    {/* Divider Horizontal */}
                    <div className="w-8 h-px bg-indigo-100 my-1"></div>

                    {/* Margen */}
                    <div className="text-center">
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Margen</p>
                      <p className={`text-2xl font-black ${margin >= 30 ? 'text-emerald-500' : margin > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                        {margin.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen de Variante en el formulario principal */}
            {formData.sellingMode !== 'simple' && (
              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex items-center gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                  {formData.sellingMode === 'weight' ? <Scale className="w-4 h-4" /> : <Box className="w-4 h-4" />}
                </div>
                <div className="text-xs">
                  <span className="font-bold text-indigo-900 block">
                    {formData.sellingMode === 'weight' ? `Venta por ${formData.measurementUnit}` : `Venta por Paquete (x${formData.unitsPerPackage})`}
                  </span>
                  {formData.sellingMode === 'package' && (
                    <span className="text-indigo-500">Unidad suelta: ${formData.pricePerUnit?.toFixed(2)}</span>
                  )}
                </div>
                <button type="button" onClick={() => setIsVariantConfigOpen(true)} className="ml-auto text-xs font-bold text-indigo-600 underline">Editar</button>
              </div>
            )}

            <div className="pt-4 flex gap-3 mt-auto">
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
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

// Simple Info Icon component locally
const InfoIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
);

export default Inventory;
