# GalaxyPulse — Implementation Plan
### PRISM OpenClaw Hackathon | Team: [Your Team Name] | Theme 2: Daily Utility (Smartphones)

---

## 1. Executive Summary

**GalaxyPulse** is a contextual micro-feedback harvesting system built on OpenClaw. It is an always-on Android agent that detects when a Samsung Galaxy AI feature has just been used, reads the user's biometric and environmental context from Samsung Health and Android system APIs, and proactively initiates a short conversational feedback session over WhatsApp or Telegram — without any popups, forms, or manual effort from the user.

The collected feedback is streamed to a web dashboard where SRIB product managers can view feature health scores, sentiment evolution across OTA updates, friction heatmaps, and cohort breakdowns — giving Samsung a longitudinal, context-rich signal that no existing in-app feedback tool provides.

**Core novelty:** No existing product combines always-on OS-level usage detection + biometric context + conversational LLM-driven feedback + longitudinal memory. Existing tools (Instabug, Qualaroo, Formbricks) are passive SDKs embedded inside apps. GalaxyPulse is an intelligent external agent that reasons about *when* and *how* to ask.

---

## 2. Problem Statement

Samsung Research Institute Bangalore builds Galaxy AI features (AI Photo Erase, Circle to Search, AI Wallpaper, Live Translate, Generative Edit, Note Assist, etc.) but collects feedback through:

- **App store reviews** — delayed, biased, anonymous, not tied to a feature
- **Formal user studies** — expensive, infrequent, lab conditions
- **Bug reports** — only captures failures, not UX friction or delight
- **NPS surveys** — post-hoc, forgettable, low response rates

**The gap:** There is no system that captures what a Galaxy AI user *genuinely felt* about a feature at the exact moment they used it, enriched with the real-world context (stress level, time of day, location, sleep quality) that shaped that experience.

GalaxyPulse fills this gap using OpenClaw as the always-on reasoning and delivery agent.

---

## 3. Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ANDROID PHONE (User)                    │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  UsageStats API  │    │   Samsung Health SDK (Mock)  │  │
│  │  (Feature usage  │    │   Stress / Sleep / HR / Steps│  │
│  │   detection)     │    └──────────────┬───────────────┘  │
│  └────────┬─────────┘                   │                   │
│           │                             │                   │
│           ▼                             ▼                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │           OpenClaw Android Node (Termux)            │    │
│  │                                                     │    │
│  │  HEARTBEAT.md ──► polls every 5 min                │    │
│  │  SOUL.md      ──► agent persona & rules             │    │
│  │  MEMORY/      ──► YAML files per feature per user   │    │
│  │  SKILLS/      ──► custom skill files (see §6)       │    │
│  └────────────────────────┬───────────────────────────┘    │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │ WhatsApp / Telegram
                             ▼
                  ┌─────────────────────┐
                  │   User Conversation  │
                  │  (2-question voice/  │
                  │   text exchange)     │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   FastAPI Backend   │
                  │   (Python)          │
                  │   PostgreSQL DB     │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   React Web         │
                  │   Dashboard         │
                  │   (PM / UX Portal)  │
                  └─────────────────────┘
```

### Component Breakdown

| Component | Technology | Role |
|---|---|---|
| OpenClaw Android Node | Termux + Node.js ≥22 | Core agent runtime on phone |
| HEARTBEAT.md | OpenClaw cron daemon | Polls usage + health, triggers feedback |
| SOUL.md | OpenClaw personality file | Defines agent tone, rules, question style |
| Feature Watcher Skill | Custom skill (JS) | Reads Android UsageStats API |
| Health Context Skill | Custom skill (JS) | Reads Samsung Health / mock data |
| Feedback Conductor Skill | Custom skill (JS) | Runs the conversational feedback loop |
| FastAPI Backend | Python 3.11 | Receives feedback, stores in DB, serves API |
| PostgreSQL | DB | Feedback records, feature health scores |
| React Dashboard | Vite + React + Recharts | PM portal — heatmaps, timelines, cohorts |
| WhatsApp / Telegram | OpenClaw channel adapter | Delivery channel for feedback conversations |

---

## 4. OpenClaw Integration (Core)

This section describes how GalaxyPulse uses OpenClaw primitives.

### 4.1 SOUL.md

Defines the agent's persona for the feedback context:

```markdown
# SOUL.md — GalaxyPulse

