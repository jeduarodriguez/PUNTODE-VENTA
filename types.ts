
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;      // Selling price in USD (Precio Principal / Paquete Completo)
  costPrice: number;  // Purchase price (cost) in USD
  stock: number;
  image?: string;
  description?: string;

  // Nuevos campos para Variantes/Modos de Venta
  sellingMode?: 'simple' | 'weight' | 'package';
  measurementUnit?: 'kg' | 'g' | 'l' | 'ml' | 'm'; // Para venta por peso/volumen
  unitsPerPackage?: number; // Cuantas unidades trae el paquete (si es modo paquete)
  pricePerUnit?: number;    // Precio de venta de la unidad suelta (si es modo paquete)
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  balance: number; // Current debt in USD
  createdAt: number;
}

export interface Sale {
  id: string;
  timestamp: number;
  items: CartItem[];
  total: number; // Total in USD
  exchangeRate: number; // Rate used at the time of sale
  paymentMethod: 'Cash' | 'Card' | 'Credit' | 'PagoMovil';
  customerId?: string;
}

export interface ExchangeRateRecord {
  id: string;
  rate: number;
  timestamp: number;
}

export interface Shift {
  id: string;
  startTime: number;
  initialCash: number;
  status: 'open' | 'closed';
}

export interface TreasuryTransaction {
  id: string;
  timestamp: number;
  type: 'income' | 'expense';
  category: string;
  amount: number; // Amount in USD (base reference)
  amountBs: number; // Amount in Bs at time of transaction
  exchangeRate: number;
  description: string;
  method: 'Cash' | 'Transfer' | 'PagoMovil' | 'Zelle/Intl' | 'Card' | 'PointOfSale' | 'Credit';
}

export type View = 'pos' | 'inventory' | 'reports' | 'customers' | 'settings' | 'treasury' | 'dashboard';
