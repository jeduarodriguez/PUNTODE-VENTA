
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;      // Selling price in USD
  costPrice: number;  // Purchase price (cost) in USD
  stock: number;
  image?: string;
  description?: string;
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

export type View = 'pos' | 'inventory' | 'reports' | 'customers' | 'settings';
