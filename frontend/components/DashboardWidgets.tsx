"use client";
import React from 'react';
import { Truck, Wind, Navigation, Radio, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface ResourceData {
  Ventilators: { total: number; in_use: number };
  Ambulances: { total: number; available: number };
}

interface DashboardWidgetsProps {
  resources: ResourceData;
}

const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({ resources }) => {
  if (!resources) return null;

  const ventInUse = resources.Ventilators.in_use;
  const ventTotal = resources.Ventilators.total;
  const ventPerc = Math.round((ventInUse / ventTotal) * 100);
  
  const ambAvailable = resources.Ambulances.available;
  const ambTotal = resources.Ambulances.total;
  const ambActive = ambTotal - ambAvailable;

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      
      {/* VENTILATOR NODE */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ borderColor: "rgba(6, 182, 212, 0.3)" }}
        className="relative bg-[#0a0f1d] border border-white/5 rounded-[2.5rem] p-8 overflow-hidden group transition-colors duration-500"
      >
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-[80px] group-hover:bg-cyan-500/20 transition-all duration-700 pointer-events-none" />
        
        <div className="relative z-10 h-full flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <motion.div 
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" 
                />
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">Pneuma-Control</span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">Ventilation Core</h3>
            </div>
            <motion.div 
              whileHover={{ rotate: 180 }}
              className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400"
            >
              <Wind size={24} />
            </motion.div>
          </div>

          <div className="flex items-center justify-between gap-12">
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                <motion.circle
                  cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent"
                  strokeDasharray={301.6}
                  initial={{ strokeDashoffset: 301.6 }}
                  animate={{ strokeDashoffset: 301.6 - (301.6 * ventPerc) / 100 }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className={`${ventPerc > 85 ? 'text-rose-500' : 'text-cyan-500'} drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]`}
                />
              </svg>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <span className="text-2xl font-black text-white leading-none">{ventPerc}%</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase mt-1">Load</span>
              </motion.div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-8">
              <motion.div whileHover={{ x: 5 }} className="border-l-2 border-white/5 pl-6 transition-all">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Available Units</span>
                <span className="text-3xl font-black text-white">{ventTotal - ventInUse}</span>
              </motion.div>
              <motion.div whileHover={{ x: 5 }} className="border-l-2 border-white/5 pl-6 transition-all">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Active Support</span>
                <span className="text-3xl font-black text-slate-400">{ventInUse}</span>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* FLEET STATUS NODE */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ borderColor: "rgba(16, 185, 129, 0.3)" }}
        className="relative bg-[#0b0b0b] border border-emerald-900/30 rounded-[2.5rem] p-8 overflow-hidden group transition-colors duration-500"
      >
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 blur-[80px] group-hover:bg-emerald-500/20 transition-all duration-700 pointer-events-none" />

        <div className="relative z-10 h-full flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" 
                />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">EMS Grid Control</span>
              </div>
              <h3 className="text-3xl font-black text-white tracking-tighter italic">FLEET <span className="text-emerald-500">STATUS</span></h3>
            </div>
            <motion.div 
              whileHover={{ y: -5, scale: 1.1 }}
              className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 shadow-lg shadow-emerald-500/5"
            >
              <Truck size={28} />
            </motion.div>
          </div>

          {/* Sequential Block Entry */}
          <div className="grid grid-cols-10 gap-2 mb-8">
            {Array.from({ length: ambTotal }).map((_, i) => {
              const isAvailable = i < ambAvailable;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={isAvailable ? { scale: 1.1, zIndex: 10 } : {}}
                  transition={{ delay: i * 0.03, type: "spring", stiffness: 300 }}
                  className={`h-12 rounded-lg border transition-all duration-500 relative cursor-default ${
                    isAvailable 
                      ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]' 
                      : 'bg-slate-900 border-white/5 opacity-20'
                  }`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              whileHover={{ scale: 1.02, backgroundColor: "rgba(16, 185, 129, 0.08)" }}
              className="p-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between transition-all"
            >
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Standby</p>
                <p className="text-2xl font-black text-white leading-none">{ambAvailable}</p>
              </div>
              <Navigation className="text-emerald-500/40" size={20} />
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02, backgroundColor: "rgba(245, 158, 11, 0.08)" }}
              className="p-4 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between transition-all"
            >
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Missions</p>
                <p className="text-2xl font-black text-white leading-none">{ambActive}</p>
              </div>
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }}>
                <Radio className="text-amber-500/40" size={20} />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardWidgets;