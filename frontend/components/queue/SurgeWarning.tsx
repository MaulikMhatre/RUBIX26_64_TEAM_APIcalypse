"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ShieldAlert, Activity, ChevronRight } from "lucide-react";

interface SurgeWarningProps {
    show: boolean;
    score: number;
    onActivate: () => void;
    isActive: boolean;
}

export default function SurgeWarning({ show, score, onActivate }: SurgeWarningProps) {
    // Dynamic intensity calculation based on how far over the threshold we are
    const intensity = Math.min((score - 70) / 30, 1); // Assuming 70 is start of surge

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="relative border-b border-rose-500/30 overflow-hidden"
                >
                    {/* Phrelis Hazard Pattern Layer */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: `repeating-linear-gradient(45deg, #f43f5e 0, #f43f5e 2px, transparent 0, transparent 50%)`, backgroundSize: '15px 15px' }}
                    />

                    {/* Kinetic Scanline Effect */}
                    <motion.div
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/10 to-transparent w-1/2 skew-x-12 pointer-events-none"
                    />

                    <div className="bg-slate-950/80 backdrop-blur-2xl relative z-10">
                        <div className="max-w-[1600px] mx-auto px-8 py-3 flex items-center justify-between">

                            <div className="flex items-center gap-6">
                                {/* Aggressive Alert Icon */}
                                <div className="relative">
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="absolute inset-0 bg-rose-500 blur-md rounded-full"
                                    />
                                    <div className="relative p-2.5 bg-rose-600 rounded-xl text-white shadow-[0_0_20px_rgba(225,29,72,0.5)] border border-rose-400/50">
                                        <ShieldAlert className="w-5 h-5" />
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-3">
                                        <h4 className="font-black text-rose-500 text-xs tracking-[0.2em] uppercase italic">
                                            Critical Surge Detected
                                        </h4>
                                        <div className="h-1 w-1 rounded-full bg-rose-500 animate-ping" />
                                        <span className="text-[10px] font-bold text-rose-400/60 uppercase tracking-widest">
                                            ESI-Load: High
                                        </span>
                                    </div>
                                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.05em] flex items-center gap-2">
                                        Mean Acuity <span className="text-rose-500 tabular-nums">{Math.round(score)}</span>
                                        <span className="opacity-30">|</span>
                                        Bypass Protocol: <span className="text-white">Active</span>
                                        <span className="opacity-30">|</span>
                                        Est. Delay: <span className="text-rose-400">+45m</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                {/* Live Metric Visualizer */}
                                <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                                    <div className="text-right">
                                        <div className="text-[8px] font-black text-rose-500/50 uppercase tracking-tighter">Throughput</div>
                                        <div className="text-xs font-black text-rose-400">Diminished</div>
                                    </div>
                                    <div className="flex gap-1 items-end h-6">
                                        {[0.4, 0.8, 0.5, 0.9, 0.3].map((h, i) => (
                                            <motion.div
                                                key={i}
                                                animate={{ height: [`${h * 100}%`, `${(h * 0.5) * 100}%`, `${h * 100}%`] }}
                                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                                                className="w-1 bg-rose-500/40 rounded-full"
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Action Button */}
                                <motion.button
                                    onClick={onActivate}
                                    whileHover={{ scale: 1.05, backgroundColor: "rgba(244, 63, 94, 1)" }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-4 py-2 bg-rose-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-rose-900/40 border border-rose-400/30"
                                >
                                    Activate Triage Mode
                                    <ChevronRight className="w-3 h-3" />
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}