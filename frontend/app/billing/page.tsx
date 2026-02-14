"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { Search, Receipt, DollarSign, Clock, Package, Activity, Download, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import FinancialTimeline from "@/components/FinancialTimeline";
import LiveTotalCard from "@/components/LiveTotalCard";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SmartBillingPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [patientId, setPatientId] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const { data: billingData, error } = useSWR(
        patientId ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/billing/live/${patientId}` : null,
        fetcher,
        { refreshInterval: 1000 } // Real-time refresh
    );

    const handleSearch = async () => {
        if (!searchTerm) return;
        setIsSearching(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/patients/search?q=${searchTerm}`);
            const results = await res.json();
            if (results && results.length > 0) {
                setPatientId(results[0].id);
            } else {
                setPatientId(searchTerm);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30">
            <Navbar />

            <main className="max-w-7xl mx-auto p-8 pt-24 space-y-12">
                {/* Header & Search */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-2 text-center md:text-left">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase italic flex items-center gap-4">
                            <span className="text-cyan-500">Smart</span> Billing
                        </h1>
                        <p className="text-gray-500 font-mono text-sm tracking-widest uppercase">Dynamic Revenue Orchestration</p>
                    </div>

                    <div className="relative w-full max-w-md group">
                        <div className="absolute inset-0 bg-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative flex items-center bg-gray-900 border border-white/10 rounded-2xl p-4 focus-within:border-cyan-500 transition-all">
                            <Search className="text-gray-500 mr-4" />
                            <input
                                type="text"
                                placeholder="Search MRN or Patient Name..."
                                className="bg-transparent border-none outline-none w-full text-white font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSearch();
                                    }
                                }}
                            />
                            <button
                                onClick={handleSearch}
                                disabled={isSearching}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-xl text-xs font-black transition-colors disabled:opacity-50"
                            >
                                {isSearching ? "..." : "FETCH"}
                            </button>
                        </div>
                    </div>
                </div>

                {patientId && billingData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* Left Column: Stats & Animated Total */}
                        <div className="lg:col-span-4 space-y-8">
                            <LiveTotalCard data={billingData} />

                            <div className="bg-gray-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Patient Context</h3>
                                <div className="space-y-4">
                                    <ContextItem icon={<Hash size={14} />} label="Patient ID" value={billingData.patient_id} />
                                    <ContextItem icon={<Clock size={14} />} label="Admission" value={new Date(billingData.bed_info.admission_time).toLocaleString()} />
                                    <ContextItem icon={<Package size={14} />} label="Bed Category" value={billingData.bed_info.category} color="text-cyan-400" />
                                    <ContextItem icon={<DollarSign size={14} />} label="Daily Rate" value={`₹${billingData.bed_info.daily_rate}`} />
                                </div>
                            </div>

                            <button className="w-full py-4 rounded-3xl bg-white text-black font-black flex items-center justify-center gap-3 hover:bg-cyan-500 hover:text-white transition-all shadow-xl shadow-cyan-500/10 uppercase italic">
                                <Download size={20} />
                                Generate Final Invoice
                            </button>
                        </div>

                        {/* Right Column: Financial Timeline */}
                        <div className="lg:col-span-8">
                            <FinancialTimeline ledger={billingData.ledger} />
                        </div>
                    </div>
                ) : (
                    <div className="h-[50vh] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                        <Activity className="w-16 h-16 text-gray-800 animate-pulse mb-6" />
                        <p className="text-gray-500 font-mono text-sm uppercase tracking-[0.2em]">Enter a Patient ID to initialize billing bridge</p>
                    </div>
                )}
            </main>
        </div>
    );
}

function ContextItem({ icon, label, value, color = "text-white" }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-400">
                {icon}
                <span className="text-xs font-medium">{label}</span>
            </div>
            <span className={`text-sm font-bold ${color}`}>{value}</span>
        </div>
    );
}
