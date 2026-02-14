"use client";

import React, { useState, useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { TrendingUp, Coins } from "lucide-react";

export default function LiveTotalCard({ data }: { data: any }) {
    const total = data.costs.grand_total;
    const springConfig = { damping: 20, stiffness: 100 };
    const animatedValue = useSpring(total, springConfig);

    useEffect(() => {
        animatedValue.set(total);
    }, [total, animatedValue]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden group"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 to-blue-900 rounded-[40px] opacity-20 group-hover:opacity-30 transition-opacity blur-2xl" />

            <div className="relative bg-gray-900/80 border border-white/10 rounded-[40px] p-8 backdrop-blur-3xl shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                        <Coins className="text-cyan-400" size={24} />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">Live Accumulation</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-gray-400 text-xs font-black uppercase tracking-widest pl-1">Total Outstanding Bill</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-cyan-500 italic">₹</span>
                        <motion.h2 className="text-6xl font-black tracking-tighter text-white tabular-nums">
                            {total.toLocaleString()}
                        </motion.h2>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-tight">Bed Charges</p>
                        <p className="text-lg font-bold text-white">₹{data.costs.accrued_bed_cost.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-tight">GST (18%)</p>
                        <p className="text-lg font-bold text-white">₹{data.costs.tax.toLocaleString()}</p>
                    </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
            </div>
        </motion.div>
    );
}
