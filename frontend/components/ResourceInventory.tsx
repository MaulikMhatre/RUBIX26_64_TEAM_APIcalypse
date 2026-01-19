"use client";

import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, Activity, Box, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResourceProps {
  resources?: any;
  isSimulating?: boolean;
}

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  reorder_level: number;
}

const CircularProgress = ({ percentage, color }: { percentage: number, color: string }) => {
  const radius = 24; // Increased size for impact
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="transform -rotate-90 w-full h-full">
        <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
        <circle
          cx="32" cy="32" r={radius}
          stroke="currentColor" strokeWidth="4" fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-1000 ease-spring-smooth`}
        />
      </svg>
      <span className={`absolute text-[10px] font-black ${color}`}>{Math.round(percentage)}%</span>
    </div>
  );
};

const Sparkline = ({ color }: { color: string }) => {
  return (
    <svg viewBox="0 0 100 30" className={`w-24 h-10 ${color} opacity-60`}>
      <path
        d="M0 25 Q 10 15, 20 25 T 40 10 T 60 20 T 80 5 T 100 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path d="M0 25 Q 10 15, 20 25 T 40 10 T 60 20 T 80 5 T 100 15 V 30 H 0 Z" fill="currentColor" className="opacity-10" />
    </svg>
  )
}

const ResourceInventory: React.FC<ResourceProps> = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/erp/inventory');
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (e) { console.error("Failed to fetch inventory", e); }
  };

  useEffect(() => {
    fetchInventory();
    const ws = new WebSocket('ws://localhost:8000/ws');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'REFRESH_INVENTORY' || data.type === 'LOW_STOCK_ALERT') {
        fetchInventory();
      }
    };
    return () => ws.close();
  }, []);

  return (
    <>
      {/* VERTICAL TRIGGER TAB (Visible when closed) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed top-1/2 -translate-y-1/2 right-0 z-[60] py-8 px-2 bg-[#0f172a] border-l border-y border-indigo-500/30 rounded-l-2xl shadow-[0_0_30px_rgba(99,102,241,0.2)] flex flex-col items-center justify-center gap-4 hover:bg-indigo-950/50 hover:border-indigo-500 transition-all cursor-pointer group"
          >
            <Package size={20} className="text-indigo-400 group-hover:text-white transition-colors animate-pulse" />
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] whitespace-nowrap group-hover:text-white transition-colors" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
              Supply Node
            </span>
            <ChevronLeft size={16} className="text-slate-500 group-hover:-translate-x-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* DRAWER BACKDROP */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* DRAWER CONTAINER */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: isOpen ? 0 : '100%' }}
        exit={{ x: '100%' }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="fixed top-0 right-0 h-screen w-1/2 min-w-[500px] bg-[#020617] border-l border-indigo-500/20 shadow-2xl z-50 flex flex-col"
      >
        {/* HEADER */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-[#0b0b0b]/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 text-indigo-400">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Supply Chain Node</h2>
              <p className="text-xs text-indigo-400/60 font-bold tracking-widest uppercase">Real-time Logistics & Inventory</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className={`w-2 h-2 rounded-full ${inventory.some(i => i.quantity < i.reorder_level) ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'} animate-pulse`} />
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">System Operational</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <X size={24} className="text-slate-500 hover:text-white" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-[#020617]">
          <style jsx global>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 9999px; }
                `}</style>

          {inventory.map((item) => {
            const isLow = item.quantity < item.reorder_level;
            const percentage = Math.min((item.quantity / (item.reorder_level * 3)) * 100, 100);
            const color = isLow ? 'text-rose-500' : 'text-emerald-500';
            const borderColor = isLow ? 'border-rose-500/30' : 'border-slate-800';
            const bg = isLow ? 'bg-rose-500/[0.03]' : 'bg-[#0f172a]';
            const glow = isLow ? 'shadow-[0_0_30px_rgba(244,63,94,0.1)]' : 'hover:shadow-lg hover:shadow-indigo-500/5';

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.id}
                className={`group relative p-6 rounded-3xl border ${borderColor} ${bg} ${glow} transition-all duration-300`}
              >
                {isLow && (
                  <div className="absolute top-0 right-0 p-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/20 border border-rose-500/30 rounded-lg animate-pulse">
                      <AlertTriangle size={12} className="text-rose-500" />
                      <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Critically Low</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <CircularProgress percentage={percentage} color={color} />

                  <div className="flex-1">
                    <h3 className={`text-sm font-black uppercase tracking-widest mb-1 ${isLow ? 'text-rose-200' : 'text-slate-200'} group-hover:text-white transition-colors`}>{item.name}</h3>

                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">{item.category}</p>
                        <div className="flex items-baseline gap-1">
                          <p className={`text-3xl font-black ${color} tracking-tighter`}>{item.quantity}</p>
                          <span className="text-[10px] text-slate-600 font-bold uppercase">/ {item.reorder_level * 3} Units</span>
                        </div>
                      </div>
                      <div className="hidden sm:block pb-1">
                        <Sparkline color={isLow ? 'text-rose-500' : 'text-indigo-500'} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="mt-4 flex justify-between items-center pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <Activity size={12} />
                    <span className="uppercase tracking-wider">Consumption Velocity</span>
                  </div>
                  <div className={`text-[9px] font-black px-3 py-1 rounded-md uppercase tracking-wider ${isLow ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {isLow ? 'Reorder Immediate' : 'Optimal Flow'}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {inventory.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-20">
              <Box size={48} className="text-indigo-500/50 mb-4 animate-bounce" />
              <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Linking Supply Chain...</p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default ResourceInventory;
