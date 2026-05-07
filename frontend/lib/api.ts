import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 10000,
});

// ── Types ────────────────────────────────────────────────────────────────────

export interface FeatureHealth {
  feature_id: string;
  feature_name: string;
  package_name: string | null;
  health_score: number;
  avg_satisfaction_7d: number | null;
  avg_satisfaction_30d: number | null;
  friction_rate: number;
  total_sessions: number;
  last_updated: string;
}

export interface SentimentPoint {
  date: string;
  avg_satisfaction: number;
  session_count: number;
  build_version: string | null;
}

export interface FeatureTimeline {
  feature_id: string;
  feature_name: string;
  timeline: SentimentPoint[];
}

export interface TagFrequency {
  tag: string;
  count: number;
}

export interface FeedbackRecord {
  id: string;
  session_id: string;
  feature_id: string;
  feature_name: string;
  satisfaction: number | null;
  friction: boolean;
  sentiment: string | null;
  auto_tags: string[];
  verbatim_q1?: string;
  stress_score?: number;
  sleep_score?: number;
  time_of_day?: string;
  timestamp: string;
  created_at: string;
}

export interface OTAEvent {
  id: string;
  build_version: string;
  release_date: string;
  features_updated: string[];
  notes: string | null;
  created_at: string;
}

export interface OTACorrelationEntry {
  feature_id: string;
  feature_name: string;
  build_version: string;
  release_date: string;
  avg_satisfaction_before: number | null;
  avg_satisfaction_after: number | null;
  delta: number | null;
  is_regression: boolean;
}

export interface WeeklyDigest {
  id: string;
  week_start: string;
  top_issues: Record<string, unknown>[];
  sentiment_changes: Record<string, unknown>;
  novelty_flags: string[];
  ota_correlations: Record<string, unknown>[];
  generated_at: string;
}

export interface CohortStat {
  user_type: string;
  session_count: number;
  avg_satisfaction: number | null;
  friction_rate: number;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const getFeatures = () =>
  api.get<FeatureHealth[]>("/api/features").then((r) => r.data);

export const getFeatureTimeline = (featureId: string) =>
  api.get<FeatureTimeline>(`/api/features/${featureId}/timeline`).then((r) => r.data);

export const getFeatureTags = (featureId: string) =>
  api.get<{ feature_id: string; tags: TagFrequency[] }>(`/api/features/${featureId}/tags`).then((r) => r.data);

export const getFeedback = (params?: { feature_id?: string; limit?: number }) =>
  api.get<{ total: number; items: FeedbackRecord[] }>("/api/feedback", { params }).then((r) => r.data);

export const getOTAEvents = () =>
  api.get<OTAEvent[]>("/api/ota/event").then((r) => r.data);

export const getOTACorrelation = () =>
  api.get<{ correlations: OTACorrelationEntry[] }>("/api/ota/correlation").then((r) => r.data);

export const getLatestDigest = () =>
  api.get<WeeklyDigest>("/api/digest/weekly").then((r) => r.data);

export const getAllDigests = () =>
  api.get<WeeklyDigest[]>("/api/digest/weekly/all").then((r) => r.data);

export const getCohorts = (params?: { feature_id?: string }) =>
  api.get<CohortStat[]>("/api/cohorts", { params }).then((r) => r.data);

export const postOTAEvent = (data: {
  build_version: string;
  release_date: string;
  features_updated: string[];
  notes?: string;
}) => api.post<OTAEvent>("/api/ota/event", data).then((r) => r.data);

export default api;
