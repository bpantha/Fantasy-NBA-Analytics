#!/usr/bin/env python3
"""Quick test script to fetch live week data and show category values for a specific team"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from espn_api.basketball import League

# Get credentials from environment - match backend app.py logic
LEAGUE_ID = int(os.getenv('LEAGUE_ID', '39944776'))
YEAR = 2026
ESPN_S2 = os.getenv('ESPN_S2', '')
ESPN_SWID = os.getenv('ESPN_SWID', '')

if not ESPN_S2 or not ESPN_SWID:
    print("Error: ESPN_S2 and ESPN_SWID environment variables must be set")
    sys.exit(1)

# Initialize league
print("Initializing league...")
league = League(league_id=LEAGUE_ID, year=YEAR, espn_s2=ESPN_S2, swid=ESPN_SWID)

# Get current week
current_week = league.currentMatchupPeriod
print(f"\nCurrent matchup period: {current_week}")
print(f"Current scoring period: {league.current_week}")

# Import export function
from backend.export_analytics import export_week_analytics

# Fetch live data for current week
print(f"\nFetching live data for week {current_week}...")
week_data = export_week_analytics(league, current_week)

if not week_data:
    print("Error: No data returned")
    sys.exit(1)

# Find the team
team_name_to_find = "Sugg(s) mah johnson"
team_found = None

for team in week_data.get('teams', []):
    if team_name_to_find.lower() in team.get('name', '').lower():
        team_found = team
        break

if not team_found:
    print(f"\nTeam '{team_name_to_find}' not found. Available teams:")
    for team in week_data.get('teams', []):
        print(f"  - {team.get('name', 'Unknown')}")
    sys.exit(1)

print(f"\n{'='*60}")
print(f"Team: {team_found.get('name', 'Unknown')}")
print(f"{'='*60}")

# Show category totals
print("\nCategory Totals:")
category_totals = team_found.get('category_totals', {})
if category_totals:
    for cat, value in category_totals.items():
        if cat in ['FG%', 'FT%']:
            print(f"  {cat}: {(value * 100):.1f}%")
        else:
            print(f"  {cat}: {value:.1f}")
else:
    print("  No category totals found")

# Show matchup details
print(f"\nOpponent: {team_found.get('opponent_name', 'Unknown')}")
matchup_details = team_found.get('matchup_details', {})
if matchup_details:
    opponent_name = team_found.get('opponent_name', '')
    if opponent_name in matchup_details:
        details = matchup_details[opponent_name]
        print(f"  Won: {details.get('won', 0)}")
        print(f"  Lost: {details.get('lost', 0)}")
        print(f"  Tied: {details.get('tied', 0)}")
        print(f"  Won Categories: {', '.join(details.get('won_cats', []))}")
        print(f"  Lost Categories: {', '.join(details.get('lost_cats', []))}")

# Show other stats
print(f"\nOther Stats:")
print(f"  Teams Beaten: {team_found.get('total_teams_beaten', 0)}")
print(f"  Total Category Wins: {team_found.get('total_category_wins', 0)}")
print(f"  Minutes Played: {team_found.get('minutes_played', 0):.1f}")

print(f"\n{'='*60}")
