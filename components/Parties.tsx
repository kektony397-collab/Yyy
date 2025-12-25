
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { Party } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Upload, Trash2, Edit2, X, Phone, MapPin, FileText, Loader2, Star, CreditCard } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import clsx from 'clsx';

export const Parties: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  const parties = useLiveQuery(
    () => db.parties
      .filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.phone.includes(searchTerm) || 
        p.gstin.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .limit(50) 
      .toArray(),
    [searchTerm]
  );

  const { register, handleSubmit, reset, setValue } = useForm<Party>();

  React.useEffect(() => {
    if (editingParty) {
      Object.keys(editingParty).forEach((key) => {
        setValue(key as keyof Party, (editingParty as any)[key]);
      });
    } else {
      reset({ type: 'WHOLESALE' });
    }
  }, [editingParty, setValue, reset]);

  const onSubmit = async (data: Party) => {
    try {
      const formattedData = {
        ...data,
        creditLimit: Number(data.creditLimit || 0),
        outstandingBalance: Number(data.outstandingBalance || 0),
        isFavorite: Boolean(data.isFavorite)
      };

      if (editingParty?.id) {
        await db.parties.update(editingParty.id, formattedData);
        toast.success('Party updated');
      } else {
        await db.parties.add(formattedData);
        toast.success('Party added');
      }
      setIsModalOpen(false);
      setEditingParty(null);
      reset();
    } catch (error) {
      console.error(error);
      toast.error('Error saving party');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this party?')) {
      await db.parties.delete(id);
      toast.success('Party deleted');
    }
  };

  // Helper for smart column detection
  const getValue = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
      // 1. Exact match
      if (row[key] !== undefined) return row[key];
      // 2. Case insensitive
      const foundKey = rowKeys.find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
      if (foundKey) return row[foundKey];
      // 3. Normalized
      const cleanKey = rowKeys.find(k => k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
      if (cleanKey) return row[cleanKey];
    }
    return '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) throw new Error("Empty File");

        const partiesToAdd: any[] = data.map((row: any) => ({
          name: String(getValue(row, ['Name', 'Party Name', 'Customer', 'Client']) || 'Unknown'),
          gstin: String(getValue(row, ['GSTIN', 'GST', 'GST No']) || ''),
          address: String(getValue(row, ['Address', 'Addr', 'City']) || ''),
          phone: String(getValue(row, ['Phone', 'Mobile', 'Contact', 'Tel']) || ''),
          email: String(getValue(row, ['Email', 'Mail']) || ''),
          dlNo1: String(getValue(row, ['DL No 1', 'DL1', 'Drug Lic 1', '20B']) || ''),
          dlNo2: String(getValue(row, ['DL No 2', 'DL2', 'Drug Lic 2', '21B']) || ''),
          type: 'WHOLESALE',
          creditLimit: Number(getValue(row, ['Credit Limit', 'Limit']) || 0),
          outstandingBalance: Number(getValue(row, ['Balance', 'Outstanding', 'Due']) || 0),
        })).filter(p => p.name !== 'Unknown');

        // Batch insert for performance
        await db.parties.bulkAdd(partiesToAdd);
        toast.success(`Imported ${partiesToAdd.length} parties successfully!`);
      } catch (e) {
        console.error(e);
        toast.error('Import failed. Check format.');
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Parties & Customers</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage your wholesale and retail contacts</p>
        </div>
        
        <div className="flex gap-3">
          {isImporting ? (
             <div className="flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-medium">
               <Loader2 className="w-5 h-5 mr-2 animate-spin" />
               Processing...
             </div>
          ) : (
            <label className="cursor-pointer flex items-center px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all font-medium">
              <Upload className="w-5 h-5 mr-2" />
              Import Excel
               <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
            </label>
          )}
          
          <button 
            onClick={() => { setEditingParty(null); setIsModalOpen(true); }}
            className="flex items-center px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 transition-all font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Party
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by Name, GST, or Phone..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-white shadow-sm transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parties?.map((party) => (
          <div key={party.id} className="group bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors flex items-center gap-2">
                  {party.name}
                  {party.isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${party.type === 'RETAIL' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {party.type || 'WHOLESALE'}
                </span>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => { setEditingParty(party); setIsModalOpen(true); }} className="p-2 bg-slate-100 dark:bg-slate-800 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><Edit2 className="w-4 h-4" /></button>
                 <button onClick={() => handleDelete(party.id!)} className="p-2 bg-slate-100 dark:bg-slate-800 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              {party.gstin && (
                <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                   <FileText className="w-4 h-4 mr-2 text-slate-400" />
                   <span className="font-mono text-slate-800 dark:text-slate-200">{party.gstin}</span>
                </div>
              )}
              {party.phone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-slate-400" />
                  {party.phone}
                </div>
              )}
              {party.address && (
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 mr-2 text-slate-400 mt-0.5" />
                  <span className="line-clamp-2">{party.address}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                <div className="text-xs">
                  <span className="block text-slate-400">Balance</span>
                  <span className={clsx("font-bold", (party.outstandingBalance || 0) > 0 ? "text-red-500" : "text-green-500")}>
                    ₹{(party.outstandingBalance || 0).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-right">
                   <span className="block text-slate-400">Limit</span>
                   <span className="font-bold text-slate-700 dark:text-slate-300">₹{(party.creditLimit || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{editingParty ? 'Edit Party' : 'Add New Party'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="label">Party Name</label>
                  <input {...register('name', { required: true })} className="input-field" placeholder="Enter party name" />
                </div>
                
                <div>
                  <label className="label">Party Type</label>
                  <select {...register('type')} className="input-field">
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="RETAIL">Retail</option>
                  </select>
                </div>

                <div>
                   <label className="label">Favorite Customer?</label>
                   <div className="flex items-center h-full">
                     <input type="checkbox" {...register('isFavorite')} className="w-6 h-6 rounded text-blue-600" />
                     <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Mark as favorite</span>
                   </div>
                </div>

                <div>
                  <label className="label">Phone</label>
                  <input {...register('phone')} className="input-field" placeholder="Contact Number" />
                </div>

                <div>
                  <label className="label">GSTIN</label>
                  <input {...register('gstin')} className="input-field" placeholder="GST Number" />
                </div>
                
                <div>
                  <label className="label">Email</label>
                  <input {...register('email')} className="input-field" placeholder="Email Address" />
                </div>

                <div>
                  <label className="label">DL No. 1 (20B)</label>
                  <input {...register('dlNo1')} className="input-field" placeholder="Drug License 1" />
                </div>

                <div>
                  <label className="label">DL No. 2 (21B)</label>
                  <input {...register('dlNo2')} className="input-field" placeholder="Drug License 2" />
                </div>

                <div>
                   <label className="label">Credit Limit (₹)</label>
                   <input type="number" {...register('creditLimit')} className="input-field" placeholder="0.00" />
                </div>

                <div>
                   <label className="label">Opening Balance (₹)</label>
                   <input type="number" {...register('outstandingBalance')} className="input-field" placeholder="0.00" />
                </div>

                <div className="md:col-span-2">
                   <label className="label">Address</label>
                   <textarea {...register('address')} className="input-field" rows={3} placeholder="Full Address" />
                </div>

                <div className="md:col-span-2">
                   <label className="label">Notes</label>
                   <textarea {...register('notes')} className="input-field" rows={2} placeholder="Internal notes..." />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 font-medium">Cancel</button>
                <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg font-bold">Save Details</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        .label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .input-field {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
        }
        .dark .input-field {
          background-color: #1e293b;
          border-color: #334155;
          color: white;
        }
        .input-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
};
