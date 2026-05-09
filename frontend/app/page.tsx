"use client";
import Link from "next/link";
import { ArrowRight, Activity, Zap, Shield, Cpu, Globe } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-900 overflow-hidden relative selection:bg-brand-500/30">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-500/20 rounded-full blur-[120px] animate-blob mix-blend-screen pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-accent-cyan/10 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-screen pointer-events-none" />
      <div className="absolute -bottom-40 left-1/2 w-[800px] h-[800px] bg-accent-pink/10 rounded-full blur-[120px] animate-blob animation-delay-4000 mix-blend-screen pointer-events-none" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-brand flex items-center justify-center glow-brand shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]">
            <Activity size={20} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          </div>
          <div>
            <span className="font-bold text-white text-lg tracking-widest display-font">GALAXY<span className="text-brand-400">PULSE</span></span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm font-semibold text-white/60 hover:text-white transition-colors">GitHub</a>
          <Link href="/dashboard" className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-bold tracking-wide hover:bg-white/20 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105">
            Enter Command Center
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-6 text-center max-w-5xl mx-auto">
        
        {/* Hackathon Badge */}
        <div className="animate-fade-in inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl mb-8 hover:bg-white/10 transition-colors cursor-pointer group">
           <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-brand-500 to-accent-cyan shadow-[0_0_10px_rgba(0,212,255,0.5)]">
             <Globe size={12} className="text-white animate-spin-slow" />
           </span>
           <span className="text-xs sm:text-sm font-bold text-white tracking-widest uppercase opacity-80 group-hover:opacity-100 transition-opacity">
             Built for <span className="text-brand-400">Samsung Prism</span> x <span className="text-accent-pink">OpenClaw</span>
           </span>
        </div>

        {/* Headline */}
        <h1 className="animate-slide-up text-5xl sm:text-7xl md:text-8xl font-black text-white display-font tracking-tighter leading-tight drop-shadow-2xl">
          Live Intelligence for the <br />
          <span className="gradient-text bg-clip-text text-transparent">Galaxy Ecosystem</span>
        </h1>

        <p className="animate-slide-up animation-delay-200 mt-8 text-lg sm:text-xl text-white/60 max-w-3xl font-medium leading-relaxed">
          GalaxyPulse is an autonomous, context-aware micro-feedback agent. We intercept UI friction, map biometric signals, and synthesize neural digests in real-time to redefine Samsung user experience.
        </p>

        {/* CTA Buttons */}
        <div className="animate-slide-up animation-delay-400 mt-12 flex flex-col sm:flex-row gap-6">
          <Link href="/dashboard" className="group relative px-8 py-4 rounded-2xl bg-brand-600 font-bold text-lg text-white tracking-wide overflow-hidden shadow-[0_0_30px_rgba(138,43,226,0.5)] hover:scale-105 hover:shadow-[0_0_50px_rgba(138,43,226,0.8)] transition-all">
            <span className="relative z-10 flex items-center justify-center gap-2">
              Launch Dashboard <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500 via-accent-cyan to-brand-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          <a href="#features" className="px-8 py-4 rounded-2xl glass-panel border border-white/10 font-bold text-lg text-white hover:bg-white/10 transition-all hover:scale-105">
            Explore Architecture
          </a>
        </div>

        {/* Team Credits */}
        <div className="animate-fade-in animation-delay-1000 mt-24 pt-8 border-t border-white/10 w-full flex flex-col items-center">
          <p className="text-xs uppercase tracking-[0.3em] font-black text-white/30 mb-4">Developed By</p>
          <div className="px-6 py-3 rounded-2xl glass border border-brand-500/30 glow-brand inline-flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
             <span className="text-lg font-black text-white tracking-widest display-font drop-shadow-[0_0_10px_rgba(138,43,226,0.8)]">SERIOUSVIBECODER</span>
          </div>
        </div>

      </main>

      {/* Feature Highlight Section */}
      <section id="features" className="relative z-10 py-32 px-6 max-w-7xl mx-auto border-t border-white/5 bg-black/20 mt-16 rounded-[3rem] backdrop-blur-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
         <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-black text-white display-font tracking-tight">The Core <span className="gradient-text-alt bg-clip-text text-transparent">Architecture</span></h2>
            <p className="mt-4 text-white/50 text-lg">Next-generation telemetry for next-generation devices.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Autonomous ADB Agents", desc: "Monitors app usage state natively without compromising user data or requiring heavy SDKs." },
              { icon: Shield, title: "Contextual Intercepts", desc: "Uses deterministic rules combined with generative AI to only ask for feedback when friction is detected." },
              { icon: Cpu, title: "Neural Synthesis Digest", desc: "Generates high-fidelity summaries from raw sentiment using localized OpenRouter models." }
            ].map((ft, i) => (
              <div key={i} className="glass-elevated p-8 rounded-3xl border border-white/10 hover:border-brand-500/50 hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand-500/20 transition-all duration-300">
                  <ft.icon size={28} className="text-white/50 group-hover:text-brand-400 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-wide">{ft.title}</h3>
                <p className="text-white/50 leading-relaxed">{ft.desc}</p>
              </div>
            ))}
         </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center border-t border-white/5 mt-auto">
        <p className="text-sm font-medium text-white/30 tracking-wider">
          © {new Date().getFullYear()} GalaxyPulse. All systems nominal.
        </p>
      </footer>
    </div>
  );
}
