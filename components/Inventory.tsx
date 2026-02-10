
import React, { useState } from 'react';
import { Product } from '../types';
import { Plus, Trash2, Edit, Search, CATEGORIES, DollarSign, TrendingDown, Filter, ArrowUpDown, PiggyBank, ShoppingBag, TrendingUp, Package } from '../constants';

interface InventoryProps {
  products: Product[];
  onAdd: (product: Product) => void;
  onUpdate: (product: Product) => void;
  onDelete: (id: string) => void;
}

type FilterStatus = 'all' | 'low-stock' | 'out-of-stock';
type SortBy = 'name' | 'price-high' | 'price-low' | 'stock-high' | 'stock-low' | 'margin-high';

const Inventory: React.FC<InventoryProps> = ({ products, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
    image: ''
  });

  const totalCostValue = products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);
  const totalRetailValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const totalPotentialProfit = totalRetailValue - totalCostValue;
  const avgMargin = totalCostValue > 0 ? (totalPotentialProfit / totalCostValue) * 100 : 0;

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
      image: formData.image || `https://picsum.photos/seed/${Math.random()}/200`
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
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: 'Bebidas',
        price: 0,
        costPrice: 0,
        stock: 0,
        description: '',
        image: `https://picsum.photos/seed/${Math.random()}/200`
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                <Package className="w-6 h-6 text-indigo-600" />
                Inventario
            </h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Gestión total de mercancía</p>
          </div>
          <button
            onClick={() => openModal()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 text-xs font-black uppercase tracking-widest"
          >
            <Plus className="w-5 h-5" />
            Añadir Producto
          </button>
        </div>

        {/* Estadísticas Compactas */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
              <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
              <span className="text-[8px] font-black text-gray-400 uppercase truncate">Inversión</span>
            </div>
            <p className="text-sm sm:text-lg font-black text-gray-800 leading-tight">${totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
              <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[8px] font-black text-gray-400 uppercase truncate">Valor</span>
            </div>
            <p className="text-sm sm:text-lg font-black text-gray-800 leading-tight">${totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
          </div>
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100 text-white flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
              <PiggyBank className="w-3 h-3 text-indigo-200 shrink-0" />
              <span className="text-[8px] font-black text-indigo-200 uppercase truncate">Utilidad</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-sm sm:text-lg font-black leading-tight">${totalPotentialProfit.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="BUSCAR..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs shadow-sm text-black font-black uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select 
              className="flex-1 pl-4 pr-8 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none shadow-sm cursor-pointer text-gray-600"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            >
              <option value="all">TODOS</option>
              <option value="low-stock">BAJO STOCK</option>
              <option value="out-of-stock">AGOTADOS</option>
            </select>
            
            <select 
              className="flex-1 pl-4 pr-8 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none shadow-sm cursor-pointer text-gray-600"
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
      </div>

      {/* Lista de Productos Estilo Carrito */}
      <div className="space-y-3">
        {filteredProducts.map(product => {
          const utility = product.price - product.costPrice;
          return (
            <div 
              key={product.id} 
              onClick={() => openModal(product)}
              className="bg-white px-5 py-4 rounded-[1.5rem] border border-gray-100 flex items-center justify-between shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
            >
              {/* IZQUIERDA: Nombre y Categoría */}
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <h3 className="font-black text-gray-800 text-base leading-tight uppercase truncate pr-4">{product.name}</h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.category}</span>
              </div>

              {/* CENTRO: Stock */}
              <div className="mx-4 flex-shrink-0">
                 <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-gray-300 uppercase leading-none mb-1">Stock</span>
                    <span className={`text-sm font-black px-4 py-1.5 rounded-xl shadow-inner ${product.stock < 10 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                        {product.stock}
                    </span>
                 </div>
              </div>

              {/* DERECHA: Precios y Acciones */}
              <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end flex-shrink-0 min-w-[90px]">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">P. Venta</span>
                        <span className="text-lg font-black text-indigo-700 leading-none">${product.price.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col items-end mt-1.5">
                        <span className="text-[8px] font-bold text-gray-300 uppercase leading-none">Costo: ${product.costPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="hidden sm:flex flex-col gap-1">
                      <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit className="w-4 h-4"/></button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(product.id); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center justify-center opacity-30 gap-4">
                <Package className="w-16 h-16" />
                <p className="text-xs font-black uppercase tracking-widest">Sin coincidencias en el inventario</p>
            </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100] backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-black text-gray-900">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
              <button onClick={closeModal} className="text-gray-400 text-3xl font-light hover:text-black">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nombre Comercial</label>
                  <input
                    required
                    autoFocus
                    placeholder="Ej. Café Molido 1kg"
                    className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all text-sm font-bold"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoría</label>
                    <select
                      className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 outline-none text-sm font-bold cursor-pointer focus:border-indigo-500 transition-all"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Stock Actual</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none text-sm font-bold focus:border-indigo-500 transition-all"
                      value={formData.stock || ''}
                      onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1 flex items-center gap-1">
                       Costo Unitario ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none text-sm font-bold focus:border-indigo-500 transition-all"
                      value={formData.costPrice || ''}
                      placeholder="0.00"
                      onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-1 flex items-center gap-1">
                       Precio Venta ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none text-sm font-bold focus:border-indigo-500 transition-all"
                      value={formData.price || ''}
                      placeholder="0.00"
                      onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

              <div className="pt-4 flex gap-3">
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

export default Inventory;
