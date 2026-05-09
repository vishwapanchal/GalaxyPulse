"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Cpu, Zap, Users, FileText, Activity
} from "lucide-react";
import { clsx } from "clsx";

const NAV = [
  { href: "/dashboard",         label: "Command Center", icon: LayoutDashboard },
  { href: "/dashboard/features", label: "Feature Health", icon: Cpu            },
  { href: "/dashboard/ota",      label: "OTA Tracker",    icon: Zap            },
  { href: "/dashboard/cohorts",  label: "Cohorts",        icon: Users          },
  { href: "/dashboard/digest",   label: "Weekly Digest",  icon: FileText       },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed left-4 top-4 bottom-4 w-64 glass-panel rounded-3xl flex flex-col z-50 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      {/* Dynamic Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-glow opacity-50 pointer-events-none" />

      {/* Logo */}
      <div className="relative p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-brand flex items-center justify-center glow-brand shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]">
            <Activity size={20} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
            <div className="absolute inset-0 rounded-2xl border border-white/20 animate-pulse-ring pointer-events-none" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-widest display-font">GALAXY<span className="text-brand-400">PULSE</span></h1>
            <p className="text-[10px] text-brand-300/80 uppercase tracking-[0.2em] font-medium mt-0.5">Core Interface</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 p-4 space-y-2 mt-4">
        <p className="px-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-4">Navigation</p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "group relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 overflow-hidden",
                active
                  ? "text-white glow-brand bg-white/5"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-brand-400 to-accent-cyan rounded-r-full shadow-[0_0_10px_rgba(0,212,255,0.8)]" />
              )}
              {active && (
                 <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-transparent pointer-events-none" />
              )}
              <Icon size={18} className={clsx("transition-transform duration-300 group-hover:scale-110 group-hover:text-brand-300", active && "text-brand-400 drop-shadow-[0_0_8px_rgba(138,43,226,0.8)]")} />
              <span className="tracking-wide z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="relative p-5 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-accent-green/10 border border-accent-green/30 glow-green shadow-[0_0_15px_rgba(16,185,129,0.3)]">
             <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse" />
          </div>
          <div>
            <p className="text-[11px] text-white/40 uppercase tracking-widest font-bold">System Status</p>
            <p className="text-sm font-semibold text-accent-green drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">Agent Active</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
