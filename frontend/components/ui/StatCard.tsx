import { clsx } from "clsx";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accent?: "blue" | "green" | "amber" | "red" | "cyan";
  icon?: React.ReactNode;
}

const accentMap = {
  blue:   "border-brand-500/30 bg-brand-500/5",
  green:  "border-accent-green/30 bg-accent-green/5",
  amber:  "border-accent-amber/30 bg-accent-amber/5",
  red:    "border-accent-red/30 bg-accent-red/5",
  cyan:   "border-accent-cyan/30 bg-accent-cyan/5",
};

const iconAccent = {
  blue:   "text-brand-400",
  green:  "text-accent-green",
  amber:  "text-accent-amber",
  red:    "text-accent-red",
  cyan:   "text-accent-cyan",
};

export default function StatCard({
  label, value, sub, trend, trendValue, accent = "blue", icon
}: StatCardProps) {
  return (
    <div className={clsx(
      "glass rounded-2xl p-5 border animate-slide-up transition-all duration-300 hover:scale-[1.02]",
      accentMap[accent]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        {icon && (
          <div className={clsx("p-2 rounded-xl glass-elevated", iconAccent[accent])}>
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={clsx(
            "text-xs font-semibold",
            trend === "up" ? "text-accent-green" : trend === "down" ? "text-accent-red" : "text-slate-400"
          )}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
          </span>
          <span className="text-xs text-slate-500">vs last week</span>
        </div>
      )}
    </div>
  );
}
