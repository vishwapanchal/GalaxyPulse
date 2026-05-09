"use client";
import { useEffect, useState } from "react";
import { getFeatures } from "@/lib/api";
import type { FeatureHealth } from "@/lib/api";
import HealthBadge from "@/components/ui/HealthBadge";
import Link from "next/link";
import { Cpu, Search } from "lucide-react";

export default function FeaturesPage() {
  const [features, setFeatures] = useState<FeatureHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "healthy" | "warning" | "critical">("all");

  useEffect(() => {
    getFeatures().then((data) => { setFeatures(data); setLoading(false); });
  }, []);

  const filtered = features.filter((f) => {
    const matchSearch = f.feature_name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ? true :
      filter === "healthy" ? f.health_score >= 70 :
      filter === "warning" ? f.health_score >= 40 && f.health_score < 70 :
      f.health_score < 40;
    return matchSearch && matchFilter;
  });

  const FILTERS = [
    { key: "all",      label: "All",      color: "text-slate-400" },
    { key: "healthy",  label: "Healthy",  color: "text-accent-green" },
    { key: "warning",  label: "Warning",  color: "text-accent-amber" },
    { key: "critical", label: "Critical", color: "text-accent-red"  },
  ] as const;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Cpu size={28} className="text-brand-400" />
            Feature <span className="gradient-text">Health</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">All Galaxy AI features with rolling health scores</p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 glass rounded-xl p-1">
          {FILTERS.map(({ key, label, color }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === key ? "bg-surface-600 " + color : "text-slate-500 hover:text-slate-300"
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features…"
            className="w-full glass rounded-xl pl-8 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 border border-surface-600 focus:border-brand-500/50 outline-none bg-transparent"
          />
        </div>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} features</span>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-surface-600 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-600">
              {["Feature", "Health Score", "7d Avg Sat.", "Friction Rate", "Sessions", "Last Updated"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-600">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-surface-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.map((f) => (
              <tr key={f.feature_id} className="hover:bg-surface-700/50 transition-colors group">
                <td className="px-5 py-4">
                  <Link href={`/features/${f.feature_id}`} className="group-hover:text-brand-300 transition-colors">
                    <p className="text-sm font-semibold text-white">{f.feature_name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{f.feature_id}</p>
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <HealthBadge score={f.health_score} showLabel />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <div key={s} className={`w-2 h-2 rounded-full ${
                          s <= Math.round(f.avg_satisfaction_7d ?? 0) ? "bg-brand-400" : "bg-surface-600"
                        }`} />
                      ))}
                    </div>
                    <span className="text-sm text-white font-medium">
                      {f.avg_satisfaction_7d?.toFixed(1) ?? "—"}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-sm font-medium ${
                    f.friction_rate > 0.5 ? "text-accent-red" :
                    f.friction_rate > 0.25 ? "text-accent-amber" : "text-accent-green"
                  }`}>
                    {Math.round(f.friction_rate * 100)}%
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-slate-300">{f.total_sessions}</td>
                <td className="px-5 py-4 text-xs text-slate-500">
                  {new Date(f.last_updated).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center text-slate-500 text-sm">No features match your filter.</div>
        )}
      </div>
    </div>
  );
}
