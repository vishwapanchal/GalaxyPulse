import { clsx } from "clsx";

interface HealthBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function getHealthConfig(score: number) {
  if (score >= 70) return { text: "text-accent-green text-glow", bg: "bg-accent-green/10 border-accent-green/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]", label: "Nominal" };
  if (score >= 40) return { text: "text-accent-amber text-shadow-[0_0_10px_rgba(245,158,11,0.6)]", bg: "bg-accent-amber/10 border-accent-amber/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]", label: "Warning" };
  return { text: "text-accent-red text-shadow-[0_0_10px_rgba(239,68,68,0.6)]", bg: "bg-accent-red/10 border-accent-red/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]", label: "Critical" };
}

export default function HealthBadge({ score, size = "md", showLabel = false }: HealthBadgeProps) {
  const { text, bg, label } = getHealthConfig(score);
  const textSize = size === "lg" ? "text-3xl font-extrabold display-font" : size === "sm" ? "text-sm font-bold" : "text-xl font-extrabold display-font";

  return (
    <div className={clsx("relative inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl border backdrop-blur-md", bg)}>
      {/* Micro-glow dot */}
      <div className={clsx(
        "w-2 h-2 rounded-full animate-pulse",
        score >= 70 ? "bg-accent-green shadow-[0_0_5px_#10b981]" : score >= 40 ? "bg-accent-amber shadow-[0_0_5px_#f59e0b]" : "bg-accent-red shadow-[0_0_5px_#ef4444]"
      )} />
      <span className={clsx(textSize, text, "tracking-tight")}>{Math.round(score)}</span>
      {showLabel && <span className={clsx("text-[10px] uppercase tracking-widest font-bold opacity-80", text)}>{label}</span>}
      
      {/* Glass sheen */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
    </div>
  );
}
