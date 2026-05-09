"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getFeatureTimeline, getFeatureTags, getFeedback } from "@/lib/api";
import type { FeatureTimeline, TagFrequency, FeedbackRecord } from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { ArrowLeft, Tag, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function FeatureDeepDive() {
  const { id } = useParams<{ id: string }>();
  const [timeline, setTimeline] = useState<FeatureTimeline | null>(null);
  const [tags, setTags] = useState<TagFrequency[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.allSettled([
      getFeatureTimeline(id),
      getFeatureTags(id),
      getFeedback({ feature_id: id, limit: 10 }),
    ]).then(([t, tg, fb]) => {
      if (t.status  === "fulfilled") setTimeline(t.value);
      if (tg.status === "fulfilled") setTags(tg.value.tags);
      if (fb.status === "fulfilled") setFeedback(fb.value.items);
      setLoading(false);
    });
  }, [id]);

  const maxTagCount = tags[0]?.count ?? 1;

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/features" className="p-2 glass rounded-xl text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">
            {loading ? "Loading…" : <><span className="gradient-text">{timeline?.feature_name}</span> Deep Dive</>}
          </h1>
          <p className="text-slate-500 font-mono text-xs mt-1">{id}</p>
        </div>
      </div>

      {/* Sentiment Timeline */}
      <div className="glass rounded-2xl border border-surface-600 p-6">
        <h2 className="text-base font-semibold text-white mb-4">Sentiment Timeline (30 days)</h2>
        {loading ? (
          <div className="h-64 bg-surface-700/30 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeline?.timeline ?? []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2a47" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" })} />
              <YAxis domain={[1, 5]} tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0d1424", border: "1px solid #253555", borderRadius: 8 }}
                labelStyle={{ color: "#94a3b8", fontSize: 11 }}
                itemStyle={{ color: "#3b6cff" }}
                formatter={(v: number) => [v.toFixed(2), "Avg Satisfaction"]}
              />
              <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Neutral (3)", fill: "#f59e0b", fontSize: 10 }} />
              <Line type="monotone" dataKey="avg_satisfaction" stroke="#3b6cff" strokeWidth={2.5}
                dot={{ fill: "#3b6cff", r: 3 }} activeDot={{ r: 5, fill: "#00d4ff" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Friction Tag Bar Chart */}
        <div className="glass rounded-2xl border border-surface-600 p-6">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Tag size={16} className="text-brand-400" /> Top Friction Tags
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-surface-700/30 rounded animate-pulse" />)}
            </div>
          ) : tags.length === 0 ? (
            <p className="text-slate-500 text-sm">No tags yet.</p>
          ) : (
            <div className="space-y-3">
              {tags.slice(0, 8).map(({ tag, count }) => (
                <div key={tag} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 w-36 truncate">{tag}</span>
                  <div className="flex-1 h-2 bg-surface-600 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-brand rounded-full transition-all duration-700"
                      style={{ width: `${(count / maxTagCount) * 100}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Verbatims */}
        <div className="glass rounded-2xl border border-surface-600 p-6">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-accent-cyan" /> Recent Verbatims
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-surface-700/30 rounded animate-pulse" />)}
            </div>
          ) : feedback.length === 0 ? (
            <p className="text-slate-500 text-sm">No feedback yet.</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {feedback.map((fb) => (
                <div key={fb.id} className="glass-elevated rounded-xl p-3 border border-surface-600">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} className={`text-xs ${s <= (fb.satisfaction ?? 0) ? "text-accent-amber" : "text-surface-500"}`}>★</span>
                      ))}
                    </div>
                    {fb.friction && (
                      <span className="text-xs bg-accent-red/10 text-accent-red px-1.5 py-0.5 rounded-md font-medium">Friction</span>
                    )}
                    <span className="text-xs text-slate-600 ml-auto">
                      {fb.time_of_day} · stress {fb.stress_score?.toFixed(0) ?? "?"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {fb.verbatim_q1 ?? "No verbatim"}
                  </p>
                  {fb.auto_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {fb.auto_tags.map((t) => (
                        <span key={t} className="text-xs bg-brand-500/10 text-brand-400 px-1.5 py-0.5 rounded-md font-mono">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