You are GalaxyPulse, a friendly and empathetic AI companion that helps Samsung
researchers understand how people feel about Galaxy AI features in real life.

Rules:
- Never interrupt the user if they are in a meeting, driving, or stressed (stress > 70)
- Keep feedback sessions to 2 questions maximum — respect the user's time
- Always acknowledge the user's feeling before asking the follow-up
- Never ask the same feature twice in the same day
- Use casual, warm language — never corporate survey language
- If the user says "not now", reschedule for 2 hours later silently
- Store every session result to memory/feedback/{feature}/{date}.yaml
```

### 4.2 HEARTBEAT.md

Runs every 5 minutes as a background daemon:

```markdown
# HEARTBEAT.md — GalaxyPulse

Every 5 minutes:
1. Invoke skill: feature-watcher → get list of Galaxy AI features used in last 10 min
2. If any feature found AND not already asked today:
   a. Invoke skill: health-context → get current stress, sleep score, time of day
   b. If stress > 80 or time is 23:00–07:00: log "deferred" and skip
   c. Else: invoke skill: feedback-conductor with {feature, health_context}
3. Every Monday 09:00: invoke skill: weekly-digest → post summary to PM dashboard
4. Every night 00:00: invoke skill: memory-compactor → summarize weekly feedback files
```

### 4.3 Durable Memory Structure

```
~/.openclaw/workspace/
├── memory/
│   ├── feedback/
│   │   ├── ai_photo_erase/
│   │   │   ├── 2026-05-07.yaml
│   │   │   └── 2026-05-06.yaml
│   │   ├── circle_to_search/
│   │   └── live_translate/
│   ├── user_profile.yaml          # persona, preferred channel, cohort
│   ├── feature_health_scores.yaml # rolling health per feature
│   └── deferred_sessions.yaml     # sessions rescheduled by user
├── skills/
│   ├── feature-watcher.js
│   ├── health-context.js
│   ├── feedback-conductor.js
│   └── weekly-digest.js
├── SOUL.md
└── HEARTBEAT.md
```

Each feedback YAML file looks like:
```yaml
# memory/feedback/ai_photo_erase/2026-05-07.yaml
feature: ai_photo_erase
build_version: "One UI 7.0 / May OTA"
timestamp: "2026-05-07T14:32:00+05:30"
context:
  stress_score: 42
  sleep_score: 78
  time_of_day: afternoon
  location_type: home
  battery_level: 67
responses:
  q1_satisfaction: 4          # 1-5 scale
  q1_verbatim: "It worked but left a weird shadow on the left side"
  q2_friction: true
  q2_verbatim: "Had to try 3 times before the brush covered the whole object"
sentiment: negative_friction
auto_tags:
  - brush_precision
  - multi_attempt
  - shadow_artifact
