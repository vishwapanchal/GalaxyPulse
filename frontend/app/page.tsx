"use client";
import { useEffect, useState } from "react";
import { getFeatures, getLatestDigest, getOTACorrelation } from "@/lib/api";
import type { FeatureHealth, WeeklyDigest, OTACorrelationEntry } from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import HealthBadge from "@/components/ui/HealthBadge";
import Link from "next/link";
import { Activity, AlertTriangle, Users, TrendingDown, Cpu, Zap, Radio, Globe } from "lucide-react";

export default function OverviewPage() {
  const [features, setFeatures] = useState<FeatureHealth[]>([]);
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [regressions, setRegressions] = useState<OTACorrelationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getFeatures(),
      getLatestDigest(),
      getOTACorrelation(),
    ]).then(([f, d, o]) => {
      if (f.status === "fulfilled") setFeatures(f.value);
      if (d.status === "fulfilled") setDigest(d.value);
      if (o.status === "fulfilled")
        setRegressions(o.value.correlations.filter((c) => c.is_regression));
      setLoading(false);
    });
  }, []);

  const totalSessions = features.reduce((s, f) => s + f.total_sessions, 0);
  const avgHealth = features.length
    ? Math.round(features.reduce((s, f) => s + f.health_score, 0) / features.length)
    : 0;
  const criticalCount = features.filter((f) => f.health_score < 40).length;

  return (
    <div className="animate-fade-in relative pl-72 pr-8 pt-8 pb-20 max-w-7xl mx-auto z-10 w-full min-h-screen">
      
      {/* Immersive Hero Header */}
      <div className="relative mb-12 p-10 rounded-[2rem] border border-white/5 bg-gradient-hero overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Animated Background Elements inside Hero */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[100px] animate-blob mix-blend-screen pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-accent-cyan/10 rounded-full blur-[80px] animate-blob animation-delay-2000 mix-blend-screen pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/50 glow-brand">
                <Globe size={16} className="text-brand-300 animate-spin-slow" />
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20">
                Live Telemetry
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white display-font leading-tight tracking-tighter">
              Galaxy <span className="gradient-text">Feedback</span><br/> Intelligence
            </h1>
            <p className="text-white/60 mt-4 max-w-xl text-lg leading-relaxed font-light">
              Real-time sentiment tracking and biometric-context-aware feature analysis across the entire Galaxy ecosystem.
            </p>
          </div>

          <div className="flex gap-4">
            <button className="relative group px-6 py-3 rounded-xl bg-brand-600 font-bold text-white tracking-wide overflow-hidden shadow-[0_0_20px_rgba(138,43,226,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(138,43,226,0.6)]">
              <span className="relative z-10 flex items-center gap-2"><Radio size={18} className="animate-pulse" /> Deploy Agent</span>
              <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-brand-500 via-accent-pink to-brand-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
            <button className="px-6 py-3 rounded-xl glass border border-white/10 font-bold text-white tracking-wide hover:bg-white/5 transition-all hover:scale-105">
              View Architecture
            </button>
          </div>
        </div>
      </div>

      {/* OTA Regression Alert */}
      {regressions.length > 0 && (
        <div className="mb-8 glass border border-accent-red/50 rounded-2xl p-5 flex items-center gap-4 animate-slide-up shadow-[0_0_30px_rgba(239,68,68,0.15)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent-red/10 to-transparent pointer-events-none" />
          <div className="p-3 rounded-full bg-accent-red/20 border border-accent-red/30 glow-red shrink-0 z-10">
            <AlertTriangle size={24} className="text-accent-red animate-pulse" />
          </div>
          <div className="z-10 flex-1">
            <p className="text-lg font-bold text-white display-font tracking-tight">Critical OTA Regression Detected</p>
            <p className="text-sm text-white/60 mt-1 font-medium">
              {regressions.length} feature{regressions.length > 1 ? "s" : ""} dropped >10 points after the latest OTA:{" "}
              <span className="text-accent-red font-semibold">{regressions.map((r) => r.feature_name).join(", ")}</span>
            </p>
          </div>
          <Link href="/ota" className="z-10 px-5 py-2.5 rounded-xl bg-accent-red/10 border border-accent-red/30 text-accent-red hover:bg-accent-red hover:text-white transition-all font-bold tracking-wide text-sm shadow-[0_0_15px_rgba(239,68,68,0.4)]">
            Investigate →
          </Link>
        </div>
      )}

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
        <StatCard label="Avg Health Score" value={loading ? "—" : avgHealth} sub="Across all active modules"
          accent="brand" icon={<Activity size={24} />} trend="up" trendValue="+2.4" />
        <StatCard label="Total Sessions" value={loading ? "—" : totalSessions.toLocaleString()} sub="Contextual feedback events"
          accent="cyan" icon={<Users size={24} />} trend="up" trendValue="15k" />
        <StatCard label="Critical Features" value={loading ? "—" : criticalCount} sub="Health score below 40"
          accent={criticalCount > 0 ? "red" : "green"} icon={<AlertTriangle size={24} />} trend="down" trendValue="-1" />
        <StatCard label="OTA Regressions" value={loading ? "—" : regressions.length} sub="Post-update severe drops"
          accent={regressions.length > 0 ? "amber" : "green"} icon={<TrendingDown size={24} />} trend="neutral" trendValue="0" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Feature Health Scorecard */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white display-font flex items-center gap-3 tracking-tight">
              <span className="p-2 rounded-lg bg-brand-500/20 border border-brand-500/30 text-brand-400">
                <Cpu size={20} />
              </span>
              Module Health Matrix
            </h2>
            <Link href="/features" className="text-sm font-bold text-brand-400 hover:text-brand-300 transition-colors uppercase tracking-widest">
              View Matrix →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass rounded-[2rem] p-6 animate-pulse h-48 bg-white/5 border border-white/5" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {features.map((f, i) => (
                <Link key={f.feature_id} href={`/features/${f.feature_id}`}>
                  <div className="glass rounded-[2rem] p-6 border border-white/5 hover:border-brand-500/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(138,43,226,0.15)] cursor-pointer group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-[40px] group-hover:bg-brand-500/30 transition-colors duration-500" />
                    
                    <div className="relative z-10 flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-lg font-bold text-white truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-brand-300 group-hover:to-accent-cyan transition-all display-font">
                          {f.feature_name}
                        </p>
                        <p className="text-xs text-white/40 mt-1 font-mono truncate tracking-wider">{f.package_name}</p>
                      </div>
                      <HealthBadge score={f.health_score} size="sm" />
                    </div>
                    
                    <div className="relative z-10 mt-6 grid grid-cols-3 gap-4 text-center divide-x divide-white/10">
                      <div>
                        <p className="text-xl font-black text-white display-font">
                          {f.avg_satisfaction_7d?.toFixed(1) ?? "—"}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1 font-bold">Avg Sat</p>
                      </div>
                      <div>
                        <p className="text-xl font-black text-white display-font">
                          {Math.round(f.friction_rate * 100)}<span className="text-sm">%</span>
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1 font-bold">Friction</p>
                      </div>
                      <div>
                        <p className="text-xl font-black text-white display-font">{f.total_sessions}</p>
                        <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1 font-bold">Events</p>
                      </div>
                    </div>
                    
                    {/* Futuristic Health bar */}
                    <div className="relative z-10 mt-6 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                          f.health_score >= 70 ? "bg-accent-green shadow-[0_0_10px_#10b981]" :
                          f.health_score >= 40 ? "bg-accent-amber shadow-[0_0_10px_#f59e0b]" : "bg-accent-red shadow-[0_0_10px_#ef4444]"
                        }`}
                        style={{ width: `${f.health_score}%` }}
                      >
                         <div className="absolute inset-0 bg-white/30 w-full animate-[pulse_2s_ease-in-out_infinite]" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Neural Digest / Top Issues Sidebar */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
             <span className="p-2 rounded-lg bg-accent-pink/20 border border-accent-pink/30 text-accent-pink">
                <Zap size={20} />
              </span>
             <h2 className="text-2xl font-bold text-white display-font tracking-tight">Neural Digest</h2>
          </div>
          
          <div className="glass-elevated rounded-[2rem] p-6 border border-white/5 relative overflow-hidden">
             {/* Decorative Background for Digest */}
             <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(255,0,128,0.15),_transparent_50%)] pointer-events-none" />
             
             <div className="relative z-10">
               <p className="text-sm text-white/60 font-medium mb-6 leading-relaxed">
                 AI-synthesized priority issues flagged across the global user base over the last 7 days.
               </p>

               {digest && digest.top_issues.length > 0 ? (
                 <div className="space-y-4">
                   {digest.top_issues.slice(0, 4).map((issue, i) => (
                     <div key={i} className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors relative overflow-hidden">
                       <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-500 to-accent-pink opacity-0 group-hover:opacity-100 transition-opacity" />
                       <div className="flex gap-4">
                         <span className="text-2xl font-black text-white/10 display-font mt-1">0{i + 1}</span>
                         <div className="flex-1">
                           <div className="flex items-start justify-between gap-2">
                             <p className="text-sm font-bold text-white display-font">
                               {String((issue as Record<string, unknown>).feature ?? "Unknown Module")}
                             </p>
                             <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md tracking-widest ${
                               String((issue as Record<string, unknown>).severity) === "high"
                                 ? "bg-accent-red/20 text-accent-red border border-accent-red/30 glow-red"
                                 : "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
                             }`}>
                               {String((issue as Record<string, unknown>).severity ?? "medium")}
                             </span>
                           </div>
                           <p className="text-xs text-white/50 mt-1.5 leading-relaxed font-medium">
                             {String((issue as Record<string, unknown>).issue ?? "")}
                           </p>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-8">
                   <p className="text-white/40 text-sm">No critical issues synthesized.</p>
                 </div>
               )}
             </div>
             
             <div className="mt-6 pt-6 border-t border-white/10 relative z-10">
               <Link href="/digest" className="block w-full py-3 rounded-xl bg-white/5 border border-white/10 text-center text-sm font-bold text-white hover:bg-white/10 hover:border-white/20 transition-all uppercase tracking-widest">
                 View Full Report
               </Link>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
