
"use client";
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BedDouble, Activity, BrainCircuit, Package,
  ArrowLeft, Plus, X, MapPin,
  Siren, LogOut, Baby, Stethoscope,
  ShieldAlert, HeartPulse, Timer, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ResourceInventory from '@/components/ResourceInventory';
import SurgerySection from '@/components/SurgerySection';
import { endpoints } from '@/utils/api';
import { useToast } from '@/context/ToastContext';

// --- HELPERS ---
const formatIST = (isoString: string) => {
  if (!isoString) return "--:--";
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
};

// --- SIMULATED ASSET DISTRIBUTION ---
const getWardZone = (bedId: string): 'Medical' | 'Specialty' | 'Recovery' | 'Security' => {
  const id = bedId.toUpperCase();
  
  if (id.includes('SPEC')) return 'Specialty';
  if (id.includes('REC'))  return 'Recovery';
  if (id.includes('SEC'))  return 'Security';
  if (id.includes('MED') || id.includes('SEMIP')) return 'Medical';
  
  return 'Medical'; // Default fallback
};

const getBedGender = (bedId: string): 'Male' | 'Female' | 'Any' => {
  if (bedId.includes('-M-')) return 'Male';
  if (bedId.includes('-F-')) return 'Female';
  return 'Any';
};
// --- COMPONENTS ---

