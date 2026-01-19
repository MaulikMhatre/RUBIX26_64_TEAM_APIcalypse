
"use client";

import React, { useState, useEffect } from 'react';
import { Brain, Thermometer, TrendingUp, Activity, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { endpoints } from '@/utils/api';

const TOTAL_BEDS = 60;
const MindPredictions = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<{i: number, value: number} | null>(null);

  useEffect(() => {
    const fetchModel = async () => {
      try {
        const res = await fetch(endpoints.predictInflow, { method: 'POST',headers: { 'Content-Type': 'application/json' }});

        const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType?.includes("application/json")) {
        const text = await res.text();
        console.error("Expected JSON but got:", text.substring(0, 100));
        return;
      }
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Sync Failure:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchModel();
    const interval = setInterval(fetchModel, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-12 text-center animate-pulse text-indigo-400 font-mono">CALIBRATING HEURISTIC ENGINE...</div>;

  return (
    <div className="bg-slate-950 text-slate-200 p-8 rounded-3xl border border-slate-800 shadow-2xl">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h2 className="text-2xl font-black tracking-tighter flex items-center gap-3">
            <Brain className="text-indigo-500 w-8 h-8" /> 
            HEURISTIC INFLOW ENGINE
          </h2>
          <p className="text-slate-500 text-sm mt-1">Weighted Gaussian modeling with Systemic Saturation feedback</p>
        </div>
        
        {/* Confidence Badge */}
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 rounded-full">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-emerald-400 text-xs font-bold font-mono tracking-widest">
            {data?.confidence_score}% CONFIDENCE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">6H Forecast</p>
          <div className="flex items-baseline gap-3 text-white">
            <span className="text-7xl font-black">{data?.total_predicted_inflow}</span>
            <TrendingUp className="text-emerald-400 w-6 h-6" />
          </div>
          <p className="text-xs text-slate-400 mt-4 font-medium italic">High-accuracy arrival projection</p>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Risk Factors</p>
          <div className="space-y-4">
             {/* Weather Factor */}
             <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Weather Multiplier</span>
                <span className="text-amber-400 font-bold">{data?.factors?.environmental || '1.0x'}</span>
             </div>
             {/* Saturation Factor */}
             <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Systemic Saturation</span>
                <span className="text-amber-400 font-bold">{data?.factors?.systemic_saturation || '1.0x'}</span>
             </div>
          </div>
          <div className="mt-6 p-2 bg-indigo-500/10 rounded border border-indigo-500/20 text-[10px] text-indigo-300">
            {data?.weather_impact?.reason || "No weather impact data available"}
          </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Surge Readiness</p>
          <div className={`text-3xl font-black ${data?.total_predicted_inflow > 120 ? 'text-rose-500' : 'text-emerald-400'}`}>
              {data?.total_predicted_inflow > 120 ? 'CRITICAL' : 'STABLE'}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
             <ShieldAlert className="w-4 h-4 text-amber-500" />
             Based on {TOTAL_BEDS} bed capacity
          </div>
        </div>
      </div>

      <div className="mt-12">
        <p className="text-[10px] font-black tracking-[0.35em] uppercase mb-6 flex items-center gap-2 text-slate-400">
          <Clock className="w-4 h-4" /> Bimodal Stochastic Curve
        </p>
        <div className="relative bg-[#0b0b0b]/50 border border-white/5 rounded-3xl p-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="absolute left-0 right-0 top-[25%] border-t border-white/5" />
          <div className="absolute left-0 right-0 top-[50%] border-t border-white/5" />
          <div className="absolute left-0 right-0 top-[75%] border-t border-white/5" />
          <div className="flex items-end justify-between gap-3 h-48">
            {(() => {
              const forecast = data?.forecast || [];
              const maxInflow = forecast.length > 0 ? Math.max(...forecast.map((f: any) => f.inflow)) : 0;
              const maxVal = maxInflow > 0 ? maxInflow : 1; // Prevent division by zero
              
              if (forecast.length === 0) {
                 return <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No prediction data available</div>;
              }

              return forecast.map((item: any, i: number) => {
                const currentInflow = item.inflow || 0;
                const h = Math.max(10, Math.round((item.inflow / maxVal) * 100)); // Min 10% height
                const active = hover?.i === i;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className={`w-full relative rounded-t-2xl transition-all duration-300 ${active ? 'scale-[1.02]' : ''}`}
                      style={{ height: `${h}%` }}
                      onMouseEnter={() => setHover({ i, value: item.inflow })}
                      onMouseLeave={() => setHover(null)}
                    >
                      <div className={`absolute inset-0 rounded-t-2xl ${active ? 'bg-gradient-to-t from-indigo-600 to-indigo-400' : 'bg-gradient-to-t from-indigo-700/60 to-indigo-500/40'}`} />
                      <div className={`absolute inset-0 rounded-t-2xl ${active ? 'shadow-[0_20px_50px_-20px_rgba(99,102,241,0.6)]' : 'shadow-[0_10px_30px_-20px_rgba(99,102,241,0.4)]'}`} />
                      {active && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-black shadow-lg z-10 whitespace-nowrap">
                          {item.inflow} Patients
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{item.hour}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MindPredictions;