severity: medium
```

---

## 5. Feature Details (Supporting Features)

### Feature 1 — Intelligent Usage Detection
**What it does:** Reads Android `UsageStatsManager` every 5 minutes to detect when a Galaxy AI feature package was foregrounded and used for >3 seconds.

**Why it's novel:** Existing feedback tools require an SDK inside the app. This works externally — the agent watches the OS, not the app.

**Implementation:**
- Android `UsageStatsManager` API (no root needed, just `PACKAGE_USAGE_STATS` permission)
- Feature package name registry (e.g., `com.samsung.android.photostudio` → "AI Photo Erase")
- Minimum engagement threshold: 3 seconds in foreground
- Deduplication: same feature not re-triggered for 6 hours

---

### Feature 2 — Biometric Context Enrichment
**What it does:** At the moment of trigger, reads the user's current biometric state to decide whether to ask, and to enrich the feedback record with human context.

**Signals read:**
- Stress score (0–100) from Samsung Health
- Sleep quality score from last night
- Heart rate (resting vs. elevated)
- Step count (proxy for active vs. sedentary)
- Time of day, day of week

**Why this matters:** A user who rates AI Photo Erase 2/5 after 4 hours of sleep and a stress score of 85 is giving contextually different data than the same rating after a relaxed Saturday morning. SRIB needs this signal to separate "feature is bad" from "user was in a bad state."

**Hackathon note:** For the prototype, Samsung Health SDK is mocked with realistic random data within plausible ranges. The skill file is structured to swap in the real SDK with a one-line change.

---

### Feature 3 — Conversational Feedback Conductor
**What it does:** Sends a 2-question WhatsApp/Telegram conversation to the user immediately after feature use. Questions are dynamically generated by the LLM based on the feature and the user's context.

**Example conversation (AI Photo Erase):**

> **GalaxyPulse:** Hey! You just used AI Photo Erase — did the result turn out the way you imagined? (Reply 1-5 or just tell me)
>
> **User:** 3, it left a shadow
>
> **GalaxyPulse:** Got it, shadows are tricky! Did you have to retry, or did it work on the first try?
>
> **User:** Tried 3 times
>
> **GalaxyPulse:** Thanks, logged that 👍 I'll let the team know about the shadow edge case.

**Why it's novel:** No popup, no form, no app switch. It meets the user where they already are (messaging app). The LLM generates the second question based on the first answer — it's a dynamic conversation, not a static survey.

**Implementation:**
- OpenClaw WhatsApp/Telegram channel (already supported natively)
- LLM prompt: given feature name + first answer, generate a follow-up that probes the specific friction point
- Max 2 turns to respect user time (enforced in SOUL.md)
- Response parsed by LLM into structured fields: satisfaction score, friction flag, auto-tags, severity

---

### Feature 4 — Trigger Intelligence (Anti-Interrupt)
**What it does:** Before initiating a feedback session, the agent checks whether now is a good time. If not, it silently reschedules.

**Rules (defined in SOUL.md):**
- Stress score > 75 → defer 2 hours
- Time between 23:00 and 07:00 → defer to morning
- Battery < 15% → skip entirely
- Same feature triggered again within 6 hours → skip
- User replied "not now" or "busy" → defer 2 hours

**Why this matters for SRIB:** Feedback collected when a user is stressed or exhausted is lower quality and more negative-biased. The trigger intelligence filter improves signal quality, not just user experience.

---

### Feature 5 — Sentiment Evolution Tracker (Longitudinal Memory)
**What it does:** Tracks how a user's sentiment for a specific feature changes over time, especially across OTA software updates.

**How it works:**
- Each feedback YAML is tagged with the current One UI build version (read from Android `Build.VERSION`)
- The web dashboard plots a sentiment timeline per feature per build version
- When a new OTA update is detected, the HEARTBEAT automatically increases feedback collection frequency for updated features for 3 days ("OTA sensitivity window")

**Business value:** SRIB can see whether an OTA update improved or degraded user experience for a specific feature — within days of release, not weeks after app store reviews accumulate.

---

### Feature 6 — Friction Point Auto-Tagger
**What it does:** The LLM automatically extracts structured tags from free-text user responses, mapping them to Samsung's feature taxonomy.

**Example:**
- User says: "Had to try three times and the edges looked blurry"
- Auto-tags: `multi_attempt`, `edge_quality`, `brush_precision`
- Mapped to: `AI Photo Erase → Inpainting Engine → Edge Sharpness`

**Implementation:**
- LLM prompt at time of feedback storage: given the user's verbatim response and the feature name, output a JSON array of 2-5 tags from a predefined taxonomy
- Tag taxonomy defined in `memory/taxonomy.yaml` — editable by SRIB team
- Tags are stored in the feedback YAML and indexed in PostgreSQL for dashboard filtering

---

### Feature 7 — Weekly PM Digest (HEARTBEAT-driven)
**What it does:** Every Monday at 09:00, the HEARTBEAT generates and posts a structured weekly digest to the web dashboard (and optionally emails the PM team).

**Digest contains:**
- Top 3 features with most negative feedback this week
- Top friction tags across all features
- New friction patterns that didn't appear last week (novelty detection)
- Sentiment change vs. last week per feature
- OTA correlation: did the update released Tuesday cause the spike in AI Photo Erase complaints?

**Implementation:** HEARTBEAT skill compacts the week's YAML files using the LLM, generates a structured JSON summary, posts to FastAPI `/api/digest/weekly`, and sends a formatted WhatsApp message to the PM's number.

---

## 6. Skill Files (OpenClaw)

### skill: feature-watcher.js
```
Purpose: Query Android UsageStats API, return list of Galaxy AI features 
         used in the last N minutes with usage duration.
