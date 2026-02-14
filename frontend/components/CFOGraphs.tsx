"use client";

import React from "react";
import useSWR from "swr";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    ComposedChart,
    Area,
    Line,
    Bar
} from "recharts";
import { motion } from "framer-motion";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CFOGraphs() {
    const { data: areaData } = useSWR(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/finance/revenue-history`, fetcher, { refreshInterval: 30000 });
    const { data: deptData } = useSWR(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/finance/department-pl`, fetcher, { refreshInterval: 30000 });
    const { data: payerData } = useSWR(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/finance/payer-mix`, fetcher, { refreshInterval: 30000 });

    const COLORS = ["#06b6d4", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6"];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* The Pulse Chart: Revenue vs Operational Burn */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                className="bg-gray-900/40 border border-white/5 rounded-[40px] p-8 backdrop-blur-3xl lg:col-span-2"
            >
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h3 className="text-2xl font-black text-white italic tracking-tight uppercase">THE <span className="text-cyan-500">PULSE</span> CHART</h3>
                        <p className="text-xs font-mono text-gray-500 tracking-widest mt-1 uppercase">Live Revenue vs Operational Burn | Daily Break-Even Analysis</p>
                    </div>
                    <div className="flex gap-6 font-mono text-[10px] uppercase tracking-tighter">
                        <div className="flex items-center gap-2 text-cyan-500">
                            <div className="w-2 h-2 bg-cyan-500 rounded-full" /> Revenue Area
                        </div>
                        <div className="flex items-center gap-2 text-rose-500">
                            <div className="w-2 h-0.5 bg-rose-500" /> Operational Burn
                        </div>
                    </div>
                </div>

                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={areaData || []}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis dataKey="date" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '20px', color: '#fff' }}
                                itemStyle={{ fontSize: '12px' }}
                                cursor={{ stroke: '#333', strokeWidth: 2 }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#06b6d4" fillOpacity={1} fill="url(#colorRev)" strokeWidth={4} />
                            <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#000' }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Departmental P&L Breakdown */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-900/40 border border-white/5 rounded-[40px] p-8 backdrop-blur-3xl"
            >
                <div className="mb-8">
                    <h3 className="text-xl font-black text-white italic tracking-tight uppercase">Departmental <span className="text-cyan-500">P&L</span></h3>
                    <p className="text-xs font-mono text-gray-500 tracking-widest mt-1 uppercase">Profit Center Allocation</p>
                </div>

                <div className="h-[300px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={deptData || []}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={10}
                                dataKey="value"
                                stroke="none"
                            >
                                {(deptData || []).map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '15px' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Payer Mix Analytics */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-900/40 border border-white/5 rounded-[40px] p-8 backdrop-blur-3xl"
            >
                <div className="mb-8">
                    <h3 className="text-xl font-black text-white italic tracking-tight uppercase">Payer <span className="text-emerald-500">Mix</span> Analytics</h3>
                    <p className="text-xs font-mono text-gray-500 tracking-widest mt-1 uppercase">Insurance vs Cash vs Schemes</p>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={payerData || []}
                                cx="50%"
                                cy="50%"
                                innerRadius={0}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {(payerData || []).map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '15px' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="diamond" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </div>
    );
}

function LeakageList() {
    const { data: leaks } = useSWR(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/finance/leakage`, fetcher, { refreshInterval: 60000 });

    if (!leaks || leaks.length === 0) {
        return (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
                <p className="text-gray-600 font-mono text-[10px] uppercase tracking-widest">No anomalies detected in active cycles</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {leaks.map((leak: any) => (
                <div key={leak.patient_id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-rose-500/20">
                    <div>
                        <p className="text-xs font-black uppercase text-white">{leak.name}</p>
                        <p className="text-[10px] font-mono text-gray-500 tracking-tighter uppercase">ESI {leak.esi} | {leak.ledger_items} Items Logged</p>
                    </div>
                    <div className="bg-rose-500/10 text-rose-500 text-[10px] font-black px-3 py-1 rounded-full uppercase italic">
                        {leak.risk} Risk
                    </div>
                </div>
            ))}
        </div>
    );
}
