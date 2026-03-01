# ESPN Fantasy NBA Analytics — Data Analysis Index

This document indexes the codebase: all data analysis, where it lives, and how data is fetched from the ESPN API (and local files).

---

## 1. How Data Is Fetched From the API

### ESPN API Usage

- **Library:** `espn_api.basketball.League` (in-repo under `espn_api/`).
- **Credentials:** `LEAGUE_ID`, `YEAR`, `ESPN_S2`, `ESPN_SWID` (env or `.env`).
- **Entry point:** `get_league_instance(use_cache=True|False)` in `backend/app.py`:
  - Builds or returns a cached `League` (60s TTL).
  - `league.fetch_league()` refreshes from ESPN when needed.

**Main ESPN data sources used:**

| Source | Used for |
|--------|----------|
| `league.currentMatchupPeriod` | Current week number. |
| `league.current_week` | Current scoring period ID (e.g. 97). |
| `league.box_scores(matchup_period, scoring_period?, matchup_total?)` | Per-matchup stats: `home_stats`/`away_stats` (category totals), `home_lineup`/`away_lineup` (player `points_breakdown`). When `scoreByStat` is empty, we fall back to aggregating from lineup `points_breakdown`. |
| `league.scoreboard(matchupPeriod=N)` | Matchup pairings (home/away) for any period, including future (e.g. next week). |
| `league.teams`, `team.roster` | Roster and player season stats for roster totals and predictions. |
| `league.matchup_ids` | Map matchup_period → list of scoring period IDs. |
| `league.pro_schedule` | Pro team ID → scoring period → games (for “remaining games” in predictions). |
| `league.get_team_data(team_id)` | Resolve team ID to team object (name, etc.). |

### File-Based Data (Cron / Export)

- **Export job:** `backend/export_analytics.py` → `main()` (e.g. daily via GitHub Actions).
- **Writes:** `data/analytics/league_summary.json`, `players.json`, and `week1.json` … `week(current_period - 1).json`. The **current** week is **not** written; it is always served live via the API.
- **Read by:** `/api/league/summary`, `/api/players`, `/api/week/<N>` (when not live), and `/api/league/stats` (historical weeks only).

### Live vs File Summary

| Data | Source |
|------|--------|
| Current week analytics | Always live: `export_week_analytics(league, current)` (no file). |
| Historical week analytics | Files `week{N}.json` (or live only if `?live=true` and week = current). |
| League summary | File; `current_matchup_period` overwritten from live League when available. |
| League-wide stats | Historical from files + live current week from `export_week_analytics`. |
| Roster totals | Live League if available; else `players.json` + `league_summary.json`. |
| Upcoming matchups | Live: `league.scoreboard(matchupPeriod=current+1)` + roster totals. |
| Predictions | Live: `league.box_scores` + `project_team_stats()` (current + remaining games). |

---

## 2. Backend API Routes and What They Return

| Route | Method | Data returned | Data source |
|-------|--------|---------------|-------------|
| `/api/health` | GET | `{ status, timestamp }` | — |
| `/api/weeks` | GET | `{ weeks: number[], current_week?: number }` | Files + live League for `current_week` |
| `/api/week/current` | GET | Full week analytics (same shape as `/api/week/<N>`) | **Live only:** `export_week_analytics(league, current)` |
| `/api/week/<week>` | GET | Week analytics JSON (see §3.1) | `?live=true` and week=current → live; else `week{N}.json` |
| `/api/league/summary` | GET | Standings, league name, season, `current_matchup_period`, teams (rank, name, wins, etc.) | `league_summary.json`; current period from League when available |
| `/api/league/roster-totals` | GET | `{ teams: [{ name, team_id, logo_url, roster_totals }], season }` | Live League or `players.json` + `league_summary.json` |
| `/api/league/upcoming-matchups` | GET | `{ matchups: [{ team1, team2, categories }], matchup_period }` | Live: `scoreboard(current+1)` + roster totals for “favored” |
| `/api/league/stats` | GET | All aggregated league analytics (see §3.2) | Historical files + live current week |
| `/api/players` | GET | `{ export_date, players: [...] }` | `players.json` |
| `/api/teams` | GET | Teams file | `teams.json` |
| `/api/compare/<team1>/<team2>` | GET | Latest week data for two teams | File; **not used by frontend** |
| `/api/predictions/matchups` | GET | `{ matchups: [{ team1, team2 }] }` | Live: `box_scores(current_week)` |
| `/api/predictions` | GET | `{ predictions: [{ team1, team2, categories, projected_score, confidence }] }` | Live: `project_team_stats()` (see §3.3); requires `?live=true` |
| `/api/chatbot` | POST | `{ response }` | Backend loads summary, latest week, players; calls LLM |

---

## 3. All Data Analysis — Where It Lives and What It Is

