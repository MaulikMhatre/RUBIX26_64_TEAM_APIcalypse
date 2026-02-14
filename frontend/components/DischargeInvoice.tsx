"use client";

import React from "react";
import { Receipt, Printer, CheckCircle, ShieldCheck, Hash, User, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function DischargeInvoice({ data }: { data: any }) {
    const printInvoice = () => window.print();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white text-black p-12 rounded-[40px] shadow-2xl max-w-4xl mx-auto print:p-0 print:shadow-none print:rounded-none"
        >
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b-4 border-black pb-10">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter uppercase italic">PHRELIS <span className="text-cyan-600 italic">OS</span></h1>
                    <p className="text-xs font-mono font-bold tracking-[0.3em] mt-2">NEXT-GEN CLINICAL OPERATING SYSTEM</p>
                </div>
                <div className="text-right">
                    <div className="bg-black text-white px-6 py-2 rounded-xl text-xl font-black italic tracking-tighter uppercase">Discharge Summary</div>
                    <p className="mt-4 font-mono text-xs font-bold uppercase tracking-tight">Invoice ID: INV-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                    <p className="font-mono text-xs uppercase font-bold text-gray-400 mt-1">Generated: {new Date().toLocaleString()}</p>
                </div>
            </div>

            {/* Patient & Hospital Info */}
            <div className="grid grid-cols-2 gap-12 py-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-400 uppercase font-black text-[10px] tracking-widest">
                        <User size={12} />
                        <span>Patient Information</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase text-black">{data.patient_name}</h2>
                        <p className="text-sm font-bold text-gray-500 font-mono tracking-tight uppercase">MRN-#{data.patient_id}</p>
                        <p className="text-xs font-medium text-gray-400 mt-1 uppercase max-w-[200px]">Admitted to {data.bed_info.category} Level Bed Care</p>
                    </div>
                </div>
                <div className="space-y-4 text-right">
                    <div className="flex items-center gap-2 text-gray-400 uppercase font-black text-[10px] tracking-widest justify-end">
                        <MapPin size={12} />
                        <span>Institution Header</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase text-black">PHRELIS CORE COMMAND</h2>
                        <p className="text-sm font-bold text-gray-500 font-mono tracking-tight uppercase">GRID-BASE NODE A-1</p>
                        <p className="text-xs font-medium text-gray-400 mt-1 uppercase max-w-[200px] ml-auto">Sector 09, Neo-Tech District, Bengaluru, India</p>
                    </div>
                </div>
            </div>

            {/* Table of Charges */}
            <div className="mt-6 border-2 border-black rounded-3xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-black text-white">
                        <tr>
                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest">Service Description</th>
                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-center">Category</th>
                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 italic">
                        {/* Bed Charge (Dynamic) */}
                        <tr className="bg-gray-50/50">
                            <td className="px-6 py-6 font-black text-sm uppercase">
                                Hospital Stay: {data.bed_info.category} Care
                                <p className="text-[10px] text-gray-400 font-mono mt-1 font-normal italic underline decoration-gray-100">
                                    Rate: ₹{data.bed_info.daily_rate.toLocaleString()} / Day | Admitted: {new Date(data.bed_info.admission_time).toLocaleString()}
                                </p>
                            </td>
                            <td className="px-6 py-6 text-center">
                                <span className="bg-black text-white text-[10px] px-3 py-1 rounded-full font-black uppercase">Accommodation</span>
                            </td>
                            <td className="px-6 py-6 text-right font-black text-lg">₹{data.costs.accrued_bed_cost.toLocaleString()}</td>
                        </tr>

                        {/* Ledger Entries */}
                        {data.ledger.map((item: any) => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 font-bold text-sm text-gray-800 uppercase leading-none">
                                    {item.description}
                                    <p className="text-[10px] text-gray-400 font-mono mt-1 font-normal italic underline decoration-gray-100">TXREF-#{item.id.toString(16).toUpperCase()}</p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="border border-black text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter">{item.item_type}</span>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-base">₹{item.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer Calculation */}
            <div className="mt-12 flex justify-end">
                <div className="w-64 space-y-4">
                    <div className="flex justify-between text-xs font-black text-gray-500 uppercase">
                        <span>Subtotal</span>
                        <span className="text-black italic">₹{data.costs.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black text-gray-500 uppercase border-b border-gray-100 pb-4">
                        <span>GST (18%)</span>
                        <span className="text-black italic">₹{data.costs.tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-sm font-black uppercase italic mb-1">Grand Total</span>
                        <span className="text-4xl font-black underline decoration-black underline-offset-4 tracking-tighter">₹{data.costs.grand_total.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="mt-16 pt-10 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <div className="w-40 h-px bg-black mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Chief Medical Auditor</span>
                    </div>
                    <div className="flex flex-col">
                        <div className="w-40 h-px bg-black mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">RCM Specialist</span>
                    </div>
                </div>
                <div className="flex gap-4 print:hidden">
                    <button
                        onClick={printInvoice}
                        className="px-8 py-3 bg-black text-white rounded-2xl font-black text-xs uppercase flex items-center gap-3 hover:bg-gray-800 transition-colors shadow-2xl shadow-black/20"
                    >
                        <Printer size={16} /> Print Statement
                    </button>
                    <button className="px-8 py-3 bg-cyan-600 text-white rounded-2xl font-black text-xs uppercase flex items-center gap-3 hover:bg-cyan-500 transition-colors shadow-2xl shadow-cyan-900/20">
                        <ShieldCheck size={16} /> Finalize Discharge
                    </button>
                </div>
            </div>

            <div className="mt-8 text-center">
                <p className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-[0.5em]">This is a cryptographically signed document powered by Phrelis OS Finance Core</p>
            </div>
        </motion.div>
    );
}