const UnitHeroCard = ({ title, icon: Icon, total, occupied, isActive, onClick, colorClass }: any) => {
  const percentage = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const isCritical = percentage >= 80;

  const getColors = () => {
    switch (colorClass) {
      case 'red': return { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500', ring: 'ring-red-500' };
      case 'blue': return { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', ring: 'ring-blue-500' };
      case 'indigo': return { bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500', ring: 'ring-indigo-500' };
      case 'emerald': return { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', ring: 'ring-emerald-500' };
      default: return { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-500', ring: 'ring-slate-500' };
    }
  };
  const c = getColors();

  return (
    <button
      onClick={onClick}
      className={`relative p-5 rounded-2xl border transition-all duration-300 w-full text-left overflow-hidden group
        ${isActive ? `${c.bg}/10 ${c.border} ring-1 ${c.ring}/50 shadow-lg` : 'bg-[#0a0a0a] border-white/5 opacity-60 hover:opacity-100'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${isActive ? `${c.bg}/20 ${c.text}` : 'bg-white/5 text-slate-400'}`}>
          <Icon size={24} />
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white">{percentage}%</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Occupancy</p>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className={`text-sm font-bold uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-400'}`}>{title}</h3>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className={`h-full rounded-full ${isCritical ? 'bg-red-500' : `${c.bg}`}`} />
        </div>
        <p className="text-[10px] text-slate-500 font-medium pt-1"><span className="text-white font-bold">{occupied}</span> / {total} Active</p>
      </div>
    </button>
  );
};

const CleaningTimer = ({ bedId, onRequestUnlock }: { bedId: string, onRequestUnlock: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const storageKey = `cleaning_end_time_${bedId}`;
    let endTime = localStorage.getItem(storageKey);
    if (!endTime) {
      const newEndTime = Date.now() + 180 * 1000;
      localStorage.setItem(storageKey, newEndTime.toString());
      endTime = newEndTime.toString();
    }
    const checkTime = () => {
      const remaining = Math.round((parseInt(endTime!) - Date.now()) / 1000);
      if (remaining <= 0) { setTimeLeft(0); setIsFinished(true); return true; }
      setTimeLeft(remaining); return false;
    };
    if (!checkTime()) {
      const timer = setInterval(() => { if (checkTime()) clearInterval(timer); }, 1000);
      return () => clearInterval(timer);
    }
  }, [bedId]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isFinished) {
    return (
      <button onClick={onRequestUnlock} className="w-full py-3 bg-emerald-500 text-white font-black rounded-xl animate-bounce">
        RELEASE BED
      </button>
    );
  }
  return (
    <div className="text-center py-2 bg-sky-500/10 rounded-lg border border-sky-400/20">
      <p className="text-[9px] font-black text-sky-400 uppercase">Sanitizing</p>
      <p className="text-lg font-black text-white font-mono">{timeLeft !== null ? formatTime(timeLeft) : "--:--"}</p>
    </div>
  );
};

const BedCard = ({ bed, onDischarge, onAdmit, onStartCleaning, onRefresh, accentColor, genderLock, patientGender }: any) => {
  const isRed = accentColor === 'red';
  const isGreen = accentColor === 'green';
  const isLocked = !bed.is_occupied && genderLock && genderLock !== 'Any' && patientGender && patientGender !== genderLock;

  const occupiedStyle = isRed ? 'bg-red-500/10 border-red-500/30' : isGreen ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-blue-500/10 border-blue-500/30';
  const textClass = isRed ? 'text-red-400' : isGreen ? 'text-emerald-400' : 'text-blue-400';

  const handleManualUnlock = async () => {
    try {
      await fetch(endpoints.cleaningComplete(bed.id), { method: 'POST' });
      localStorage.removeItem(`cleaning_end_time_${bed.id}`);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  if (isLocked) {
    return (
      <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] opacity-40 grayscale pointer-events-none relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px] font-black text-slate-500">{bed.id}</p>
          <div className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-bold uppercase">{genderLock} Only</div>
        </div>
        <div className="h-24 flex items-center justify-center border border-dashed border-white/10 rounded-xl">
          <p className="text-[10px] uppercase font-bold text-slate-600">Gender Mismatch</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-2xl border transition-all relative overflow-hidden group 
      ${bed.status === 'OCCUPIED' ? occupiedStyle : bed.status === 'DIRTY' ? 'bg-orange-500/10 border-orange-500/30 animate-pulse' : bed.status === 'CLEANING' ? 'bg-sky-500/10 border-sky-500/30' : 'bg-white/5 border-white/5'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-black text-slate-500">{bed.id}</p>
          {genderLock && genderLock !== 'Any' && (
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${genderLock === 'Male' ? 'bg-blue-500/20 text-blue-300' : 'bg-pink-500/20 text-pink-300'}`}>
              {genderLock.substring(0, 1)}
            </span>
          )}
        </div>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bed.status === "AVAILABLE" ? "#32CD32" : bed.status === "OCCUPIED" ? (isRed ? "#FF4500" : "#3b82f6") : bed.status === "DIRTY" ? "#FFA500" : "#87CEEB" }} />
      </div>

      {bed.status === "OCCUPIED" ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-black text-white truncate uppercase mb-1">{bed.patient_name || "Unidentified"}</p>
            <p className={`text-[9px] font-bold ${textClass} uppercase tracking-tighter`}>{bed.condition || "General"}</p>
            {bed.ventilator_in_use && <span className="block mt-2 text-[9px] font-bold text-cyan-300 bg-cyan-500/20 px-2 py-1 rounded border border-cyan-500/30">VENTILATOR</span>}
          </div>
          <button onClick={onDischarge} className={`w-full py-2 ${isRed ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'} text-[10px] font-bold rounded-lg transition-colors`}>DISCHARGE</button>
        </div>
      ) : bed.status === "DIRTY" ? (
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-orange-400 text-center uppercase tracking-widest">Awaiting Cleaning</p>
          <button onClick={() => onStartCleaning(bed.id)} className="w-full py-2 bg-orange-500/20 text-orange-300 text-[10px] font-bold rounded-lg">START CLEANING</button>
        </div>
      ) : bed.status === "CLEANING" ? (
        <CleaningTimer bedId={bed.id} onRequestUnlock={handleManualUnlock} />
      ) : (
        <button onClick={onAdmit} className="w-full py-6 flex flex-col items-center justify-center text-slate-600 hover:text-white transition-colors gap-2">
          <Plus size={24} />
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Assign</span>
        </button>
      )}
    </div>
  );
};

// --- MAIN PANEL ---

const AdminPanel = () => {
  const { toast } = useToast();
  const [beds, setBeds] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeUnit, setActiveUnit] = useState<'ICU' | 'ER' | 'Surgery' | 'Wards'>('ICU');
  const [wardCategory, setWardCategory] = useState<'Medical' | 'Specialty' | 'Recovery' | 'Security'>('Medical');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<any | null>(null);
  const [patientData, setPatientData] = useState({ name: '', age: '', gender: 'Male', condition: 'Stable', surgeonName: '', duration: 60 });

  const [dispatchForm, setDispatchForm] = useState({ severity: 'HIGH', location: '', eta: 10 });
  const [dischargeBedId, setDischargeBedId] = useState<string | null>(null);

  const fetchERPData = useCallback(async () => {
    try {
      const [bedsRes, ambRes] = await Promise.all([fetch(endpoints.beds), fetch(endpoints.ambulances)]);
      const bedsData = await bedsRes.json();
      const ambData = await ambRes.json();
      setBeds(Array.isArray(bedsData) ? bedsData : []);
      setAmbulances(Array.isArray(ambData) ? ambData : []);
      setLoading(false);
    } catch { toast("Sync Error", "error"); setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchERPData(); }, [fetchERPData]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (["SURGERY_UPDATE", "SURGERY_EXTENDED", "ROOM_RELEASED", "BED_UPDATE", "REFRESH_RESOURCES", "NEW_ADMISSION"].includes(data.type)) {
          fetchERPData();
        }
      } catch { }
    };
    return () => ws.close();
  }, [fetchERPData]);

  const handleStartCleaning = async (id: string) => { await fetch(endpoints.startCleaning(id), { method: 'POST' }); fetchERPData(); };
  const resetAmbulance = async (id: string) => { await fetch(endpoints.ambulanceReset(id), { method: 'POST' }); fetchERPData(); };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(endpoints.ambulanceDispatch, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dispatchForm) });
      const data = await res.json();
      toast(data.status === 'DISPATCHED' ? "Unit Authorized" : "Dispatch Failed", data.status === 'DISPATCHED' ? "success" : "error");
      fetchERPData();
    } catch { toast("Network Error", "error"); }
  };

  const confirmDischarge = async () => {
    if (!dischargeBedId) return;
    await fetch(endpoints.discharge(dischargeBedId), { method: 'POST' });
    toast("Patient Discharged", "success");
    setDischargeBedId(null);
    fetchERPData();
  };

  const openAdmitModal = (bed: any) => {
    setSelectedBed(bed);
    let defCond = activeUnit === 'ICU' ? 'Critical' : activeUnit === 'Surgery' ? 'Pre-Surgery' : 'Stable';
    setPatientData({ name: '', age: '', gender: 'Male', condition: defCond, surgeonName: '', duration: 60 });
    setIsModalOpen(true);
  };

  const submitAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    const staffId = localStorage.getItem('staff_id');
    if (!staffId) { toast("Auth Error", "error"); return; }

    try {
      const payload: any = {
        bed_id: String(selectedBed.id),
        patient_name: patientData.name,
        patient_age: Number(patientData.age),
        condition: patientData.condition,
        staff_id: staffId,
        gender: patientData.gender
      };

      let res;
      if (selectedBed.type === 'Surgery') {
        res = await fetch(endpoints.startSurgery, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, surgeon_name: patientData.surgeonName, duration_minutes: Number(patientData.duration) })
        });
      } else {
        res = await fetch(endpoints.admit, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }

      if (res.ok) { setIsModalOpen(false); toast("Admission Confirmed", "success"); fetchERPData(); }
      else { toast("Admission Rejected", "error"); }
    } catch { toast("System Error", "error"); }
  };

