"use client";
import { useEffect, useState } from "react";
import { getCohorts, getFeatures } from "@/lib/api";
import type { CohortStat, FeatureHealth } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users } from "lucide-react";

export default function CohortsPage() {
  const [cohorts, setCohorts]     = useState<CohortStat[]>([]);
  const [features, setFeatures]   = useState<FeatureHealth[]>([]);
  const [featureId, setFeatureId] = useState("");
  const [loading, setLoading]     = useState(true);

  const load = (fid?: string) => {
    setLoading(true);
    Promise.allSettled([getCohorts(fid ? { feature_id: fid } : {}), getFeatures()]).then(([c, f]) => {
      if (c.status === "fulfilled") setCohorts(c.value);
      if (f.status === "fulfilled") setFeatures(f.value);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const chartData = cohorts.map((c) => ({
    name: c.user_type || "unknown",
    satisfaction: c.avg_satisfaction ?? 0,
    sessions: c.session_count,
  }));

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users size={28} className="text-accent-purple" />
            Cohort <span className="gradient-text">Explorer</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Satisfaction by time-of-day cohort</p>
        </div>
        <select
          value={featureId}
          onChange={(e) => { setFeatureId(e.target.value); load(e.target.value || undefined); }}
          className="glass rounded-xl px-4 py-2 text-sm text-slate-200 border border-surface-600 bg-surface-800 outline-none"
        >
          <option value="">All Features</option>
          {features.map((f) => (
            <option key={f.feature_id} value={f.feature_id}>{f.feature_name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? [...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-2xl h-28 animate-pulse bg-surface-700/30" />
        )) : cohorts.map((c) => (
          <div key={c.user_type} className="glass rounded-2xl border border-surface-600 p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium capitalize">{c.user_type || "Unknown"}</p>
            <p className="text-3xl font-bold text-white mt-1">{c.avg_satisfaction?.toFixed(1) ?? "—"}</p>
            <p className="text-xs text-slate-500 mt-1">{c.session_count} sessions</p>
            <div className="mt-2 h-1 bg-surface-600 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-brand rounded-full"
                style={{ width: `${((c.avg_satisfaction ?? 0) / 5) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl border border-surface-600 p-6">
        <h2 className="text-base font-semibold text-white mb-4">Avg Satisfaction by Time of Day</h2>
        {loading ? <div className="h-64 bg-surface-700/30 rounded-xl animate-pulse" /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2a47" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis domain={[0, 5]} tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0d1424", border: "1px solid #253555", borderRadius: 8 }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Bar dataKey="satisfaction" name="Avg Satisfaction" fill="#3b6cff" radius={[6,6,0,0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="glass rounded-2xl border border-surface-600 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-600">
              {["Cohort", "Sessions", "Avg Satisfaction", "Friction Rate"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-600">
            {loading ? [...Array(4)].map((_, i) => (
              <tr key={i}>{[...Array(4)].map((_, j) => (
                <td key={j} className="px-5 py-4"><div className="h-4 bg-surface-700 rounded animate-pulse" /></td>
              ))}</tr>
            )) : cohorts.map((c) => (
              <tr key={c.user_type} className="hover:bg-surface-700/50 transition-colors">
                <td className="px-5 py-4 text-sm font-medium text-white capitalize">{c.user_type || "Unknown"}</td>
                <td className="px-5 py-4 text-sm text-slate-300">{c.session_count}</td>
                <td className="px-5 py-4 text-sm text-white">{c.avg_satisfaction?.toFixed(1) ?? "—"}</td>
                <td className="px-5 py-4">
                  <span className={`text-sm font-medium ${
                    c.friction_rate > 0.5 ? "text-accent-red" :
                    c.friction_rate > 0.25 ? "text-accent-amber" : "text-accent-green"
                  }`}>
                    {Math.round(c.friction_rate * 100)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
