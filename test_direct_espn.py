#!/usr/bin/env python3
"""Direct test to fetch current category values from ESPN API"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from espn_api.basketball import League

# Get credentials - try from environment
LEAGUE_ID = int(os.getenv('LEAGUE_ID', '39944776'))
YEAR = 2026
ESPN_S2 = os.getenv('ESPN_S2', '')
ESPN_SWID = os.getenv('ESPN_SWID', '')

if not ESPN_S2 or not ESPN_SWID:
    print("Error: ESPN_S2 and ESPN_SWID must be set in environment")
    print("Please set them and run again")
    sys.exit(1)

print("Connecting to ESPN API...")
league = League(league_id=LEAGUE_ID, year=YEAR, espn_s2=ESPN_S2, swid=ESPN_SWID)

print(f"Current matchup period: {league.currentMatchupPeriod}")
print(f"Current scoring period: {league.current_week}")

# Get box scores for current week
print(f"\nFetching box scores for matchup period {league.currentMatchupPeriod}...")
box_scores = league.box_scores(matchup_period=league.currentMatchupPeriod, matchup_total=True)

if not box_scores:
    print("No box scores found")
    sys.exit(1)

# Find the team
team_name_to_find = "Sugg(s) mah johnson"
team_found = None
box_score_found = None

for box_score in box_scores:
    home_team = box_score.home_team
    away_team = box_score.away_team
    
    # Get team names
    if hasattr(home_team, 'team_name'):
        home_name = home_team.team_name
    elif isinstance(home_team, int):
        home_team_obj = league.get_team_data(home_team)
        home_name = home_team_obj.team_name if hasattr(home_team_obj, 'team_name') else str(home_team)
    else:
        home_name = str(home_team)
    
    if hasattr(away_team, 'team_name'):
        away_name = away_team.team_name
    elif isinstance(away_team, int):
        away_team_obj = league.get_team_data(away_team)
        away_name = away_team_obj.team_name if hasattr(away_team_obj, 'team_name') else str(away_team)
    else:
        away_name = str(away_team)
    
    if team_name_to_find.lower() in home_name.lower():
        team_found = home_team
        box_score_found = box_score
        is_home = True
        break
    elif team_name_to_find.lower() in away_name.lower():
        team_found = away_team
        box_score_found = box_score
        is_home = False
        break

if not box_score_found:
    print(f"\nTeam '{team_name_to_find}' not found in any matchup. Available teams:")
    for box_score in box_scores:
        home_team = box_score.home_team
        away_team = box_score.away_team
        if isinstance(home_team, int):
            home_team = league.get_team_data(home_team)
        if isinstance(away_team, int):
            away_team = league.get_team_data(away_team)
        print(f"  - {home_team.team_name if hasattr(home_team, 'team_name') else home_team} vs {away_team.team_name if hasattr(away_team, 'team_name') else away_team}")
    sys.exit(1)

# Get stats
stats = box_score_found.home_stats if is_home else box_score_found.away_stats

print(f"\n{'='*60}")
print(f"Team: {team_name_to_find}")
print(f"{'='*60}")

if stats:
    print("\nCategory Values (from box_score stats):")
    standard_cats = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']
    for cat in standard_cats:
        if cat in stats:
            value = stats[cat].get('value', 0)
            if cat in ['FG%', 'FT%']:
                print(f"  {cat}: {(value * 100):.1f}%")
            else:
                print(f"  {cat}: {value:.1f}")
        else:
            print(f"  {cat}: Not found")
    
    # Also show raw stats dict
    print(f"\nRaw stats dict keys: {list(stats.keys())}")
    print(f"\nFull stats dict:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
else:
    print("No stats found in box_score")

# Also check lineup stats
lineup = box_score_found.home_lineup if is_home else box_score_found.away_lineup
print(f"\nLineup has {len(lineup)} players")

print(f"\n{'='*60}")
