
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import { db } from '../db';
import { Product, GSTRate } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Upload, Trash2, Edit2, X, Loader2, Database, FileSpreadsheet, Zap, ScanBarcode } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

export const Inventory: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [stats, setStats] = useState({ processed: 0, total: 0 });
  const [searchMode, setSearchMode] = useState<'fast' | 'accurate'>('fast');
  
  // Use debounced search term for querying DB
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const products = useLiveQuery(
    async () => {
      if (!debouncedSearch) return db.products.orderBy('name').limit(100).toArray();

      const term = debouncedSearch.toLowerCase();

      if (searchMode === 'fast') {
        // Fast: Partial matches on Name or Batch (OR condition)
        // Note: Dexie OR queries are efficient but limited without full indexing
        return db.products
          .filter(p => p.name.toLowerCase().includes(term) || p.batch.toLowerCase().includes(term))
          .limit(100)
          .toArray();
      } else {
        // Accurate: Exact/Prefix match on Name, Barcode, HSN, Category
        // Checking specific fields rigorously
        return db.products
          .filter(p => 
            p.name.toLowerCase().startsWith(term) || 
            p.hsn === term || 
            (p.barcode && p.barcode.toLowerCase() === term) ||
            (p.category && p.category.toLowerCase() === term)
          )
          .limit(100)
          .toArray();
      }
    },
    [debouncedSearch, searchMode]
  );

  const { register, handleSubmit, reset, setValue } = useForm<Product>();

  useEffect(() => {
    if (editingProduct) {
      Object.keys(editingProduct).forEach((key) => {
        setValue(key as keyof Product, (editingProduct as any)[key]);
      });
    } else {
      reset({ gstRate: GSTRate.GST_12 });
    }
  }, [editingProduct, setValue, reset]);

  const onSubmit = async (data: Product) => {
    try {
      const formattedData = {
        ...data,
        mrp: Number(data.mrp),
        oldMrp: Number(data.oldMrp || data.mrp),
        purchaseRate: Number(data.purchaseRate),
        saleRate: Number(data.saleRate),
        stock: Number(data.stock),
        gstRate: Number(data.gstRate),
      };

      if (editingProduct?.id) {
        await db.products.update(editingProduct.id, formattedData);
        toast.success('Product updated');
      } else {
        await db.products.add(formattedData);
        toast.success('Product added');
      }
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (e) { toast.error('Error saving product'); }
  };

  // --- Intelligent Import Logic ---
  const getCellValue = (row: any, synonyms: string[]): any => {
    const keys = Object.keys(row);
    for (const s of synonyms) {
      const target = s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === target);
      if (match) return row[match];
    }
    return null;
  };

  const formatExcelDate = (val: any): string => {
    if (!val) return '2026-01-01';
    if (typeof val === 'number') {
      const date = new Date((val - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    return String(val).trim();
  };

  const cleanNumber = (val: any, fallback = 0): number => {
    if (val === null || val === undefined) return fallback;
    const cleaned = String(val).replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? fallback : num;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        const workbook = XLSX.read(dataBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          setIsImporting(false);
          return toast.error('Excel file is empty');
        }

        setStats({ processed: 0, total: jsonData.length });

        const CHUNK_SIZE = 1000;
        const totalRows = jsonData.length;
        
        for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
          const chunk = jsonData.slice(i, i + CHUNK_SIZE).map((row: any) => {
            const mrp = cleanNumber(getCellValue(row, ['MRP', 'M.R.P.', 'Max Retail Price', 'Retail Price']));
            const saleRate = cleanNumber(getCellValue(row, ['Sale Rate', 'Rate', 'Billing Rate', 'S.Rate', 'Selling Rate']));
            
            return {
              name: String(getCellValue(row, ['Item Name', 'Description', 'Product', 'Medicine', 'Particulars', 'Name']) || 'Item'),
              batch: String(getCellValue(row, ['Batch', 'B.No', 'Lot No', 'Batch No']) || 'N/A'),
              expiry: formatExcelDate(getCellValue(row, ['Expiry', 'Exp', 'Exp Date', 'Validity'])),
              hsn: String(getCellValue(row, ['HSN', 'HSN Code', 'SAC']) || '3004'),
              gstRate: cleanNumber(getCellValue(row, ['GST', 'GST%', 'Tax%', 'IGST']), 12),
              mrp: mrp,
              oldMrp: cleanNumber(getCellValue(row, ['Old MRP', 'Previous MRP']), mrp),
              purchaseRate: cleanNumber(getCellValue(row, ['Purchase Rate', 'P.Rate', 'Cost Price', 'P.Price'])),
              saleRate: saleRate,
              stock: cleanNumber(getCellValue(row, ['Stock', 'Qty', 'Quantity', 'Balance', 'In Stock'])),
              manufacturer: String(getCellValue(row, ['Manufacturer', 'Mfg', 'Company', 'Brand']) || ''),
              category: String(getCellValue(row, ['Category', 'Type', 'Group']) || ''),
              barcode: String(getCellValue(row, ['Barcode', 'EAN', 'UPC']) || ''),
            };
          });

          await db.products.bulkAdd(chunk);
          
          const processedCount = Math.min(i + CHUNK_SIZE, totalRows);
          setImportProgress(Math.round((processedCount / totalRows) * 100));
          setStats(s => ({ ...s, processed: processedCount }));
          
          await new Promise(r => setTimeout(r, 0));
        }
        
        toast.success(`Successfully imported ${totalRows} products!`);
      } catch (err) {
        console.error(err);
        toast.error('Import failed. Please check the file format.');
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl">
             <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Inventory Dashboard</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Manage products, stocks and pricing</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className={clsx(
            "cursor-pointer flex items-center px-4 py-2.5 rounded-xl transition-all font-bold",
            isImporting ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          )}>
            {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {isImporting ? 'Processing...' : 'Bulk Import'}
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
          </label>
          <button 
            disabled={isImporting}
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} 
            className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-all font-bold disabled:opacity-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </button>
        </div>
      </div>

      {isImporting && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-blue-100 dark:border-blue-900 animate-in slide-in-from-top-4 duration-300">
           <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Importing: {stats.processed.toLocaleString()} / {stats.total.toLocaleString()} products</span>
              </div>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400">{importProgress}%</span>
           </div>
           <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-200 dark:border-slate-700">
              <div 
                className="bg-blue-600 h-full transition-all duration-300 ease-out" 
                style={{ width: `${importProgress}%` }}
              ></div>
           </div>
        </div>
      )}

      {/* Advanced Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-2">
        <div className="relative flex-grow group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder={searchMode === 'fast' ? "Fast Search (Name, Batch)..." : "Accurate Search (Start of Name, Exact HSN, Barcode)..."}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-800 dark:text-white transition-all placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex shrink-0">
          <button 
            onClick={() => setSearchMode('fast')}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all",
              searchMode === 'fast' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            )}
          >
            <Zap className="w-4 h-4" /> Fast
          </button>
          <button 
             onClick={() => setSearchMode('accurate')}
             className={clsx(
              "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all",
              searchMode === 'accurate' ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            )}
          >
            <ScanBarcode className="w-4 h-4" /> Accurate
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-5">Product Details</th>
                <th className="px-4 py-5">Batch & Exp</th>
                <th className="px-4 py-5 text-right">Inventory</th>
                <th className="px-4 py-5 text-right">Pricing (MRP / Rate)</th>
                <th className="px-4 py-5 text-center">GST</th>
                <th className="px-6 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {products?.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-sm">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 dark:text-slate-100">{p.name}</div>
                    <div className="flex gap-2 text-[10px] text-slate-400 uppercase tracking-tighter mt-1">
                      <span>HSN: {p.hsn}</span>
                      {p.category && <span>• {p.category}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-slate-600 dark:text-slate-400 font-mono text-xs">{p.batch}</div>
                    <div className="text-[10px] text-slate-400">{p.expiry}</div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={clsx(
                      "px-2 py-1 rounded-lg font-black text-xs", 
                      p.stock < 100 ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                    )}>
                      {p.stock.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="text-xs text-slate-400 line-through">₹{p.mrp.toFixed(2)}</div>
                    <div className="font-bold text-blue-600 dark:text-blue-400">₹{p.saleRate.toFixed(2)}</div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md font-bold text-[10px] text-slate-600 dark:text-slate-300">{p.gstRate}%</span>
                  </td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => db.products.delete(p.id!)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {products?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                    No products found matching "{searchTerm}" in {searchMode} mode.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center p-8 border-b border-slate-50 dark:border-slate-800">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{editingProduct ? 'Edit Profile' : 'New Product Profile'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Product / Medicine Name</label>
                  <input {...register('name', { required: true })} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">GST Slab (%)</label>
                  <select {...register('gstRate')} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl p-4 font-bold">
                    <option value={5}>5% (GST 5)</option>
                    <option value={12}>12% (GST 12)</option>
                    <option value={18}>18% (GST 18)</option>
                    <option value={0}>0% (Exempted)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">HSN Code</label>
                  <input {...register('hsn')} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl p-4" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Batch Number</label>
                  <input {...register('batch', { required: true })} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl p-4 font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Expiry Window</label>
                  <input {...register('expiry', { required: true })} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl p-4" placeholder="MM/YY or YYYY-MM-DD" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Maximum Retail Price</label>
                  <input type="number" step="0.01" {...register('mrp', { required: true })} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl p-4 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Wholesale Billing Rate</label>
                  <input type="number" step="0.01" {...register('saleRate', { required: true })} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl p-4 font-bold text-blue-600 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Opening Stock</label>
                  <input type="number" {...register('stock', { required: true })} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl p-4 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Category</label>
                  <input {...register('category')} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl p-4" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Barcode</label>
                  <input {...register('barcode')} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl p-4 font-mono" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Dismiss</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all">Synchronize Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
