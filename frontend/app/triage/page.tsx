"use client";

import React, { useState } from 'react';
import { User, Heart, Activity, CheckCircle, AlertTriangle, ArrowRight, Activity as Pulse, ShieldAlert, Binary, Fingerprint, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { endpoints } from '@/utils/api';

interface TriageResponse {
  patient_name: string;
  patient_age: number;
  esi_level: number;
  acuity: string;
  assigned_bed: string;
  color: string;
  action: string;
  ai_justification: string;
}

export default function TriagePage() {
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_age: '',
    gender: '', // New Gender State
    spo2: '',
    heart_rate: '',
    symptoms: ''
  });
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!formData.gender) return alert("Please select Subject Gender"); // Validation for Gender

    setLoading(true);
    try {
      const res = await fetch(endpoints.triageAssess, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: formData.patient_name,
          patient_age: parseInt(formData.patient_age),
          gender: formData.gender, // Passing Gender to API
          vitals: {
            spo2: parseInt(formData.spo2),
            heart_rate: parseInt(formData.heart_rate),
          },
          symptoms: formData.symptoms.split(',').map(s => s.trim())
        })
      });

      if (!res.ok) {
        if (res.status === 422) {
          throw new Error("Validation Error: Please check input fields.");
        }
        throw new Error(`System Error: ${res.statusText}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error("Critical: Triage Link Severed", err);
      // Differentiate Network vs Validation errors
      const msg = err.message || "Network Error: Backend Unreachable";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ patient_name: '', patient_age: '', gender: '', spo2: '', heart_rate: '', symptoms: '' });
    setResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-black text-slate-200 p-8 font-sans selection:bg-blue-500/30">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-5%] right-[-5%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-12 flex justify-between items-end border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Fingerprint size={18} className="text-blue-400" />
              </div>
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">Biometric Intake Phase</span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter italic uppercase">
              Phrelis<span className="text-blue-500">OS</span>
            </h1>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Protocol</p>
            <p className="text-xs font-bold text-white uppercase tracking-tighter">AI-Triage.v2.4</p>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-[#080808] border border-white/10 rounded-[2rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <form onSubmit={handleSubmit} className="relative z-10 space-y-10">

                {errorMsg && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-pulse">
                    <AlertTriangle className="text-red-500" size={20} />
                    <span className="text-sm font-bold text-red-400 uppercase">{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Subject Identity</label>
                    <input
                      type="text" required value={formData.patient_name}
                      onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white focus:border-blue-500/40 transition-all outline-none font-bold placeholder:text-slate-800"
                      placeholder="SCANNING FULL LEGAL NAME..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Age (Cycles)</label>
                      <input
                        type="number" required value={formData.patient_age}
                        onChange={(e) => setFormData({ ...formData, patient_age: e.target.value })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white focus:border-blue-500/40 transition-all outline-none font-bold placeholder:text-slate-800"
                        placeholder="00"
                      />
                    </div>

                    {/* GENDER SELECTION UI */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                        <Users size={10} /> Biological Gender
                      </label>
                      <select
                        required
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white focus:border-blue-500/40 transition-all outline-none font-bold appearance-none cursor-pointer"
                      >
                        <option value="" disabled className="bg-black">SELECT</option>
                        <option value="Male" className="bg-black">MALE</option>
                        <option value="Female" className="bg-black">FEMALE</option>
                        <option value="Other" className="bg-black">OTHER</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* VITALS SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-white/5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Pulse size={12} className="text-blue-400" /> SpO2 Saturation
                    </label>
                    <input
                      type="number" required value={formData.spo2}
                      onChange={(e) => setFormData({ ...formData, spo2: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-blue-400 focus:border-blue-400/40 outline-none font-black text-3xl font-mono"
                      placeholder="98"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Heart size={12} className="text-red-500" /> BPM Frequency
                    </label>
                    <input
                      type="number" required value={formData.heart_rate}
                      onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-red-500 focus:border-red-500/40 outline-none font-black text-3xl font-mono"
                      placeholder="72"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Presenting Pathologies</label>
                  <textarea
                    required rows={3} value={formData.symptoms}
                    onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white focus:border-indigo-500/40 transition-all outline-none font-bold resize-none placeholder:text-slate-800"
                    placeholder="ENTER SYMPTOMS SEPARATED BY COMMAS..."
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full py-6 bg-white text-black font-black rounded-2xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-4 tracking-[0.4em] uppercase text-[10px] shadow-2xl"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Establish Triage Link <ArrowRight size={18} /></>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-12 md:p-16 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-2 ${result.esi_level <= 2 ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]' : 'bg-emerald-500'}`} />

              <div className="mb-12">
                <div className={`mx-auto w-24 h-24 rounded-3xl flex items-center justify-center mb-8 border-2 ${result.esi_level <= 2 ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.2)]' : 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                  }`}>
                  {result.esi_level <= 2 ? <ShieldAlert size={48} /> : <CheckCircle size={48} />}
                </div>
                <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter italic">Assessment Complete</h2>
                <div className="inline-block mt-4">
                  <span className={`px-6 py-2 rounded-full font-black text-[10px] tracking-[0.3em] border ${result.esi_level <= 2 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                    ESI PRIORITY: LEVEL {result.esi_level}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-12">
                <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 group hover:border-blue-500/30 transition-all">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <User size={12} className="text-blue-500" /> Subject Identity
                  </p>
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-white uppercase leading-none tracking-tighter">{result.patient_name}</span>
                    <span className="text-xs font-bold text-slate-400 mt-2">{result.patient_age} Standard Cycles • {formData.gender}</span>
                  </div>
                </div>

                <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 group hover:border-blue-500/30 transition-all">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Binary size={12} className="text-blue-500" /> Unit Allocation
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-blue-500 uppercase leading-none italic">{result.assigned_bed}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Sync</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 p-8 rounded-[2rem] bg-white/[0.03] border border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Diagnostic Acuity Profile</p>
                    <Activity size={16} className="text-slate-700" />
                  </div>
                  <div className="flex flex-col gap-1">
    <span className={`text-2xl font-black uppercase tracking-tight ${result.esi_level <= 2 ? 'text-red-500' : 'text-emerald-500'}`}>
      {result.acuity} STATUS: {result.esi_level <= 2 ? 'CRITICAL CARE' : 'PHYSIOLOGICALLY STABLE'}
    </span>
    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
      Pathophysiological Hypothesis Active
    </span>
  </div>
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 italic">AI Neural Justification</p>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed italic border-l-2 border-white/10 pl-4">
                      &quot;{result.ai_justification}&quot;
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={resetForm}
                className="w-full md:w-auto px-16 py-5 bg-white text-black font-black rounded-2xl hover:bg-blue-600 hover:text-white transition-all transform active:scale-95 shadow-2xl uppercase text-[10px] tracking-[0.4em]"
              >
                Reset Intake Portal
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}