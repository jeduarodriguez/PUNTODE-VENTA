
import React from 'react';
import { ShoppingCart, Package, Users, Banknote, Settings } from '../constants';
import { View } from '../types';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const menuItems = [
    { id: 'reports', icon: Banknote, label: 'Ventas (Caja)' },
    { id: 'inventory', icon: Package, label: 'Inventario' },
    { id: 'customers', icon: Users, label: 'Clientes' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 hidden md:flex flex-col shadow-sm">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
          <ShoppingCart className="w-8 h-8" />
          Pointy
        </h1>
      </div>
      <nav className="flex-1 mt-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as View)}
            className={`w-full flex items-center gap-4 px-6 py-4 text-sm font-medium transition-colors ${
              activeView === item.id
                ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-6 border-t border-gray-100">
        <button 
           onClick={() => onViewChange('settings')}
           className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeView === 'settings' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
        >
           <Settings className="w-5 h-5" />
           Ajustes
        </button>
        <p className="text-[10px] text-gray-300 mt-4 text-center">v1.3.0 &copy; 2024 Pointy POS</p>
      </div>
    </aside>
  );
};

export default Sidebar;
