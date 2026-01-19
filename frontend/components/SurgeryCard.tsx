"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock,
    User,
    Stethoscope,
    AlertTriangle,
    CheckCircle,
    Trash2,
    RefreshCw
} from "lucide-react";
import { endpoints } from "@/utils/api";

// --- Types ---
interface SurgeryRoom {
    id: string;
    current_state: "AVAILABLE" | "OCCUPIED" | "OVERTIME" | "DIRTY" | "CLEANING";
    patient_name?: string;
    surgeon_name?: string;
    expected_end_time?: string; // ISO string
    is_occupied: boolean;
}

interface SurgeryCardProps {
    room: SurgeryRoom;
    onUpdate: () => void;
    onAdmit: () => void;
}

export default function SurgeryCard({ room, onUpdate, onAdmit }: SurgeryCardProps) {
    const [isOvertime, setIsOvertime] = useState(false);
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [processing, setProcessing] = useState(false);

    // FIX 1: Reset overtime status immediately when a room is released to AVAILABLE
    useEffect(() => {
        if (room.current_state === "AVAILABLE") {
            setIsOvertime(false);
        }
    }, [room.current_state]);

    // --- Actions ---
    const handleAction = async (actionType: "extend" | "complete" | "release", body?: any) => {
        setProcessing(true);
        let url = "";
        if (actionType === "extend") url = endpoints.extendSurgery(room.id);
        if (actionType === "complete") url = endpoints.completeSurgery(room.id);
        if (actionType === "release") url = endpoints.releaseSurgery(room.id);

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: body ? JSON.stringify(body) : undefined,
            });
            if (res.ok) {
                onUpdate(); // Re-fetch data to sync new expected_end_time
                setShowCheckIn(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setProcessing(false);
        }
    };

    // --- Visuals ---
    const getStatusColor = () => {
        if (room.current_state === "AVAILABLE") return "bg-green-500/10 border-green-500/50 hover:bg-green-500/20";
        if (room.current_state === "OVERTIME" || isOvertime) return "bg-red-500/10 border-red-500 animate-pulse";
        if (room.current_state === "OCCUPIED") return "bg-blue-600/10 border-blue-500/50";
        if (room.current_state === "DIRTY") return "bg-orange-500/10 border-orange-500/50";
        if (room.current_state === "CLEANING") return "bg-sky-400/10 border-sky-400/50";
        return "bg-gray-800 border-gray-700";
    };

    const getStatusIcon = () => {
        if (room.current_state === "AVAILABLE") return <CheckCircle className="w-5 h-5 text-green-400" />;
        if (room.current_state === "DIRTY") return <Trash2 className="w-5 h-5 text-orange-400" />;
        if (room.current_state === "CLEANING") return <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />;
        return <Clock className={`w-5 h-5 ${isOvertime ? "text-red-500" : "text-blue-400"}`} />;
    };

    // Sub-component for strict isolation
    const SurgeryTimer = ({ expectedEndTime, onOvertime }: { expectedEndTime: string, onOvertime: (v: boolean) => void }) => {
        const [timeLeft, setTimeLeft] = useState("--:--");

        useEffect(() => {
            const updateTimer = () => {
                const now = new Date().getTime();
                // Parse specifically as UTC
                const end = new Date(expectedEndTime).getTime();

                const diff = end - now;

                if (diff <= 0) {
                    setTimeLeft("00:00");
                    onOvertime(true);
                } else {
                    const totalSecs = Math.floor(diff / 1000);
                    const mins = Math.floor(totalSecs / 60);
                    const secs = totalSecs % 60;
                    setTimeLeft(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
                    onOvertime(false);
                }
            };

            updateTimer();
            const interval = setInterval(updateTimer, 1000);
            return () => clearInterval(interval);
        }, [expectedEndTime, onOvertime]);

        // Derive visual state from timeLeft directly or use a prop in future. 
        // For now, if timeLeft is "00:00", it's overtime (Red), else Blue.
        const isTimerRed = timeLeft === "00:00";

        return (
            <div className={`text-center py-2 bg-black/20 rounded-lg ${isTimerRed ? "border border-red-500/30" : ""}`}>
                <div className={`text-2xl font-mono font-bold ${isTimerRed ? "text-red-500" : "text-blue-400"}`}>
                    {timeLeft}
                </div>
                <div className={`text-xs font-bold uppercase tracking-tighter ${isTimerRed ? "text-red-400" : "text-gray-500"}`}>
                    {isTimerRed ? "Time Exceeded" : "Remaining Time"}
                </div>
            </div>
        );
    };

    // FIX 2: STRICT VISUAL GUARD - Only show timer if state is occupied/overtime AND time exists
    const showTimer = (room.current_state === "OCCUPIED" || room.current_state === "OVERTIME") && !!room.expected_end_time;

    return (
        <div className={`relative p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 ${getStatusColor()}`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {room.id}
                        {(isOvertime || room.current_state === "OVERTIME") && <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-black">
                        {room.current_state === "OCCUPIED" && isOvertime ? "OVERTIME" : room.current_state}
                    </span>
                </div>
                {getStatusIcon()}
            </div>

            {/* Content */}
            <div className="space-y-2 mb-4">
                {showTimer ? (
                    <SurgeryTimer
                        expectedEndTime={room.expected_end_time!}
                        onOvertime={setIsOvertime}
                    />
                ) : (
                    /* Fallback for Overtime logic when timer isn't calculating */
                    room.current_state === "OVERTIME" && (
                        <div className="text-center py-2 bg-black/20 rounded-lg border border-red-500/30">
                            <div className="text-2xl font-mono font-bold text-red-500">+00:00</div>
                            <div className="text-xs text-red-400 font-bold uppercase">Time Exceeded</div>
                        </div>
                    )
                )}

                {(room.current_state !== "AVAILABLE") && (
                    <div className="space-y-1 p-2 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <User className="w-3.5 h-3.5 text-blue-400" />
                            <span className="truncate font-semibold">{room.patient_name || "Unknown Patient"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Stethoscope className="w-3.5 h-3.5 text-purple-400" />
                            <span className="truncate">{room.surgeon_name || "No Surgeon"}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Footer */}
            <div className="grid grid-cols-1 gap-2">
                {(room.current_state === "OCCUPIED" || room.current_state === "OVERTIME") && (
                    <>
                        <div className="grid grid-cols-3 gap-2">
                            {/* FIX 3: Bind extension buttons to correctly pass additional_minutes */}
                            <button
                                disabled={processing}
                                onClick={() => handleAction("extend", { additional_minutes: 15 })}
                                className="bg-gray-800 hover:bg-gray-700 text-white text-[10px] py-2 rounded font-bold border border-white/10"
                            >
                                +15m
                            </button>
                            <button
                                disabled={processing}
                                onClick={() => handleAction("extend", { additional_minutes: 30 })}
                                className="bg-gray-800 hover:bg-gray-700 text-white text-[10px] py-2 rounded font-bold border border-white/10"
                            >
                                +30m
                            </button>
                            <button
                                disabled={processing}
                                onClick={() => handleAction("extend", { additional_minutes: 60 })}
                                className="bg-gray-800 hover:bg-gray-700 text-white text-[10px] py-2 rounded font-bold border border-white/10"
                            >
                                +60m
                            </button>
                        </div>
                        <button
                            disabled={processing}
                            onClick={() => setShowCheckIn(true)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-2.5 rounded font-black uppercase tracking-widest transition-all shadow-lg"
                        >
                            Complete Surgery
                        </button>
                    </>
                )}

                {(room.current_state === "DIRTY" || room.current_state === "CLEANING") && (
                    <button
                        disabled={processing}
                        onClick={() => handleAction("release")}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-black uppercase tracking-tighter flex items-center justify-center gap-2 transition-all"
                    >
                        <CheckCircle className="w-4 h-4" /> Release Room
                    </button>
                )}

                {room.current_state === "AVAILABLE" && (
                    <button
                        onClick={onAdmit}
                        className="w-full py-6 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 border border-dashed border-white/10 hover:border-blue-500/50 rounded-xl transition-all group"
                    >
                        <div className="p-3 bg-blue-500/10 rounded-full mb-2 group-hover:bg-blue-600 transition-colors">
                            <User size={20} className="text-blue-400 group-hover:text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Admit Patient</span>
                    </button>
                )}
            </div>

            {/* Check-In Modal Overlay */}
            <AnimatePresence>
                {showCheckIn && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gray-950/98 backdrop-blur-xl rounded-xl z-20 flex flex-col items-center justify-center p-4 text-center border border-white/10"
                    >
                        <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                        <h4 className="text-lg font-black text-white mb-1 uppercase tracking-tight">Surgery Complete?</h4>
                        <p className="text-xs text-gray-400 mb-6">Confirming room turnover & history logging.</p>

                        <div className="space-y-2 w-full">
                            <button
                                disabled={processing}
                                onClick={() => handleAction("complete")}
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-3 rounded-lg uppercase text-xs tracking-widest shadow-lg shadow-green-500/20"
                            >
                                Confirm & Clean
                            </button>
                            <button
                                disabled={processing}
                                onClick={() => setShowCheckIn(false)}
                                className="w-full bg-white/5 hover:bg-white/10 text-gray-300 py-3 rounded-lg text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}