#!/usr/bin/env python3
"""
Direct API test to see what ESPN returns for this league
"""

import requests
import json

LEAGUE_ID = 39944776
YEAR = 2026

# Try the endpoint directly
base_url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/{YEAR}/segments/0/leagues/{LEAGUE_ID}"
params = {
    'view': 'mTeam',
    'view': 'mRoster', 
    'view': 'mMatchup',
    'view': 'mSettings'
}

print(f"Testing direct API call to ESPN...")
print(f"URL: {base_url}")
print(f"Params: {params}")
print("\n" + "="*60)

try:
    r = requests.get(base_url, params=params)
    print(f"Status Code: {r.status_code}")
    print(f"Response Headers: {dict(r.headers)}")
    
    if r.status_code == 200:
        data = r.json()
        print("\n✓ Success! League data retrieved:")
        print(f"  League Name: {data.get('settings', {}).get('name', 'N/A')}")
        print(f"  Number of Teams: {len(data.get('teams', []))}")
        print(f"  Season: {data.get('seasonId', 'N/A')}")
    elif r.status_code == 401:
        print("\n✗ 401 Unauthorized")
        print("This league requires authentication (cookies).")
        print("Even if marked as 'public', ESPN may require login.")
    elif r.status_code == 404:
        print("\n✗ 404 Not Found")
        print("League not found. Possible reasons:")
        print(f"  - League ID {LEAGUE_ID} doesn't exist")
        print(f"  - Season {YEAR} doesn't exist yet (it's currently 2025)")
        print("  - League may have been deleted")
    else:
        print(f"\n✗ Error: {r.status_code}")
        print(f"Response: {r.text[:500]}")
        
except Exception as e:
    print(f"\n✗ Exception: {e}")

print("\n" + "="*60)
print("\nTrying alternate endpoint (leagueHistory)...")

# Try alternate endpoint
alt_url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/leagueHistory/{LEAGUE_ID}?seasonId={YEAR}"
try:
    r2 = requests.get(alt_url, params=params)
    print(f"Status Code: {r2.status_code}")
    if r2.status_code == 200:
        data = r2.json()
        if isinstance(data, list) and len(data) > 0:
            data = data[0]
        print("\n✓ Success with alternate endpoint!")
        print(f"  League Name: {data.get('settings', {}).get('name', 'N/A')}")
    else:
        print(f"  Response: {r2.text[:200]}")
except Exception as e:
    print(f"  Exception: {e}")
