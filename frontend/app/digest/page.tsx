"use client";
import { useEffect, useState } from "react";
import { getAllDigests } from "@/lib/api";
import type { WeeklyDigest } from "@/lib/api";
import { FileText, ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function DigestPage() {
  const [digests, setDigests] = useState<WeeklyDigest[]>([]);
  const [selected, setSelected] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllDigests().then((data) => {
      setDigests(data);
      if (data.length > 0) setSelected(data[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText size={28} className="text-accent-cyan" />
            Weekly <span className="gradient-text">Digest</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">AI-generated weekly summary from OpenClaw HEARTBEAT</p>
        </div>
        {digests.length > 1 && (
          <div className="relative">
            <select
              onChange={(e) => {
                const d = digests.find((d) => d.id === e.target.value);
                if (d) setSelected(d);
              }}
              className="glass rounded-xl px-4 py-2 pr-8 text-sm text-slate-200 border border-surface-600 bg-surface-800 outline-none appearance-none"
            >
              {digests.map((d) => (
                <option key={d.id} value={d.id}>Week of {d.week_start}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass rounded-2xl h-32 animate-pulse bg-surface-700/30" />
          ))}
        </div>
      ) : !selected ? (
        <div className="glass rounded-2xl border border-surface-600 p-16 text-center">
          <FileText size={40} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-sm font-medium">No weekly digest yet</p>
          <p className="text-slate-600 text-xs mt-2">
            The OpenClaw HEARTBEAT generates this every Monday at 09:00 via the weekly-digest skill.
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-slide-up">
          {/* Header */}
          <div className="glass-elevated rounded-2xl border border-brand-500/20 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Week of {selected.week_start}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Generated {new Date(selected.generated_at).toLocaleString()} · by OpenClaw HEARTBEAT
              </p>
            </div>
          </div>

          {/* Top Issues */}
          {selected.top_issues.length > 0 && (
            <div className="glass rounded-2xl border border-surface-600 p-6">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                🔥 Top Issues This Week
              </h2>
              <div className="space-y-3">
                {selected.top_issues.map((issue, i) => {
                  const iss = issue as Record<string, unknown>;
                  return (
                    <div key={i} className="flex items-start gap-4 p-3 glass-elevated rounded-xl border border-surface-600">
                      <span className="text-2xl font-bold text-slate-700">0{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{String(iss.feature ?? "Unknown")}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{String(iss.issue ?? "")}</p>
                        {iss.count && (
                          <p className="text-xs text-slate-600 mt-1">{String(iss.count)} occurrences</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-lg font-semibold shrink-0 ${
                        String(iss.severity) === "high"
                          ? "bg-accent-red/10 text-accent-red"
                          : "bg-accent-amber/10 text-accent-amber"
                      }`}>
                        {String(iss.severity ?? "medium")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sentiment Changes */}
          {Object.keys(selected.sentiment_changes).length > 0 && (
            <div className="glass rounded-2xl border border-surface-600 p-6">
              <h2 className="text-base font-semibold text-white mb-4">📊 Sentiment Changes vs Last Week</h2>
              <div className="space-y-3">
                {Object.entries(selected.sentiment_changes).map(([feature, data]) => {
                  const d = data as Record<string, unknown>;
                  const delta = Number(d.delta ?? 0);
                  return (
                    <div key={feature} className="flex items-center gap-3 p-3 glass-elevated rounded-xl border border-surface-600">
                      <p className="text-sm text-white flex-1 capitalize">{feature.replace(/_/g, " ")}</p>
                      <span className={`flex items-center gap-1 text-sm font-semibold ${
                        delta > 0 ? "text-accent-green" : delta < 0 ? "text-accent-red" : "text-slate-400"
                      }`}>
                        {delta > 0 ? <TrendingUp size={13} /> : delta < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
                        {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-500 capitalize">{String(d.trend ?? "stable")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Novelty Flags */}
          {selected.novelty_flags.length > 0 && (
            <div className="glass rounded-2xl border border-accent-cyan/20 p-6">
              <h2 className="text-base font-semibold text-white mb-4">✨ New Patterns Detected</h2>
              <div className="flex flex-wrap gap-2">
                {selected.novelty_flags.map((flag, i) => (
                  <span key={i} className="text-xs bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 px-3 py-1.5 rounded-xl font-medium">
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* OTA Correlations */}
          {selected.ota_correlations.length > 0 && (
            <div className="glass rounded-2xl border border-surface-600 p-6">
              <h2 className="text-base font-semibold text-white mb-4">⚡ OTA Correlations</h2>
              <div className="space-y-2">
                {selected.ota_correlations.map((c, i) => {
                  const corr = c as Record<string, unknown>;
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 glass-elevated rounded-xl">
                      <p className="text-sm text-white flex-1">{String(corr.feature ?? "")}</p>
                      <p className="text-xs text-slate-400 font-mono">{String(corr.build_version ?? "")}</p>
                      <p className="text-xs text-slate-500">{String(corr.impact ?? "")}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