### 3.1 Week-Level Analytics — `export_analytics.export_week_analytics(league, matchup_period)`

**Location:** `backend/export_analytics.py`

**Inputs:** ESPN `League`, `matchup_period` (e.g. 1–15).

**Data fetched:**  
- Current week: `league.box_scores(matchup_period, scoring_period=league.current_week, matchup_total=True)`.  
- Historical: `league.box_scores(matchup_period, matchup_total=True)`.  
- If category totals from `home_stats`/`away_stats` are all zeros, fallback: aggregate from `home_lineup`/`away_lineup` → `points_breakdown` (same as lineup aggregation used elsewhere).

**Computed:**

- **Category totals per team:** PTS, REB, AST, STL, BLK, FG%, FT%, 3PM, TO (from box score or lineup aggregation).
- **Cross-team comparison:** For every pair (A, B): categories won/lost, `won_cats`, `lost_cats`; “teams beaten” = count of opponents for which team won ≥5 categories.
- **Per team:**  
  - `total_teams_beaten`, `total_category_wins`  
  - `minutes_played`, `games_played` (healthy/DTD, MIN>0; for current week optionally Mon–Sun via scoring periods in range)  
  - `league_avg_minutes`, `league_avg_games_played`  
  - `opponent_name`, `minutes_vs_opponent`, `minutes_vs_league_avg`, `category_totals`, `beaten_teams`, `matchup_details` (per-opponent won/lost/won_cats/lost_cats).

**Output:** One JSON object per week (returned by `/api/week/current` and `/api/week/<N>`, and appended for current week in `/api/league/stats`).

---

### 3.2 League-Wide Aggregations — `/api/league/stats` (`get_league_stats()`)

**Location:** `backend/app.py`

**Data source:** All week objects (historical from files + live current week from `export_week_analytics`). No direct ESPN calls inside the aggregation loop; current week is fetched before this.

**Computed (per team over all weeks):**

- **Counts:** `total_teams_beaten`, `total_category_wins`, `total_minutes`, `weeks_played`, `weekly_teams_beaten[]`, `category_wins` (per category), `category_wins_by_week`, `category_wins_list` (for std dev).
- **Matchups:** `matchup_history` (wins/losses/total per opponent), `best_week`, `scheduled_opponent_wins` / `scheduled_opponent_weeks`, `opponent_matchups` (per opponent, list of { week, won, lost, result }).
- **Streaks:** `current_streak`, `longest_streak` (from scheduled opponent wins).
- **Clutch:** `close_wins`, `close_losses`, `blowout_wins`, `blowout_losses` (e.g. 5-4/6-3 vs 7+/0-2).
- **Recent:** `recent_performance` (last 4 weeks’ teams beaten, excluding current).

**Derived per team:**  
`avg_teams_beaten`, `variance` (of weekly teams beaten), `efficiency` (e.g. overall_wins / total_minutes * 1000), `avg_minutes_per_week`, overall wins/win_pct from league summary.

**Returned structures (summary):**

- **overall_performance:** total_wins_leader, win_pct_leader, most_dominant (max avg_teams_beaten), most_consistent (min coefficient of variation of weekly teams beaten).
- **category_performance:** category_leaders (per cat), most_balanced (min std dev of category wins).
- **activity_metrics:** most_active (max avg_minutes_per_week), minutes_leader, efficiency_leader.
- **streaks_trends:** current_streak_leaders, longest_streak_leaders, hot_teams, cold_teams (by recent avg teams beaten).
- **head_to_head:** best_matchups / worst_matchups (e.g. 80%+ / ≤20% win rate vs opponent), category_specialists (best win rate per category), most_consistent_weekly / least_consistent_weekly (variance of weekly teams beaten).
- **weekly_performance:** best_single_week, most_improved (first 4 vs last 4 weeks, 8+ weeks), improved_teams.
- **close_matchups:** close_win_leaders, close_loss_most, blowout_win_most, blowout_loss_most.
- **teams_list:** Full list of team-level stats above.
- **category_wins_by_team:** Per-team category win counts (for comparison modals).

---

### 3.3 Predictions — `project_team_stats()` and `/api/predictions`

**Location:** `backend/app.py`

**Data fetched:**  
`league.box_scores(matchup_period=current_week, scoring_period=current_scoring_period, matchup_total=True)`.  
Current accumulated stats from `box_score.home_stats`/`away_stats`; if all zeros, fallback: aggregate from same box’s `home_lineup`/`away_lineup` → `points_breakdown`.

**Computed:**

- **Current accumulated:** Category totals (PTS, REB, … TO) and FGM/FGA, FTM/FTA for percentages.
- **Remaining games:** For each remaining scoring period in the matchup, for each player (excluding OUT): if their pro team has a game that period, add one game of **season-average** stats (from `nine_cat_averages` or `stats[year_total].avg`).
- **Projected totals:** current + remaining; FG%/FT% from aggregated FGM/FGA and FTM/FTA.
- **Prediction:** Category-by-category comparison → projected score (e.g. 5-4-0) and a confidence value from category margins.

