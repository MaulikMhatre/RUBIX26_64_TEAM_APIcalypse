"use client";

import React from 'react';
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

interface HeatmapProps {
  occupancy: {
    ER: number;
    ICU: number;
    Surgery: number;
    Wards: number;
  };
  isSimulating?: boolean;
}

const CAPACITY = {
  ER: 60,
  ICU: 20,
  Wards: 100,
  Surgery: 10
};

const LiveHeatmap: React.FC<HeatmapProps> = ({ occupancy, isSimulating }) => {
  const getPercentage = (dept: string, value: number) => {
    const cap = CAPACITY[dept as keyof typeof CAPACITY] || 100;
    return Math.round((value / cap) * 100);
  };

  const getTheme = (percent: number) => {
    if (percent < 60) return {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]',
      icon: 'text-emerald-400'
    };
    if (percent < 85) return {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      bar: 'bg-amber-500',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]',
      icon: 'text-amber-400'
    };
    return {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      text: 'text-rose-400',
      bar: 'bg-rose-500',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.1)]',
      icon: 'text-rose-400'
    };
  };

  return (
    <div className="bg-[#0b0b0b]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="flex justify-between items-center mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Activity size={20} />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Unit Load Heatmap</h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live Feed</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 relative z-10">
        {Object.entries(occupancy).map(([dept, value]) => {
          const percentage = isSimulating ? Math.min(Math.round(value * 1.5), 100) : getPercentage(dept, value); // Simulate surge
          const theme = getTheme(percentage);
          const capacity = CAPACITY[dept as keyof typeof CAPACITY] || 100;
          
          return (
            <div 
              key={dept} 
              className={`p-5 rounded-2xl border transition-all duration-500 ${theme.bg} ${theme.border} ${theme.glow} hover:scale-[1.02] cursor-default group/card relative overflow-hidden`}
            >
              <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{dept}</h3>
                {percentage >= 85 ? (
                  <AlertCircle size={14} className="text-rose-500 animate-pulse" />
                ) : (
                  <CheckCircle2 size={14} className="text-emerald-500 opacity-50" />
                )}
              </div>

              <div className="flex items-end gap-2 mb-3 relative z-10">
                <span className={`text-3xl font-black ${theme.text} drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]`}>
                  {percentage}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Occupancy
                </span>
              </div>
              
              <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden relative z-10">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${theme.bar} shadow-[0_0_10px_currentColor]`} 
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                ></div>
              </div>

              <div className="mt-3 flex justify-between items-center relative z-10">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Active Patients</span>
                <span className="text-xs font-mono text-slate-200">
                  {isSimulating ? Math.round(value * 1.2) : value} <span className="text-slate-500">/</span> {capacity}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveHeatmap;
