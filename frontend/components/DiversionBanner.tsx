"use client";
import React, { useState, useEffect } from 'react';
import { useBedOccupancy } from '@/hooks/useBedOccupancy';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, MapPin, Clock, ArrowRight, X } from 'lucide-react';

interface Recommendation {
    hospital: string;
    distance: number;
    available_beds: number;
    load_index: number;
    eta_minutes: number;
}

const DiversionBanner = () => {
    const { percentage } = useBedOccupancy();
    const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

    // Fetch recommendation only if critical
    useEffect(() => {
        if (percentage >= 100) {
            const fetchRec = async () => {
                try {
                    // In a real scenario, this would come from a dedicated endpoint
                    // For now, mocking dynamic data or hitting existing endpoint
                    const res = await fetch('http://localhost:8000/api/diversion/recommend');
                    const data = await res.json();
                    setRecommendation(data.recommendation);
                } catch (e) { console.error(e); }
            };
            fetchRec();
            const interval = setInterval(fetchRec, 10000);
            return () => clearInterval(interval);
        }
    }, [percentage]);

    // Requirement: triggers ONLY when hospital capacity is 100% full.
    // User logic: {bedsFull && <DiversionBanner />}
    // We implement the internal visibility logic here based on hook.

    if (percentage < 100) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-orange-500 text-black overflow-hidden"
            >
                <div className="max-w-[1600px] mx-auto px-8 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 bg-black/10 rounded-full">
                            <AlertTriangle className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-wider">
                                CRITICAL CAPACITY REACHED
                            </span>
                            <span className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">
                                {recommendation
                                    ? `Auto-Routing Incoming EMS to nearest partner: ${recommendation.hospital}`
                                    : "Calculating Optimal Diversion Path..."}
                            </span>
                        </div>

                        {recommendation && (
                            <div className="hidden md:flex items-center gap-6 ml-8 pl-8 border-l border-black/10">
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="opacity-70" />
                                    <span className="text-sm font-black whitespace-nowrap">{recommendation.hospital}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="opacity-70" />
                                    <span className="text-sm font-black whitespace-nowrap">{recommendation.eta_minutes} Min ETA</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {recommendation && (
                            <button
                                className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-black/80 transition-all rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg"
                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(recommendation.hospital)}`, '_blank')}
                            >
                                <span>Navigate</span>
                                <ArrowRight size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DiversionBanner;