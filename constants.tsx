
import React from 'react';
import { Product, Customer, Sale } from './types';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Settings, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Minus,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  CreditCard,
  Users,
  UserPlus,
  History,
  Wallet,
  PiggyBank,
  TrendingDown,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  Cloud,
  CloudOff,
  Globe,
  Smartphone,
  QrCode,
  Rocket,
  Info,
  ExternalLink,
  Check,
  Copy,
  RefreshCw,
  X,
  Download,
  XCircle,
  Monitor,
  Lock,
  Unlock,
  MousePointer2,
  // Added icons for Deployment guide
  Terminal,
  Play,
  Banknote,
  // Added icons for Customers
  ChevronDown,
  ChevronUp,
  // Added icons for missing exports
  ArrowRight,
  Calendar,
  ArrowLeft,
  Building,
  Clock,
  Share // New icon for iOS instructions
} from 'lucide-react';

// Initial products for the demo with costPrice added
export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Café Espresso', category: 'Bebidas', price: 2.50, costPrice: 0.80, stock: 50, image: 'https://picsum.photos/seed/coffee/200' },
  { id: '2', name: 'Croissant', category: 'Panadería', price: 1.80, costPrice: 0.60, stock: 20, image: 'https://picsum.photos/seed/bread/200' },
  { id: '3', name: 'Sándwich Jamón y Queso', category: 'Comida', price: 4.50, costPrice: 2.10, stock: 15, image: 'https://picsum.photos/seed/sandwich/200' },
  { id: '4', name: 'Té Matcha', category: 'Bebidas', price: 3.20, costPrice: 1.10, stock: 30, image: 'https://picsum.photos/seed/tea/200' },
  { id: '5', name: 'Muffin de Arándanos', category: 'Panadería', price: 2.20, costPrice: 0.90, stock: 25, image: 'https://picsum.photos/seed/muffin/200' },
];

// Datos iniciales de clientes para que no aparezca vacío
export const INITIAL_CUSTOMERS: Customer[] = [
  { 
    id: 'c1', 
    name: 'Maria Rodriguez', 
    phone: '0414-1234567', 
    balance: 15.00, 
    createdAt: Date.now() - 86400000 
  },
  { 
    id: 'c2', 
    name: 'Inversiones Los Andes', 
    phone: '0412-7654321', 
    balance: 0, 
    createdAt: Date.now() - 172800000 
  },
  { 
    id: 'c3', 
    name: 'Carlos Perez', 
    phone: '0424-5555555', 
    balance: 4.50, 
    createdAt: Date.now() - 43200000 
  }
];

// Datos iniciales de ventas para tener reportes de ejemplo
export const INITIAL_SALES: Sale[] = [
  {
    id: 's1',
    timestamp: Date.now() - 3600000, // Hace 1 hora
    items: [
      { id: '1', name: 'Café Espresso', category: 'Bebidas', price: 2.50, costPrice: 0.80, stock: 50, quantity: 2 },
      { id: '2', name: 'Croissant', category: 'Panadería', price: 1.80, costPrice: 0.60, stock: 20, quantity: 1 }
    ],
    total: 6.80,
    exchangeRate: 40,
    paymentMethod: 'Cash'
  },
  {
    id: 's2',
    timestamp: Date.now() - 7200000, // Hace 2 horas
    items: [
      { id: '3', name: 'Sándwich Jamón y Queso', category: 'Comida', price: 4.50, costPrice: 2.10, stock: 15, quantity: 1 }
    ],
    total: 4.50,
    exchangeRate: 40,
    paymentMethod: 'Credit',
    customerId: 'c3' // Carlos Perez
  }
];

export const CATEGORIES = ['Todas', 'Bebidas', 'Panadería', 'Comida', 'Snacks'];

export { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Settings, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Minus,
  CheckCircle2, 
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  CreditCard,
  Users,
  UserPlus,
  History,
  Wallet,
  PiggyBank,
  TrendingDown,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  Cloud,
  CloudOff,
  Globe,
  Smartphone,
  QrCode,
  Rocket,
  Info,
  ExternalLink,
  Check,
  Copy,
  RefreshCw,
  X,
  Download,
  XCircle,
  Monitor,
  Lock,
  Unlock,
  MousePointer2,
  Terminal,
  Play,
  Banknote,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Calendar,
  ArrowLeft,
  Building,
  Clock,
  Share
};
