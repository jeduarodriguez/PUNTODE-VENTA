
import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, ShoppingBag,
    Users, Package, ArrowUpRight, ArrowDownRight,
    PieChart as PieChartIcon, BarChart3, Calendar
} from 'lucide-react';
import { Sale, Product, Customer } from '../types';

interface DashboardProps {
    sales: Sale[];
    products: Product[];
    customers: Customer[];
    exchangeRate: number;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC<DashboardProps> = ({ sales, products, customers, exchangeRate }) => {

    // --- PROCESAMIENTO DE DATOS ---

    const stats = useMemo(() => {
        const totalSalesUSD = sales.reduce((acc, sale) => acc + sale.total, 0);
        const totalSalesBS = sales.reduce((acc, sale) => acc + (sale.total * sale.exchangeRate), 0);

        // Utilidad estimada (Venta - Costo)
        let totalProfitUSD = 0;
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const prod = products.find(p => p.id === item.id);
                if (prod && prod.costPrice) {
                    totalProfitUSD += (item.price - prod.costPrice) * item.quantity;
                }
            });
        });

        const avgTicket = sales.length > 0 ? totalSalesUSD / sales.length : 0;

        return {
            totalSalesUSD,
            totalSalesBS,
            totalProfitUSD,
            avgTicket,
            salesCount: sales.length,
            customersCount: customers.length,
            productsCount: products.length
        };
    }, [sales, products, customers]);

    // Datos para gráfico de líneas (Ventas por día - últimos 7 días)
    const lineChartData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        return last7Days.map(date => {
            const daySales = sales.filter(s => new Date(s.timestamp).toISOString().split('T')[0] === date);
            const total = daySales.reduce((acc, s) => acc + s.total, 0);
            return {
                name: date.split('-').slice(1).join('/'),
                ventas: total
            };
        });
    }, [sales]);

    // Datos para gráfico de Tortas (Ventas por Categoría)
    const pieData = useMemo(() => {
        const categoryTotals: Record<string, number> = {};
        sales.forEach(sale => {
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
    }, [sales, products]);

    // Datos para gráfico de barras (Top 5 Productos)
    const barData = useMemo(() => {
        const productSales: Record<string, number> = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
            });
        });

        return Object.entries(productSales)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
    }, [sales]);

    return (
        <div className="space-y-6 pb-24 animate-fade-in">

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">Tablero de Control</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Visión General del Negocio</p>
                </div>
                <div className="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-black text-indigo-700 uppercase">Últimos 7 días</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Ventas */}
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="bg-indigo-100 w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Ventas Totales</p>
                    <p className="text-xl font-black text-gray-900 leading-tight">${stats.totalSalesUSD.toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-gray-400 mt-1">{stats.totalSalesBS.toLocaleString()} Bs</p>
                    <div className="absolute -right-2 -bottom-2 opacity-5">
                        <TrendingUp className="w-20 h-20 text-indigo-600" />
                    </div>
                </div>

                {/* Utilidad */}
                <div className="bg-emerald-500 text-white p-5 rounded-[2rem] shadow-lg shadow-emerald-100 relative overflow-hidden group">
                    <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 group-hover:rotate-12 transition-transform">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest leading-none mb-2">Utilidad Est.</p>
                    <p className="text-xl font-black text-white leading-tight">${stats.totalProfitUSD.toFixed(2)}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <ArrowUpRight className="w-3 h-3 text-emerald-200" />
                        <span className="text-[9px] font-bold text-emerald-100">+{((stats.totalProfitUSD / stats.totalSalesUSD || 0) * 100).toFixed(0)}% de margen</span>
                    </div>
                </div>

                {/* Ticket Promedio */}
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="bg-orange-100 w-10 h-10 rounded-xl flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Ticket Prom.</p>
                    <p className="text-xl font-black text-gray-900 leading-tight">${stats.avgTicket.toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-gray-400 mt-1">{stats.salesCount} Ventas registradas</p>
                </div>

                {/* Clientes */}
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="bg-blue-100 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                        <Users className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Clientes</p>
                    <p className="text-xl font-black text-gray-900 leading-tight">{stats.customersCount}</p>
                    <p className="text-[9px] font-bold text-gray-400 mt-1">{stats.productsCount} Productos en stock</p>
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
