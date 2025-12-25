
export enum GSTRate {
  GST_0 = 0,
  GST_5 = 5,
  GST_12 = 12,
  GST_18 = 18,
  GST_28 = 28,
}

export type AppTheme = 'blue' | 'green' | 'purple' | 'dark';
export type AppPlatform = 'windows' | 'android';
export type InvoiceTemplate = 'standard' | 'modern' | 'thermal' | 'authentic';

export interface CompanyProfile {
  id?: number;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  gstin: string;
  dlNo1: string; 
  dlNo2: string; 
  dlNo3?: string;
  dlNo4?: string;
  phone: string;
  email: string;
  terms: string;
  theme?: AppTheme;
  platform?: AppPlatform; // New: UI Platform
  darkMode?: 'system' | 'light' | 'dark'; // New: Dark mode preference
  invoiceTemplate?: InvoiceTemplate;
  useDefaultGST?: boolean;
  defaultGSTRate?: number;
}

export interface Product {
  id?: number;
  name: string;
  batch: string;
  expiry: string; 
  hsn: string;
  gstRate: number;
  mrp: number;
  oldMrp?: number;
  purchaseRate: number;
  saleRate: number;
  stock: number;
  manufacturer?: string;
  category?: string; // New for accurate search
  barcode?: string; // New for accurate search
}

export interface Party {
  id?: number;
  name: string;
  gstin: string;
  address: string;
  phone: string;
  email?: string;
  dlNo1?: string; 
  dlNo2?: string; 
  type?: 'WHOLESALE' | 'RETAIL';
  stateCode?: string;
  creditLimit?: number; // New
  outstandingBalance?: number; // New
  notes?: string; // New
  isFavorite?: boolean; // New
}

export interface InvoiceItem extends Product {
  productId: number;
  quantity: number;
  freeQuantity: number;
  discountPercent: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id?: number;
  invoiceNo: string;
  date: string; 
  invoiceType: 'WHOLESALE' | 'RETAIL';
  partyId: number;
  partyName: string;
  partyGstin: string;
  partyAddress: string;
  partyStateCode?: string;
  grNo?: string;
  vehicleNo?: string;
  transport?: string;
  items: InvoiceItem[];
  totalTaxable: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  grandTotal: number;
  roundOff: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
}

export interface DashboardStats {
  totalSales: number;
  totalInvoices: number;
  lowStockItems: number;
  expiringSoonItems: number;
}
