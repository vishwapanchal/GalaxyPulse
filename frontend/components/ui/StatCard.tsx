import { clsx } from "clsx";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accent?: "brand" | "green" | "amber" | "red" | "cyan" | "pink";
  icon?: React.ReactNode;
}

const accentConfig = {
  brand: { glow: "glow-brand", text: "text-brand-400", border: "border-brand-500/40", bg: "bg-brand-500/10" },
  green: { glow: "shadow-[0_0_30px_rgba(16,185,129,0.2)]", text: "text-accent-green", border: "border-accent-green/40", bg: "bg-accent-green/10" },
  amber: { glow: "shadow-[0_0_30px_rgba(245,158,11,0.2)]", text: "text-accent-amber", border: "border-accent-amber/40", bg: "bg-accent-amber/10" },
  red:   { glow: "shadow-[0_0_30px_rgba(239,68,68,0.2)]", text: "text-accent-red", border: "border-accent-red/40", bg: "bg-accent-red/10" },
  cyan:  { glow: "glow-cyan", text: "text-accent-cyan", border: "border-accent-cyan/40", bg: "bg-accent-cyan/10" },
  pink:  { glow: "glow-pink", text: "text-accent-pink", border: "border-accent-pink/40", bg: "bg-accent-pink/10" },
};

export default function StatCard({
  label, value, sub, trend, trendValue, accent = "brand", icon
}: StatCardProps) {
  const config = accentConfig[accent] || accentConfig.brand;

  return (
    <div className={clsx(
      "group relative glass-elevated rounded-3xl p-6 transition-all duration-500 hover:scale-[1.03] overflow-hidden cursor-pointer",
      config.glow
    )}>
      {/* Animated gradient overlay on hover */}
      <div className={clsx(
        "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none",
        config.bg
      )} />

      {/* Glass Edge Highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

      <div className="relative flex items-start justify-between z-10">
        <div className="flex-1">
          <p className="text-[11px] text-white/50 font-bold uppercase tracking-[0.15em] mb-2">{label}</p>
          <p className={clsx("text-4xl font-extrabold display-font tracking-tight drop-shadow-md", config.text)}>
            {value}
          </p>
          {sub && <p className="text-sm text-white/40 mt-2 font-medium">{sub}</p>}
        </div>
        {icon && (
          <div className={clsx(
            "p-3 rounded-2xl glass border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-3",
            config.border, config.text
          )}>
            {icon}
          </div>
        )}
      </div>

      {trend && trendValue && (
        <div className="relative mt-4 flex items-center gap-2 pt-4 border-t border-white/5 z-10">
          <div className={clsx(
            "flex items-center justify-center px-2 py-1 rounded-lg text-xs font-bold bg-white/5 border border-white/10",
            trend === "up" ? "text-accent-green" : trend === "down" ? "text-accent-red" : "text-white/50"
          )}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
          </div>
          <span className="text-xs text-white/30 font-medium tracking-wide">vs last week</span>
        </div>
      )}
    </div>
  );
}
