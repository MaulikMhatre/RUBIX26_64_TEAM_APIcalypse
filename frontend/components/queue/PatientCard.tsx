
"use client";

import { motion, AnimatePresence } from "framer-motion";
import PriorityOrb from "./PriorityOrb";
import { Clock, AlertTriangle, ChevronRight, Activity, Microscope } from "lucide-react"; // Added Microscope icon
import { useState, useEffect } from "react";

interface Patient {
    id: string;
    patient_name: string;
    patient_age: number;
    gender: string;
    base_acuity: number;
    priority_score: number;
    check_in_time: string;
    symptoms: string[];
    icd_code?: string;
    icd_rationale?: string; // [NEW]
    triage_urgency?: string; // [NEW]
}

interface PatientCardProps {
    patient: Patient;
    onCall: (id: string) => void;
}

export default function PatientCard({ patient, onCall }: PatientCardProps) {
    const [waitTime, setWaitTime] = useState(0);

    useEffect(() => {
        const calculateTime = () => {
            const checkInStr = patient.check_in_time.endsWith('Z')
                ? patient.check_in_time
                : `${patient.check_in_time.replace(' ', 'T')}Z`;

            const checkInDate = new Date(checkInStr);
            const now = new Date();
            const diffInMs = now.getTime() - checkInDate.getTime();
            setWaitTime(Math.max(0, Math.floor(diffInMs / 60000)));
        };

        calculateTime();
        const interval = setInterval(calculateTime, 30000);
        return () => clearInterval(interval);
    }, [patient.check_in_time]);

    const getStatusColor = () => {
        if (patient.base_acuity <= 2 || patient.triage_urgency === 'CRITICAL') return "from-rose-500/20";
        if (patient.base_acuity === 3 || patient.triage_urgency === 'URGENT') return "from-amber-500/20";
        return "from-emerald-500/20";
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -5 }}
            className="relative group mb-4"
        >
            <div className={`absolute -inset-0.5 bg-gradient-to-r ${getStatusColor()} to-transparent rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500`} />

            <div className="relative p-5 border border-white/5 bg-[#0a0c14]/80 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 group-hover:border-white/10 group-hover:bg-slate-900/80">

                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                        <div className="relative">
                            <PriorityOrb score={patient.priority_score} acuity={patient.base_acuity} />
                            {(patient.base_acuity <= 2 || patient.triage_urgency === 'CRITICAL') && (
                                <motion.div
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute -top-1 -right-1"
                                >
                                    <Activity className="w-3 h-3 text-rose-500" />
                                </motion.div>
                            )}
                        </div>

                        <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white tracking-tight leading-none">
                                    {patient.patient_name}
                                </h3>
                                <div className="flex gap-1">
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-500 uppercase tracking-widest">
                                        {patient.gender.charAt(0)} • {patient.patient_age}y
                                    </span>
                                    {patient.triage_urgency && (
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-md border ${patient.triage_urgency === 'CRITICAL' ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' :
                                                patient.triage_urgency === 'URGENT' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                                                    'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                                            }`}>
                                            {patient.triage_urgency}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {patient.icd_code && (
                                <div className="space-y-2 py-1">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 w-fit">
                                        <Microscope className="w-3 h-3 text-rose-500" />
                                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-[0.1em]">
                                            Core DX: {patient.icd_code}
                                        </span>
                                    </div>
                                    {patient.icd_rationale && (
                                        <p className="text-[10px] text-slate-400 leading-relaxed font-mono italic">
                                            {patient.icd_rationale}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {patient.symptoms.map((s, i) => (
                                    <span key={i} className="px-2 py-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded uppercase tracking-wider">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-black/40 p-2 pl-3 rounded-xl border border-white/5 shadow-inner self-start">
                        <div className="text-right">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">P-Index</div>
                            <div className="text-xl font-black text-white tabular-nums leading-none mt-1">
                                {Math.round(patient.priority_score)}
                            </div>
                        </div>
                        <div className="h-8 w-1 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${Math.min(patient.priority_score, 100)}%` }}
                                className={`w-full ${patient.priority_score > 90 ? 'bg-rose-500' : 'bg-blue-500'} shadow-[0_0_8px_rgba(59,130,246,0.5)]`}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-8">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs font-bold tabular-nums">{waitTime}m</span>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white/5 ${(patient.base_acuity <= 2 || patient.triage_urgency === 'CRITICAL') ? 'border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.1)]' : 'border-white/5 text-slate-400'}`}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">ESI {patient.base_acuity}</span>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02, x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onCall(patient.id)}
                        className="flex items-center gap-2 pl-6 pr-4 py-2 text-[10px] font-black text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] group/btn tracking-widest uppercase"
                    >
                        Dispatch
                        <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                    </motion.button>
                </div>

                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
            </div>
        </motion.div>
    );
}
