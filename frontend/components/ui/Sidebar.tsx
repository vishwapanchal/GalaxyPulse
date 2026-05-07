"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Cpu, Zap, Users, FileText, Activity
} from "lucide-react";
import { clsx } from "clsx";

const NAV = [
  { href: "/",         label: "Overview",       icon: LayoutDashboard },
  { href: "/features", label: "Feature Health", icon: Cpu            },
  { href: "/ota",      label: "OTA Tracker",    icon: Zap            },
  { href: "/cohorts",  label: "Cohorts",        icon: Users          },
  { href: "/digest",   label: "Weekly Digest",  icon: FileText       },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 glass border-r border-surface-600 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-surface-600">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center glow-blue animate-pulse-ring">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-wide">GalaxyPulse</p>
            <p className="text-xs text-slate-400">Feedback Intelligence</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "bg-brand-500/20 text-brand-300 border border-brand-500/30 glow-blue"
                  : "text-slate-400 hover:text-slate-200 hover:bg-surface-700"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-surface-600">
        <div className="glass-elevated rounded-xl p-3">
          <p className="text-xs text-slate-500 font-mono">PRISM OpenClaw</p>
          <p className="text-xs text-slate-400 mt-0.5">Theme 2 · Daily Utility</p>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            <p className="text-xs text-accent-green font-medium">Agent active</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
