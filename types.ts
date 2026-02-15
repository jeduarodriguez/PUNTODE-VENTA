  
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost_price: number;
  stock: number;
  image?: string;
  description?: string;

  // Campos para Variantes/Modos de Venta
  selling_mode?: 'simple' | 'weight' | 'package';
  measurement_unit?: 'kg' | 'g' | 'l' | 'ml' | 'm';
  units_per_package?: number;
  price_per_unit?: number;
  remaining_units?: number;
  
  // Aliases para compatibilidad con datos existentes
  costPrice?: number;
  sellingMode?: 'simple' | 'weight' | 'package';
  measurementUnit?: 'kg' | 'g' | 'l' | 'ml' | 'm';
  unitsPerPackage?: number;
  pricePerUnit?: number;
  remainingUnits?: number;
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

export interface Worker {
  id: string;
  name: string;
  position: string; // Cargo
  salary: number; // Salario en dólares
  payDay: string; // Día de pago (Lunes, Martes, etc.)
  balance: number; // Deuda actual por compras a crédito en USD
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
