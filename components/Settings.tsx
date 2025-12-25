
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { CompanyProfile, AppTheme, AppPlatform } from '../types';
import { Save, Building2, Palette, LayoutTemplate, Settings as SettingsIcon, Percent, Monitor, Smartphone, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';

export const Settings: React.FC = () => {
  const { register, handleSubmit, setValue, watch } = useForm<CompanyProfile>();
  const currentTheme = watch('theme');
  const activePlatform = watch('platform');
  const darkMode = watch('darkMode');
  const useDefaultGST = watch('useDefaultGST');

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await db.settings.get(1); 
      if (settings) {
        Object.keys(settings).forEach((key) => {
          setValue(key as keyof CompanyProfile, (settings as any)[key]);
        });
      }
    };
    loadSettings();
  }, [setValue]);

  const onSubmit = async (data: CompanyProfile) => {
    try {
      await db.settings.put({ ...data, id: 1 });
      toast.success('Settings Updated Successfully');
      // Small delay to allow DB to write before reload
      setTimeout(() => window.location.reload(), 500); 
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const RadioOption = ({ name, value, current, label, icon: Icon, color }: any) => (
    <label className={`cursor-pointer flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${current === value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
      <input type="radio" {...register(name)} value={value} className="hidden" />
      <div className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center ${color} shadow-sm`}>
         {Icon && <Icon className="w-6 h-6 text-white" />}
         {!Icon && <div className="w-6 h-6 rounded-full bg-current"></div>}
      </div>
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
    </label>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center space-x-4">
        <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg">
          <SettingsIcon className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Settings</h2>
          <p className="text-slate-500 dark:text-slate-400">Configure your application preferences</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Appearance Section */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-white">
             <LayoutTemplate className="w-6 h-6 text-blue-600" />
             <h3 className="text-xl font-bold">Platform & Interface</h3>
           </div>
           
           <div className="space-y-6">
             <div>
               <label className="block text-sm font-bold text-slate-400 uppercase mb-4">Operating System Layout</label>
               <div className="grid grid-cols-2 gap-4">
                  <RadioOption name="platform" value="windows" current={activePlatform} label="Windows 11" icon={Monitor} color="bg-blue-600" />
                  <RadioOption name="platform" value="android" current={activePlatform} label="Android 13" icon={Smartphone} color="bg-green-600" />
               </div>
             </div>

             <div>
               <label className="block text-sm font-bold text-slate-400 uppercase mb-4">Color Mode</label>
               <div className="grid grid-cols-3 gap-4">
                  <RadioOption name="darkMode" value="light" current={darkMode} label="Light" icon={Sun} color="bg-amber-500" />
                  <RadioOption name="darkMode" value="dark" current={darkMode} label="Dark" icon={Moon} color="bg-indigo-900" />
                  <RadioOption name="darkMode" value="system" current={darkMode} label="System" icon={SettingsIcon} color="bg-slate-500" />
               </div>
             </div>
           </div>
        </section>

        {/* Branding Section */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-white">
             <Building2 className="w-6 h-6 text-purple-600" />
             <h3 className="text-xl font-bold">Company Profile</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold mb-2 text-slate-600 dark:text-slate-300">Company Name</label>
              <input {...register('companyName', { required: true })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 dark:text-white" />
            </div>
            <div>
               <label className="block text-sm font-medium mb-2 text-slate-600 dark:text-slate-300">GSTIN</label>
               <input {...register('gstin')} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 dark:text-white" />
            </div>
            <div>
               <label className="block text-sm font-medium mb-2 text-slate-600 dark:text-slate-300">Phone</label>
               <input {...register('phone')} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 dark:text-white" />
            </div>
            
            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1 dark:text-slate-400">Drug Lic. 1</label><input {...register('dlNo1')} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 dark:text-white" /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-slate-400">Drug Lic. 2</label><input {...register('dlNo2')} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 dark:text-white" /></div>
            </div>

             <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1 dark:text-slate-400">Address Line 1</label>
                <input {...register('addressLine1')} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 dark:text-white" />
             </div>
            <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1 dark:text-slate-400">Address Line 2</label>
                <input {...register('addressLine2')} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 dark:text-white" />
            </div>
            <div className="col-span-1 md:col-span-2">
               <label className="block text-sm font-medium mb-1 dark:text-slate-400">Invoice Terms</label>
               <textarea {...register('terms')} rows={3} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 dark:text-white" />
            </div>
          </div>
        </section>

        {/* GST Section */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-white">
              <Percent className="w-6 h-6 text-emerald-600" />
              <h3 className="text-xl font-bold">GST Configuration</h3>
           </div>
           <div className="space-y-6">
              <label className="flex items-center cursor-pointer p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 transition-all">
                <input type="checkbox" {...register('useDefaultGST')} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 mr-4" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">Force Default GST Rate</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Enable this to apply a fixed GST rate to every item on a new bill, overriding product settings.</div>
                </div>
              </label>

              {useDefaultGST && (
                <div className="animate-in slide-in-from-top-2">
                   <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Default GST Rate (%)</label>
                   <select {...register('defaultGSTRate')} className="w-full md:w-48 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white">
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                   </select>
                </div>
              )}
           </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-white">
              <Palette className="w-6 h-6 text-orange-500" />
              <h3 className="text-xl font-bold">Color Theme</h3>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <RadioOption name="theme" value="blue" current={currentTheme} label="Ocean" icon={null} color="bg-blue-600" />
              <RadioOption name="theme" value="green" current={currentTheme} label="Forest" icon={null} color="bg-emerald-600" />
              <RadioOption name="theme" value="purple" current={currentTheme} label="Royal" icon={null} color="bg-purple-600" />
              <RadioOption name="theme" value="dark" current={currentTheme} label="OLED" icon={null} color="bg-gray-900" />
           </div>
        </section>

        <div className="flex justify-end sticky bottom-4 z-40">
           <button type="submit" className="flex items-center px-8 py-4 bg-blue-600 text-white font-bold rounded-full shadow-xl hover:scale-105 transition-all hover:bg-blue-700">
              <Save className="w-5 h-5 mr-2" /> Save Settings
           </button>
        </div>
      </form>
    </div>
  );
};
