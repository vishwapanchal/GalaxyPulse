"use client";
import { useEffect, useState } from "react";
import { getFeatures, getLatestDigest, getOTACorrelation } from "@/lib/api";
import type { FeatureHealth, WeeklyDigest, OTACorrelationEntry } from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import HealthBadge from "@/components/ui/HealthBadge";
import Link from "next/link";
import { Activity, AlertTriangle, Users, TrendingDown, Cpu, Zap } from "lucide-react";

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
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Galaxy AI <span className="gradient-text">Feedback Intelligence</span>
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Real-time sentiment tracking across all Galaxy AI features
        </p>
      </div>

      {/* OTA Regression Alert */}
      {regressions.length > 0 && (
        <div className="glass-elevated border border-accent-red/30 rounded-2xl p-4 flex items-start gap-3 animate-slide-up">
          <AlertTriangle size={18} className="text-accent-red mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-accent-red">OTA Regression Detected</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {regressions.length} feature{regressions.length > 1 ? "s" : ""} dropped &gt;10 points after the latest OTA:{" "}
              {regressions.map((r) => r.feature_name).join(", ")}
            </p>
          </div>
          <Link href="/ota" className="ml-auto text-xs text-accent-red hover:text-accent-red/80 font-medium whitespace-nowrap">
            View →
          </Link>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Avg Health Score" value={loading ? "—" : avgHealth} sub="across all features"
          accent="blue" icon={<Activity size={16} />} />
        <StatCard label="Total Sessions" value={loading ? "—" : totalSessions.toLocaleString()} sub="feedback collected"
          accent="cyan" icon={<Users size={16} />} />
        <StatCard label="Critical Features" value={loading ? "—" : criticalCount} sub="health score < 40"
          accent={criticalCount > 0 ? "red" : "green"} icon={<AlertTriangle size={16} />} />
        <StatCard label="OTA Regressions" value={loading ? "—" : regressions.length} sub="post-update drops"
          accent={regressions.length > 0 ? "amber" : "green"} icon={<TrendingDown size={16} />} />
      </div>

      {/* Feature Health Scorecard */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Cpu size={18} className="text-brand-400" /> Feature Health Scorecard
          </h2>
          <Link href="/features" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-2xl p-5 animate-pulse h-32 bg-surface-700/50" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {features.map((f) => (
              <Link key={f.feature_id} href={`/features/${f.feature_id}`}>
                <div className="glass rounded-2xl p-5 border border-surface-600 hover:border-brand-500/40 transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-brand-300 transition-colors">
                        {f.feature_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">{f.package_name}</p>
                    </div>
                    <HealthBadge score={f.health_score} showLabel />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-white">
                        {f.avg_satisfaction_7d?.toFixed(1) ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500">Avg Sat.</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">
                        {Math.round(f.friction_rate * 100)}%
                      </p>
                      <p className="text-xs text-slate-500">Friction</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{f.total_sessions}</p>
                      <p className="text-xs text-slate-500">Sessions</p>
                    </div>
                  </div>
                  {/* Health bar */}
                  <div className="mt-3 h-1.5 bg-surface-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        f.health_score >= 70 ? "bg-accent-green" :
                        f.health_score >= 40 ? "bg-accent-amber" : "bg-accent-red"
                      }`}
                      style={{ width: `${f.health_score}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* This Week's Top Issues */}
      {digest && digest.top_issues.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Zap size={18} className="text-accent-amber" /> This Week&apos;s Top Issues
          </h2>
          <div className="glass rounded-2xl border border-surface-600 divide-y divide-surface-600">
            {digest.top_issues.slice(0, 3).map((issue, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <span className="text-2xl font-bold text-slate-600">0{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {String((issue as Record<string, unknown>).feature ?? "Unknown Feature")}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {String((issue as Record<string, unknown>).issue ?? "")}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                  String((issue as Record<string, unknown>).severity) === "high"
                    ? "bg-accent-red/10 text-accent-red"
                    : "bg-accent-amber/10 text-accent-amber"
                }`}>
                  {String((issue as Record<string, unknown>).severity ?? "medium")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
