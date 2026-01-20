"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Activity, Thermometer, Droplets, User, Calendar, Info } from "lucide-react";

export default function QueueIncoming({ onCheckIn }: { onCheckIn: (data: any) => void }) {
    const [formData, setFormData] = useState({
        patient_name: "",
        patient_age: "",
        gender: "Male",
        base_acuity: "3",
        symptoms: "",
        hr: "",
        bp: "",
        spo2: ""
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCheckIn({
            ...formData,
            patient_age: parseInt(formData.patient_age),
            base_acuity: parseInt(formData.base_acuity),
            symptoms: formData.symptoms.split(",").map((s: string) => s.trim()).filter((s: string) => s),
            vitals: {
                hr: parseInt(formData.hr) || 0,
                bp: formData.bp || "120/80",
                spo2: parseInt(formData.spo2) || 98
            }
        });
        setFormData({
            patient_name: "", patient_age: "", gender: "Male", 
            base_acuity: "3", symptoms: "", hr: "", bp: "", spo2: ""
        });
    };

    const inputClasses = "w-full bg-slate-950/50 border border-slate-800/60 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-slate-600 shadow-inner";

    return (
        <motion.div
            layout
            className="relative p-6 border border-white/5 bg-slate-900/40 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl"
        >
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <PlusCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white tracking-tighter">Bio-Intake</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Initial Triage Protocol</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identity Section */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Identity</label>
                    </div>
                    <input
                        required
                        className={inputClasses}
                        placeholder="Patient Legal Name"
                        value={formData.patient_name}
                        onChange={e => setFormData({ ...formData, patient_name: e.target.value })}
                    />
                </div>

                {/* Demographics Section - FIXED SPACING */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Demographics</label>
                    </div>
                    <div className="flex gap-4"> {/* Increased gap for better separation */}
                        <div className="flex-1"> {/* Fixed width container for Age */}
                            <input
                                required
                                type="number"
                                className={inputClasses}
                                placeholder="Age"
                                value={formData.patient_age}
                                onChange={e => setFormData({ ...formData, patient_age: e.target.value })}
                            />
                        </div>
                        <div className="flex-[1.5]"> {/* More space for Gender dropdown */}
                            <select
                                className={`${inputClasses} appearance-none cursor-pointer`}
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                            >
                                <option className="bg-slate-900">Male</option>
                                <option className="bg-slate-900">Female</option>
                                <option className="bg-slate-900">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Acuity Selector */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Activity className="w-3 h-3 text-blue-400" />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ESI Level</label>
                    </div>
                    <div className="grid grid-cols-5 p-1 bg-slate-950/60 rounded-2xl border border-slate-800/40 gap-1.5">
                        {["1", "2", "3", "4", "5"].map(level => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setFormData({ ...formData, base_acuity: level })}
                                className={`py-2.5 text-xs font-black rounded-xl transition-all duration-300 ${formData.base_acuity === level
                                    ? "bg-blue-600 text-white shadow-lg"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Symptoms */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <Info className="w-3 h-3 text-slate-500" />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Presentation</label>
                    </div>
                    <textarea
                        className={`${inputClasses} min-h-[90px] resize-none`}
                        placeholder="Symptoms (e.g. Fever, Cough...)"
                        value={formData.symptoms}
                        onChange={e => setFormData({ ...formData, symptoms: e.target.value })}
                    />
                </div>

                {/* Vitals Grid */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "HR", icon: Activity, color: "text-rose-500", key: "hr", placeholder: "72" },
                        { label: "BP", icon: Droplets, color: "text-blue-500", key: "bp", placeholder: "120/80" },
                        { label: "SpO2", icon: Thermometer, color: "text-emerald-500", key: "spo2", placeholder: "98" }
                    ].map(vital => (
                        <div key={vital.label} className="space-y-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${vital.color} flex items-center gap-1`}>
                                <vital.icon className="w-3 h-3" /> {vital.label}
                            </span>
                            <input
                                placeholder={vital.placeholder}
                                className="w-full bg-slate-950/40 border border-slate-800/60 rounded-xl px-3 py-2 text-slate-100 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                                value={(formData as any)[vital.key]}
                                onChange={e => setFormData({ ...formData, [vital.key]: e.target.value })}
                            />
                        </div>
                    ))}
                </div>

                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    className="w-full py-4 mt-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-900/20"
                >
                    Commit Check-In
                </motion.button>
            </form>
        </motion.div>
    );
}