Input:   { lookback_minutes: 10 }
Output:  [ { package: "com.samsung.android.photostudio", 
             feature_name: "AI Photo Erase", 
             duration_sec: 45, 
             timestamp: "..." } ]
Permission required: android.permission.PACKAGE_USAGE_STATS
```

### skill: health-context.js
```
Purpose: Read current biometric state from Samsung Health SDK (mocked for prototype).
Input:   {}
Output:  { stress_score: 42, sleep_score: 78, heart_rate: 72, 
           steps_today: 3200, battery_level: 67, 
           time_of_day: "afternoon", is_charging: false }
```

### skill: feedback-conductor.js
```
Purpose: Run a 2-turn conversational feedback session over WhatsApp/Telegram.
Input:   { feature: "AI Photo Erase", health_context: {...} }
Process: 
  1. Generate Q1 using Claude API (feature-specific opening question)
  2. Send via OpenClaw channel adapter
  3. Wait for response (timeout: 30 min, then abandon)
  4. Generate Q2 based on Q1 response
  5. Send Q2, wait for response
  6. Parse both responses into structured feedback
  7. Write to memory/feedback/{feature}/{date}.yaml
  8. POST to backend API
Output:  { session_id, feature, satisfaction, friction, tags, severity }
```

### skill: weekly-digest.js
```
Purpose: Aggregate weekly feedback files and post digest to dashboard.
Input:   { week_start: "2026-05-04" }
Process:
  1. Read all YAML files in memory/feedback/*/{week_start}*.yaml
  2. Summarize with Claude API → structured JSON
  3. POST to /api/digest/weekly
  4. Send WhatsApp summary to PM contact
Output:  { top_issues, sentiment_changes, ota_correlations, novelty_flags }
```

---

## 7. Backend API (FastAPI)

### Tech Stack
- Python 3.11 + FastAPI
- PostgreSQL (feedback records, feature scores, digests)
- SQLAlchemy ORM
- Deployed on: Railway / Render (free tier for prototype)

### Endpoints

```
POST   /api/feedback              Store a feedback record from OpenClaw
GET    /api/features              List all features with current health score
GET    /api/features/{id}/timeline Sentiment timeline for a feature (by build)
GET    /api/features/{id}/tags    Top friction tags for a feature
GET    /api/cohorts               User cohort breakdown
GET    /api/digest/weekly         Latest weekly digest
POST   /api/digest/weekly         Post new digest from agent
GET    /api/ota/correlation        Sentiment change around OTA events
POST   /api/ota/event             Register a new OTA update event
GET    /api/health                Server health check
```

### Database Schema (key tables)

```sql
feedback_records
  id, user_id, feature_id, build_version, timestamp,
  satisfaction (1-5), friction (bool), verbatim_q1, verbatim_q2,
  auto_tags (jsonb), severity, stress_score, sleep_score,
  time_of_day, location_type, session_id

feature_health
  feature_id, feature_name, package_name,
  health_score (0-100), last_updated, total_sessions,
  avg_satisfaction_7d, avg_satisfaction_30d, friction_rate

ota_events
  id, build_version, release_date, features_updated (jsonb)

weekly_digests
  id, week_start, top_issues (jsonb), sentiment_changes (jsonb),
  novelty_flags (jsonb), generated_at
```

---

## 8. Web Dashboard (React)

### Tech Stack
- React 18 + Vite
- Recharts (charts and timelines)
- Tailwind CSS
- Deployed on: Vercel (free tier)

### Pages / Views

#### 8.1 Overview Dashboard (Home)
- Feature Health Scorecard: grid of all Galaxy AI features with color-coded health scores (green >70, amber 40–70, red <40)
- This Week's Top Issues: top 3 friction patterns with trend arrow vs. last week
- Active Users widget: number of users who gave feedback this week
- OTA Alert banner: if a recent OTA correlates with a sentiment drop, show an alert

#### 8.2 Feature Deep Dive
- Sentiment Timeline: line chart of avg satisfaction score over time, with OTA release markers as vertical lines
- Friction Tag Cloud: word cloud of auto-tags for the selected feature
- Verbatim Feed: scrollable list of recent user verbatims with context (stress, sleep, time)
- Cohort Comparison: side-by-side satisfaction for power users vs. casual users
- Build Comparison: bar chart — satisfaction per One UI build version

#### 8.3 Cohort Explorer
- Filter by: user type (power / casual / elderly), time of day, stress level at time of feedback, day of week
- Any filter combination rerenders all charts

#### 8.4 OTA Impact Tracker
- Table of OTA releases with before/after sentiment per updated feature
- Automatically flags regressions (sentiment dropped >10 points post-OTA)

#### 8.5 Weekly Digest View
- Formatted weekly digest (generated by HEARTBEAT skill)
- Previous weeks accessible from dropdown

---

## 9. Development Timeline

### Phase 2 Deadline: 8th May 2026 EOD

```
Day 1–2 (May 7–8): Core Agent Loop
  ├── Set up OpenClaw on Android (Termux)
  ├── Write SOUL.md and HEARTBEAT.md
  ├── Implement feature-watcher.js (UsageStats API)
  ├── Implement health-context.js (mocked Samsung Health)
  ├── Implement feedback-conductor.js (WhatsApp channel)
  └── End-to-end test: feature used → agent asks → YAML written ✓

Day 3 (May 9): Backend
  ├── FastAPI project setup + PostgreSQL schema
  ├── Implement /api/feedback POST endpoint
  ├── Implement /api/features GET endpoints
  └── Deploy to Railway

Day 4–5 (May 10–11): Dashboard MVP
  ├── React project setup + Tailwind
  ├── Overview dashboard with Feature Health Scorecard
  ├── Feature Deep Dive — sentiment timeline chart
  ├── Connect to backend API
  └── Deploy to Vercel

Day 6 (May 12): Advanced Features
  ├── Auto-tagger LLM prompt + tag storage
  ├── Trigger intelligence (anti-interrupt rules)
  ├── OTA event registration + correlation view
  └── Weekly digest skill

Day 7 (May 13): Integration & Polish
  ├── Full end-to-end flow test
  ├── Demo scenario preparation (3 scenarios)
  ├── README.md + setup instructions
  └── APK build + GitHub repo cleanup
```

---

## 10. Demo Scenarios (for Phase 3 Video)

### Scenario 1 — AI Photo Erase Feedback (Core Flow)
1. Open Samsung Gallery, use AI Photo Erase on a photo
2. 3 minutes later, WhatsApp message arrives from GalaxyPulse
3. User replies with rating + complaint about shadow edges
4. GalaxyPulse asks follow-up, logs the response
5. Web dashboard shows AI Photo Erase health score drop + new "shadow_artifact" tag

### Scenario 2 — OTA Update Correlation
1. Register a mock OTA event in the dashboard (May 6 build)
2. Show 2 weeks of synthetic feedback data before the OTA — AI Wallpaper: 4.1/5
3. Show feedback data after OTA — AI Wallpaper: 3.2/5
4. Dashboard automatically flags OTA regression with red banner
5. Verbatim feed shows users complaining about generation quality since the update

### Scenario 3 — Anti-Interrupt Intelligence
1. Set mock Samsung Health stress score to 82
2. Use Circle to Search on the phone
3. GalaxyPulse detects usage but does NOT send a message
4. Show the HEARTBEAT log: "Deferred — stress score 82 > threshold 75"
5. 2 hours later (skip time), stress drops to 45 → GalaxyPulse sends the message

---

## 11. Deliverables Checklist (Phase 2)

- [ ] Working Android APK with OpenClaw node + all skill files
- [ ] Public GitHub repo (buildable, with README)
  - [ ] Setup instructions (Termux install, OpenClaw setup, channel config)
  - [ ] Build instructions (backend, frontend)
  - [ ] Run instructions (end-to-end)
- [ ] Skill files in `skills/` directory:
  - [ ] feature-watcher.js + SKILL.md
  - [ ] health-context.js + SKILL.md
  - [ ] feedback-conductor.js + SKILL.md
  - [ ] weekly-digest.js + SKILL.md
- [ ] Memory implementation: YAML structure documented + sample files
- [ ] SOUL.md and HEARTBEAT.md
- [ ] FastAPI backend (deployed + accessible URL)
- [ ] React web dashboard (deployed + accessible URL)
- [ ] Video demo (hands-on, showing all 3 scenarios)
- [ ] PPT documentation (SRIB format)

---

## 12. Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Agent Runtime | OpenClaw (Termux, Android) | Core requirement; runs always-on on Android |
| LLM | Claude API (claude-sonnet-4-20250514) | Question generation, auto-tagging, digest summarization |
| Channel | WhatsApp (via OpenClaw adapter) | User already there; no friction |
| Feedback Storage | YAML files (durable memory) | OpenClaw-native; inspectable; survives restarts |
| Usage Detection | Android UsageStatsManager | OS-level, no app SDK needed |
| Health Context | Samsung Health SDK (mocked) | Biometric enrichment; real SDK on roadmap |
| Backend | FastAPI + PostgreSQL | Lightweight, fast to build, easy to deploy |
| Frontend | React + Recharts + Tailwind | Fast to build PM dashboard |
| Deployment | Railway (backend) + Vercel (frontend) | Free tier; accessible demo URL |

---

## 13. Evaluation Criteria Alignment

| Criterion | Weight | How GalaxyPulse Scores |
|---|---|---|
| Working Prototype / Functionality | 35% | Full end-to-end loop: detection → feedback → dashboard |
| Technical Depth of Contribution | 25% | 4 custom skill files, OpenClaw durable memory, LLM-driven conversation + tagging |
| User Experience (UI/UX, novelty) | 15% | Conversational feedback over WhatsApp — zero friction UX; rich web dashboard |
| Relevance to Theme & Biz Importance | 15% | Directly solves SRIB's Galaxy AI feature validation gap |
| Presentation & Documentation | 10% | This plan + README + video demo + SKILL.md files |

---

## 14. Future Scope (Phase 3 / Beyond)

- **Real Samsung Health SDK integration** — replace mock with live biometric data
- **Galaxy Watch triggers** — detect feature use on watch (Quick Measure, Sleep Coach)
- **Multi-language support** — vernacular feedback in Hindi, Kannada, Tamil via OpenClaw's multilingual support
- **Bixby plugin** — surface the GalaxyPulse agent as a Bixby routine
- **One UI Routines integration** — expose feedback sessions as a Routine action
- **Cross-device corroboration** — if 5 users report the same friction tag in 24 hours, auto-escalate to the PM's Slack
- **External beta programme** — extend beyond SRIB employees to selected Galaxy Beta members
- **B2B productisation** — license the feedback intelligence layer to other Android OEMs (Xiaomi, OnePlus) or large app companies as a white-label SDK

---

*Last updated: May 7, 2026 | GalaxyPulse v1.0 Implementation Plan*
