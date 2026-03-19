
import React, { useState, useMemo, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    TrendingUp, DollarSign, ShoppingBag,
    Users, Package,
    PieChart as PieChartIcon, BarChart3, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Sale, Product, Customer } from '../types';

interface DashboardProps {
    sales: Sale[];
    products: Product[];
    customers: Customer[];
    exchangeRate: number;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type DateFilter = 'today' | 'week' | 'month' | 'custom';

const getMeasurementUnit = (p: Product) => (p.measurement_unit || (p as any).measurementUnit || 'kg').toLowerCase();

const toBase = (qty: number, unit?: string): number => {
    if (!unit) return qty;
    const u = unit.toLowerCase();
    if (u === 'g' || u === 'ml') return qty / 1000;
    if (u === 'cm') return qty / 100;
    if (u === 'mg') return qty / 1000000;
    return qty;
};

const Dashboard: React.FC<DashboardProps> = ({ sales, products, customers, exchangeRate }) => {

    const [dateFilter, setDateFilter] = useState<DateFilter>(() => {
      const saved = localStorage.getItem('pointy_date_filter');
      return (saved as DateFilter) || 'today';
    });
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [quickNavOffset, setQuickNavOffset] = useState(0);

    useEffect(() => {
      localStorage.setItem('pointy_date_filter', dateFilter);
    }, [dateFilter]);

    const getSelectedDate = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        if (dateFilter === 'today') {
            const targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + quickNavOffset);
            const targetTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
            if (targetTime > today) return now;
            return targetDate;
        } else if (dateFilter === 'week') {
            const targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + quickNavOffset * 7);
            return targetDate;
        } else if (dateFilter === 'month') {
            const targetDate = new Date(now.getFullYear(), now.getMonth() + quickNavOffset, 1);
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
            const dayOfWeek = currentWeekStart.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            currentWeekStart.setDate(currentWeekStart.getDate() + mondayOffset + (quickNavOffset * 7));
            const currentWeekEnd = new Date(currentWeekStart);
            currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
            return [{
                label: `${fullDays[currentWeekStart.getDay()]} ${currentWeekStart.getDate().toString().padStart(2, '0')}/${(currentWeekStart.getMonth() + 1).toString().padStart(2, '0')} - ${fullDays[currentWeekEnd.getDay()]} ${currentWeekEnd.getDate().toString().padStart(2, '0')}/${(currentWeekEnd.getMonth() + 1).toString().padStart(2, '0')}`,
                startDate: new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate()).getTime(),
                endDate: new Date(currentWeekEnd.getFullYear(), currentWeekEnd.getMonth(), currentWeekEnd.getDate()).getTime()
            }];
        } else if (dateFilter === 'month') {
            const currentMonthDate = new Date(now.getFullYear(), now.getMonth() + quickNavOffset, 1);
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
            return targetTime > today;
        } else if (dateFilter === 'week') {
            const currentWeekStart = new Date(now);
            const dayOfWeek = currentWeekStart.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            currentWeekStart.setDate(currentWeekStart.getDate() + mondayOffset + (quickNavOffset * 7));
            const weekTime = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate()).getTime();
            return weekTime > today;
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
                const dayOfWeek = weekStart.getDay();
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                weekStart.setDate(weekStart.getDate() + mondayOffset);
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

    const filteredSales = useMemo(() => {
        return sales.filter(s => s.timestamp >= filterStart && s.timestamp <= filterEnd);
    }, [sales, filterStart, filterEnd]);

    const stats = useMemo(() => {
        const totalSalesUSD = filteredSales.reduce((acc, sale) => acc + sale.total, 0);
        const totalSalesBS = filteredSales.reduce((acc, sale) => acc + (sale.total * sale.exchangeRate), 0);

        // Usar utilityAtSale guardado en cada item (calculado al momento de la venta)
        let totalProfitUSD = 0;
        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                // Si tiene utilityAtSale guardado, usarlo directamente
                if (item.utilityAtSale !== undefined) {
                    totalProfitUSD += item.utilityAtSale;
                } else {
                    // Compatibilidad con ventas antiguas sin utilityAtSale
                    const prod = products.find(p => p.id === item.id) || products.find(p => p.id === item.id.replace('-unit', ''));
                    if (!prod) return;

                    const sellingMode = prod.selling_mode || (prod as any).sellingMode || 'simple';
                    const measurementUnit = getMeasurementUnit(prod);
                    
                    let costAtSale = item.costAtSale;
                    
                    if (costAtSale === undefined) {
                        costAtSale = prod.cost_price || 0;
                        if (item.id.endsWith('-unit')) {
                            const unitsPerPkg = prod.units_per_package || (prod as any).unitsPerPackage || 1;
                            costAtSale = costAtSale / unitsPerPkg;
                        }
                    }

                    if (costAtSale > 0) {
                        const normalizedQty = sellingMode === 'weight' ? toBase(item.quantity, measurementUnit) : item.quantity;
                        totalProfitUSD += (item.price - costAtSale) * normalizedQty;
                    }
                }
            });
        });

        const avgTicket = filteredSales.length > 0 ? totalSalesUSD / filteredSales.length : 0;
        const marginPercent = totalSalesUSD > 0 ? (totalProfitUSD / totalSalesUSD) * 100 : 0;

        return {
            totalSalesUSD,
            totalSalesBS,
            totalProfitUSD,
            avgTicket,
            salesCount: filteredSales.length,
            customersCount: customers.length,
            productsCount: products.length,
            marginPercent
        };
    }, [filteredSales, products, customers]);

    const lineChartData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        return last7Days.map(date => {
            const daySales = filteredSales.filter(s => new Date(s.timestamp).toISOString().split('T')[0] === date);
            const total = daySales.reduce((acc, s) => acc + s.total, 0);
            return {
                name: date.split('-').slice(1).join('/'),
                ventas: total
            };
        });
    }, [filteredSales]);

    const pieData = useMemo(() => {
        const categoryTotals: Record<string, number> = {};
        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                const prod = products.find(p => p.id === item.id);
                const cat = prod?.category || 'Otros';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + (item.price * item.quantity);
            });
        });

        return Object.entries(categoryTotals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [filteredSales, products]);

    const barData = useMemo(() => {
        const productSales: Record<string, number> = {};
        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
            });
        });

        return Object.entries(productSales)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
    }, [filteredSales]);

    return (
        <div className="space-y-6 pb-24 animate-fade-in">

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">Tablero de Control</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Visión General del Negocio</p>
                </div>
            </div>

            {/* FILTRO DE FECHAS */}
            <div className="bg-indigo-900 text-white p-3 rounded-xl shadow-xl relative">
                <div className="flex items-center justify-between gap-2 relative z-10">
                    {/* FLECHA IZQUIERDA */}
                    <button onClick={() => setQuickNavOffset(prev => prev - 1)} className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors shrink-0 active:scale-95">
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    
                    {/* FILTRO CENTRAL */}
                    <div className="flex-1 select-none flex justify-center min-w-0">
                        <div className="relative w-full max-w-[200px] sm:max-w-[240px]">
                            <button 
                                onClick={() => setShowFilterDropdown(!showFilterDropdown)} 
                                className="w-full py-2 px-2 sm:px-3 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
                            >
                                <span className="text-xs sm:text-sm font-bold text-white truncate">{getQuickNavItems().map(item => item.label).join(' - ')}</span>
                            </button>

                            {/* DROPDOWN MENU */}
                            {showFilterDropdown && (
                                <>
                                    <div className="fixed inset-0 z-[60]" onClick={() => setShowFilterDropdown(false)}></div>
                                    <div className="absolute top-[110%] left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl shadow-indigo-500/20 z-[70] w-64 p-2.5 border border-indigo-50 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                        <div className="space-y-1.5">
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
                                                    className={`w-full px-4 py-3 text-sm font-bold rounded-xl text-left transition-all ${
                                                        dateFilter === opt.value
                                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-1'
                                                            : 'bg-transparent text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:translate-x-1'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* FLECHA DERECHA */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button 
                            onClick={() => setQuickNavOffset(prev => prev + 1)} 
                            disabled={canNavigateForward()}
                            className={`p-2 sm:p-3 rounded-xl transition-colors active:scale-95 ${canNavigateForward() ? 'bg-white/5 opacity-30 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'}`}
                        >
                            <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-40 pointer-events-none"></div>

                {/* MODAL CUSTOM DATE PICKER */}
                {showCustomDatePicker && (
                    <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCustomDatePicker(false)}>
                        <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
                            <h3 className="font-black text-gray-900 mb-5 text-center text-sm uppercase tracking-wider">Rango de Fechas</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Desde</label>
                                    <input type="date" max={getTodayString()} className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none rounded-xl text-sm font-bold mt-1 transition-all" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Hasta</label>
                                    <input type="date" max={getTodayString()} className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none rounded-xl text-sm font-bold mt-1 transition-all" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <button onClick={() => { setShowCustomDatePicker(false); setDateFilter('today'); setCustomStartDate(''); setCustomEndDate(''); }} className="py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase transition-colors active:scale-95">Cancelar</button>
                                <button onClick={() => { if (customStartDate && customEndDate) { setDateFilter('custom'); setQuickNavOffset(0); } setShowCustomDatePicker(false); }} className="py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/30 rounded-xl font-bold text-xs uppercase transition-all active:scale-95">Aplicar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Ventas */}
                <div className="bg-indigo-600 text-white p-5 rounded-[2rem] shadow-lg relative overflow-hidden">
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-none mb-2">Ventas Totales</p>
                    <p className="text-2xl font-black text-white leading-tight">{stats.totalSalesBS.toLocaleString('es-CO', { maximumFractionDigits: 0 })} Bs</p>
                    <p className="text-lg font-black text-indigo-200 mt-1">${stats.totalSalesUSD.toFixed(2)}</p>
                </div>

                {/* Utilidad */}
                <div className="bg-emerald-500 text-white p-5 rounded-[2rem] shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest leading-none">Utilidad Est.</p>
                        <span className="text-[10px] font-black text-emerald-200 bg-white/20 px-2 py-1 rounded-lg">+{stats.marginPercent.toFixed(0)}%</span>
                    </div>
                    <p className="text-2xl font-black text-white leading-tight">{Math.round(stats.totalProfitUSD * exchangeRate).toLocaleString('es-CO', { maximumFractionDigits: 0 })} Bs</p>
                    <p className="text-lg font-black text-emerald-100 mt-1">${stats.totalProfitUSD.toFixed(2)}</p>
                </div>

                {/* Ticket Promedio */}
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="bg-orange-100 w-10 h-10 rounded-xl flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Ticket Prom.</p>
                    <p className="text-xl font-black text-gray-900 leading-tight">${stats.avgTicket.toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-gray-400 mt-1">{stats.salesCount} Ventas</p>
                </div>

                {/* Clientes */}
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="bg-blue-100 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                        <Users className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Clientes</p>
                    <p className="text-xl font-black text-gray-900 leading-tight">{stats.customersCount}</p>
                    <p className="text-[9px] font-bold text-gray-400 mt-1">{stats.productsCount} Productos</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Gráfico de Tendencia */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                            <BarChart3 className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Tendencia de Ventas ($)</h3>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9ca3af' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9ca3af' }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    labelStyle={{ fontWeight: 'black', marginBottom: '4px', fontSize: '10px', color: '#111827' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="ventas"
                                    stroke="#6366f1"
                                    strokeWidth={4}
                                    dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 8, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico de Categorías */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                            <PieChartIcon className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Ventas por Categoría</h3>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    align="center"
                                    iconType="circle"
                                    formatter={(value) => <span className="text-[10px] font-black text-gray-500 uppercase ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Productos */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                                <Package className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Más Vendidos (Cantidad)</h3>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    width={120}
                                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#4b5563' }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f3f4f6', radius: 10 }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="qty" radius={[0, 10, 10, 0]}>
                                    {barData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            <style>{`
        @keyframes fade-in { 
          from { opacity: 0; transform: translateY(10px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
        </div>
    );
};

export default Dashboard;
