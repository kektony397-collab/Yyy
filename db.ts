
import Dexie from 'dexie';
import type { Table } from 'dexie';
import { Product, Party, Invoice, CompanyProfile } from './types';

/**
 * AppDatabase class extending Dexie to manage the local database.
 */
export class AppDatabase extends Dexie {
  products!: Table<Product>;
  parties!: Table<Party>;
  invoices!: Table<Invoice>;
  settings!: Table<CompanyProfile>;

  constructor() {
    super('GopiDistributorsDB');
    
    // IMPORTANT: Versions must be defined in chronological order to avoid errors.
    
    // Version 1: Initial schema
    (this as any).version(1).stores({
      products: '++id, name, hsn, batch',
      parties: '++id, name, gstin',
      invoices: '++id, invoiceNo, date, partyId',
      settings: '++id'
    });

    // Version 2: Added indexing for accurate search fields (barcode, category) and party fields
    // Dexie will handle the schema upgrade automatically
    (this as any).version(2).stores({
      products: '++id, name, hsn, batch, barcode, category',
      parties: '++id, name, gstin, phone, type, isFavorite',
      invoices: '++id, invoiceNo, date, partyId',
      settings: '++id'
    });
  }
}

export const db = new AppDatabase();

export const seedDatabase = async () => {
  try {
    const settingsCount = await db.settings.count();
    if (settingsCount === 0) {
      await db.settings.add({
        companyName: 'GOPI DISTRIBUTOR',
        addressLine1: '74/20/4, Navyug Colony',
        addressLine2: 'Bhulabhai Park Crossroad, Ahmedabad–22',
        gstin: '24AADPO7411Q1ZE',
        dlNo1: 'GJ-ADC-AA/1946',
        dlNo2: 'GJ-ADC-AA/4967',
        dlNo3: 'GJ-ADC-AA/1953',
        dlNo4: 'GJ-ADC-AA/4856',
        phone: '07925383834, 8460143984',
        email: 'info@gopidistributor.com',
        terms: 'Bill No. is must while returning EXP. Products\nE.&.O.E.',
        theme: 'blue',
        platform: 'windows', // Default to windows style
        darkMode: 'system',
        invoiceTemplate: 'authentic',
        useDefaultGST: true,
        defaultGSTRate: 5
      });
    }
  } catch (error) {
    console.error("Database seeding failed:", error);
  }
};
