"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, Activity, Thermometer, Droplets, User, Calendar, Info, ShieldCheck, Search, Sparkles, AlertTriangle } from "lucide-react";

export default function QueueIncoming({ onCheckIn }: { onCheckIn: (data: any) => void }) {
    const [formData, setFormData] = useState({
        patient_name: "",
        patient_age: "",
        gender: "Male",
        base_acuity: "3",
        complaint: "",
        symptoms: "",
        icd_code: "",
        icd_description: "",
        icd_rationale: "",
        triage_urgency: "",
        hr: "",
        bp: "",
        spo2: ""
    });

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAIAnalyze = async () => {
        if (!formData.complaint && !formData.symptoms) {
            setError("Please enter a complaint or symptoms first.");
            return;
        }
        setIsAnalyzing(true);
        setError(null);
        try {
            const res = await fetch("http://localhost:8000/api/clinical/classify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    complaint: formData.complaint,
                    symptoms: formData.symptoms
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "AI classification failed.");
            }

            const data = await res.json();
            setFormData(prev => ({
                ...prev,
                icd_code: data.icd_code,
                icd_description: data.official_description,
                icd_rationale: data.clinical_rationale,
                triage_urgency: data.triage_urgency
            }));
        } catch (err: any) {
            console.error("AI Analysis failed", err);
            setError(err.message || "Failed to fetch AI analysis. Check backend connectivity.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Clean data for backend Pydantic model
        const submitData = {
            patient_name: formData.patient_name,
            patient_age: parseInt(formData.patient_age),
            gender: formData.gender,
            base_acuity: parseInt(formData.base_acuity),
            symptoms: formData.symptoms.split(",").map((s: string) => s.trim()).filter((s: string) => s),
            icd_code: formData.icd_code || null,
            icd_rationale: formData.icd_rationale || null,
            triage_urgency: formData.triage_urgency || null,
            vitals: {
                hr: parseInt(formData.hr) || 0,
                bp: formData.bp || "120/80",
                spo2: parseInt(formData.spo2) || 98
            }
        };

        onCheckIn(submitData);

        setFormData({
            patient_name: "", patient_age: "", gender: "Male",
            base_acuity: "3", complaint: "", symptoms: "", icd_code: "",
            icd_description: "", icd_rationale: "", triage_urgency: "",
            hr: "", bp: "", spo2: ""
        });
        setError(null);
    };

    const inputClasses = "w-full bg-slate-950/50 border border-slate-800/60 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-slate-600 shadow-inner";

    return (
        <motion.div
            layout
            className="relative p-6 border border-white/5 bg-[#0a0c14]/80 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl"
        >
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                    <PlusCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">Bio-Intake</h2>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">Operational Protocol v2.5</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <User className="w-3 h-3" /> Identity
                        </label>
                        <input
                            required
                            className={inputClasses}
                            placeholder="Patient Name"
                            value={formData.patient_name}
                            onChange={e => setFormData({ ...formData, patient_name: e.target.value })}
                        />
                    </div>

                    <div className="col-span-4 space-y-2">
                        <input
                            required
                            type="number"
                            className={inputClasses}
                            placeholder="Age"
                            value={formData.patient_age}
                            onChange={e => setFormData({ ...formData, patient_age: e.target.value })}
                        />
                    </div>
                    <div className="col-span-8">
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

                <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Info className="w-3 h-3" /> Clinical Context
                        </label>
                        <input
                            className={inputClasses}
                            placeholder="Primary Complaint (e.g., Sudden Chest Pain)"
                            value={formData.complaint}
                            onChange={e => setFormData({ ...formData, complaint: e.target.value })}
                        />
                        <textarea
                            className={`${inputClasses} min-h-[60px] resize-none mt-2`}
                            placeholder="Supporting Symptoms (CSV)"
                            value={formData.symptoms}
                            onChange={e => setFormData({ ...formData, symptoms: e.target.value })}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleAIAnalyze}
                        disabled={isAnalyzing}
                        className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                        {isAnalyzing ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                <Sparkles className="w-3 h-3" />
                            </motion.div>
                        ) : <Sparkles className="w-3 h-3" />}
                        {isAnalyzing ? "Processing..." : "AI Analyze Core"}
                    </button>

                    {error && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-500 font-bold flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3" />
                            {error}
                        </div>
                    )}

                    <AnimatePresence>
                        {formData.icd_code && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="space-y-3 pt-2"
                            >
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="font-black text-emerald-500 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                                        ICD: {formData.icd_code}
                                    </span>
                                    <span className={`font-black px-2 py-0.5 rounded border ${formData.triage_urgency === 'CRITICAL' || formData.triage_urgency === 'EMERGENCY' ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' :
                                            formData.triage_urgency === 'URGENT' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                                                'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                                        }`}>
                                        {formData.triage_urgency}
                                    </span>
                                </div>
                                <p className="text-[10px] text-white font-medium italic">{formData.icd_description}</p>
                                <div className="p-2 bg-black/40 rounded-lg border border-white/5 text-[9px] text-slate-400 leading-relaxed font-mono">
                                    <AlertTriangle className="w-2.5 h-2.5 inline mr-1 mb-0.5 text-amber-500" />
                                    {formData.icd_rationale}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "HR", icon: Activity, color: "text-rose-500", key: "hr" },
                        { label: "BP", icon: Droplets, color: "text-blue-500", key: "bp" },
                        { label: "SpO2", icon: Thermometer, color: "text-emerald-500", key: "spo2" }
                    ].map(vital => (
                        <div key={vital.label} className="bg-black/20 p-3 rounded-2xl border border-white/5">
                            <span className={`text-[8px] font-black uppercase tracking-widest ${vital.color} flex items-center gap-1 mb-2`}>
                                <vital.icon className="w-2.5 h-2.5" /> {vital.label}
                            </span>
                            <input
                                placeholder="--"
                                className="w-full bg-transparent text-slate-100 text-sm text-center focus:outline-none"
                                value={(formData as any)[vital.key]}
                                onChange={e => setFormData({ ...formData, [vital.key]: e.target.value })}
                            />
                        </div>
                    ))}
                </div>

                <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Activity className="w-3 h-3 text-blue-500" /> ESI Triage
                    </label>
                    <div className="grid grid-cols-5 p-1 bg-black/40 rounded-2xl border border-white/5 gap-1.5">
                        {["1", "2", "3", "4", "5"].map(level => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setFormData({ ...formData, base_acuity: level })}
                                className={`py-2 text-[10px] font-black rounded-xl transition-all ${formData.base_acuity === level
                                    ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                    : "text-slate-600 hover:text-slate-300 hover:bg-white/5"
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: "#2563eb" }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full py-4 bg-blue-700 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-blue-900/40 border border-blue-400/20"
                >
                    Commit Check-In
                </motion.button>
            </form>
        </motion.div>
    );
}
