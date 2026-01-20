"use client";

import { motion } from "framer-motion";
import { Stethoscope, User, DoorOpen } from "lucide-react";

interface Room {
    id: string;
    doctor_name: string;
    status: string;
    current_patient_id?: string;
}

export default function QueueConsultation({ rooms, onComplete }: { rooms: Room[], onComplete: (id: string) => void }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                    <Stethoscope className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">Active Rooms</h2>
            </div>

            <div className="grid grid-cols-1 gap-5">
                {rooms.map((room) => (
                    <motion.div
                        key={room.id}
                        layout
                        initial={false}
                        animate={{
                            borderColor: room.status === "ACTIVE" ? "rgba(99, 102, 241, 0.4)" : "rgba(30, 41, 59, 1)",
                            backgroundColor: room.status === "ACTIVE" ? "rgba(79, 70, 229, 0.05)" : "rgba(15, 23, 42, 0.2)",
                        }}
                        className={`p-5 rounded-2xl border backdrop-blur-md transition-shadow hover:shadow-lg ${room.status === "ACTIVE" ? "shadow-indigo-500/5" : ""
                            }`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl transition-colors ${room.status === "ACTIVE"
                                        ? "bg-indigo-500 text-white shadow-xl shadow-indigo-500/40"
                                        : "bg-slate-800 text-slate-500"
                                    }`}>
                                    <DoorOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-100 tracking-tight">{room.doctor_name}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{room.id}</p>
                                </div>
                            </div>
                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${room.status === "ACTIVE" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/20" : "bg-slate-800/50 text-slate-500 border border-slate-700/50"
                                }`}>
                                {room.status}
                            </div>
                        </div>

                        {room.status === "ACTIVE" && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="pt-4 border-t border-indigo-500/10 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                                    <span className="text-xs font-semibold text-indigo-200/70">In Consultation</span>
                                </div>
                                <button
                                    onClick={() => onComplete(room.id)}
                                    className="px-3 py-1 text-[10px] font-black text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all uppercase tracking-widest"
                                >
                                    Release
                                </button>
                            </motion.div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