const getDisplayBeds = () => {
  let filtered = beds.filter(b => b.type === activeUnit);
  
  if (activeUnit === 'Wards') {
    return filtered.filter(b => {
      const zone = getWardZone(b.id);
      // DEBUG: This will show you exactly why the filtering is failing
      console.log(`Bed ID: ${b.id} | Parsed Zone: ${zone} | Current Category: ${wardCategory}`);
      return zone === wardCategory;
    });
  }
  return filtered;
};

  const getUnitStats = (type: string) => {
    const unitBeds = beds.filter(b => b.type === type);
    return { total: unitBeds.length, occupied: unitBeds.filter(b => b.status === "OCCUPIED").length };
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono animate-pulse text-white">Initializing Phrelis OS...</div>;

  return (
    <div className="min-h-screen bg-black text-slate-200 p-8 font-sans">
      <div className="max-w-[1800px] mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><Activity className="text-indigo-400 w-6 h-6" /></div>
              <h1 className="text-4xl font-black tracking-tight text-white">Command Center</h1>
            </div>
            <p className="text-slate-500 pl-16 text-sm italic">{formatIST(new Date().toISOString())} • Orchestrating Hospital Resources</p>
          </div>
          <Link href="/" className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all"><ArrowLeft size={16} className="text-slate-400" /><span className="text-xs font-bold uppercase tracking-widest">Dashboard Main</span></Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-250px)]">
          <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            <div className="bg-[#0a0a0a] rounded-3xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3"><Siren size={18} className="text-red-500" /> Emergency Dispatch</h3>
              <form onSubmit={handleDispatch} className="space-y-4">
                <select className="w-full p-4 bg-white/5 border border-white/10 rounded-xl outline-none" value={dispatchForm.severity} onChange={e => setDispatchForm({ ...dispatchForm, severity: e.target.value })}>
                  <option value="HIGH">CRITICAL (ICU)</option>
                  <option value="LOW">STABLE (ER)</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Location" required className="p-4 bg-white/5 border border-white/10 rounded-xl" value={dispatchForm.location} onChange={e => setDispatchForm({ ...dispatchForm, location: e.target.value })} />
                  <input type="number" required className="p-4 bg-white/5 border border-white/10 rounded-xl" value={dispatchForm.eta} onChange={e => setDispatchForm({ ...dispatchForm, eta: parseInt(e.target.value) })} />
                </div>
                <button type="submit" className="w-full py-4 bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"><Siren size={18} /> DISPATCH UNIT</button>
              </form>
            </div>

            <div className="bg-[#0a0a0a] rounded-3xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3"><MapPin size={18} className="text-yellow-400" /> Fleet Status</h3>
              <div className="space-y-3">
                {ambulances.map(amb => (
                  <div key={amb.id} className={`p-4 rounded-2xl border flex justify-between items-center ${amb.status === 'IDLE' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                    <div><span className="font-black text-white text-lg">{amb.id}</span><p className="text-xs text-slate-400">{amb.location}</p></div>
                    {amb.status !== 'IDLE' && <button onClick={() => resetAmbulance(amb.id)} className="p-2 rounded-lg bg-white/5 text-slate-400"><X size={14} /></button>}
                  </div>
                ))}
              </div>
            </div>
            <ResourceInventory resources={{ Ventilators: { total: 20, in_use: beds.filter(b => b.ventilator_in_use).length }, Ambulances: { total: ambulances.length, available: ambulances.filter(a => a?.status === 'IDLE').length } }} />
          </div>

          <div className="lg:col-span-9 flex flex-col gap-6 h-full">
            <div className="grid grid-cols-4 gap-4 shrink-0">
              <UnitHeroCard title="ICU" icon={Activity} {...getUnitStats('ICU')} isActive={activeUnit === 'ICU'} onClick={() => setActiveUnit('ICU')} colorClass="red" />
              <UnitHeroCard title="Emergency" icon={BedDouble} {...getUnitStats('ER')} isActive={activeUnit === 'ER'} onClick={() => setActiveUnit('ER')} colorClass="blue" />
              <UnitHeroCard title="Surgery" icon={BrainCircuit} {...getUnitStats('Surgery')} isActive={activeUnit === 'Surgery'} onClick={() => setActiveUnit('Surgery')} colorClass="indigo" />
              <UnitHeroCard title="Wards" icon={Package} {...getUnitStats('Wards')} isActive={activeUnit === 'Wards'} onClick={() => setActiveUnit('Wards')} colorClass="emerald" />
            </div>

            <div className="flex-1 bg-[#0a0a0a] rounded-3xl border border-white/10 p-6 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-center mb-6 z-10">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">{activeUnit === 'Wards' ? `${wardCategory} Block` : activeUnit}</h2>
                {activeUnit === 'Wards' && (
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    {[{ id: 'Medical', icon: HeartPulse }, { id: 'Specialty', icon: Baby }, { id: 'Recovery', icon: Stethoscope }, { id: 'Security', icon: ShieldAlert }].map(cat => (
                      <button key={cat.id} onClick={() => setWardCategory(cat.id as any)} className={`px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center gap-2 ${wardCategory === cat.id ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}><cat.icon size={12} /> {cat.id}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                <AnimatePresence mode="wait">
                  <motion.div key={activeUnit + wardCategory} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {activeUnit === 'Surgery' ? (
                      <div className="col-span-full"><SurgerySection beds={beds} onRefresh={fetchERPData} onAdmit={openAdmitModal} /></div>
                    ) : getDisplayBeds().map(bed => (
                      <BedCard key={bed.id} bed={bed} onDischarge={() => setDischargeBedId(bed.id)} onAdmit={() => openAdmitModal(bed)} onStartCleaning={handleStartCleaning} onRefresh={fetchERPData} accentColor={activeUnit === 'ICU' ? 'red' : activeUnit === 'Wards' ? 'green' : 'blue'} genderLock={activeUnit === 'Wards' && wardCategory === 'Medical' ? getBedGender(bed.id) : null} patientGender={patientData.gender} />
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && selectedBed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0a0a0a] rounded-3xl p-8 max-w-lg w-full border border-white/10 relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white">Admit Patient</h2>
                <button onClick={() => setIsModalOpen(false)}><X className="text-slate-500" /></button>
              </div>
              <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 mb-6 flex justify-between items-center">
                <div><p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Target Bed</p><p className="text-xl font-black text-white">{selectedBed.id}</p></div>
                {activeUnit === 'Wards' && wardCategory === 'Medical' && (
                  <div className="text-right"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ward Policy</p><p className="text-sm font-bold text-white">{getBedGender(selectedBed.id)} Only</p></div>
                )}
              </div>
              <form onSubmit={submitAdmission} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Full Name</label>
                  <input required className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none" value={patientData.name} onChange={e => setPatientData({ ...patientData, name: e.target.value })} />
                </div>
                {activeUnit === 'Surgery' && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold text-purple-500 uppercase ml-1 flex items-center gap-2"><UserCheck size={12} /> Attending Surgeon</label>
                    <div className="relative">
                      <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                      <input required className="w-full p-4 pl-12 bg-white/5 border border-purple-500/20 rounded-xl text-white outline-none" placeholder="CHIEF SURGEON..." value={patientData.surgeonName} onChange={e => setPatientData({ ...patientData, surgeonName: e.target.value })} />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Age</label><input type="number" required className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none" value={patientData.age} onChange={e => setPatientData({ ...patientData, age: e.target.value })} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Gender</label><select className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none" value={patientData.gender} onChange={e => setPatientData({ ...patientData, gender: e.target.value })}><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Condition</label>
                  <select className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none" value={patientData.condition} onChange={e => setPatientData({ ...patientData, condition: e.target.value })}><option>Stable</option><option>Critical</option><option>Observation</option><option>Pre-Surgery</option></select>
                </div>
                {activeUnit === 'Wards' && wardCategory === 'Medical' && getBedGender(selectedBed.id) !== 'Any' && getBedGender(selectedBed.id) !== patientData.gender && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"><ShieldAlert className="text-red-500" size={20} /><p className="text-xs font-bold text-red-200">Policy Violation: Reserved for {getBedGender(selectedBed.id)}.</p></div>
                )}
                <button 
  type="submit" 
  // 1. Logic to determine if the button should be disabled
  disabled={
    activeUnit === 'Wards' && 
    wardCategory === 'Medical' && 
    getBedGender(selectedBed.id) !== 'Any' && 
    getBedGender(selectedBed.id) !== patientData.gender
  }
  // 2. Styling to show the user it is disabled
  className={`w-full py-4 font-black rounded-xl mt-4 transition-all ${
    (activeUnit === 'Wards' && 
     wardCategory === 'Medical' && 
     getBedGender(selectedBed.id) !== 'Any' && 
     getBedGender(selectedBed.id) !== patientData.gender)
    ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' 
    : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95'
  }`}
>
  CONFIRM ADMISSION
</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dischargeBedId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDischargeBedId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0a0a0a] rounded-3xl p-8 max-w-sm w-full border border-red-500/20 relative z-10 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><LogOut size={32} className="text-red-500" /></div>
              <h2 className="text-xl font-black text-white mb-2">Discharge Patient?</h2>
              <div className="flex gap-3 mt-6"><button onClick={() => setDischargeBedId(null)} className="flex-1 py-3 bg-white/5 rounded-xl text-slate-300 font-bold">CANCEL</button><button onClick={confirmDischarge} className="flex-1 py-3 bg-red-600 rounded-xl text-white font-bold">CONFIRM</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPanel;