"use client";

import React from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, AlertCircle, IndianRupee } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function UnitEconomics() {
    const { data: economics } = useSWR(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/finance/unit-economics`, fetcher, { refreshInterval: 60000 });

    if (!economics) return <div className="animate-pulse h-32 bg-white/5 rounded-3xl" />;

    return (
        <div className="bg-gray-900/40 border border-white/5 rounded-[40px] p-8 backdrop-blur-3xl">
            <div className="mb-6">
                <h3 className="text-xl font-black text-white italic tracking-tight uppercase">Unit Economics <span className="text-emerald-500">Breakdown</span></h3>
                <p className="text-xs font-mono text-gray-500 tracking-widest mt-1 uppercase">Real-time Margin per Patient Admission</p>
            </div>

            <div className="space-y-3">
                {economics.map((case_item: any) => {
                    const isLowMargin = case_item.margin < 5000;
                    return (
                        <motion.div
                            key={case_item.patient_id}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            className={`flex items-center justify-between p-4 rounded-2xl border ${isLowMargin ? "bg-rose-500/5 border-rose-500/20" : "bg-white/5 border-white/5"
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isLowMargin ? "bg-rose-500/20 text-rose-500" : "bg-emerald-500/20 text-emerald-500"
                                    }`}>
                                    {isLowMargin ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                                </div>
                                <div>
                                    <p className="text-[10px] font-mono text-gray-500 uppercase">PID: {case_item.patient_id.slice(0, 8)}</p>
                                    <p className="text-sm font-bold text-white uppercase">{case_item.name}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="flex items-center gap-1 justify-end">
                                    <IndianRupee size={12} className="text-emerald-500" />
                                    <span className={`text-lg font-black tracking-tighter ${isLowMargin ? "text-rose-400" : "text-emerald-400"
                                        }`}>
                                        {case_item.margin.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 justify-end">
                                    <p className="text-[10px] font-mono text-gray-500 uppercase">Yield: {((case_item.margin / case_item.revenue) * 100 || 0).toFixed(1)}%</p>
                                    {isLowMargin && <AlertCircle size={10} className="text-rose-500 animate-pulse" />}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {economics.length === 0 && (
                    <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                        <p className="text-gray-600 font-mono text-[10px] uppercase tracking-widest">Awaiting Case Finalization...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
