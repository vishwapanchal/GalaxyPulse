import { clsx } from "clsx";

interface HealthBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function getHealthColor(score: number) {
  if (score >= 70) return { text: "text-accent-green", bg: "bg-accent-green/10 border-accent-green/30", label: "Healthy" };
  if (score >= 40) return { text: "text-accent-amber", bg: "bg-accent-amber/10 border-accent-amber/30", label: "Warning" };
  return { text: "text-accent-red", bg: "bg-accent-red/10 border-accent-red/30", label: "Critical" };
}

export default function HealthBadge({ score, size = "md", showLabel = false }: HealthBadgeProps) {
  const { text, bg, label } = getHealthColor(score);
  const textSize = size === "lg" ? "text-2xl font-bold" : size === "sm" ? "text-sm font-semibold" : "text-lg font-bold";

  return (
    <div className={clsx("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border", bg)}>
      <span className={clsx(textSize, text)}>{Math.round(score)}</span>
      {showLabel && <span className={clsx("text-xs font-medium", text)}>{label}</span>}
    </div>
  );
}
