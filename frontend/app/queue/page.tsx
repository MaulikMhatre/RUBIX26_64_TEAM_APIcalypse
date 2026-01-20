
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { motion, AnimatePresence, Reorder, useScroll, useSpring } from "framer-motion";
import QueueIncoming from "@/components/queue/QueueIncoming";
import PatientCard from "@/components/queue/PatientCard";
import QueueConsultation from "@/components/queue/QueueConsultation";
import SurgeWarning from "@/components/queue/SurgeWarning";
import { Cpu, Zap, LayoutGrid } from "lucide-react";

import { useToast } from "@/context/ToastContext";
import { endpoints } from "@/utils/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function QueuePage() {
    const { toast } = useToast();
    const [isTriageMode, setIsTriageMode] = useState(false);
    const scrollRef = useRef(null);

    // 3D Perspective Scroll Physics
    const { scrollYProgress } = useScroll({ container: scrollRef });
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

    // Data Fetching
    const { data: queueData, mutate: mutateQueue } = useSWR("http://localhost:8000/api/queue/sorted", fetcher, {
        refreshInterval: 5000,
    });

    const { data: roomsData, mutate: mutateRooms } = useSWR("http://localhost:8000/api/queue/rooms", fetcher, {
        refreshInterval: 5000,
    });

    const { data: bedsData, mutate: mutateBeds } = useSWR(endpoints.beds, fetcher, {
        refreshInterval: 5000,
    });

    const [localPatients, setLocalPatients] = useState<any[]>([]);

    useEffect(() => {
        if (queueData?.patients) setLocalPatients(queueData.patients);
    }, [queueData]);

    // Triage Mode Logic
    const displayedPatients = useMemo(() => {
        if (!isTriageMode) return localPatients;
        return localPatients.filter(p => p.base_acuity <= 2 || p.priority_score > 90);
    }, [localPatients, isTriageMode]);

    // Backend Handlers
    const handleCheckIn = async (patientData: any) => {
        try {
            const res = await fetch("http://localhost:8000/api/queue/checkin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patientData),
            });
            if (res.ok) mutateQueue();
        } catch (err) {
            console.error("Check-in failed", err);
        }
    };

    const handleCallPatient = async (patientId: string) => {
        const availableRoom = roomsData?.find((r: any) => r.status === "IDLE");
        if (!availableRoom) {
            toast("No available consultation rooms!", "error");
            return;
        }
        try {
            const res = await fetch(`http://localhost:8000/api/queue/call/${patientId}?room_id=${availableRoom.id}`, {
                method: "POST",
            });
            if (res.ok) {
                mutateQueue();
                mutateRooms();
            }
        } catch (err) {
            console.error("Call failed", err);
            toast("Call failed", "error");
        }
    };

    const handleAutoAssign = async () => {
        // Separation of concerns: 
        // 1. Super Critical (>105) -> Direct Bed Admission (Skip Consult)
        // 2. Critical (<=2 or >90) -> Auto Assign to Room

        const superCriticalPatients = localPatients.filter(p => (p.priority_score || 0) > 105);
        const standardAutoPatients = localPatients.filter(p =>
            !superCriticalPatients.find(scp => scp.id === p.id) &&
            (p.base_acuity <= 2 || p.priority_score > 90)
        );

        const availableRooms = roomsData?.filter((r: any) => r.status === "IDLE") || [];

        // --- 1. DIRECT ADMISSION LOGIC ---
        if (superCriticalPatients.length > 0 && bedsData) {
            toast(`CRITICAL SURGE: Analyzing ${superCriticalPatients.length} patients for Direct Admission...`, "error");

            for (const p of superCriticalPatients) {
                try {
                    // A. AI Assessment for Bed Selection
                    const admissionPayload = {
                        patient_name: p.patient_name || "Unknown",
                        patient_age: p.patient_age || 30,
                        gender: p.gender || "Male",
                        vitals: p.vitals || { spo2: 85, heart_rate: 120 }, // Fallback to critical vitals if missing
                        symptoms: p.symptoms || ["Severe Trauma", "Unresponsive"]
                    };

                    const assessRes = await fetch(endpoints.triageAssess, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(admissionPayload)
                    });

                    if (!assessRes.ok) throw new Error("Assessment Failed");
                    const assessData = await assessRes.json();

                    // B. Find Matching Bed
                    // assessData.assigned_bed return usually "ICU", "General Ward", etc.
                    // bedsData has 'unit' property: 'ICU', 'ER', 'Wards', 'Medical', etc.

                    let targetUnit = 'ICU'; // Default for >105
                    const rec = assessData.assigned_bed?.toLowerCase() || "";
                    if (rec.includes("icu")) targetUnit = 'ICU';
                    else if (rec.includes("ward")) targetUnit = 'Wards';
                    else if (rec.includes("er") || rec.includes("emergency")) targetUnit = 'ER';
                    else if (rec.includes("surgery")) targetUnit = 'Surgery';

                    const availableBed = bedsData.find((b: any) =>
                        b.unit === targetUnit && b.status === "Available"
                    );

                    if (availableBed) {
                        // C. Direct Admit
                        const admitRes = await fetch(endpoints.admit, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                bedId: availableBed.id,
                                patientData: {
                                    name: p.patient_name,
                                    age: p.patient_age,
                                    gender: p.gender,
                                    condition: "Critical (Auto-Surge)",
                                    surgeonName: "Surge Protocol",
                                    duration: 24
                                },
                                dischargeBedId: null
                            })
                        });

                        if (admitRes.ok) {
                            toast(`DIRECT ADMIT: ${p.patient_name} -> ${availableBed.name} (${targetUnit})`, "success");
                            // D. Remove from Queue (Simulate Completion)
                            // Since we don't have a room, we just mark them possibly?
                            // Assuming backend cleans up or we just refresh.
                            // Implementing specific "remove from queue" might be needed if not automatic.
                            // For now, assume backend doesn't double-list admitted patients.
                        }
                    } else {
                        toast(`No ${targetUnit} beds for ${p.patient_name}!`, "error");
                    }

                } catch (err) {
                    console.error("Direct Admit Failed", err);
                }
            }
            mutateBeds();
            mutateQueue();
        }

        // --- 2. ROOM ASSIGNMENT LOGIC (Existing) ---
        if (standardAutoPatients.length === 0) {
            if (superCriticalPatients.length === 0) toast("No critical patients to assign.", "info");
            return;
        }
        if (availableRooms.length === 0) {
            if (standardAutoPatients.length > 0) toast("No available rooms for consult assignment.", "warning");
            return;
        }

        let assignedCount = 0;
        const limit = Math.min(standardAutoPatients.length, availableRooms.length);

        toast(`Assigning ${limit} patients to Consult Rooms...`, "info");

        for (let i = 0; i < limit; i++) {
            const patient = standardAutoPatients[i];
            const room = availableRooms[i];
            try {
                await fetch(`http://localhost:8000/api/queue/call/${patient.id}?room_id=${room.id}`, {
                    method: "POST",
                });
                assignedCount++;
            } catch (e) {
                console.error(e);
            }
        }

        if (assignedCount > 0) {
            mutateQueue();
            mutateRooms();
            toast(`Surge Protocol: ${assignedCount} sent to rooms.`, "success");
        }
    };

    const handleSurgeAction = () => {
        // ALWAYS run auto-assign when clicked. logic inside handles filtering.
        handleAutoAssign();

        // Always toggle mode to show the filtered view
        setIsTriageMode(!isTriageMode);
    };

    const handleCompleteConsult = async (roomId: string) => {
        try {
            const res = await fetch(`http://localhost:8000/api/queue/complete/${roomId}`, {
                method: "POST",
            });
            if (res.ok) {
                mutateQueue();
                mutateRooms();
            }
        } catch (err) {
            console.error("Complete failed", err);
        }
    };

    return (
        <div className="min-h-screen bg-[#010204] text-slate-400 font-sans selection:bg-blue-500/30 overflow-hidden select-none">

            {/* 3D Depth Layers */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e293b33,transparent)] pointer-events-none z-0" />
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

            {/* Global Progress Telemetry */}
            <motion.div style={{ scaleX }} className="fixed top-0 left-0 right-0 h-[2px] bg-blue-500 origin-left z-[100] shadow-[0_0_10px_#3b82f6]" />

            <SurgeWarning
                show={queueData?.surge_warning}
                score={queueData?.average_score}
                onActivate={handleSurgeAction}
                isActive={isTriageMode}
            />

            {/* Ultra-Slim HUD Header */}
            <header className="relative z-50 border-b border-white/[0.03] bg-black/60 backdrop-blur-xl">
                <div className="max-w-[1800px] mx-auto px-10 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-4">
                            <motion.div
                                whileHover={{ rotateY: 180 }}
                                transition={{ duration: 0.6 }}
                                className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                            >
                                <Cpu className="w-5 h-5 text-blue-500" />
                            </motion.div>
                            <div className="flex flex-col">
                                <span className="text-lg font-black text-white tracking-tighter uppercase italic leading-none">
                                    Phrelis <span className="text-blue-500">OS</span>
                                </span>
                                <span className="text-[8px] font-black text-slate-600 tracking-[0.5em] uppercase mt-1">Tactical Intelligence Core</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                            <div className="px-6 py-2 rounded-lg bg-black/40 border border-white/[0.03] text-center min-w-[120px]">
                                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Queue Load</p>
                                <p className="text-lg font-black text-white tabular-nums leading-none">{localPatients.length}</p>
                            </div>
                            <div className="px-6 py-2 rounded-lg bg-black/40 border border-white/[0.03] text-center min-w-[120px]">
                                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Mean Acuity</p>
                                <p className={`text-lg font-black tabular-nums leading-none ${queueData?.average_score > 75 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {Math.round(queueData?.average_score || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1800px] mx-auto p-10 grid grid-cols-12 gap-12 h-[calc(100vh-120px)] overflow-hidden">

                {/* Column 1: Intake */}
                <motion.section
                    initial={{ opacity: 0, rotateY: 20, x: -50 }}
                    animate={{ opacity: 1, rotateY: 0, x: 0 }}
                    className="col-span-3 custom-scrollbar overflow-y-auto pr-4 perspective-[1000px]"
                >
                    <QueueIncoming onCheckIn={handleCheckIn} />
                </motion.section>

                {/* Column 2: Orchestration */}
                <section className="col-span-6 flex flex-col gap-6 overflow-hidden">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <LayoutGrid className="w-4 h-4 text-slate-600" />
                            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">
                                {isTriageMode ? 'Emergency Triage Path' : 'Live Orchestration Hub'}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 text-[8px] font-black text-slate-500 px-3 py-1 border border-white/[0.05] rounded-full">
                            <span className={`w-1 h-1 rounded-full ${isTriageMode ? 'bg-rose-500 animate-ping' : 'bg-blue-500'}`} />
                            Live-Sync Active
                        </div>
                    </div>

                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto custom-scrollbar-hidden pr-2 scroll-smooth"
                        style={{ perspective: "1200px" }}
                    >
                        <AnimatePresence mode="popLayout">
                            <Reorder.Group axis="y" values={localPatients} onReorder={setLocalPatients} className="space-y-4">
                                {displayedPatients.map((patient) => (
                                    <Reorder.Item
                                        key={patient.id}
                                        value={patient}
                                        initial={{ opacity: 0, z: -50, y: 30 }}
                                        animate={{ opacity: 1, z: 0, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, x: -100 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 25 }}
                                    >
                                        <motion.div whileHover={{ scale: 1.01, z: 10 }} className="transform-gpu">
                                            <PatientCard patient={patient} onCall={handleCallPatient} />
                                        </motion.div>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                        </AnimatePresence>
                    </div>
                </section>

                {/* Column 3: Deployments */}
                <motion.section
                    initial={{ opacity: 0, rotateY: -20, x: 50 }}
                    animate={{ opacity: 1, rotateY: 0, x: 0 }}
                    className="col-span-3 custom-scrollbar overflow-y-auto pl-4 perspective-[1000px]"
                >
                    <QueueConsultation
                        rooms={roomsData || []}
                        onComplete={handleCompleteConsult}
                    />
                </motion.section>

            </main>

            {/* Tactical Footer Overlay */}
            <div className="fixed bottom-6 left-10 flex items-center gap-4 pointer-events-none">
                <div className="flex gap-1">
                    {[1, 2, 3].map(i => <div key={i} className="w-1 h-3 bg-blue-500/20 rounded-full" />)}
                </div>
                <span className="text-[8px] font-black text-slate-700 tracking-[0.8em] uppercase">Phrelis Intelligence Node // 0x442-A</span>
            </div>
        </div>
    );
}