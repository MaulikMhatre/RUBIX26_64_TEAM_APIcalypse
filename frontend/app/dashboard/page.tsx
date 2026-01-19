"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

// Components
import LiveHeatmap from "@/components/LiveHeatmap";
import DashboardWidgets from "@/components/DashboardWidgets";
import MindPredictions from "@/components/MindPredictions";

// Icons
import {
    Activity,
    Users,
    AlertCircle,
    BedDouble,
    HeartPulse,
    Zap,
    Timer,
} from "lucide-react";

import { endpoints, WS_BASE_URL } from '@/utils/api';

interface DashboardData {
    occupancy: { ER: number; ICU: number; Surgery: number; Wards: number };
    bed_stats: { total: number; occupied: number; available: number; free_beds: number };
    staff_ratio: string;
    resources: any;
    system_status: { diversion_active: boolean; occupancy_rate: number };
}

export default function DashboardPage() {
    const router = useRouter();

    // State Management
    const [data, setData] = useState<DashboardData | null>(null);
    const [surge, setSurge] = useState<any>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [criticalAlert, setCriticalAlert] = useState<string | null>(null);
    const [stressScore, setStressScore] = useState<number>(0);
    const [time, setTime] = useState(new Date());

    // 1. RBAC Security Check
    useEffect(() => {
        const role = localStorage.getItem('role');
        const token = localStorage.getItem('token');

        if (!token) {
            router.push('/login');
        } else if (role === 'Nurse') {
            router.push('/staff/worklist');
        }
    }, [router]);


    const fetchData = useCallback(async () => {
        try {
            // Parallel fetching for better performance
            const [statsRes, surgeRes] = await Promise.all([
                fetch(endpoints.dashboardStats),
                fetch(endpoints.timeToCapacity)
            ]);

            const json = await statsRes.json();
            const surgeData = await surgeRes.json();

            // Safety check: ensure bed_stats exists to prevent the TypeError
            const bedStats = json?.bed_stats || { available: 0, occupied: 0, total: 1 };
            const calculatedFreeBeds = Math.max(0, bedStats.total - bedStats.occupied);
            setSurge(surgeData);
            const freeBeds = Math.max(0, bedStats.total - bedStats.occupied);
            const adaptedData: DashboardData = {
                ...json,
                bed_stats: {
                    ...bedStats,
                    free_beds: calculatedFreeBeds
                },
                system_status: {
                    // Fix: Using the safe bedStats reference
                    diversion_active: bedStats.available === 0,
                    occupancy_rate: Math.round((bedStats.occupied / (bedStats.total || 1)) * 100)
                }
            };

            setData(adaptedData);

            // Stress Score Calculation Logic
            const occ = adaptedData.system_status.occupancy_rate / 100;
            const vel = Math.min((surgeData?.velocity || 0) / 120, 1);
            const ttc = 1 - Math.min((surgeData?.minutes_remaining || 0) / 120, 1);
            const score = Math.round(100 * (0.5 * occ + 0.3 * vel + 0.2 * ttc));

            setStressScore(score);

            // Auto-trigger simulation if stress is too high
            if (score >= 85) setIsSimulating(true);

        } catch (err) {
            console.error("Command Center Sync Error", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // 3. Real-time Subscriptions
    useEffect(() => {
        fetchData();
        const poll = setInterval(fetchData, 5000);
        const clock = setInterval(() => setTime(new Date()), 1000);

        const ws = new WebSocket(`${WS_BASE_URL}/ws/vitals`);
        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === "CRITICAL_VITALS") {
                setCriticalAlert(msg.message);
                setTimeout(() => setCriticalAlert(null), 10000);
            }
        };

        return () => {
            clearInterval(poll);
            clearInterval(clock);
            ws.close();
        };
    }, [fetchData]);

    if (loading || !data) return <LoadingState />;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-screen w-full bg-black text-slate-100 flex overflow-hidden"
        >
            <main className="flex-1 flex flex-col relative min-w-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black">

                {/* Simulation Banner */}
                <AnimatePresence>
                    {isSimulating && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="w-full bg-rose-600 text-white py-1 text-[10px] font-black tracking-[0.4em] text-center uppercase z-50 animate-pulse"
                        >
                            Surge Simulation Mode Active: Mass Casualty Protocol
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex-1 overflow-y-auto px-12 py-10 space-y-14 custom-scrollbar">

                    {/* Header Section */}
                    <header className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-4 mb-3">
                                <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black tracking-[0.35em] uppercase">
                                    Intelligence Division
                                </span>
                                <span className="text-slate-500 text-[10px] font-mono tracking-widest">
                                    {time.toLocaleTimeString()}
                                </span>
                            </div>
                            <h1 className="text-6xl font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-500">
                                Hospital Command Center
                            </h1>
                        </div>

                        <button
                            onClick={() => setIsSimulating(!isSimulating)}
                            className={`group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-black tracking-tight border transition-all duration-300 ${isSimulating
                                ? "bg-rose-600 border-rose-500 text-white shadow-[0_0_40px_rgba(225,29,72,0.5)]"
                                : "bg-white/5 border-white/10 text-slate-300 hover:border-indigo-500/50 hover:text-indigo-400"
                                }`}
                        >
                            <Zap className={`w-5 h-5 ${isSimulating ? 'animate-pulse' : ''}`} />
                            <span>{isSimulating ? `Stress: ${stressScore}` : "Evaluate Stress"}</span>
                        </button>
                    </header>

                    {/* Critical Alert Component */}
                    <AnimatePresence>
                        {criticalAlert && (
                            <CriticalAlertUI message={criticalAlert} onClose={() => setCriticalAlert(null)} />
                        )}
                    </AnimatePresence>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <MetricCard label="Capacity" value={`${data.system_status.occupancy_rate}%`} icon={<Activity />} />
                        <MetricCard label="Doctor Ratio" value={data.staff_ratio} icon={<Users />} />
                        {/* Free Beds Intelligence Card (Matches MetricCard CSS) */}
                        <div className={`group relative backdrop-blur-xl p-8 rounded-[2.5rem] border transition-all duration-300 hover:border-indigo-500/30 ${(data.bed_stats.free_beds || 0) <= 2
                            ? "bg-rose-950/40 border-rose-500 text-rose-200 shadow-[0_0_40px_rgba(225,29,72,0.2)]"
                            : "bg-white/5 border-white/5 text-slate-300"
                            }`}>
                            {/* Icon Container - Matches MetricCard styling */}
                            <div className="inline-flex p-4 bg-white/5 rounded-2xl mb-8 text-indigo-500 group-hover:scale-110 transition-transform">
                                <BedDouble size={32} />
                            </div>

                            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-500 mb-2">Neural Availability</p>

                            <div className="flex items-baseline gap-2">
                                <p className="text-5xl font-black tracking-tight text-white">
                                    {data.bed_stats.free_beds || 0}
                                </p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Beds Free</p>
                            </div>

                            {/* Progress Bar for high-end look */}
                            <div className="mt-6 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(data.bed_stats.occupied / data.bed_stats.total) * 100}%` }}
                                    className={`h-full transition-all duration-1000 ${(data.bed_stats.free_beds || 0) <= 2 ? 'bg-rose-500' : 'bg-indigo-500'
                                        }`}
                                />
                            </div>
                        </div>

                        <StatusCard active={data.system_status.diversion_active} isSimulating={isSimulating} />
                    </div>

                    {/* Visualizations Section */}
                    <section className="space-y-14 pb-10">
                        <MindPredictions />
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-14">
                            <LiveHeatmap occupancy={data.occupancy} isSimulating={isSimulating} />
                            <DashboardWidgets resources={data.resources} />
                        </div>
                    </section>

                </div>
            </main>
        </motion.div>
    );
}

// --- Sub-Components ---

const MetricCard = ({ label, value, icon }: any) => (
    <div className="group relative bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/30 transition-all">
        <div className="inline-flex p-4 bg-white/5 rounded-2xl mb-8 text-indigo-500 group-hover:scale-110 transition-transform">
            {React.cloneElement(icon, { size: 32 })}
        </div>
        <p className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-500 mb-2">{label}</p>
        <p className="text-5xl font-black tracking-tight text-white">{value}</p>
    </div>
);

const StatusCard = ({ active, isSimulating }: any) => (
    <div className={`p-8 rounded-[2.5rem] border flex flex-col justify-between transition-all ${active || isSimulating ? "bg-rose-950/30 border-rose-500 text-rose-500" : "bg-emerald-950/30 border-emerald-500/30 text-emerald-400"
        }`}>
        <AlertCircle className="w-10 h-10 mb-4" />
        <div>
            <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-60">System Status</p>
            <p className="text-4xl font-black uppercase tracking-tight">{active || isSimulating ? "Diversion" : "Normal"}</p>
        </div>
    </div>
);

const CriticalAlertUI = ({ message, onClose }: any) => (
    <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
        className="bg-rose-950/20 border border-rose-500/30 rounded-[2rem] p-8 flex justify-between items-center backdrop-blur-md"
    >
        <div className="flex items-center gap-6">
            <div className="p-4 bg-rose-600 rounded-2xl animate-pulse">
                <HeartPulse className="w-8 h-8 text-white" />
            </div>
            <p className="text-2xl font-black uppercase tracking-tight text-rose-100 italic">Code Red: {message}</p>
        </div>
        <button onClick={onClose} className="px-8 py-3 rounded-xl bg-rose-600 font-bold text-white text-sm hover:bg-rose-500">
            ACKNOWLEDGE
        </button>
    </motion.div>
);

const LoadingState = () => (
    <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
    </div>
);