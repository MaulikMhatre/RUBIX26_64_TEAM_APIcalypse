

"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
// Added Scissors icon for Surgery
import { Clock, Search, Activity, Calendar, ArrowLeft, Filter, AlertCircle, FileText, Scissors, Microscope } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { endpoints } from '@/utils/api';

export interface HistoryRecord {
  id: string;
  timestamp: string;
  patient_name: string;
  patient_age: number;
  condition: string;
  esi_level: number;
  acuity: string;
  symptoms: string[];
}

// Interface for Surgery Data
export interface SurgeryRecord {
  id: number;
  room_id: string;
  patient_name: string;
  patient_age: number;
  surgeon_name: string;
  total_duration_minutes: number;
  overtime_minutes: number;
  end_time: string;
}

// Interface for OPD Data
export interface OPDRecord {
  id: number;
  patient_name: string;
  patient_age: number;
  gender: string;
  icd_code: string;
  icd_rationale: string;
  triage_urgency: string;
  priority_score: number;
  check_in_time: string;
}

export default function HistoryPage() {
  // NEW: State to toggle between Clinical, Surgery and OPD views
  const [activeTab, setActiveTab] = useState<"CLINICAL" | "SURGERY" | "OPD">("CLINICAL");
  const [history, setHistory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        setError(null);
        // NEW: Conditional URL based on the active tab
        let url = "";
        if (activeTab === "CLINICAL") url = endpoints.historyByDate(selectedDate);
        else if (activeTab === "SURGERY") url = endpoints.historySurgery;
        else url = endpoints.historyOpd;

        console.log("Fetching history from:", url); // Debug Log
        const res = await fetch(url, { cache: 'no-store' });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Server Error ${res.status}: ${res.statusText} - ${errorText}`);
        }

        const data = await res.json();
        setHistory(data);
      } catch (err) {
        setError("Could not connect to the medical server. Ensure the backend is running on port 8000.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedDate, activeTab]); // Re-fetch when tab changes

  const filteredHistory = history.filter(item => {
    // Use optional chaining and fallbacks to empty strings
    const name = (item.patient_name || "").toLowerCase();
    const surgeon = (item.surgeon_name || "").toLowerCase();
    const condition = (item.condition || "").toLowerCase();
    const icd = (item.icd_code || "").toLowerCase();
    const id = (item.id?.toString() || "").toLowerCase();
    const search = searchTerm.toLowerCase();

    return name.includes(search) ||
      surgeon.includes(search) ||
      condition.includes(search) ||
      icd.includes(search) ||
      id.includes(search);
  });

  const getUrgencyBadge = (urgency: string) => {
    const normalized = urgency?.toUpperCase();
    if (normalized === 'CRITICAL' || normalized === 'EMERGENCY') {
      return <span className="px-2 py-0.5 rounded border text-rose-500 bg-rose-500/10 border-rose-500/20 font-black text-[8px] uppercase tracking-widest">CRITICAL</span>;
    }
    if (normalized === 'URGENT') {
      return <span className="px-2 py-0.5 rounded border text-amber-500 bg-amber-500/10 border-amber-500/20 font-black text-[8px] uppercase tracking-widest">URGENT</span>;
    }
    return <span className="px-2 py-0.5 rounded border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 font-black text-[8px] uppercase tracking-widest">STABLE</span>;
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-8">
          <div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                {activeTab === "CLINICAL" && <Clock className="text-indigo-400 w-6 h-6" />}
                {activeTab === "SURGERY" && <Scissors className="text-purple-400 w-6 h-6" />}
                {activeTab === "OPD" && <Microscope className="text-emerald-400 w-6 h-6" />}
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white uppercase">
                {activeTab === "CLINICAL" && "Clinical Logs"}
                {activeTab === "SURGERY" && "Surgical Logs"}
                {activeTab === "OPD" && "OPD History"}
              </h1>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-500 font-medium tracking-wide pl-16">
              Secure Archival Record System • PHRELIS OS
            </motion.p>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab("CLINICAL")}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "CLINICAL" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-200"}`}
            >
              <Activity size={14} /> Clinical
            </button>
            <button
              onClick={() => setActiveTab("SURGERY")}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "SURGERY" ? "bg-purple-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-200"}`}
            >
              <Scissors size={14} /> Surgery
            </button>
            <button
              onClick={() => setActiveTab("OPD")}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "OPD" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-200"}`}
            >
              <Microscope size={14} /> OPD Logs
            </button>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/admin" className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              <ArrowLeft size={16} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Admin</span>
            </Link>

            {/* Show Date Picker only for Clinical view */}
            {activeTab === "CLINICAL" && (
              <div className="flex items-center gap-3 bg-[#0a0a0a] px-5 py-3 rounded-xl border border-white/10">
                <Calendar size={18} className="text-indigo-500" />
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-slate-200 font-mono text-sm outline-none cursor-pointer uppercase tracking-widest [&::-webkit-calendar-picker-indicator]:invert" />
              </div>
            )}
          </div>
        </header>

        {/* ERROR STATE */}
        <AnimatePresence>{error && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-4 bg-rose-950/30 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center gap-3 overflow-hidden font-bold text-sm"><AlertCircle className="w-5 h-5 flex-shrink-0" />{error}</motion.div>}</AnimatePresence>

        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400" size={20} />
            <input type="text" placeholder={`Search ${activeTab.toLowerCase()} records...`} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#0a0a0a] border border-white/10 focus:border-indigo-500/50 outline-none text-slate-200 transition-all" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button className="px-6 py-4 rounded-2xl bg-[#0a0a0a] border border-white/10 text-slate-400 hover:text-white flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-all"><Filter size={16} />Filter</button>
        </div>

        {/* DATA TABLE */}
        <div className="rounded-3xl border border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-500">
              <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Retrieving Archives...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Timestamp</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Patient Identity</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{activeTab === "CLINICAL" ? "Status" : activeTab === "SURGERY" ? "Surgeon" : "Clinical Intel"}</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{activeTab === "CLINICAL" ? "Triage Level" : activeTab === "SURGERY" ? "Duration" : "AI Rationale"}</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{activeTab === "CLINICAL" ? "Acuity" : activeTab === "SURGERY" ? "Overtime" : "Score"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((row, i) => (
                      <motion.tr key={row.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="group hover:bg-white/[0.02] transition-colors relative">
                        <td className="p-6">
                          {/* Hover Glow Effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/[0.02] to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                          <span className="font-mono text-sm text-slate-400" suppressHydrationWarning>
                            {(() => {
                              const rawDate = row.timestamp || row.end_time || row.check_in_time;
                              if (!rawDate) return "N/A";

                              // Append 'Z' if it's missing to force UTC interpretation
                              const dateStr = rawDate.endsWith('Z') ? rawDate : `${rawDate}Z`;
                              const dateObj = new Date(dateStr);

                              return isNaN(dateObj.getTime())
                                ? "TIME ERROR"
                                : dateObj.toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                });
                            })()}
                          </span>
                        </td>
                        <td className="p-6 relative">
                          <div className="font-bold text-slate-200 group-hover:text-white transition-colors text-lg">{row.patient_name || "Unknown Patient"}</div>
                          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-1">Age: {row.patient_age} • {row.gender}</div>
                        </td>
                        <td className="p-6 relative">
                          {activeTab === "CLINICAL" && (
                            <div className="flex items-center gap-2">
                              <Activity size={16} className="text-indigo-500" />
                              <span className="text-sm font-medium text-slate-300">{row.condition || "Stable"}</span>
                            </div>
                          )}
                          {activeTab === "SURGERY" && (
                            <span className="text-sm font-bold text-purple-400">{row.surgeon_name}</span>
                          )}
                          {activeTab === "OPD" && (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <Microscope size={14} className="text-emerald-500" />
                                <span className="text-sm font-black text-slate-200">ICD: {row.icd_code || "N/A"}</span>
                              </div>
                              {getUrgencyBadge(row.triage_urgency)}
                            </div>
                          )}
                        </td>
                        <td className="p-6 relative">
                          {activeTab === "CLINICAL" && (
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${row.esi_level === 1 ? 'bg-rose-950/30 border-rose-500/30 text-rose-400' : 'bg-orange-950/30 border-orange-500/30 text-orange-400'}`}>
                              Level {row.esi_level}
                            </span>
                          )}
                          {activeTab === "SURGERY" && (
                            <span className="text-sm font-mono text-slate-300">{row.total_duration_minutes} Minutes</span>
                          )}
                          {activeTab === "OPD" && (
                            <div className="max-w-[280px]">
                              <p className="text-[10px] text-slate-500 italic leading-relaxed font-serif">
                                {row.icd_rationale ? `"${row.icd_rationale}"` : "AI audit log unavailable."}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="p-6 relative">
                          {activeTab === "CLINICAL" && (
                            <span className="text-sm font-bold text-slate-400">{row.acuity}</span>
                          )}
                          {activeTab === "SURGERY" && (
                            <span className={`text-sm font-black ${row.overtime_minutes > 0 ? 'text-rose-500' : 'text-green-500'}`}>
                              {row.overtime_minutes > 0 ? `+${row.overtime_minutes}m Over` : "On Time"}
                            </span>
                          )}
                          {activeTab === "OPD" && (
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              <span className="text-sm font-mono font-black text-blue-400">{row.priority_score?.toFixed(1) || "0.0"}</span>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-50">
                          <FileText size={48} className="text-slate-600" />
                          <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No records found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
