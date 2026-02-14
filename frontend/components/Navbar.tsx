"use client";
import { useRouter, usePathname } from "next/navigation";
import Link from 'next/link';
import { motion } from "framer-motion";
import {
  LayoutDashboard, Stethoscope, LineChart, Activity, Settings,
  Clock, Network, Users, ClipboardCheck, LogOut, Shield, DollarSign
} from 'lucide-react';
import DiversionBanner from './DiversionBanner';

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Analytics', icon: LineChart, href: '/predictions' },
    { name: 'OPD', icon: Stethoscope, href: '/queue' },
    { name: 'Triage', icon: Activity, href: '/triage' },
    { name: 'Admin', icon: Settings, href: '/admin' },
    { name: 'History', icon: Clock, href: '/history' },
    { name: 'Staff', icon: Users, href: '/staff' },
    // { name: 'Sentinel', icon: Network, href: '/sentinel' },
    { name: 'Command', icon: Shield, href: '/command-centre' },
    { name: 'Nursing', icon: ClipboardCheck, href: '/staff/worklist' },
    { name: 'CFO', icon: ClipboardCheck, href: '/cfo' },
    { name: 'Billing', icon: DollarSign, href: '/billing' }
  ];

  return (
    <>
      <DiversionBanner />
      <nav className="sticky top-0 z-50 w-full bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.08]">
        <div className="max-w-[1800px] mx-auto px-6 h-20">
          <div className="flex items-center justify-between h-full">

            {/* BRANDING: Increased spacing & luxury weight */}
            <div
              className="flex items-center gap-5 pr-10 border-r border-white/[0.08] cursor-pointer group"
              onClick={() => router.push('/dashboard')}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative p-2.5 bg-indigo-600 rounded-xl">
                  <Activity className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter uppercase italic leading-none text-white">
                  Phrelis <span className="text-indigo-500">OS</span>
                </span>
                <span className="text-[9px] font-bold text-slate-500 tracking-[0.4em] uppercase mt-1.5">
                  Intelligence v2.4
                </span>
              </div>
            </div>

            {/* NAV: Dynamic spacing and high-end interaction */}
            <div className="flex-1 flex items-center justify-center px-8 gap-1 2xl:gap-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group relative flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-500 ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-200'
                      }`}
                  >
                    <item.icon className={`w-4 h-4 mb-1.5 transition-colors duration-500 ${isActive ? 'text-indigo-400' : 'group-hover:text-indigo-300'
                      }`} />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em]">
                      {item.name}
                    </span>

                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute inset-0 bg-white/[0.03] border border-white/[0.05] rounded-xl -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* SYSTEM: Minimalist status & refined exit */}
            <div className="flex items-center gap-8 pl-10 border-l border-white/[0.08]">
              <div className="hidden xl:flex flex-col items-end">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live Sync</span>
                  <div className="flex h-1.5 w-1.5">
                    <span className="animate-ping absolute h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-40"></span>
                    <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  </div>
                </div>
                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1">Health: Optimal</span>
              </div>

              <button
                onClick={handleLogout}
                className="group p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-500"
              >
                <LogOut size={18} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>

          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;