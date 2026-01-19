
"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Clock, AlertTriangle, User, Zap } from 'lucide-react';

export default function SmartWorklist() {
  const [data, setData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // FIXED: Correctly retrieve values from localStorage without using undefined variables
  const staffId = typeof window !== 'undefined' ? (localStorage.getItem('staff_id') || 'N-01') : 'N-01';
  const nurseName = typeof window !== 'undefined' ? (localStorage.getItem('staff_name') || 'Nurse') : 'Nurse';

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/staff/worklist/${staffId}`);
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Failed to fetch dashboard", err);
    }
  }, [staffId]);

  useEffect(() => {
    fetchDashboard();

    const socket = new WebSocket("ws://localhost:8000/ws");
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "REFRESH_RESOURCES" || message.type === "NEW_ADMISSION") {
        fetchDashboard();
      }
    };

    return () => socket.close();
  }, [fetchDashboard]);

  const completeTask = async (taskId: number) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/tasks/complete/${taskId}`, { 
        method: 'POST' 
      });
      if (res.ok) {
        console.log(`Task ${taskId} completed successfully`);
          setData((prevData: any) => ({
        ...prevData,
        tasks: prevData.tasks.filter((t: any) => t.id !== taskId)
      }));

        fetchDashboard(); 
      }else{
        const errorData = await res.json();
        console.error("Server Error:", errorData);
      }
    } catch (err) {
      console.error("Failed to complete task", err);
    }
  };

  if (!data) return <div className="p-8 text-white">Connecting to Hospital Neural Grid...</div>;

  return (
    <div className="min-h-screen bg-[#050505] p-6 text-slate-100 font-sans">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-emerald-500 uppercase tracking-widest">System Live</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            SMART<span className="text-blue-500">WORKLIST</span>
          </h1>
          <p className="text-indigo-400 font-bold text-xs mt-1 uppercase tracking-widest">
            Logged in as: <span className="text-white">{nurseName}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 font-mono">LAST SYNC</p>
          <p className="text-sm font-bold text-slate-300">{lastUpdate.toLocaleTimeString()}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Patient Monitor */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2 mb-2 px-2">
            <User size={18} className="text-blue-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">My Patients</h2>
          </div>
          {data.patients && data.patients.map((patient: any) => (
            <div key={patient.id} className="bg-[#0f1115] border border-slate-800 p-5 rounded-2xl">
              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                  {patient.patient_name || "Unknown Patient"} 
                </span>
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">
                  Bed: {patient.bed_id}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Task Queue */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-cyan-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Task Queue</h2>
            </div>
            <span className="text-xs text-slate-500">{(data.tasks?.length || 0)} Pending</span>
          </div>
          
          <div className="space-y-3">
            {data.tasks?.map((task: any) => (
              <div 
                key={task.id} 
                className="group flex items-center justify-between p-5 rounded-2xl border border-slate-800 bg-[#0f1115]"
              >
                <div className="flex gap-5 items-center">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-slate-800 text-slate-400">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-slate-100">{task.description}</p>
                    <div className="flex gap-4 text-xs font-medium text-slate-500 mt-1">
                      <span className="flex items-center gap-1"><User size={12} /> {task.bed_id}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> Due {new Date(task.due_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                </div>
                  <button 
                  onClick={() => {
                    // Wrapping in curly braces allows multiple statements
                    console.log("Attempting to complete task ID:", task.id); 
                    completeTask(task.id);
                  }}
                  className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-emerald-500 hover:text-white transition-colors"
                  >
                  Mark Complete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}