"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function RevenueTicker() {
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/alerts");

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "REVENUE_UPDATE") {
                setEvents(prev => [{
                    id: Math.random(),
                    patient_id: data.patient_id || "ANON",
                    type: data.category || "CREDIT",
                    amt: data.amt,
                    status: "SYNCED"
                }, ...prev].slice(0, 15));
            }
        };

        return () => ws.close();
    }, []);

    return (
        <div className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-3xl border-t border-white/10 z-50 h-10 flex items-center overflow-hidden">
            <div className="bg-emerald-600 px-4 h-full flex items-center gap-2 font-black italic text-[10px] uppercase tracking-tighter shrink-0 text-white">
                <ShieldCheck size={12} className="fill-white" /> Financial Core
            </div>

            <div className="flex-1 relative overflow-hidden h-full flex items-center">
                <div className="flex gap-16 animate-marquee whitespace-nowrap px-8">
                    <AnimatePresence>
                        {events.map((e) => (
                            <motion.div
                                key={e.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 font-mono text-[10px]"
                            >
                                <span className="text-cyan-500 font-black">[{e.patient_id}]</span>
                                <span className="text-gray-600">|</span>
                                <span className="text-white font-bold uppercase">{e.type}</span>
                                <span className="text-gray-600">|</span>
                                <span className="text-emerald-400 font-black tracking-tighter">₹{e.amt.toLocaleString()}</span>
                                <span className="text-gray-600">|</span>
                                <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded text-gray-400 font-bold">{e.status}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {events.length === 0 && (
                        <span className="text-gray-600 font-mono text-[10px] uppercase tracking-widest animate-pulse">
                            Synchronizing live ledger with high-density financial streams...
                        </span>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33%); }
                }
                .animate-marquee {
                    animation: marquee 40s linear infinite;
                    display: inline-flex;
                }
            `}</style>
        </div>
    );
}
