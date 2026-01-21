#!/usr/bin/env python3
"""Debug script to check team logo data from ESPN API"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from espn_api.basketball import League

LEAGUE_ID = int(os.getenv('LEAGUE_ID', '39944776'))
YEAR = int(os.getenv('YEAR', '2026'))
ESPN_S2 = os.getenv('ESPN_S2', '')
ESPN_SWID = os.getenv('ESPN_SWID', '')

if not ESPN_S2 or not ESPN_SWID:
    print("ERROR: ESPN_S2 and ESPN_SWID environment variables required")
    sys.exit(1)

league = League(league_id=LEAGUE_ID, year=YEAR, espn_s2=ESPN_S2, swid=ESPN_SWID)

print("Checking team logo data...")
print("=" * 80)

for i, team in enumerate(league.teams[:3]):  # Check first 3 teams
    print(f"\nTeam {i+1}: {team.team_name}")
    print(f"  Team ID: {team.team_id}")
    print(f"  Has logo_url attr: {hasattr(team, 'logo_url')}")
    if hasattr(team, 'logo_url'):
        print(f"  logo_url value: '{team.logo_url}'")
        print(f"  logo_url type: {type(team.logo_url)}")
        print(f"  logo_url length: {len(team.logo_url) if team.logo_url else 0}")
    
    # Check if we can access raw data
    if hasattr(team, '__dict__'):
        print(f"  Team attributes: {[k for k in team.__dict__.keys() if 'logo' in k.lower() or 'image' in k.lower()]}")

print("\n" + "=" * 80)
print("Checking raw league data structure...")

# Try to access raw data
try:
    raw_data = league.espn_request.get_league()
    if 'teams' in raw_data:
        first_team = raw_data['teams'][0] if raw_data['teams'] else {}
        print(f"First team raw data keys: {list(first_team.keys())}")
        if 'logo' in first_team:
            print(f"  'logo' field value: {first_team['logo']}")
        if 'logoUrl' in first_team:
            print(f"  'logoUrl' field value: {first_team['logoUrl']}")
        if 'imageUrl' in first_team:
            print(f"  'imageUrl' field value: {first_team['imageUrl']}")
except Exception as e:
    print(f"Error accessing raw data: {e}")
