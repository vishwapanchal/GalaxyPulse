"use client";
import { useEffect, useState } from "react";
import { getOTAEvents, getOTACorrelation, postOTAEvent, getFeatures } from "@/lib/api";
import type { OTAEvent, OTACorrelationEntry, FeatureHealth } from "@/lib/api";
import { Zap, Plus, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

export default function OTAPage() {
  const [events, setEvents]           = useState<OTAEvent[]>([]);
  const [correlations, setCorrelations] = useState<OTACorrelationEntry[]>([]);
  const [features, setFeatures]       = useState<FeatureHealth[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({ build_version: "", release_date: "", features_updated: "", notes: "" });
  const [submitting, setSubmitting]   = useState(false);

  const load = () => {
    setLoading(true);
    Promise.allSettled([getOTAEvents(), getOTACorrelation(), getFeatures()]).then(([e, c, f]) => {
      if (e.status === "fulfilled") setEvents(e.value);
      if (c.status === "fulfilled") setCorrelations(c.value.correlations);
      if (f.status === "fulfilled") setFeatures(f.value);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitting(true);
    try {
      await postOTAEvent({
        build_version: form.build_version,
        release_date: form.release_date,
        features_updated: form.features_updated.split(",").map((s) => s.trim()).filter(Boolean),
        notes: form.notes || undefined,
      });
      setShowForm(false);
      setForm({ build_version: "", release_date: "", features_updated: "", notes: "" });
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const regressions = correlations.filter((c) => c.is_regression);

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Zap size={28} className="text-accent-amber" />
            OTA <span className="gradient-text">Impact Tracker</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Before/after sentiment delta per OTA release</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Register OTA
        </button>
      </div>

      {/* Register OTA Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-elevated rounded-2xl border border-brand-500/30 p-6 space-y-4 animate-slide-up">
          <h3 className="text-sm font-semibold text-white">Register New OTA Event</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Build Version</label>
              <input required value={form.build_version}
                onChange={(e) => setForm({ ...form, build_version: e.target.value })}
                placeholder="One UI 7.0 / June OTA"
                className="w-full glass rounded-xl px-3 py-2 text-sm text-white border border-surface-600 focus:border-brand-500/50 outline-none bg-transparent" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Release Date</label>
              <input required type="date" value={form.release_date}
                onChange={(e) => setForm({ ...form, release_date: e.target.value })}
                className="w-full glass rounded-xl px-3 py-2 text-sm text-white border border-surface-600 focus:border-brand-500/50 outline-none bg-transparent" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Features Updated <span className="text-slate-600">(comma-separated feature IDs)</span>
            </label>
            <input value={form.features_updated}
              onChange={(e) => setForm({ ...form, features_updated: e.target.value })}
              placeholder="ai_photo_erase, circle_to_search"
              className="w-full glass rounded-xl px-3 py-2 text-sm text-white border border-surface-600 focus:border-brand-500/50 outline-none bg-transparent" />
            <p className="text-xs text-slate-600 mt-1">
              Available IDs: {features.map((f) => f.feature_id).join(", ")}
            </p>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes (optional)</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Security patch + performance improvements"
              className="w-full glass rounded-xl px-3 py-2 text-sm text-white border border-surface-600 focus:border-brand-500/50 outline-none bg-transparent" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? "Registering…" : "Register Event"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 glass text-slate-400 hover:text-white rounded-xl text-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Regression Alert */}
      {regressions.length > 0 && (
        <div className="glass-elevated border border-accent-red/30 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-accent-red shrink-0" />
          <p className="text-sm text-slate-300">
            <span className="text-accent-red font-semibold">{regressions.length} regression{regressions.length > 1 ? "s" : ""} detected</span>
            {" "}— sentiment dropped &gt;10 points post-OTA
          </p>
        </div>
      )}

      {/* Correlation Table */}
      <div className="glass rounded-2xl border border-surface-600 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-600">
          <h2 className="text-sm font-semibold text-white">Before / After Sentiment per OTA</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-600">
              {["Feature", "Build Version", "Release Date", "Before (1-5)", "After (1-5)", "Delta", "Status"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-600">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j} className="px-5 py-4"><div className="h-4 bg-surface-700 rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : correlations.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-sm">
                No OTA events registered yet. Register one above to see impact analysis.
              </td></tr>
            ) : correlations.map((c, i) => (
              <tr key={i} className={c.is_regression ? "bg-accent-red/5" : ""}>
                <td className="px-5 py-4 text-sm text-white font-medium">{c.feature_name}</td>
                <td className="px-5 py-4 text-xs text-slate-400 font-mono">{c.build_version}</td>
                <td className="px-5 py-4 text-xs text-slate-400">{c.release_date}</td>
                <td className="px-5 py-4 text-sm text-slate-300">{c.avg_satisfaction_before?.toFixed(2) ?? "—"}</td>
                <td className="px-5 py-4 text-sm text-slate-300">{c.avg_satisfaction_after?.toFixed(2) ?? "—"}</td>
                <td className="px-5 py-4">
                  {c.delta != null ? (
                    <span className={`flex items-center gap-1 text-sm font-semibold ${c.delta >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                      {c.delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {c.delta >= 0 ? "+" : ""}{c.delta.toFixed(1)}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-5 py-4">
                  {c.is_regression ? (
                    <span className="text-xs bg-accent-red/10 text-accent-red px-2 py-1 rounded-lg font-semibold">Regression</span>
                  ) : (
                    <span className="text-xs bg-accent-green/10 text-accent-green px-2 py-1 rounded-lg font-semibold">
                      {c.delta == null ? "Insufficient data" : "Stable"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* OTA Events List */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Registered OTA Events</h2>
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="glass rounded-xl border border-surface-600 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent-amber/10 flex items-center justify-center shrink-0">
                <Zap size={16} className="text-accent-amber" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{e.build_version}</p>
                <p className="text-xs text-slate-500 mt-0.5">{e.notes}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">{e.release_date}</p>
                <p className="text-xs text-slate-600 mt-0.5">{e.features_updated.length} features updated</p>
              </div>
            </div>
          ))}
          {!loading && events.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">No OTA events yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
