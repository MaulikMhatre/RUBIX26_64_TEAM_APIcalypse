
"use client";
import { useRouter, usePathname } from "next/navigation";
import Link from 'next/link';
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Stethoscope, 
  LineChart, 
  Activity, 
  Settings, 
  Clock,
  Network,
  Users,
  ClipboardCheck,
  LogOut
} from 'lucide-react';

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("staff_id");
    router.push("/"); 
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', href: '/predictions', icon: LineChart },
    { name: 'OPD', href: '/queue', icon: Stethoscope },
    { name: 'Triage', href: '/triage', icon: Stethoscope },
    { name: 'Admin', href: '/admin', icon: Settings },
    { name: 'History', href: '/history', icon: Clock },
    { name: 'Staff', href: '/staff', icon: Users },
    { name: 'Sentinel', href: '/sentinel', icon: Network },
    { name: 'Smart Nursing', href: '/staff/worklist', icon: ClipboardCheck }
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-xl text-white border-b border-white/5">
      <div className="max-w-[1600px] mx-auto px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* LEFT: Logo Section */}
          <div 
            className="flex items-center gap-4 pr-8 border-r border-white/10 group cursor-pointer"
            onClick={() => router.push('/dashboard')}
          >
            <div className="p-2 bg-indigo-600 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-transform group-hover:scale-105">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter uppercase italic leading-none">
                Phrelis <span className="text-indigo-500">OS</span>
              </span>
              <span className="text-[9px] font-bold text-slate-500 tracking-[0.3em] uppercase mt-1">
                Intelligence v2.4
              </span>
            </div>
          </div>
          
          {/* CENTER: Navigation Links */}
          <div className="hidden xl:flex items-center justify-center flex-1 px-4 gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 group/link ${
                    isActive 
                      ? 'text-white bg-white/5 border border-white/5' 
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-600 group-hover/link:text-indigo-400'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                    {item.name}
                  </span>
                  
                  {isActive && (
                    <motion.span 
                      layoutId="nav-glow"
                      className="absolute -bottom-[21px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1]"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* RIGHT: System Status & Logout */}
          <div className="flex items-center gap-6 pl-8 border-l border-white/10">
            <div className="hidden lg:flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Cloud Sync Active</span>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              </div>
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">System Health: Optimal</span>
            </div>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300"
            >
              <LogOut size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;