"use client";

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Brain, CloudLightning, Activity, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { endpoints } from '@/utils/api';

interface ForecastItem {
  hour: string;
  inflow: number;
}

interface PredictionData {
  forecast: ForecastItem[];
  total_predicted_inflow: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<PredictionData | null>(null);
  const [weatherMultiplier, setWeatherMultiplier] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoints.predictInflow, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weather_event_multiplier: weatherMultiplier
        })
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Prediction failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [weatherMultiplier]);

  return (
    <div className="min-h-screen bg-black text-gray-200 p-6 md:p-12 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono mb-4"
            >
              <Brain className="w-3 h-3" />
              NEURAL PREDICTION ENGINE
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight flex items-center gap-3"
            >
              The Mind
              <span className="text-purple-500 text-2xl font-normal opacity-50">/ Analytics</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-400"
            >
              Future Inflow Forecasting (Next 6 Hours)
            </motion.p>
          </div>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => setWeatherMultiplier(!weatherMultiplier)}
            className={`flex items-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all shadow-lg border backdrop-blur-sm group ${
              weatherMultiplier 
                ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-[0_0_30px_rgba(147,51,234,0.3)]' 
                : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:border-gray-600'
            }`}
          >
            <div className={`p-2 rounded-lg ${weatherMultiplier ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-500 group-hover:text-gray-300'}`}>
              <CloudLightning className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-xs uppercase tracking-wider font-bold opacity-70">Simulation Mode</div>
              <div className="text-sm">{weatherMultiplier ? 'Event/Weather Logic ON' : 'Standard Projection'}</div>
            </div>
          </motion.button>
        </header>

        {loading && !data ? (
          <div className="h-[400px] flex flex-col items-center justify-center gap-4 bg-gray-900/30 rounded-2xl border border-gray-800 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <p className="text-purple-400 font-mono tracking-widest text-sm animate-pulse">CALCULATING FORECAST MODELS...</p>
          </div>
        ) : data ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-gray-900/50 p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-800 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">
                <Activity className="w-6 h-6 text-purple-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Projected Patient Inflow</h2>
              <p className="text-gray-500 text-sm mb-8">Real-time algorithmic prediction based on historical patterns.</p>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.forecast}>
                    <defs>
                      <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#666" 
                      tick={{fill: '#888'}} 
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#666" 
                      tick={{fill: '#888'}} 
                      axisLine={false}
                      tickLine={false}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(75, 85, 99, 0.4)',
                        backdropFilter: 'blur(8px)',
                        color: '#fff',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                      }}
                      itemStyle={{ color: '#c4b5fd' }}
                      labelStyle={{ color: '#9ca3af', marginBottom: '0.5rem' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="inflow" 
                      name="Predicted Arrivals" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorInflow)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-indigo-900/80 to-purple-900/80 p-8 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <div>
                <div className="flex items-center gap-2 text-purple-200 mb-6">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="font-mono text-sm tracking-wider uppercase">Live Analysis</span>
                </div>
                
                <h3 className="text-purple-100/70 font-medium text-lg mb-1">Total Predicted Inflow</h3>
                <div className="text-7xl font-bold text-white mb-2 tracking-tighter">
                  {data.total_predicted_inflow}
                </div>
                <p className="text-purple-200/60 mb-8">Patients expected over the next 6 hours.</p>
              </div>
              
              <div className="bg-black/20 rounded-xl p-6 backdrop-blur-md border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-300">Risk Assessment</span>
                  <span className={`font-bold px-3 py-1 rounded-full text-xs tracking-wide ${
                    data.total_predicted_inflow > 80 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {data.total_predicted_inflow > 80 ? 'HIGH SURGE RISK' : 'NORMAL CAPACITY'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-700/50 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      data.total_predicted_inflow > 80 ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min((data.total_predicted_inflow / 120) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Based on historical sinusoidal data analysis {weatherMultiplier && "& active event multiplier logic"}. 
                  Resource allocation recommended accordingly.
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