**Used by:** `/api/predictions?live=true` (and optionally `team1`/`team2`).

---

### 3.4 Roster Totals — `_build_roster_teams_from_league` / `_aggregate_roster_totals`

**Location:** `backend/app.py`

**Data fetched:**  
Live: `league.teams` → each team’s `roster`; player season stats (e.g. `nine_cat_averages` or `stats[year_total]`).  
Fallback: `players.json` + `league_summary.json` (team names, IDs).

**Computed:**  
Per team, sum of each player’s **season average** per category (PTS, REB, … TO); FG%/FT% from aggregated FGM/FGA and FTM/FTA.  
One object per team: `name`, `team_id`, `logo_url`, `roster_totals`.

**Used by:** `/api/league/roster-totals`, `/api/league/upcoming-matchups` (to decide “favored” per category).

---

### 3.5 Upcoming Matchups — `get_upcoming_matchups()`

**Location:** `backend/app.py`

**Data fetched:**  
- Roster totals (see §3.4).  
- `league.scoreboard(matchupPeriod=currentMatchupPeriod + 1)` for next week’s pairings.

**Computed:**  
For each matchup, for each category: compare roster_totals of team1 vs team2; set `favored` (team1 / team2 / toss). No game-by-game or scoring-period logic; purely roster-totals comparison for “who’s favored” next week.

**Used by:** `/api/league/upcoming-matchups`.

---

### 3.6 League Summary and Players Export

**Location:** `backend/export_analytics.py`

- **export_league_summary(league):** Standings (rank, name, team_id, logo_url, wins, losses, ties, win_percentage, playoff_seed, points_for, points_against), plus `current_week`, `current_matchup_period`, `league_name`, `season`. Written to `league_summary.json`.
- **export_players(league):** All roster + free agents; name, player_id, position, team, pro_team, injury_status, stats. Written to `players.json`.

---

## 4. Frontend Data Usage (Which Component Uses Which API)

| Component | Endpoints | Purpose |
|-----------|-----------|---------|
| **LeagueOverview** | `GET /api/league/stats?live=true`, `GET /api/league/summary`, `GET /api/week/current?t=<key>` | Dashboard: overall stats, current week KPIs, refresh current week |
| **TeamVsLeague** | `GET /api/weeks`, `GET /api/league/summary`, `GET /api/league/roster-totals`, `GET /api/week/current` or `GET /api/week/<N>`, `GET /api/week/<week>` (historical, in parallel) | Team picker, week selector, roster totals, current/historical week data, bar chart over weeks |
| **TeamModal** | `GET /api/weeks`, `GET /api/league/summary`, `GET /api/week/current` or `GET /api/week/<N>` | Week selector; week details for one team |
| **WeekModal** | `GET /api/league/summary`, `GET /api/week/current` or `GET /api/week/<week>` | Single-week leaderboard |
| **UpcomingMatchup** | `GET /api/league/upcoming-matchups` | Next week’s matchups and category favor |
| **LivePredictions** | `GET /api/predictions/matchups`, `GET /api/predictions?live=true&team1=...&team2=...` | Matchup list; prediction for selected matchup |
| **CategoryComparisonModal** | `GET /api/league/stats?live=true` | Category leaders, category_wins_by_team, teams_list |
| **ImprovementComparisonModal** | `GET /api/league/stats?live=true` | weekly_performance.improved_teams |
| **Chatbot** | `POST /api/chatbot` | Sends user query; displays LLM response (backend loads summary, week, players) |
| **CategoryDominatorModal, MetricRankModal, ClutchDetailModal, OpponentDetailModal, MatchupPreviewModal** | No direct fetch | Receive data via props from parent (LeagueOverview, TeamVsLeague, UpcomingMatchup). |

---

## 5. Cache and Refresh Behavior

- **Backend:** League instance cached 60s (`_LEAGUE_CACHE_TTL`). `/api/week/current` uses `get_league_instance(use_cache=False)` and `Cache-Control: no-store`.
- **Frontend:** SWR for GETs; `liveRefreshKey` used to bust cache for `/api/week/current` when user clicks “Refresh live”. Predictions use `?live=true` and optional `mutate` on Retry.

---

## 6. Unused or Secondary Endpoints

- **`GET /api/compare/<team1>/<team2>`:** Reads latest week file; no frontend caller.
- **`GET /api/players`**, **`GET /api/teams`:** Used by backend (e.g. chatbot context / roster fallback), not by current UI.

This index summarizes all data analysis in the app and how that data is fetched from the ESPN API and local files.
