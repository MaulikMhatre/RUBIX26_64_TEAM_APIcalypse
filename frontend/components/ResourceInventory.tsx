"use client";

import React from 'react';
import { Activity, Truck, Package, Syringe, Box, AlertTriangle } from 'lucide-react';

interface ResourceProps {
  resources: {
    Ventilators: { total: number; in_use: number };
    Ambulances: { total: number; available: number };
  };
  isSimulating?: boolean;
}

const ResourceInventory: React.FC<ResourceProps> = ({ resources, isSimulating }) => {
  const v = resources?.Ventilators || { total: 20, in_use: 0 };
  const a = resources?.Ambulances || { total: 10, available: 0 };


  const ventInUse = isSimulating ? Math.min(v.in_use + 8, v.total) : v.in_use;
  const ambAvailable = isSimulating ? Math.max(a.available - 4, 0) : a.available;

  const ventUsage = v.total > 0 ? (ventInUse / v.total) * 100 : 0;
  
  return (
    <div className="bg-[#0b0b0b]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl h-full relative overflow-hidden group">
       <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Package size={20} />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Critical Inventory</h2>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-300 uppercase">Sync</span>
        </div>
      </div>
      
      <div className="space-y-8 relative z-10">
        
        {/* Ventilators */}
        <div className="group/item">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-500/10 rounded-md text-blue-400 group-hover/item:text-blue-300 transition-colors">
                <Activity size={16} />
              </div>
              <span className="text-xs font-black text-slate-300 uppercase tracking-widest group-hover/item:text-white transition-colors">Ventilators</span>
            </div>
            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
              {ventInUse} <span className="text-slate-500">/</span> {v.total}
            </span>
          </div>
          
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden mb-2 relative">
            <div 
              className={`h-full rounded-full transition-all duration-1000 relative ${ventUsage > 80 ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]' : 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'}`} 
              style={{ width: `${ventUsage}%` }}
            >
               <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
             <span>Available: <span className="text-white">{v.total - ventInUse}</span></span>
             <span className={`${ventUsage > 80 ? 'text-rose-400' : 'text-slate-400'}`}>
                {ventUsage > 90 && <AlertTriangle size={10} className="inline mr-1" />}
                Utilization: {Math.round(ventUsage)}%
             </span>
          </div>
        </div>

        {/* Ambulances */}
        <div className="group/item">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
               <div className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-400 group-hover/item:text-emerald-300 transition-colors">
                <Truck size={16} />
              </div>
              <span className="text-xs font-black text-slate-300 uppercase tracking-widest group-hover/item:text-white transition-colors">Fleet Status</span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
              {ambAvailable} Ready
            </span>
          </div>
          
          <div className="grid grid-cols-10 gap-1.5">
             {Array.from({ length: Math.max(a.total, 10) }).map((_, i) => (
               <div 
                 key={i} 
                 className={`h-8 rounded-md transition-all duration-300 ${
                   i < ambAvailable 
                     ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.6)] hover:scale-110' 
                     : 'bg-white/5 border border-white/5 opacity-50'
                 }`}
               ></div>
             ))}
          </div>
           <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">
             Total Fleet Size: <span className="text-slate-300">{a.total}</span>
          </div>
        </div>

         {/* Medical Supplies (Mock for visual fullness) */}
         <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors group/sub relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Syringe size={40} />
                </div>
                <div className="flex items-center gap-2 mb-2 text-indigo-400">
                    <Syringe size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover/sub:text-indigo-300 transition-colors">Oxygen</span>
                </div>
                <div className="text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">92%</div>
                <div className="w-full bg-black/40 h-1 mt-2 rounded-full overflow-hidden">
                    <div className="w-[92%] h-full bg-indigo-500 shadow-[0_0_10px_currentColor]" />
                </div>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-colors group/sub relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Box size={40} />
                </div>
                <div className="flex items-center gap-2 mb-2 text-amber-400">
                    <Box size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover/sub:text-amber-300 transition-colors">PPE Kits</span>
                </div>
                <div className="text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">42%</div>
                <div className="w-full bg-black/40 h-1 mt-2 rounded-full overflow-hidden">
                    <div className="w-[42%] h-full bg-amber-500 shadow-[0_0_10px_currentColor]" />
                </div>
            </div>
         </div>

      </div>
    </div>
  );
};

export default ResourceInventory;
