import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Search, Ambulance, Radio, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';

interface HandshakeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HandshakeModal: React.FC<HandshakeModalProps> = ({ isOpen, onClose }) => {
    const [stage, setStage] = useState<'SEARCHING' | 'SELECTION' | 'HANDOFF' | 'COMPLETE'>('SEARCHING');
    const [progress, setProgress] = useState(0);

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setStage('SEARCHING');
            setProgress(0);
        }
    }, [isOpen]);

    // Stage 1: Searching Animation
    useEffect(() => {
        if (state === 'SEARCHING' && isOpen) {
            const timer = setTimeout(() => {
                setStage('SELECTION');
            }, 3000); // 3 seconds search
            return () => clearTimeout(timer);
        }
    }, [stage, isOpen]);

    // Helper for stage variable - using closure for simplicity in effects if needed or just use state
    const state = stage; // Alias for consistency if I mixed them up

    const handleConfirmTransfer = () => {
        setStage('HANDOFF');
        // Simulate transfer progress
        let p = 0;
        const interval = setInterval(() => {
            p += 2;
            setProgress(p);
            if (p >= 100) {
                clearInterval(interval);
                setStage('COMPLETE');
                setTimeout(() => {
                    onClose();
                }, 2000);
            }
        }, 50);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-2xl"
                onClick={null} // Don't close on backdrop click to force flow
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative z-10 w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="p-8 border-b border-white/5 bg-indigo-500/5 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                            <Radio className="text-indigo-500 animate-pulse" /> External Handshake Protocol
                        </h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                            Inter-Hospital Transfer Node
                        </p>
                    </div>
                </div>

                <div className="p-12 min-h-[400px] flex flex-col justify-center">

                    {/* STAGE 1: SEARCHING */}
                    {stage === 'SEARCHING' && (
                        <div className="flex flex-col items-center text-center space-y-8">
                            <div className="relative w-48 h-48 flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-ping" />
                                <div className="absolute inset-4 border-2 border-indigo-500/40 rounded-full animate-pulse" />
                                <Radar className="w-16 h-16 text-indigo-400 animate-spin-slow" />
                                {/* Sonar sweep effect */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-indigo-500/10 to-transparent animate-spin duration-1000" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-widest animate-pulse">
                                    Querying City Mesh...
                                </h3>
                                <p className="text-xs text-slate-500 mt-2 font-mono">
                                    Scanning nearby nodes for Critical Care capacity...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STAGE 2: SELECTION */}
                    {stage === 'SELECTION' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            <div className="flex items-center gap-4 text-emerald-400 mb-4 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                                <ShieldCheck className="w-6 h-6" />
                                <span className="text-xs font-black uppercase tracking-widest">Best Match Identified</span>
                            </div>

                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-colors group cursor-pointer relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-50">
                                    <MapPin className="w-24 h-24 text-white/5" />
                                </div>

                                <h3 className="text-3xl font-black text-white italic tracking-tighter mb-2">City Central Medical</h3>
                                <div className="grid grid-cols-2 gap-6 mt-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ETA (Ambulance)</p>
                                        <p className="text-xl font-bold text-white flex items-center gap-2">
                                            <Ambulance className="w-5 h-5 text-indigo-400" /> 12 Mins
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resource Match</p>
                                        <p className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded inline-block">
                                            Ventilator + ICU Bed Verified
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmTransfer}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] rounded-xl shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-all transform active:scale-95"
                            >
                                Confirm Transfer
                            </button>
                        </motion.div>
                    )}

                    {/* STAGE 3: HANDOFF & COMPLETE */}
                    {(stage === 'HANDOFF' || stage === 'COMPLETE') && (
                        <div className="flex flex-col items-center justify-center space-y-8 text-center">
                            {stage === 'HANDOFF' ? (
                                <>
                                    <div className="w-full max-w-sm">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                                            <span>Syncing Patient Data</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-indigo-500 shadow-[0_0_15px_#6366f1]"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 font-mono animate-pulse">Encrypting Triage Packet &gt; Node Transfer...</p>
                                </>
                            ) : (
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_#10b981] mb-6">
                                        <CheckCircle2 className="w-12 h-12 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Handoff Complete</h3>
                                    <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest">Ambulance #402 Re-routed</p>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default HandshakeModal;
