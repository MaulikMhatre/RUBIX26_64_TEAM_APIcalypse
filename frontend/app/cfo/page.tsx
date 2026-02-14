"use client";

import React, { useState } from "react";
import Link from 'next/link';
import useSWR from "swr";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Activity, Users, ArrowUpRight, ArrowDownRight, Filter, Calendar } from "lucide-react";
import CFOGraphs from "@/components/CFOGraphs";
import RevenueTicker from "@/components/RevenueTicker";
import UnitEconomics from "@/components/UnitEconomics";
import FinancialTimeline from "@/components/FinancialTimeline";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CFODashboard() {
    const { data: stats } = useSWR(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/finance/stats`, fetcher, { refreshInterval: 30000 });
    const [timeframe, setTimeframe] = useState("Last 30 Days");

    return (
        <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 overflow-x-hidden">
            <Navbar />

            <main className="max-w-[1600px] mx-auto p-12 pt-32 space-y-12 pb-32">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-end gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-cyan-400 font-mono text-sm tracking-[0.3em] font-black uppercase italic">
                            <Activity className="w-4 h-4 animate-pulse" />
                            Financial Core: Synchronized
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none italic">
                            CFO COMMAND <span className="text-gray-800">CENTER</span>
                        </h1>
                        <p className="text-gray-500 max-w-2xl text-lg font-medium leading-relaxed">
                            Data-driven revenue orchestration, predictive ALOS tracking, and ARPOB optimization for the Phrelis health-tech ecosystem.
                        </p>
                    </div>

                    {/* Dynamic Filters */}
                    <div className="flex items-center gap-4 bg-gray-900/50 p-2 rounded-3xl border border-white/5 backdrop-blur-xl shrink-0">
                        {["24H", "7D", "30D", "YTD"].map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setTimeframe(opt === "30D" ? "Last 30 Days" : opt)}
                                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe.includes(opt) ? "bg-white text-black shadow-2xl" : "text-gray-500 hover:text-white"
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                        <div className="w-px h-8 bg-white/10 mx-2" />
                        <button className="flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-cyan-500 hover:bg-cyan-500/10 rounded-2xl transition-all">
                            <Calendar size={14} /> Custom
                        </button>
                    </div>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <KPICard
                        label="ARPOB (Avg Revenue/Bed)"
                        value={`₹${(stats?.arpob / 1000 || 0).toFixed(1)}k`}
                        change={stats?.deltas?.revenue || "0.0%"}
                        isPositive={true}
                        icon={<DollarSign className="text-cyan-400" />}
                        subtext="Occupancy Weighted"
                    />
                    <KPICard
                        label="Operating Margin"
                        value={`${stats?.operating_margin || 0}%`}
                        change={stats?.deltas?.margin || "0.0%"}
                        isPositive={true}
                        icon={<TrendingUp className="text-emerald-400" />}
                        subtext="Net Yield Alpha"
                    />
                    <KPICard
                        label="Liquidity (Days Cash on Hand)"
                        value={`${(stats?.days_cash_on_hand || 0).toFixed(1)} Days`}
                        change="+0.5d"
                        isPositive={true}
                        icon={<Activity className="text-amber-400" />}
                        subtext="Financial Survival Buffer"
                    />
                    <KPICard
                        label="Active Occupancy"
                        value={`${stats?.active_occupancy || 0}`}
                        change="+2"
                        isPositive={true}
                        icon={<Users className="text-purple-400" />}
                        subtext="Resource Utilization"
                    />
                </div>

                {/* Revenue Graphs (Recharts) */}
                <div className="space-y-8">
                    <div className="flex items-baseline justify-between border-b border-white/5 pb-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-4xl font-black italic uppercase tracking-tight">Visual <span className="text-cyan-500">Analytics</span></h2>
                            <div className="bg-cyan-500/10 text-cyan-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" /> Live Stream
                            </div>
                        </div>
                        <div className="flex gap-4 font-mono text-[10px] uppercase tracking-widest text-gray-500">
                            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
                            <span className="text-emerald-500 underline decoration-emerald-500/30">Auto-Ref: 30S</span>
                        </div>
                    </div>
                    <CFOGraphs />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <UnitEconomics />
                        </div>
                        <div className="lg:col-span-2">
                            <FinancialTimeline />
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-6 pt-12">
                    <Link href="/billing" className="px-10 py-5 bg-white text-black font-black uppercase text-sm rounded-3xl hover:bg-cyan-500 hover:text-white transition-all duration-500 shadow-2xl shadow-cyan-500/10 italic text-center">
                        Access Patient Ledgers
                    </Link>
                    <button className="px-10 py-5 bg-gray-900 border border-white/10 text-white font-black uppercase text-sm rounded-3xl hover:border-cyan-500 transition-all duration-500 italic flex items-center gap-3">
                        <Filter size={18} /> Deep-Dive Analytics
                    </button>
                </div>
            </main>

            <RevenueTicker />
        </div>
    );
}

function KPICard({ label, value, change, isPositive, icon, subtext }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-[40px] bg-gray-900/30 border border-white/5 backdrop-blur-3xl group hover:border-cyan-500/30 transition-all duration-700 relative overflow-hidden"
        >
            <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors shadow-inner">
                        {icon}
                    </div>
                    <div className={`flex items-center gap-1 font-black text-[10px] uppercase tracking-tighter ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {change}
                    </div>
                </div>
                <div>
                    <div className="flex flex-col">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{label}</p>
                        <h3 className="text-5xl font-black tracking-tighter italic tabular-nums leading-tight">{value}</h3>
                        <p className="text-[10px] font-mono text-gray-700 mt-2 uppercase tracking-widest">{subtext}</p>
                    </div>
                </div>
            </div>

            {/* Subtle pulse line */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent group-hover:via-cyan-500/50 transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)]" />
        </motion.div>
    );
}
