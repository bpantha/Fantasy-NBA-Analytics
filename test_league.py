#!/usr/bin/env python3
"""
Test script for ESPN NBA Fantasy League
League ID: 39944776
Season: 2026

To get your cookies (espn_s2 and swid):
1. Log into ESPN Fantasy in your browser
2. Open Developer Tools (F12 or right-click -> Inspect)
3. Go to Application/Storage tab -> Cookies -> https://fantasy.espn.com
4. Find the 'espn_s2' and 'SWID' cookies
5. Copy their values and paste them below
"""

from espn_api.basketball import League
import os

# League information from URL
LEAGUE_ID = 39944776
YEAR = 2026

# Authentication cookies (optional - only needed for private leagues)
# You can also set these as environment variables: ESPN_S2 and ESPN_SWID
ESPN_S2 = os.getenv('ESPN_S2', 'AEAwWV%2BaozyTIHV5vRNdeXJ1aSx4lqN5nfk77vBKuinqXNGPpl61Tr5HTZYF65Zkw0sNf8Ou74yyVnm87nQtTYRzr1cwox34dhiO5iPJI6OQ9dgPk181YScoAy8VTxgAA6enRIl%2Fxv8JEtv9SdRQ7z8%2Fm0TwKtXoROkpWK4j6%2Fjv1SymLiWZ6ny26HtNuzECTCLQ%2FPEkzenPbr4NIPe%2BZIMbHzc%2BrkCWOcSHR4zLDxEUUfmXNgRy3KGCPGpckgwMQw6X%2FNNNMVuaC3HLG7Za2mRy%2FZMFBowLEFd9c02qDj6Vrg%3D%3D')
ESPN_SWID = os.getenv('ESPN_SWID', '{589899C8-709A-42B5-99E3-BF73799A3D36}')

def main():
    print("=" * 60)
    print(f"Connecting to ESPN NBA Fantasy League {LEAGUE_ID} ({YEAR})")
    print("=" * 60)
    
    try:
        # Initialize league (cookies only needed for private leagues
        # For public leagues, you can pass None or omit the parameters)
        league = League(
            league_id=LEAGUE_ID, 
            year=YEAR, 
            espn_s2=ESPN_S2,
            swid=ESPN_SWID,
            debug=False  # Set to True to see API requests/responses for debugging
        )
        
        print(f"\n✓ Successfully connected to league!")
        print(f"  League Name: {league.settings.name if hasattr(league.settings, 'name') else 'N/A'}")
        print(f"  Current Week: {league.current_week}")
        print(f"  Current Matchup Period: {league.currentMatchupPeriod}")
        print(f"  Number of Teams: {len(league.teams)}")
        
        # Display standings
        print("\n" + "=" * 60)
        print("STANDINGS")
        print("=" * 60)
        standings = league.standings()
        for i, team in enumerate(standings, 1):
            print(f"{i}. {team.team_name} (ID: {team.team_id})")
            print(f"   Record: {team.wins}-{team.losses}-{team.ties}")
            if hasattr(team, 'points_for'):
                print(f"   Points For: {team.points_for:.2f}")
        
        # Display current matchups
        print("\n" + "=" * 60)
        print("CURRENT MATCHUPS")
        print("=" * 60)
        try:
            matchups = league.scoreboard()
            if matchups:
                for matchup in matchups:
                    home_team = matchup.home_team
                    away_team = matchup.away_team
                    if isinstance(home_team, int):
                        home_team = league.get_team_data(home_team)
                    if isinstance(away_team, int):
                        away_team = league.get_team_data(away_team)
                    
                    home_score = matchup.home_score if hasattr(matchup, 'home_score') else 'N/A'
                    away_score = matchup.away_score if hasattr(matchup, 'away_score') else 'N/A'
                    
                    print(f"{away_team.team_name} ({away_score}) @ {home_team.team_name} ({home_score})")
            else:
                print("No matchups found for current period")
        except Exception as e:
            print(f"Could not fetch matchups: {e}")
        
        # Display team details
        print("\n" + "=" * 60)
        print("TEAM DETAILS")
        print("=" * 60)
        for team in league.teams[:3]:  # Show first 3 teams
            print(f"\n{team.team_name} (ID: {team.team_id})")
            print(f"  Record: {team.wins}-{team.losses}-{team.ties}")
            if hasattr(team, 'roster'):
                print(f"  Roster size: {len(team.roster) if team.roster else 0}")
        
        # Try to get recent activity
        print("\n" + "=" * 60)
        print("RECENT ACTIVITY")
        print("=" * 60)
        try:
            activities = league.recent_activity(size=5)
            if activities:
                for activity in activities[:5]:
                    print(f"  {activity}")
            else:
                print("  No recent activity found")
        except Exception as e:
            print(f"  Could not fetch recent activity: {e}")
        
        print("\n" + "=" * 60)
        print("Test completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error connecting to league: {e}")
        print("\nTroubleshooting:")
        print("1. ESPN may require authentication even for 'public' leagues")
        print("2. The year 2026 might be a future season - try 2025 or 2024")
        print("3. Get your cookies from browser (see instructions in script)")
        print("4. Make sure your cookies are valid (they expire after some time)")
        print("\nTo get cookies:")
        print("  - Log into ESPN Fantasy")
        print("  - Open DevTools (F12) -> Application/Storage -> Cookies")
        print("  - Copy 'espn_s2' and 'SWID' values")
        print("  - Set: export ESPN_S2='value' export ESPN_SWID='value'")
        raise

if __name__ == "__main__":
    main()
