#!/usr/bin/env python3
"""Test the API endpoint to get live week data"""

import requests
import json
import os

# Try to get the API base URL from environment or use default
# Common Render URL patterns
API_BASE = os.getenv('API_BASE', "https://laspuntas.onrender.com")

# Get current week first
print(f"Testing API endpoint: {API_BASE}")
print("Fetching current week from league summary...")
try:
    summary_response = requests.get(f"{API_BASE}/api/league/summary", timeout=30)
    if summary_response.status_code == 200:
        summary = summary_response.json()
        current_week = summary.get('current_matchup_period')
        print(f"Current week: {current_week}\n")
    else:
        print(f"Error getting summary: {summary_response.status_code}")
        current_week = None
except Exception as e:
    print(f"Error: {e}")
    current_week = None

if current_week:
    print(f"Fetching live data for week {current_week}...")
    try:
        # Add cache-busting to ensure fresh data
        print(f"Making request to: {API_BASE}/api/week/{current_week}")
        response = requests.get(
            f"{API_BASE}/api/week/{current_week}",
            params={"_t": "test"},
            timeout=60  # Longer timeout for first request (cold start)
        )
        
        if response.status_code == 200:
            week_data = response.json()
            
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
            else:
                print(f"\n{'='*60}")
                print(f"Team: {team_found.get('name', 'Unknown')}")
                print(f"{'='*60}")
                
                # Show category totals
                print("\nCategory Totals:")
                category_totals = team_found.get('category_totals', {})
                if category_totals:
                    for cat, value in sorted(category_totals.items()):
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
                print("\nFull team data (JSON):")
                print(json.dumps(team_found, indent=2))
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error fetching week data: {e}")
        import traceback
        traceback.print_exc()
