"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { Search, History, CheckCircle2, Clock } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function FinancialTimeline() {
    const [patientId, setPatientId] = useState("");
    const { data: timeline, error } = useSWR(
        patientId ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/finance/timeline/${patientId}` : null,
        fetcher
    );

    return (
        <div className="bg-gray-900/40 border border-white/5 rounded-[40px] p-8 backdrop-blur-3xl lg:col-span-2">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-black text-white italic tracking-tight uppercase underline decoration-cyan-500/50">Patient <span className="text-cyan-500">Audit</span> Trail</h3>
                    <p className="text-xs font-mono text-gray-500 tracking-widest mt-1 uppercase">Deep-Dive Billing Search & Reconciliation</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search Patient UUID..."
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-mono"
                    />
                </div>
            </div>

            <div className="min-h-[200px]">
                {!patientId ? (
                    <div className="h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-50">
                        <History size={32} className="text-gray-700 mb-2" />
                        <p className="text-gray-600 font-mono text-[10px] uppercase tracking-widest">Awaiting UUID Entry for Forensic Audit</p>
                    </div>
                ) : !timeline ? (
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl" />)}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {timeline.map((entry: any, index: number) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center gap-6 p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                            >
                                <div className="text-center min-w-[80px]">
                                    <p className="text-[10px] font-black text-cyan-500 uppercase">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    <p className="text-[8px] font-mono text-gray-600 uppercase italic">{new Date(entry.timestamp).toLocaleDateString()}</p>
                                </div>

                                <div className="w-px h-10 bg-white/10 hidden md:block" />

                                <div className="flex-1">
                                    <p className="text-xs font-mono text-cyan-400 uppercase tracking-tighter">{entry.item_type || "CHARGE"}</p>
                                    <p className="text-sm font-bold text-white uppercase">{entry.description}</p>
                                </div>

                                <div className="text-right">
                                    <p className="text-lg font-black text-emerald-400">₹{entry.amount.toLocaleString()}</p>
                                    <div className="flex items-center gap-1 justify-end">
                                        <CheckCircle2 size={10} className="text-emerald-500" />
                                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Verified</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
