# Predictions & Live Data Verification Checklist

## Issues to Verify

### 1. **Matchup Filtering Logic** (Line 800-802)
**Current Code:**
```python
if (not team1 and not team2) or \
   (team1.lower() in [home_name.lower(), away_name.lower()] and 
    team2.lower() in [home_name.lower(), away_name.lower()]):
```

**Potential Issue:**
- This checks if team1 is in the matchup AND team2 is in the matchup
- But it doesn't verify they're the ONLY teams in the matchup
- Example: If team1="Team A", team2="Team B", but matchup is "Team A vs Team C", it would incorrectly match because team1 matches

**Fix Needed:**
```python
if (not team1 and not team2) or \
   ((team1.lower() == home_name.lower() and team2.lower() == away_name.lower()) or
    (team1.lower() == away_name.lower() and team2.lower() == home_name.lower())):
```

### 2. **Matchup List Endpoint - Live Data Fetching** (Line 655-660)
**Current Code:**
```python
current_week = get_current_week(fetch_live=False)  # Don't fetch live, use cached
# Get box scores to find matchups
league.fetch_league()  # <-- This still fetches live data!
```

**Issue:**
- `get_current_week(fetch_live=False)` uses cached data
- But `league.fetch_league()` still makes a live API call
- This defeats the purpose of avoiding live data

**Question:** Should matchup list endpoint fetch live data or use cached? If cached, we need a different approach.

### 3. **Predictions Endpoint - Current Week Detection** (Line 709)
**Current Code:**
```python
current_week = get_current_week(fetch_live=True)
```

**Verification Needed:**
- Does `get_current_week(fetch_live=True)` return the correct current week?
- Is `league.current_week` (scoring period) correctly synced after `league.fetch_league()`?
- Are we using the right scoring_period when calling `box_scores()`?

### 4. **Project Team Stats - Remaining Periods Logic** (Line 887-904)
**Current Code:**
```python
remaining_periods = [sp for sp in scoring_periods if sp >= current_scoring_period]

if not remaining_periods:
    # Fallback: assume remaining periods from current through end of week
    end_period = min(current_scoring_period + 7, league.finalScoringPeriod)
    remaining_periods = list(range(current_scoring_period, end_period + 1))
```

**Verification Needed:**
- Are `matchup_scoring_periods` correctly populated?
- Is the fallback logic (current + 7 days) accurate?
- Does it correctly identify "through Sunday"?

### 5. **Project Team Stats - Current Stats** (Line 850-867)
**Current Code:**
```python
stats = box_score.home_stats if is_home else box_score.away_stats
if stats:
    for cat in standard_cats:
        if cat in stats:
            value = stats[cat].get('value', 0)
            projected[cat] = float(value) if value else 0.0
```

**Verification Needed:**
- Are `box_score.home_stats` and `box_score.away_stats` the current accumulated stats?
- Is `matchup_total=True` ensuring we get cumulative stats for the entire matchup?
- Are percentage categories (FG%, FT%) correctly calculated from FGM/FGA and FTM/FTA?

### 6. **Project Team Stats - Player Averages** (Line 973-994)
**Current Code:**
```python
avg_stats = player_stats[season_total_key].get('avg', {})
# Adds season averages for remaining games
projected['PTS'] += pts_add
```

**Verification Needed:**
- Are we using season averages or recent averages?
- Should we use per-game averages or total averages?
- Are injured players (OUT status) correctly excluded?

### 7. **Percentage Categories Recalculation** (Line 1026-1030)
**Current Code:**
```python
if fg_attempted > 0:
    projected['FG%'] = fg_made / fg_attempted
if ft_attempted > 0:
    projected['FT%'] = ft_made / ft_attempted
```

**Verification Needed:**
- Are we correctly combining current FGM/FGA with projected FGM/FGA?
- Is the percentage calculation correct: (current + projected made) / (current + projected attempted)?

## Testing Recommendations

1. **Test Matchup Filtering:**
   - Request prediction for specific matchup
   - Verify only that matchup is returned
   - Test with team name variations (case sensitivity)

2. **Test Live Data Fetching:**
   - Compare cached vs live data for current week
   - Verify `current_week` matches ESPN's current matchup period
   - Check that `scoring_period` is correct

3. **Test Projections:**
   - Compare projected values with actual ESPN projections
   - Verify current stats match what's shown on ESPN
   - Check that remaining games are correctly identified
   - Verify player averages are being used correctly

4. **Test Edge Cases:**
   - Week with no remaining games
   - Team with all players OUT
   - Team with no players in lineup
   - Percentage categories with 0 attempts
